import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { NuxtLinkStub } from '../ui/stubs'
import QueryLink from '~/app/components/search/QueryLink.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: unknown) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}))
vi.mock('~/app/composables/useSearchState', () => ({
  useSearchState: () => ({
    linkTo: (patch: { page: number }) => `/search?category=parques&page=${patch.page}`,
  }),
}))

const Pagination = (await import('~/app/components/search/Pagination.vue')).default

const mountPagination = (page: number, pageCount: number) =>
  mount(Pagination, {
    props: { page, pageCount },
    global: {
      stubs: { NuxtLink: NuxtLinkStub, UiIcon: true },
      components: { SearchQueryLink: QueryLink },
    },
  })

describe('SearchPagination', () => {
  it('renders nothing for a single page', () => {
    expect(mountPagination(1, 1).find('nav').exists()).toBe(false)
  })

  it('links to the previous and next pages keeping the filters', () => {
    const links = mountPagination(2, 3).findAll('a')
    expect(links.map((link) => [link.attributes('rel'), link.attributes('href')])).toEqual([
      ['prev', '/search?category=parques&page=1'],
      ['next', '/search?category=parques&page=3'],
    ])
  })

  it('hides the links that do not apply and labels the navigation', () => {
    const wrapper = mountPagination(1, 2)
    expect(wrapper.find('nav').attributes('aria-label')).toBe('results.pagination.label')
    expect(wrapper.findAll('a').map((link) => link.attributes('rel'))).toEqual(['next'])
    expect(wrapper.find('[aria-current="page"]').text()).toBe(
      'results.pagination.status:{"page":1,"pageCount":2}'
    )
  })
})
