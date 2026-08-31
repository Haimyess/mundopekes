import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

const stubs = {
  NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
  NuxtImg: true,
  LayoutLanguageSelector: true,
}

const PwaTopBar = (await import('~/app/components/pwa/PwaTopBar.vue')).default

describe('PwaTopBar', () => {
  it('renders a link to home', () => {
    const wrapper = mount(PwaTopBar, { global: { stubs } })
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/')
  })

  it('renders the language selector', () => {
    const wrapper = mount(PwaTopBar, { global: { stubs } })
    expect(wrapper.find('layout-language-selector-stub').exists()).toBe(true)
  })
})
