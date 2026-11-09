import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { UIconStub } from './stubs'
import UiCarousel from '../../../../../layers/ui/components/ui/Carousel.vue'
import UiIcon from '../../../../../layers/ui/components/ui/Icon.vue'

interface Item {
  id: number
  name: string
}

const ITEMS: Item[] = [
  { id: 1, name: 'Parque' },
  { id: 2, name: 'Museo' },
  { id: 3, name: 'Playa' },
]

const mountCarousel = (items: Item[] = ITEMS) =>
  mount(UiCarousel, {
    props: {
      items,
      label: 'Este Shabat',
      previousLabel: 'Anterior',
      nextLabel: 'Siguiente',
      itemKey: (item: Item) => item.id,
      itemWidth: '150px',
    },
    slots: { item: '<template #item="{ item }">{{ item.name }}</template>' },
    global: { stubs: { UIcon: UIconStub }, components: { UiIcon } },
    attachTo: document.body,
  })

const setTrackMetrics = (
  track: HTMLElement,
  metrics: { scrollLeft: number; clientWidth: number; scrollWidth: number }
) => {
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(track, key, { configurable: true, value })
  }
}

describe('UiCarousel', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('is a labelled region with one list item per entry', () => {
    const wrapper = mountCarousel()
    expect(wrapper.find('section').attributes('aria-label')).toBe('Este Shabat')
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Parque', 'Museo', 'Playa'])
  })

  it('labels the navigation buttons', () => {
    const buttons = mountCarousel().findAll('button')
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual([
      'Anterior',
      'Siguiente',
    ])
  })

  it('starts with only the next button enabled, the same on server and client', () => {
    const buttons = mountCarousel().findAll('button')
    expect(buttons[0]!.attributes('disabled')).toBeDefined()
    expect(buttons[1]!.attributes('disabled')).toBeUndefined()
  })

  it('updates the buttons from the scroll position', async () => {
    const wrapper = mountCarousel()
    const track = wrapper.find('ul').element as HTMLElement
    setTrackMetrics(track, { scrollLeft: 300, clientWidth: 300, scrollWidth: 600 })
    await wrapper.find('ul').trigger('scroll')
    await nextTick()
    const buttons = wrapper.findAll('button')
    expect(buttons[0]!.attributes('disabled')).toBeUndefined()
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
  })

  it('scrolls towards the inline end, reversed in right-to-left', async () => {
    const wrapper = mountCarousel()
    const track = wrapper.find('ul').element as HTMLElement
    setTrackMetrics(track, { scrollLeft: 0, clientWidth: 300, scrollWidth: 900 })
    await wrapper.find('ul').trigger('scroll')
    await nextTick()
    const scrollBy = vi.fn()
    track.scrollBy = scrollBy as unknown as typeof track.scrollBy

    await wrapper.findAll('button')[1]!.trigger('click')
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: 270 }))

    document.documentElement.setAttribute('dir', 'rtl')
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -270 }))
  })

  it('disables the next button when everything fits', () => {
    const buttons = mountCarousel([ITEMS[0]!]).findAll('button')
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
  })
})
