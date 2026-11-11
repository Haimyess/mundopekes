import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { FORM_STUBS } from '../business/form-stubs'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/app/composables/useCategories', () => ({ useCategories: () => ({}) }))

const Header = (await import('~/app/components/Layout/Header.vue')).default

const mountHeader = () =>
  mount(Header, {
    global: {
      stubs: {
        ...FORM_STUBS,
        LayoutLogo: true,
        LayoutLanguageSheet: true,
        LayoutCategoryNav: true,
        UiIcon: true,
      },
    },
  })

describe('LayoutHeader', () => {
  it('starts with a skip link to the main content', () => {
    const skip = mountHeader().findAll('a')[0]!
    expect(skip.attributes('href')).toBe('#main-content')
    expect(skip.text()).toBe('layout.skipToContent')
  })

  it('links home, to search and to the business page', () => {
    const links = mountHeader().findAll('a')
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '#main-content',
      '/',
      '/business',
      '/search',
    ])
    expect(links.find((link) => link.attributes('href') === '/business')!.text()).toBe(
      'business.cta.header'
    )
  })
})
