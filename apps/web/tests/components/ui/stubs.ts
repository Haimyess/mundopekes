import { defineComponent, h } from 'vue'

export const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: { to: { type: String, required: true } },
  setup(props, { slots, attrs }) {
    return () => h('a', { ...attrs, href: props.to }, slots.default?.())
  },
})

export const UIconStub = defineComponent({
  name: 'UIcon',
  props: { name: { type: String, required: true } },
  setup(props, { attrs }) {
    return () => h('span', { ...attrs, 'data-icon': props.name })
  },
})

export const NuxtImgStub = defineComponent({
  name: 'NuxtImg',
  props: { src: { type: String, required: true } },
  setup(props, { attrs }) {
    return () => h('img', { ...attrs, src: props.src })
  },
})
