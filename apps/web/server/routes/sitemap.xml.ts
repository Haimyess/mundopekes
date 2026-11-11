import { CONTENT_LOCALE_META } from '@mundopekes/i18n'
import { getSearchDataset } from '../utils/search-dataset'
import { buildSitemapXml, STATIC_SITEMAP_PATHS, type SitemapEntry } from '../utils/sitemap'

const DEFAULT_LOCALE = 'he'
const CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600'

export default defineEventHandler(async (event) => {
  const baseUrl =
    (useRuntimeConfig(event).public.i18n?.baseUrl as string) || getRequestURL(event).origin
  const dataset = await getSearchDataset(event)

  const entries: SitemapEntry[] = [
    ...STATIC_SITEMAP_PATHS.map((path) => ({ path })),
    ...dataset.categories.map((category) => ({
      path: `/search?category=${encodeURIComponent(category.slug)}`,
    })),
    ...dataset.places.map((place) => ({
      path: `/place/${place.id}`,
      lastModified: place.updated_at ?? place.created_at,
    })),
    ...dataset.activities.map((activity) => ({
      path: `/activity/${activity.id}`,
      lastModified: activity.updated_at ?? activity.created_at,
    })),
  ]

  setResponseHeaders(event, {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': CACHE_CONTROL,
  })
  return buildSitemapXml(entries, {
    baseUrl,
    locales: CONTENT_LOCALE_META.map(({ code }) => code),
    defaultLocale: DEFAULT_LOCALE,
  })
})
