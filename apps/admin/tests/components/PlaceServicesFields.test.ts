import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const UiCheckboxStub = defineComponent({
  name: 'UiCheckbox',
  props: { modelValue: Boolean, label: { type: String, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('label', [
        h('input', {
          type: 'checkbox',
          checked: props.modelValue,
          onChange: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLInputElement).checked),
        }),
        props.label,
      ])
  },
})

const PlaceServicesFields = (await import('~/components/places/PlaceServicesFields.vue')).default

function mountFields(metadata: Record<string, unknown>) {
  return mount(PlaceServicesFields, {
    props: { modelValue: metadata },
    global: { stubs: { UiCheckbox: UiCheckboxStub } },
  })
}

const checkbox = (wrapper: ReturnType<typeof mountFields>, label: string) =>
  wrapper
    .findAll('label')
    .find((element) => element.text() === label)!
    .find('input')

describe('PlaceServicesFields', () => {
  it('reflects the metadata flags and discounts', () => {
    const wrapper = mountFields({ has_parking: true, discounts: ['club', 'bogus'] })
    expect(
      (checkbox(wrapper, 'placeServices.amenities.parking').element as HTMLInputElement).checked
    ).toBe(true)
    expect(
      (checkbox(wrapper, 'placeServices.amenities.kosher').element as HTMLInputElement).checked
    ).toBe(false)
    expect(
      (checkbox(wrapper, 'placeServices.discounts.club').element as HTMLInputElement).checked
    ).toBe(true)
  })

  it('writes the flag under the metadata key the search reads, keeping other metadata', async () => {
    const wrapper = mountFields({ address: 'Herzl 1' })
    await checkbox(wrapper, 'placeServices.amenities.changing-table').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      { address: 'Herzl 1', has_changing_table: true },
    ])
  })

  it('keeps discounts in canonical order and removes them when unchecked', async () => {
    const wrapper = mountFields({ discounts: ['last-minute'] })
    await checkbox(wrapper, 'placeServices.discounts.club').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      { discounts: ['club', 'last-minute'] },
    ])
    await wrapper.setProps({ modelValue: { discounts: ['club', 'last-minute'] } })
    await checkbox(wrapper, 'placeServices.discounts.last-minute').setValue(false)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ discounts: ['club'] }])
  })
})
