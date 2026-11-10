import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { makeResultItem } from './fixtures'
import type { SearchResultItem } from '#shared/types/search'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}))
vi.mock('~/app/composables/useI18nContent', () => ({
  useI18nContent: () => ({ tc: (text: Record<string, string>) => text.es ?? '' }),
}))

const UiMediaCardStub = defineComponent({
  name: 'UiMediaCard',
  props: {
    title: { type: String, required: true },
    to: { type: String, required: true },
    imageSrc: { type: String, default: null },
    isImageOptimized: { type: Boolean, default: true },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'article',
        {
          'data-to': props.to,
          'data-image': props.imageSrc ?? '',
          'data-optimized': String(props.isImageOptimized),
        },
        [h('h2', props.title), h('div', { class: 'badge' }, slots.badge?.()), slots.default?.()]
      )
  },
})

const ResultCard = (await import('~/app/components/search/ResultCard.vue')).default

const mountCard = (item: SearchResultItem) =>
  mount(ResultCard, { props: { item }, global: { stubs: { UiMediaCard: UiMediaCardStub } } })

describe('SearchResultCard', () => {
  it('links an activity to its detail page with its context and price', () => {
    const wrapper = mountCard(makeResultItem())
    expect(wrapper.find('article').attributes('data-to')).toBe('/activity/activity-1')
    expect(wrapper.find('h2').text()).toBe('Taller de cerámica')
    expect(wrapper.find('.result-card__kind').text()).toBe('results.kind.activity')
    expect(wrapper.find('.result-card__context').text()).toBe('Casa del Arte · Jaffa')
    expect(wrapper.find('.result-card__price [dir="ltr"]').text()).toBe('₪70')
  })

  it('describes the age badge for screen readers and keeps numbers LTR', () => {
    const badge = mountCard(makeResultItem()).find('.result-card__ages')
    expect(badge.attributes('aria-label')).toBe('results.agesLabel:{"min":5,"max":12}')
    expect(badge.find('[dir="ltr"]').attributes('aria-hidden')).toBe('true')
  })

  it('shows places with their activity count', () => {
    const wrapper = mountCard(
      makeResultItem({ kind: 'place', id: 'place-1', placeName: null, activityCount: 3 })
    )
    expect(wrapper.find('article').attributes('data-to')).toBe('/place/place-1')
    expect(wrapper.find('.result-card__kind').text()).toBe(
      'results.kind.place · results.activityCount:3'
    )
    expect(wrapper.find('.result-card__context').text()).toBe('Jaffa')
  })

  it('labels free plans and hides unknown prices', () => {
    expect(
      mountCard(makeResultItem({ isFree: true }))
        .find('.result-card__price')
        .text()
    ).toBe('results.free')
    expect(
      mountCard(makeResultItem({ price: null }))
        .find('.result-card__price')
        .exists()
    ).toBe(false)
  })

  it('says which ages a partial match is for', () => {
    const wrapper = mountCard(makeResultItem({ fit: 'some', matchingAges: [7] }))
    expect(wrapper.find('.result-card__fit').text()).toBe('results.forAges:{"ages":"7"}')
    expect(mountCard(makeResultItem()).find('.result-card__fit').exists()).toBe(false)
  })

  it('skips image optimization only for photos served by our API proxy', () => {
    const proxied = mountCard(makeResultItem({ imageUrl: '/api/places/photo?ref=abc' }))
    expect(proxied.find('article').attributes('data-optimized')).toBe('false')
    expect(mountCard(makeResultItem()).find('article').attributes('data-optimized')).toBe('true')
  })

  it('omits the badge without age data', () => {
    expect(
      mountCard(makeResultItem({ ageSpan: null }))
        .find('.result-card__ages')
        .exists()
    ).toBe(false)
  })
})
