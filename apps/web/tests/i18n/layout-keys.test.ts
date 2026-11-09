import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP_DIR = resolve(__dirname, '../../app')
const CATALOG_DIR = resolve(__dirname, '../../../../packages/i18n/locales/web')
const LOCALES = ['es', 'en', 'he', 'ru'] as const

const SOURCES = [
  'components/Layout/Header.vue',
  'components/Layout/CategoryNav.vue',
  'components/Layout/LanguageSheet.vue',
  'components/Layout/Footer.vue',
  'error.vue',
]

type Catalog = { [key: string]: string | Catalog }

const STATIC_KEY_PATTERN = /\bt\(\s*'([\w.]+)'/g
const ERROR_MESSAGE_KEYS = ['errors.notFound', 'errors.gone', 'errors.generic'].flatMap(
  (prefix) => [`${prefix}.title`, `${prefix}.description`]
)

const usedKeys = [
  ...new Set([
    ...SOURCES.flatMap((file) =>
      [...readFileSync(resolve(APP_DIR, file), 'utf8').matchAll(STATIC_KEY_PATTERN)].map(
        ([, key]) => key!
      )
    ),
    ...ERROR_MESSAGE_KEYS,
  ]),
]

const resolveKey = (catalog: Catalog, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node as Catalog | undefined)?.[part], catalog)

describe('layout translations', () => {
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
})
