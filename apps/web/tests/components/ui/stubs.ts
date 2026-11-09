import { defineComponent, h } from 'vue'

export const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: { to: { type: String, required: true }, custom: { type: Boolean, default: false } },
  setup(props, { slots, attrs }) {
    return () =>
      props.custom
        ? slots.default?.({ href: props.to, navigate: () => undefined })
        : h('a', { ...attrs, href: props.to }, slots.default?.())
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

export const recordingStub = (name: string, slotNames: string[] = ['default']) => {
  const received: Record<string, unknown>[] = []
  const component = defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      received.push({ ...attrs })
      return () =>
        h(
          'div',
          { 'data-stub': name },
          slotNames.map((slot) =>
            h('div', { 'data-slot': slot }, slots[slot]?.({ item: attrs.items, day: undefined }))
          )
        )
    },
  })
  return { component, received }
}
