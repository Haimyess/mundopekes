import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { NuxtLinkStub } from '../ui/stubs'

const QueryLink = (await import('~/app/components/search/QueryLink.vue')).default

describe('SearchQueryLink', () => {
  it('renders a plain link with its attributes and never marks itself as current', () => {
    const link = mount(QueryLink, {
      props: { to: '/search?page=2' },
      attrs: { rel: 'next', class: 'pager' },
      slots: { default: 'Siguiente' },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    }).find('a')
    expect(link.attributes()).toMatchObject({ href: '/search?page=2', rel: 'next', class: 'pager' })
    expect(link.attributes('aria-current')).toBeUndefined()
    expect(link.text()).toBe('Siguiente')
  })
})
