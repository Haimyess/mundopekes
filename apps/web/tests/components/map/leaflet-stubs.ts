import { vi } from 'vitest'
import { defineComponent, h, onMounted, ref } from 'vue'

export const moveHandlers: (() => void)[] = []

export const fakeMap = {
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
  on: (_event: string, handler: () => void) => moveHandlers.push(handler),
  getBounds: () => ({
    getSouth: () => 32,
    getWest: () => 34.7,
    getNorth: () => 32.2,
    getEast: () => 34.9,
  }),
}

export const LMap = defineComponent({
  name: 'LMap',
  emits: ['ready'],
  setup(_, { slots, emit }) {
    emit('ready', fakeMap)
    return () => h('div', { 'data-stub': 'LMap' }, slots.default?.())
  },
})

export const LTileLayer = defineComponent({ name: 'LTileLayer', setup: () => () => null })

export const LMarker = defineComponent({
  name: 'LMarker',
  props: {
    latLng: { type: Array, required: true },
    icon: { type: Object, default: null },
    options: { type: Object, default: null },
  },
  emits: ['click', 'mouseover', 'mouseout', 'ready'],
  setup(props, { emit }) {
    const element = ref<HTMLElement>()
    onMounted(() => emit('ready', { getElement: () => element.value }))
    return () =>
      h('button', {
        ref: element,
        'data-stub': 'LMarker',
        'data-icon': JSON.stringify(props.icon),
        title: (props.options as { title: string }).title,
        onClick: () => emit('click'),
        onMouseover: () => emit('mouseover'),
        onMouseout: () => emit('mouseout'),
      })
  },
})
