import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SEARCH_AMENITIES,
  SEARCH_DISCOUNTS,
  SEARCH_KINDS,
  SEARCH_PRICE_BANDS,
  SEARCH_SORTS,
  WHEN_SHORTCUTS,
} from '@mundopekes/core'

const APP_DIR = resolve(__dirname, '../../app')
const CATALOG_DIR = resolve(__dirname, '../../../../packages/i18n/locales/web')
const LOCALES = ['es', 'en', 'he', 'ru'] as const

const SOURCES = [
  'components/Layout/Header.vue',
  'components/Layout/CategoryNav.vue',
  'components/Layout/LanguageSheet.vue',
  'components/Layout/Footer.vue',
  'error.vue',
  'pages/search.vue',
  'components/search/ResultsHeader.vue',
  'components/search/Toolbar.vue',
  'components/search/SheetFooter.vue',
  'components/search/WhenSheet.vue',
  'components/search/WhoSheet.vue',
  'components/search/FiltersSheet.vue',
  'components/search/SortSheet.vue',
  'components/search/WhereSheet.vue',
  'components/search/Map.vue',
  'composables/useSearchLabels.ts',
  'components/search/ResultCard.vue',
  'components/search/ResultList.vue',
  'components/search/Pagination.vue',
]

type Catalog = { [key: string]: string | Catalog }

const STATIC_KEY_PATTERN = /\bt\(\s*'([\w.]+)'/g
const ERROR_MESSAGE_KEYS = ['errors.notFound', 'errors.gone', 'errors.generic'].flatMap(
  (prefix) => [`${prefix}.title`, `${prefix}.description`]
)
const DYNAMIC_KEYS = [
  ...WHEN_SHORTCUTS.map((shortcut) => `results.when.${shortcut}`),
  ...SEARCH_KINDS.map((kind) => `results.filters.kinds.${kind}`),
  ...SEARCH_AMENITIES.map((amenity) => `results.filters.amenities.${amenity}`),
  ...SEARCH_SORTS.map((sort) => `results.sort.${sort}`),
  ...SEARCH_DISCOUNTS.map((discount) => `results.filters.discounts.${discount}`),
  ...SEARCH_PRICE_BANDS.map((band) => `results.filters.priceBands.${band}`),
  ...['unsupported', 'denied', 'unavailable'].map((error) => `results.where.errors.${error}`),
  ...SEARCH_KINDS.map((kind) => `results.kind.${kind}`),
]

const usedKeys = [
  ...new Set([
    ...SOURCES.flatMap((file) =>
      [...readFileSync(resolve(APP_DIR, file), 'utf8').matchAll(STATIC_KEY_PATTERN)].map(
        ([, key]) => key!
      )
    ),
    ...ERROR_MESSAGE_KEYS,
    ...DYNAMIC_KEYS,
  ]),
]

const resolveKey = (catalog: Catalog, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node as Catalog | undefined)?.[part], catalog)

describe('layout and search translations', () => {
  it('finds the keys used by the layout', () => {
    expect(usedKeys.length).toBeGreaterThan(20)
  })

  it.each(LOCALES)('defines every layout key in %s', (locale) => {
    const catalog = JSON.parse(
      readFileSync(resolve(CATALOG_DIR, `${locale}.json`), 'utf8')
    ) as Catalog
    const missing = usedKeys.filter((key) => typeof resolveKey(catalog, key) !== 'string')
    expect(missing).toEqual([])
  })

  it('gives Russian plurals the four forms of its plural rule', () => {
    const catalog = JSON.parse(readFileSync(resolve(CATALOG_DIR, 'ru.json'), 'utf8')) as Catalog
    for (const key of [
      'results.count',
      'results.activityCount',
      'results.filters.matches',
      'results.filters.show',
      'results.whoSheet.years',
    ]) {
      expect(String(resolveKey(catalog, key)).split('|')).toHaveLength(4)
    }
  })
})
