import { describe, expect, it, vi } from 'vitest'

const { route } = vi.hoisted(() => ({
  route: { name: 'search___en', path: '/en/search', query: {} },
}))

vi.mock('../../node_modules/nuxt/dist/app/composables/router.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRoute: () => route,
}))

const { useSearchLink } = await import('~/app/composables/useSearchLink')

describe('useSearchLink', () => {
  it('builds search links with the query', () => {
    const { searchLink, searchLinkFor } = useSearchLink()
    expect(searchLink()).toBe('/search')
    expect(searchLink({ category: 'aire-libre' })).toBe('/search?category=aire-libre')
    expect(searchLinkFor({ free: true, page: 2 })).toBe('/search?free=true&page=2')
  })

  it('recognizes the search page in any language', () => {
    expect(useSearchLink().isOnSearchPage.value).toBe(true)
    route.name = 'place-id___ru'
    expect(useSearchLink().isOnSearchPage.value).toBe(false)
  })
})
