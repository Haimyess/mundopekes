import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { makeResultItem } from './fixtures'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const passThrough = (name: string, tag = 'div') =>
  defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      return () => h(tag, { 'data-stub': name, ...attrs }, slots.default?.())
    },
  })

const StateErrorStub = defineComponent({
  name: 'StateError',
  props: { title: { type: String, required: true }, retryLabel: { type: String, default: '' } },
  emits: ['retry'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-stub': 'StateError' }, [
        h('button', { onClick: () => emit('retry') }, props.retryLabel),
      ])
  },
})

const ResultList = (await import('~/app/components/search/ResultList.vue')).default

const mountList = (props: Record<string, unknown>) =>
  mount(ResultList, {
    props: { items: [], isLoading: false, hasError: false, ...props },
    slots: { 'empty-actions': '<a href="/search">clear</a>' },
    global: {
      stubs: {
        StateError: StateErrorStub,
        StateEmpty: passThrough('StateEmpty', 'section'),
        UiSkeleton: passThrough('UiSkeleton'),
        SearchResultCard: passThrough('SearchResultCard'),
      },
    },
  })

describe('SearchResultList', () => {
  it('shows a busy skeleton grid while loading', () => {
    const grid = mountList({ isLoading: true }).find('ul')
    expect(grid.attributes('aria-busy')).toBe('true')
    expect(grid.attributes('aria-label')).toBe('results.loading')
    expect(grid.findAll('li')).toHaveLength(8)
  })

  it('shows the error state and emits retry', async () => {
    const wrapper = mountList({ hasError: true })
    await wrapper.find('[data-stub="StateError"] button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('shows the empty state with its actions', () => {
    const empty = mountList({}).find('[data-stub="StateEmpty"]')
    expect(empty.attributes('title')).toBe('results.empty.title')
    expect(empty.find('a').attributes('href')).toBe('/search')
  })

  it('renders one card per item and loads the first images eagerly', () => {
    const items = [
      makeResultItem({ id: 'a' }),
      makeResultItem({ id: 'b' }),
      makeResultItem({ id: 'c', kind: 'place' }),
    ]
    const cards = mountList({ items }).findAll('[data-stub="SearchResultCard"]')
    expect(cards).toHaveLength(3)
    expect(cards.map((card) => card.attributes('is-eager'))).toEqual(['true', 'true', 'false'])
  })
})
