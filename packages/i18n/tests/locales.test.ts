import { describe, expect, it } from 'vitest'
import commonEn from '../locales/common/en.json'
import commonEs from '../locales/common/es.json'
import commonHe from '../locales/common/he.json'
import commonRu from '../locales/common/ru.json'
import {
  CONTENT_LOCALES,
  CONTENT_LOCALE_META,
  SOURCE_LOCALE,
  isContentLocale,
  isRtlLocale,
} from '../src'
import type { ContentLocale } from '../src'

type Catalog = { [key: string]: string | Catalog }

const CATALOGS: Record<string, Record<ContentLocale, Catalog>> = {
  common: { en: commonEn, es: commonEs, he: commonHe, ru: commonRu },
}

const flattenKeys = (catalog: Catalog, prefix = ''): string[] =>
  Object.entries(catalog).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flattenKeys(value, `${prefix}${key}.`)
  )

const readCatalog = (namespace: string, locale: ContentLocale): Catalog =>
  CATALOGS[namespace]![locale]

const namespaces = Object.keys(CATALOGS)

describe('content locales', () => {
  it('lists every supported locale once', () => {
    expect([...CONTENT_LOCALES].sort()).toEqual(['en', 'es', 'he', 'ru'])
    expect(new Set(CONTENT_LOCALES).size).toBe(CONTENT_LOCALE_META.length)
  })

  it('uses a supported locale as translation source', () => {
    expect(isContentLocale(SOURCE_LOCALE)).toBe(true)
  })

  it('rejects unsupported values', () => {
    expect(isContentLocale('fr')).toBe(false)
    expect(isContentLocale(undefined)).toBe(false)
  })

  it('marks only hebrew as right-to-left', () => {
    expect(CONTENT_LOCALES.filter(isRtlLocale)).toEqual(['he'])
  })
})

describe.each(namespaces)('catalog namespace %s', (namespace) => {
  const sourceKeys = flattenKeys(readCatalog(namespace, SOURCE_LOCALE)).sort()

  it.each(CONTENT_LOCALES)('has the same keys in %s as in the source locale', (locale) => {
    expect(flattenKeys(readCatalog(namespace, locale)).sort()).toEqual(sourceKeys)
  })

  it.each(CONTENT_LOCALES)('has no empty translations in %s', (locale) => {
    const catalog = readCatalog(namespace, locale)
    const values = flattenKeys(catalog).map((key) =>
      key.split('.').reduce<Catalog | string>((node, part) => (node as Catalog)[part]!, catalog)
    )
    expect(values.every((value) => typeof value === 'string' && value.trim().length > 0)).toBe(true)
  })
})
