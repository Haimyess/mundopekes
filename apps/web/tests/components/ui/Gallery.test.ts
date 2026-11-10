import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { NuxtImgStub, UIconStub } from './stubs'
import UiGallery from '../../../../../layers/ui/components/ui/Gallery.vue'
import UiIcon from '../../../../../layers/ui/components/ui/Icon.vue'

let carouselProps: Record<string, unknown> = {}
const UCarouselStub = defineComponent({
  name: 'UCarousel',
  inheritAttrs: false,
  props: { items: { type: Array, required: true }, arrows: Boolean, dots: Boolean },
  setup(props, { slots, attrs }) {
    return () => {
      carouselProps = { ...props, ...attrs }
      return h(
        'div',
        { 'data-stub': 'carousel', 'aria-label': attrs['aria-label'] },
        (props.items as unknown[]).map((item, index) => slots.default?.({ item, index }))
      )
    }
  },
})

const mountGallery = (images: { src: string; alt: string; isOptimized?: boolean }[]) =>
  mount(UiGallery, {
    props: { images, label: 'Fotos del parque' },
    global: {
      stubs: { UCarousel: UCarouselStub, NuxtImg: NuxtImgStub, UIcon: UIconStub },
      components: { UiIcon },
    },
  })

describe('UiGallery', () => {
  it('labels the carousel and shows controls only when there are several photos', () => {
    mountGallery([{ src: '/a.jpg', alt: 'A' }])
    expect(carouselProps).toMatchObject({
      'aria-label': 'Fotos del parque',
      arrows: false,
      dots: false,
    })
    mountGallery([
      { src: '/a.jpg', alt: 'A' },
      { src: '/b.jpg', alt: 'B' },
    ])
    expect(carouselProps).toMatchObject({ arrows: true, dots: true })
  })

  it('loads the first photo eagerly and uses plain images when optimization is off', () => {
    const images = mountGallery([
      { src: '/a.jpg', alt: 'A' },
      { src: '/api/photo?ref=b', alt: 'B', isOptimized: false },
    ]).findAll('img')
    expect(images.map((image) => [image.attributes('alt'), image.attributes('loading')])).toEqual([
      ['A', 'eager'],
      ['B', 'lazy'],
    ])
    expect(images[1]!.attributes('decoding')).toBe('async')
  })

  it('shows a labelled placeholder without photos', () => {
    const placeholder = mountGallery([]).find('.ui-gallery__placeholder')
    expect(placeholder.attributes()).toMatchObject({
      role: 'img',
      'aria-label': 'Fotos del parque',
    })
  })
})
