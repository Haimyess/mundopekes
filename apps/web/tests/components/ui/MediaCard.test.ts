import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { NuxtImgStub, NuxtLinkStub, UIconStub } from './stubs'
import UiMediaCard from '../../../../../layers/ui/components/ui/MediaCard.vue'
import UiIcon from '../../../../../layers/ui/components/ui/Icon.vue'

const mountCard = (props: Record<string, unknown>, slots: Record<string, string> = {}) =>
  mount(UiMediaCard, {
    props,
    slots,
    global: {
      stubs: { NuxtLink: NuxtLinkStub, UIcon: UIconStub, NuxtImg: NuxtImgStub },
      components: { UiIcon },
    },
  })

describe('UiMediaCard', () => {
  it('renders the title as a heading inside an article', () => {
    const wrapper = mountCard({ title: 'Museo de la Ciencia' })
    expect(wrapper.find('article h3').text()).toBe('Museo de la Ciencia')
  })

  it('links the whole card through the title only', () => {
    const links = mountCard({ title: 'Museo', to: '/place/1' }).findAll('a')
    expect(links).toHaveLength(1)
    expect(links[0]!.attributes('href')).toBe('/place/1')
    expect(links[0]!.text()).toBe('Museo')
  })

  it('uses the title as image alt text unless another is given', () => {
    expect(mountCard({ title: 'Museo', imageSrc: '/a.jpg' }).find('img').attributes('alt')).toBe(
      'Museo'
    )
    expect(
      mountCard({ title: 'Museo', imageSrc: '/a.jpg', imageAlt: 'Fachada' })
        .find('img')
        .attributes('alt')
    ).toBe('Fachada')
  })

  it('lazy loads images unless marked eager', () => {
    expect(mountCard({ title: 'x', imageSrc: '/a.jpg' }).find('img').attributes('loading')).toBe(
      'lazy'
    )
    expect(
      mountCard({ title: 'x', imageSrc: '/a.jpg', isEager: true }).find('img').attributes('loading')
    ).toBe('eager')
  })

  it('shows a placeholder when there is no image', () => {
    const wrapper = mountCard({ title: 'x', imageSrc: null })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.ui-media-card__placeholder [data-icon]').exists()).toBe(true)
  })

  it('keeps the favourite action outside the title link', () => {
    const wrapper = mountCard(
      { title: 'Museo', to: '/place/1' },
      { action: '<button type="button">Guardar</button>', badge: '<span>3–6</span>' }
    )
    expect(wrapper.find('a button').exists()).toBe(false)
    expect(wrapper.find('.ui-media-card__action button').exists()).toBe(true)
    expect(wrapper.find('.ui-media-card__badge').text()).toBe('3–6')
  })

  it('applies the aspect ratio to the media area', () => {
    const media = mountCard({ title: 'x', aspectRatio: '1/1' }).find('.ui-media-card__media')
    expect(media.attributes('style')).toMatch(/aspect-ratio: 1 ?\/ ?1/)
  })
})
