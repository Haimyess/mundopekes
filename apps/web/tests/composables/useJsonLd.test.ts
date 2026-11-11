import { describe, expect, it, vi } from 'vitest'

const { mockUseHead, runtimeConfig } = vi.hoisted(() => ({
  mockUseHead: vi.fn(),
  runtimeConfig: { public: { i18n: { baseUrl: 'https://mundopekes.com/' } } },
}))

vi.mock('../../node_modules/nuxt/dist/head/runtime/composables.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useHead: mockUseHead,
}))
vi.mock('../../node_modules/nuxt/dist/app/nuxt.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRuntimeConfig: () => runtimeConfig,
}))
vi.mock('../../node_modules/nuxt/dist/app/composables/url.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRequestURL: () => new URL('http://localhost:3000/place/1'),
}))

const { useJsonLd, useSiteUrl } = await import('~/app/composables/useJsonLd')

const headFor = () => (mockUseHead.mock.calls.at(-1)![0] as () => Record<string, unknown>)()

describe('useJsonLd', () => {
  it('adds a keyed, escaped JSON-LD script', () => {
    useJsonLd('place', () => ({ '@type': 'Place', name: '<b>Parque</b>' }))
    const [script] = headFor().script as Record<string, string>[]
    expect(script).toMatchObject({ key: 'jsonld-place', type: 'application/ld+json' })
    expect(script!.innerHTML).toBe('{"@type":"Place","name":"\\u003cb>Parque\\u003c/b>"}')
  })

  it('adds nothing while the data is missing', () => {
    useJsonLd('place', () => null)
    expect(headFor()).toEqual({})
  })
})

describe('useSiteUrl', () => {
  it('uses the configured site URL for absolute links', () => {
    expect(useSiteUrl().absoluteLocaleUrl('/place/1')).toBe('https://mundopekes.com/place/1')
  })

  it('falls back to the request origin when no site URL is configured', () => {
    runtimeConfig.public.i18n.baseUrl = ''
    expect(useSiteUrl().absoluteLocaleUrl('/')).toBe('http://localhost:3000/')
  })
})
