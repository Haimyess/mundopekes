import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import UiTextarea from '../../../../../layers/ui/components/ui/Textarea.vue'

let received: Record<string, unknown> = {}

const TextareaStub = defineComponent({
  name: 'UTextarea',
  inheritAttrs: false,
  emits: ['update:modelValue'],
  setup(_, { attrs, emit }) {
    return () => {
      received = { ...attrs }
      return h('textarea', {
        value: attrs.modelValue,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
      })
    }
  },
})

const mountTextarea = (props: Record<string, unknown> = {}) =>
  mount(UiTextarea, { props, global: { stubs: { UTextarea: TextareaStub } } })

describe('UiTextarea', () => {
  it('uses four autoresizing rows by default', () => {
    mountTextarea()
    expect(received).toMatchObject({ rows: 4, modelValue: '' })
    expect(received).toHaveProperty('autoresize')
  })

  it('passes the length limit and placeholder', () => {
    mountTextarea({ maxlength: 500, placeholder: 'Contanos', rows: 6 })
    expect(received).toMatchObject({ maxlength: 500, placeholder: 'Contanos', rows: 6 })
  })

  it('updates the model as the user types', async () => {
    const wrapper = mountTextarea({ modelValue: '' })
    await wrapper.get('textarea').setValue('Tienen cabras')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Tienen cabras']])
  })
})
