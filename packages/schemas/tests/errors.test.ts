import { describe, expect, it } from 'vitest'
import commonEn from '@mundopekes/i18n/locales/common/en.json'
import commonEs from '@mundopekes/i18n/locales/common/es.json'
import commonHe from '@mundopekes/i18n/locales/common/he.json'
import commonRu from '@mundopekes/i18n/locales/common/ru.json'
import { VALIDATION_ERRORS } from '../src'

type Catalog = { [key: string]: string | Catalog }

const CATALOGS: Record<string, Catalog> = {
  en: commonEn,
  es: commonEs,
  he: commonHe,
  ru: commonRu,
}

const resolveKey = (catalog: Catalog, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Catalog | undefined)?.[part], catalog)

describe('validation error keys', () => {
  it.each(Object.entries(CATALOGS))('are all translated in the %s common catalog', (_, catalog) => {
    const missingKeys = Object.values(VALIDATION_ERRORS).filter(
      (key) => typeof resolveKey(catalog, key) !== 'string'
    )
    expect(missingKeys).toEqual([])
  })
})
