import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { FORM_STUBS } from './form-stubs'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const ClaimBanner = (await import('~/app/components/business/ClaimBanner.vue')).default
const ResultsCta = (await import('~/app/components/business/ResultsCta.vue')).default

const ClaimSheetStub = defineComponent({
  name: 'BusinessClaimSheet',
  props: {
    open: Boolean,
    placeId: { type: String, required: true },
    placeName: { type: String, default: '' },
  },
  emits: ['update:open'],
  setup:
    (props, { slots, emit }) =>
    () =>
      h(
        'div',
        {
          'data-open': String(props.open),
          'data-place': props.placeId,
          'data-name': props.placeName,
          onClick: () => emit('update:open', true),
        },
        slots.trigger?.()
      ),
})

describe('BusinessClaimBanner', () => {
  it('asks if the place is yours and opens the claim for that place', async () => {
    const wrapper = mount(ClaimBanner, {
      props: { placeId: 'place-1', placeName: 'Science Museum' },
      global: { stubs: { BusinessClaimSheet: ClaimSheetStub, UiIcon: true } },
    })
    expect(wrapper.get('h2').text()).toBe('claim.bannerTitle')
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe('claim-banner-title')
    const sheet = wrapper.get('[data-open]')
    expect(sheet.attributes('data-place')).toBe('place-1')
    expect(sheet.attributes('data-name')).toBe('Science Museum')
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('[data-open]').attributes('data-open')).toBe('true')
  })
})

describe('BusinessResultsCta', () => {
  it('links businesses to the business page', () => {
    const wrapper = mount(ResultsCta, { global: { stubs: FORM_STUBS } })
    expect(wrapper.get('aside').attributes('aria-label')).toBe('business.cta.footer')
    expect(wrapper.get('a').attributes('href')).toBe('/business')
    expect(wrapper.get('a').text()).toBe('business.cta.resultsAction')
  })
})
