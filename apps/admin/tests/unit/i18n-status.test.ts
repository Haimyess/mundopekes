import { describe, it, expect } from 'vitest'
import { summarizeI18nStatus } from '../../../../layers/domain/utils/i18n-status'

const LOCALES = ['es', 'en', 'ru', 'he']

describe('summarizeI18nStatus', () => {
  it('returns unknown when i18n_status is missing entirely', () => {
    expect(summarizeI18nStatus(null, ['name'], LOCALES)).toEqual({
      state: 'unknown',
      missingLocales: [],
    })
    expect(summarizeI18nStatus(undefined, ['name'], LOCALES)).toEqual({
      state: 'unknown',
      missingLocales: [],
    })
  })

  it('returns unknown when the requested field has no entry at all', () => {
    const status = {
      description: { sourceLocale: 'en', en: { status: 'manual' as const, updatedAt: 't' } },
    }
    expect(summarizeI18nStatus(status, ['name'], LOCALES)).toEqual({
      state: 'unknown',
      missingLocales: [],
    })
  })

  it('returns complete when every configured locale is manual/auto for all requested fields', () => {
    const entry = { status: 'auto' as const, updatedAt: 't' }
    const status = {
      name: {
        sourceLocale: 'en',
        es: entry,
        en: { status: 'manual' as const, updatedAt: 't' },
        ru: entry,
        he: entry,
      },
    }
    expect(summarizeI18nStatus(status, ['name'], LOCALES)).toEqual({
      state: 'complete',
      missingLocales: [],
    })
  })

  it('flags locales with no entry as missing', () => {
    const entry = { status: 'auto' as const, updatedAt: 't' }
    const status = {
      name: { sourceLocale: 'en', en: { status: 'manual' as const, updatedAt: 't' }, es: entry },
      // ru/he never attempted for 'name'
    }
    const result = summarizeI18nStatus(status, ['name'], LOCALES)
    expect(result.state).toBe('partial')
    expect(result.missingLocales).toEqual(['ru', 'he'])
  })

  it('flags locales with status:error as missing, even though an entry exists', () => {
    const status = {
      name: {
        sourceLocale: 'en',
        en: { status: 'manual' as const, updatedAt: 't' },
        es: { status: 'auto' as const, updatedAt: 't' },
        ru: { status: 'error' as const, updatedAt: 't', error: 'timeout' },
        he: { status: 'auto' as const, updatedAt: 't' },
      },
    }
    const result = summarizeI18nStatus(status, ['name'], LOCALES)
    expect(result.state).toBe('partial')
    expect(result.missingLocales).toEqual(['ru'])
  })

  it('checking multiple fields (name + description) unions the missing locales', () => {
    const ok = { status: 'auto' as const, updatedAt: 't' }
    const status = {
      name: { sourceLocale: 'en', en: ok, es: ok, ru: ok, he: ok },
      description: { sourceLocale: 'en', en: ok, es: ok }, // ru/he missing here
    }
    const result = summarizeI18nStatus(status, ['name', 'description'], LOCALES)
    expect(result.state).toBe('partial')
    expect(result.missingLocales).toEqual(['ru', 'he'])
  })
})
