import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRobotsTxt, buildSitemapXml, localizedPath } from '../../server/utils/sitemap'

const OPTIONS = { baseUrl: 'https://mundopekes.com/', locales: ['he', 'en'], defaultLocale: 'he' }

describe('localizedPath', () => {
  it('keeps Hebrew without a prefix and prefixes the other languages', () => {
    expect(localizedPath('/place/1', 'he', 'he')).toBe('/place/1')
    expect(localizedPath('/place/1', 'en', 'he')).toBe('/en/place/1')
    expect(localizedPath('/', 'ru', 'he')).toBe('/ru')
  })
})

describe('buildSitemapXml', () => {
  const xml = buildSitemapXml(
    [{ path: '/search?category=a&b', lastModified: '2026-11-10T08:00:00Z' }, { path: '/' }],
    OPTIONS
  )

  it('lists every page once per language with hreflang alternates and x-default', () => {
    expect(xml.match(/<url>/g)).toHaveLength(4)
    expect(xml).toContain('<loc>https://mundopekes.com/en</loc>')
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://mundopekes.com/"/>'
    )
  })

  it('escapes query strings and keeps only the day of the last change', () => {
    expect(xml).toContain('<loc>https://mundopekes.com/search?category=a&amp;b</loc>')
    expect(xml).toContain('<lastmod>2026-11-10</lastmod>')
    expect(xml).not.toContain('a&b')
  })

  it('skips invalid modification dates', () => {
    expect(buildSitemapXml([{ path: '/', lastModified: 'nope' }], OPTIONS)).not.toContain(
      '<lastmod>'
    )
  })
})

describe('buildRobotsTxt', () => {
  it('points crawlers to the sitemap and keeps them out of the API', () => {
    const robots = buildRobotsTxt('https://mundopekes.com/')
    expect(robots).toContain('Disallow: /api/')
    expect(robots).toContain('Sitemap: https://mundopekes.com/sitemap.xml')
  })

  it('blocks crawling when the public site URL is not configured', () => {
    expect(buildRobotsTxt('')).toBe('User-agent: *\nDisallow: /\n')
  })
})

describe('sitemap route', () => {
  const headers: Record<string, string> = {}

  beforeEach(() => {
    vi.resetModules()
  })

  it('includes static pages, categories, places and activities', async () => {
    vi.doMock('../../server/utils/search-dataset', () => ({
      getSearchDataset: async () => ({
        categories: [{ slug: 'aire-libre' }],
        places: [{ id: 'p1', updated_at: '2026-11-01', created_at: '2026-10-01' }],
        activities: [{ id: 'a1', updated_at: null, created_at: '2026-10-02' }],
      }),
    }))
    const h3 = await import('h3')
    vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
    vi.doMock('../../node_modules/nuxt/dist/app/nuxt.js', async (importOriginal) => ({
      ...(await importOriginal<Record<string, unknown>>()),
      useRuntimeConfig: () => ({ public: { i18n: { baseUrl: 'https://mundopekes.com' } } }),
    }))
    vi.stubGlobal('getRequestURL', () => new URL('http://localhost'))
    vi.stubGlobal('setResponseHeaders', (_event: unknown, values: Record<string, string>) =>
      Object.assign(headers, values)
    )
    const { default: handler } = await import('../../server/routes/sitemap.xml')
    const xml = (await handler({} as never)) as string
    expect(headers['content-type']).toContain('application/xml')
    expect(xml).toContain('<loc>https://mundopekes.com/search?category=aire-libre</loc>')
    expect(xml).toContain('<loc>https://mundopekes.com/es/place/p1</loc>')
    expect(xml).toContain('<loc>https://mundopekes.com/ru/activity/a1</loc>')
    expect(xml).toContain('<loc>https://mundopekes.com/en/business</loc>')
  })
})
