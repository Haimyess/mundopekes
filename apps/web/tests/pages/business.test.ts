import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { FORM_STUBS } from '../components/business/form-stubs'

const { mockSeoMeta } = vi.hoisted(() => ({ mockSeoMeta: vi.fn() }))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('../../node_modules/nuxt/dist/head/runtime/composables.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useSeoMeta: mockSeoMeta,
}))

const BusinessPage = (await import('~/app/pages/business.vue')).default

const mountPage = () =>
  mount(BusinessPage, {
    global: {
      stubs: {
        ...FORM_STUBS,
        UiIcon: true,
        BusinessJoinForm: defineComponent({
          name: 'BusinessJoinForm',
          setup: () => () => h('section', { 'data-join': '' }),
        }),
      },
    },
  })

describe('business page', () => {
  it('has one h1 and labelled sections for benefits, plans and claims', () => {
    const wrapper = mountPage()
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('h1').text()).toBe('business.hero.title')
    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual([
      'business.benefitsTitle',
      'business.soon.title',
      'business.claim.title',
    ])
    expect(wrapper.findAll('li')).toHaveLength(3)
  })

  it('sends businesses that are already listed to search to find their page', () => {
    expect(mountPage().get('a[href="/search"]').text()).toContain('business.claim.action')
  })

  it('sets a translated title and description for search engines', () => {
    mountPage()
    const meta = mockSeoMeta.mock.calls.at(-1)![0]
    expect(meta.title()).toBe('business.seo.title')
    expect(meta.description()).toBe('business.seo.description')
    expect(meta.ogTitle()).toBe('business.seo.title')
  })

  it('includes the join form', () => {
    expect(mountPage().find('[data-join]').exists()).toBe(true)
  })
})
