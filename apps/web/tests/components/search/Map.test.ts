import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { SHEET_STUBS } from './sheet-harness'
import { searchState } from './search-state-mock'
import { makeResultItem } from './fixtures'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: { value: 'en' }, t: (key: string) => key }),
}))
vi.mock('~/app/composables/useI18nContent', () => ({
  useI18nContent: () => ({ tc: (text: Record<string, string>) => text.es ?? '' }),
}))
vi.mock(
  '~/app/composables/useSearchState',
  async () => (await import('./search-state-mock')).searchStateModule
)
vi.mock('../../../node_modules/nuxt/dist/app/composables/router.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  navigateTo: mockNavigate,
}))
vi.mock('@vue-leaflet/vue-leaflet', async () => await import('../map/leaflet-stubs'))
vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useDebounceFn: (callback: (...args: unknown[]) => unknown) => callback,
}))

let canvasProps: Record<string, unknown> = {}
const MapCanvasStub = defineComponent({
  name: 'MapCanvas',
  props: {
    pins: { type: Array, required: true },
    label: { type: String, required: true },
    activeId: { type: String, default: null },
    highlightedId: { type: String, default: null },
    shouldFitPins: { type: Boolean, default: true },
  },
  emits: ['select', 'highlight', 'move'],
  setup(props, { emit }) {
    return () => {
      canvasProps = { ...props }
      return h('div', { 'data-stub': 'MapCanvas' }, [
        h('button', { class: 'select-b', onClick: () => emit('select', 'b') }),
        h('button', {
          class: 'move',
          onClick: () => emit('move', { south: 32, west: 34.7, north: 32.2, east: 34.9 }),
        }),
      ])
    }
  },
})
const ResultCardStub = defineComponent({
  name: 'SearchResultCard',
  props: { item: { type: Object, required: true } },
  setup: (props) => () => h('article', { 'data-id': (props.item as { id: string }).id }),
})

const SearchMap = (await import('~/app/components/search/Map.vue')).default

const PINS = [
  makeResultItem({ id: 'a', price: 35, location: { lat: 32.08, lng: 34.78 } }),
  makeResultItem({ id: 'b', isFree: true, location: { lat: 32.1, lng: 34.8 } }),
  makeResultItem({ id: 'c', kind: 'place', price: null, location: { lat: 32.2, lng: 34.9 } }),
]

const mountMap = (pins = PINS) =>
  mount(SearchMap, {
    props: { pins, highlightedId: 'a' },
    global: {
      stubs: { ...SHEET_STUBS, MapCanvas: MapCanvasStub, SearchResultCard: ResultCardStub },
    },
  })

describe('SearchMap', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    searchState.value = { free: true }
  })

  it('turns results into labelled pins and passes the highlight through', () => {
    mountMap()
    expect(
      (canvasProps.pins as { id: string; label: string }[]).map(({ id, label }) => [id, label])
    ).toEqual([
      ['a', '₪35'],
      ['b', 'results.free'],
      ['c', 'results.kind.place'],
    ])
    expect(canvasProps).toMatchObject({ highlightedId: 'a', shouldFitPins: true })
  })

  it('shows the card of the selected pin and closes it', async () => {
    const wrapper = mountMap()
    await wrapper.find('.select-b').trigger('click')
    expect(wrapper.find('.search-map__card article').attributes('data-id')).toBe('b')
    await wrapper.find('.search-map__close').trigger('click')
    expect(wrapper.find('.search-map__card').exists()).toBe(false)
  })

  it('searches the visible area only when the option is on', async () => {
    const wrapper = mountMap()
    await wrapper.find('.move').trigger('click')
    expect(mockNavigate).not.toHaveBeenCalled()
    await wrapper.find('[role="switch"]').setValue(true)
    await wrapper.find('.move').trigger('click')
    await flushPromises()
    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?bbox=32.0000,34.7000,32.2000,34.9000&free=true'
    )
  })

  it('stops fitting pins while an area is searched and clears it when the option is off', async () => {
    searchState.value = { bbox: { south: 32, west: 34.7, north: 32.2, east: 34.9 } }
    const wrapper = mountMap()
    expect(canvasProps.shouldFitPins).toBe(false)
    await wrapper.find('[role="switch"]').setValue(false)
    expect(mockNavigate).toHaveBeenCalledWith('/search')
  })

  it('tells when no result can be placed on the map', () => {
    expect(mountMap([]).find('[role="status"]').text()).toBe('results.map.empty')
  })
})
