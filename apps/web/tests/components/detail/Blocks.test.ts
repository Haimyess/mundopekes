import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}))

vi.mock('~/app/components/map/Canvas.vue', async () => {
  const { defineComponent: define, h: render } = await import('vue')
  return {
    default: define({
      name: 'MapCanvas',
      props: { pins: { type: Array, required: true }, label: { type: String, required: true } },
      setup: (props) => () =>
        render('div', { 'data-pins': JSON.stringify(props.pins), 'aria-label': props.label }),
    }),
  }
})

const ClientOnlyStub = defineComponent({
  name: 'ClientOnly',
  setup:
    (_, { slots }) =>
    () =>
      slots.default?.(),
})

const Summary = (await import('~/app/components/detail/Summary.vue')).default
const Amenities = (await import('~/app/components/detail/Amenities.vue')).default
const Location = (await import('~/app/components/detail/Location.vue')).default
const Section = (await import('~/app/components/detail/Section.vue')).default
const DetailGallery = (await import('~/app/components/detail/Gallery.vue')).default

describe('DetailSummary', () => {
  it('shows the title as the page heading with ages, price and open state', () => {
    const wrapper = mount(Summary, {
      props: {
        title: 'Parque',
        subtitle: 'Haifa',
        ageSpan: { min: 3, max: 9 },
        price: 35,
        isOpenNow: true,
      },
      global: { stubs: { UiIcon: true } },
    })
    expect(wrapper.find('h1').text()).toBe('Parque')
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
      'results.agesLabel:{"min":3,"max":9}',
      'detail.from:{"price":"₪35"}',
      'detail.openNow',
    ])
  })

  it('says free and closed, and hides unknown facts', () => {
    const wrapper = mount(Summary, {
      props: { title: 'Playa', isFree: true, isOpenNow: false },
      global: { stubs: { UiIcon: true } },
    })
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
      'results.free',
      'detail.closedNow',
    ])
    expect(wrapper.find('.detail-summary__subtitle').exists()).toBe(false)
  })
})

describe('DetailAmenities', () => {
  it('lists amenities and discounts with their labels', () => {
    const wrapper = mount(Amenities, {
      props: { amenities: ['wheelchair', 'kosher'], discounts: ['club'] },
      global: { stubs: { UiIcon: true } },
    })
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
      'results.filters.amenities.wheelchair',
      'results.filters.amenities.kosher',
      'results.filters.discounts.club',
    ])
  })
})

describe('DetailLocation', () => {
  it('shows the address and a single labelled pin', async () => {
    const wrapper = mount(Location, {
      props: {
        name: 'Parque',
        location: { lat: 32.1, lng: 34.8 },
        address: 'Rokach 1',
        cityName: 'Tel Aviv',
      },
      global: { stubs: { UiIcon: true, ClientOnly: ClientOnlyStub } },
    })
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await flushPromises()
    expect(wrapper.find('.detail-location__address').text()).toBe('Rokach 1, Tel Aviv')
    const map = wrapper.find('[data-pins]')
    expect(map.attributes('aria-label')).toBe('detail.mapLabel:{"name":"Parque"}')
    expect(JSON.parse(map.attributes('data-pins')!)).toEqual([
      { id: 'location', lat: 32.1, lng: 34.8, label: 'Parque', title: 'Parque' },
    ])
  })

  it('skips the map without coordinates', () => {
    const wrapper = mount(Location, {
      props: { name: 'Parque', location: null, cityName: 'Haifa' },
      global: { stubs: { UiIcon: true } },
    })
    expect(wrapper.find('.detail-location__map').exists()).toBe(false)
  })
})

describe('DetailSection', () => {
  it('labels the section with its heading', () => {
    const SectionHeaderStub = defineComponent({
      name: 'UiSectionHeader',
      props: {
        title: { type: String, required: true },
        headingId: { type: String, required: true },
      },
      setup: (props) => () => h('h2', { id: props.headingId }, props.title),
    })
    const wrapper = mount(Section, {
      props: { title: 'Horarios' },
      slots: { default: '<p>body</p>' },
      global: { stubs: { UiSectionHeader: SectionHeaderStub } },
    })
    expect(wrapper.find('section').attributes('aria-labelledby')).toBe(
      wrapper.find('h2').attributes('id')
    )
  })
})

describe('DetailGallery', () => {
  it('describes every photo and skips optimization for proxied ones', () => {
    let received: unknown[] = []
    const UiGalleryStub = defineComponent({
      name: 'UiGallery',
      props: { images: { type: Array, required: true }, label: { type: String, required: true } },
      setup(props) {
        return () => {
          received = props.images as unknown[]
          return h('div', { 'aria-label': props.label })
        }
      },
    })
    const wrapper = mount(DetailGallery, {
      props: { images: ['https://x/a.jpg', '/api/places/photo?ref=b'], name: 'Parque' },
      global: { stubs: { UiGallery: UiGalleryStub } },
    })
    expect(wrapper.find('div').attributes('aria-label')).toBe('detail.gallery:{"name":"Parque"}')
    expect(received).toEqual([
      {
        src: 'https://x/a.jpg',
        alt: 'detail.photoAlt:{"name":"Parque","number":1}',
        isOptimized: true,
      },
      {
        src: '/api/places/photo?ref=b',
        alt: 'detail.photoAlt:{"name":"Parque","number":2}',
        isOptimized: false,
      },
    ])
  })
})
