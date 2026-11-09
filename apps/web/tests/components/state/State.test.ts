import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import StateEmpty from '~/app/components/state/Empty.vue'
import StateError from '~/app/components/state/Error.vue'

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: { name: { type: String, required: true } },
  setup: (props) => () => h('span', { 'data-icon': props.name }),
})
const UiButtonStub = defineComponent({
  name: 'UiButton',
  emits: ['click'],
  setup:
    (_, { slots, emit }) =>
    () =>
      h('button', { type: 'button', onClick: () => emit('click') }, slots.default?.()),
})

const global = { stubs: { UiIcon: UiIconStub, UiButton: UiButtonStub } }

describe('StateEmpty', () => {
  it('announces the empty state politely with its title and description', () => {
    const wrapper = mount(StateEmpty, {
      props: { title: 'Sin resultados', description: 'Prueba quitar un filtro' },
      global,
    })
    expect(wrapper.find('[role="status"] h2').text()).toBe('Sin resultados')
    expect(wrapper.text()).toContain('Prueba quitar un filtro')
  })

  it('renders suggested actions', () => {
    const wrapper = mount(StateEmpty, {
      props: { title: 'x' },
      slots: { default: '<button type="button">Borrar filtros</button>' },
      global,
    })
    expect(wrapper.find('.state-empty__actions button').text()).toBe('Borrar filtros')
  })
})

describe('StateError', () => {
  it('is announced as an alert', () => {
    const wrapper = mount(StateError, { props: { title: 'Algo salió mal' }, global })
    expect(wrapper.find('[role="alert"] h2').text()).toBe('Algo salió mal')
  })

  it('offers retry only when labelled and emits it', async () => {
    expect(
      mount(StateError, { props: { title: 'x' }, global })
        .find('button')
        .exists()
    ).toBe(false)
    const wrapper = mount(StateError, { props: { title: 'x', retryLabel: 'Reintentar' }, global })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
