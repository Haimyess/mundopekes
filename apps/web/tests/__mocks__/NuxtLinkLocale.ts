import { defineComponent, h, resolveComponent, type PropType } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useLocalePath } from './i18n-routing'

export default defineComponent({
  name: 'NuxtLinkLocale',
  inheritAttrs: false,
  props: {
    to: { type: [String, Object] as PropType<RouteLocationRaw>, required: true },
    locale: { type: String, default: undefined },
  },
  setup(props, { attrs, slots }) {
    const localePath = useLocalePath()
    return () => h(resolveComponent('NuxtLink'), { ...attrs, to: localePath(props.to) }, slots)
  },
})
