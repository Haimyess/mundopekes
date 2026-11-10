import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('../../node_modules/nuxt/dist/app/composables/router.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  navigateTo: mockNavigate,
  useRoute: () => ({ path: '/', query: {} }),
  useRouter: () => ({
    resolve: (location: { path: string; query: Record<string, string> }) => ({
      fullPath: `${location.path}?${new URLSearchParams(location.query).toString()}`,
    }),
  }),
}))

const { provideSearchDraft, useSearchState } = await import('~/app/composables/useSearchState')
const { useSearchSheet } = await import('~/app/composables/useSearchSheet')

describe('search draft', () => {
  it('lets sheets below the provider edit the draft instead of navigating', async () => {
    let draft: ReturnType<typeof provideSearchDraft> | undefined
    let sheet: ReturnType<typeof useSearchSheet<string | undefined>> | undefined
    let searchState: ReturnType<typeof useSearchState> | undefined
    const isOpen = ref(true)

    const Child = defineComponent({
      setup() {
        searchState = useSearchState()
        sheet = useSearchSheet(isOpen, (state) => state.q)
        return () => h('span')
      },
    })
    mount(
      defineComponent({
        setup() {
          draft = provideSearchDraft({ free: true })
          return () => h(Child)
        },
      })
    )

    expect(searchState?.isSearchPage.value).toBe(false)
    expect(searchState?.state.value).toEqual({ free: true })
    await sheet?.apply({ q: 'museo' })
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(isOpen.value).toBe(false)
    expect(draft?.state.value).toEqual({ free: true, q: 'museo', page: undefined })
    expect(searchState?.linkTo({ category: 'parques' })).toBe(
      '/search?q=museo&category=parques&free=true'
    )
  })
})
