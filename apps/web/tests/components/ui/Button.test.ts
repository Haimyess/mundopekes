import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { NuxtLinkStub, UIconStub } from './stubs'
import UiButton from '../../../../../layers/ui/components/ui/Button.vue'
import UiIcon from '../../../../../layers/ui/components/ui/Icon.vue'

const mountButton = (props: Record<string, unknown> = {}, label = 'Ver qué hacer') =>
  mount(UiButton, {
    props,
    slots: { default: label },
    global: { stubs: { NuxtLink: NuxtLinkStub, UIcon: UIconStub }, components: { UiIcon } },
  })

describe('UiButton', () => {
  it('renders a non-submitting button by default', () => {
    const button = mountButton().find('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toEqual(
      expect.arrayContaining(['ui-button--primary', 'ui-button--md'])
    )
    expect(button.text()).toBe('Ver qué hacer')
  })

  it('can submit forms', () => {
    expect(mountButton({ type: 'submit' }).find('button').attributes('type')).toBe('submit')
  })

  it('emits click when active', async () => {
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it.each([{ disabled: true }, { loading: true }])('does not emit click when %o', async (props) => {
    const wrapper = mountButton(props)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('announces the loading state', () => {
    const button = mountButton({ loading: true }).find('button')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.find('.ui-button__spinner').exists()).toBe(true)
  })

  it('renders as a link when it has a destination', () => {
    const link = mountButton({ to: '/search', variant: 'secondary' }).find('a')
    expect(link.attributes('href')).toBe('/search')
    expect(link.classes()).toContain('ui-button--secondary')
  })

  it('falls back to a disabled button instead of a dead link', () => {
    const wrapper = mountButton({ to: '/search', disabled: true })
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('renders leading and trailing icons hidden from assistive technology', () => {
    const icons = mountButton({
      icon: 'i-hugeicons-search-01',
      iconRight: 'i-hugeicons-arrow-right-01',
    }).findAll('[data-icon]')
    expect(icons.map((icon) => icon.attributes('data-icon'))).toEqual([
      'i-hugeicons-search-01',
      'i-hugeicons-arrow-right-01',
    ])
    expect(icons.every((icon) => icon.attributes('aria-hidden') === 'true')).toBe(true)
  })
})
