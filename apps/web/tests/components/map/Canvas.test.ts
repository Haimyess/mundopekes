import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import {
  fitBounds,
  mapEvents,
  mapOptions,
  markerElements,
  removeMap,
  resetMapbox,
} from './mapbox-stubs'

const runtimeConfig = { public: { mapboxToken: 'pk.test' } }

vi.mock('mapbox-gl', async () => await import('./mapbox-stubs'))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'he' } }),
}))
vi.mock('../../../node_modules/nuxt/dist/app/nuxt.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRuntimeConfig: () => runtimeConfig,
}))

const Canvas = (await import('~/app/components/map/Canvas.vue')).default

const PINS = [
  { id: 'a', lat: 32.08, lng: 34.78, label: '₪35', title: 'Museo' },
  { id: 'b', lat: 32.1, lng: 34.8, label: '<b>Free</b>', title: 'Parque' },
]

async function mountCanvas(props: Record<string, unknown> = {}) {
  const wrapper = mount(Canvas, {
    props: { pins: PINS, label: 'Mapa de resultados', ...props },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('MapCanvas', () => {
  beforeEach(() => {
    resetMapbox()
    runtimeConfig.public.mapboxToken = 'pk.test'
  })

  it('creates the map in the interface language with the public token', async () => {
    await mountCanvas()
    expect(mapOptions[0]).toMatchObject({ accessToken: 'pk.test', language: 'he' })
  })

  it('renders every pin as a named button with its label as plain text', async () => {
    await mountCanvas()
    expect(
      markerElements.map((element) => [element.tagName, element.getAttribute('aria-label')])
    ).toEqual([
      ['BUTTON', 'Museo'],
      ['BUTTON', 'Parque'],
    ])
    expect(markerElements[1]!.textContent).toBe('<b>Free</b>')
    expect(markerElements[1]!.querySelector('b')).toBeNull()
  })

  it('marks the active and highlighted pins', async () => {
    const wrapper = await mountCanvas({ activeId: 'b' })
    expect(
      markerElements.map((element) => element.classList.contains('map-canvas__pin--active'))
    ).toEqual([false, true])
    await wrapper.setProps({ activeId: null, highlightedId: 'a' })
    expect(markerElements[0]!.classList.contains('map-canvas__pin--active')).toBe(true)
  })

  it('fits the pins unless told not to', async () => {
    await mountCanvas()
    expect(fitBounds).toHaveBeenCalledTimes(1)
    resetMapbox()
    await mountCanvas({ shouldFitPins: false })
    expect(fitBounds).not.toHaveBeenCalled()
  })

  it('reports selection, hover and only user moves', async () => {
    const wrapper = await mountCanvas()
    markerElements[0]!.click()
    markerElements[0]!.dispatchEvent(new Event('mouseenter'))
    markerElements[0]!.dispatchEvent(new Event('mouseleave'))
    mapEvents.get('moveend')!.forEach((handler) => handler({}))
    expect(wrapper.emitted('move')).toBeUndefined()
    mapEvents.get('moveend')!.forEach((handler) => handler({ originalEvent: new Event('mouseup') }))
    expect(wrapper.emitted('select')).toEqual([['a']])
    expect(wrapper.emitted('highlight')).toEqual([['a'], [null]])
    expect(wrapper.emitted('move')).toEqual([[{ south: 32, west: 34.7, north: 32.2, east: 34.9 }]])
  })

  it('removes the map when unmounted', async () => {
    const wrapper = await mountCanvas()
    wrapper.unmount()
    expect(removeMap).toHaveBeenCalledTimes(1)
  })

  it('shows a notice instead of the map without a token', async () => {
    runtimeConfig.public.mapboxToken = ''
    const wrapper = await mountCanvas()
    expect(wrapper.find('[role="status"]').text()).toBe('map.unavailable')
    expect(mapOptions).toHaveLength(0)
  })
})
