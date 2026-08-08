import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enrichI18nField } from '../../server/utils/translate'

function mockDeepl(translateFn: (targetLang: string) => string) {
  global.fetch = vi.fn(async (_url, init) => {
    const body = JSON.parse((init as RequestInit).body as string) as { target_lang: string }
    return {
      ok: true,
      json: async () => ({ translations: [{ text: translateFn(body.target_lang) }] }),
    } as Response
  }) as unknown as typeof fetch
}

describe('enrichI18nField', () => {
  beforeEach(() => {
    mockDeepl((lang) => `[${lang}] translated`)
  })

  afterEach(() => vi.restoreAllMocks())

  it('fills only empty locales when there is no previous value (create flow)', async () => {
    const result = await enrichI18nField({ es: 'Parque Centenario' }, 'api-key')

    expect(result.es).toBe('Parque Centenario')
    expect(result.he).toBe('[HE] translated')
    expect(result.en).toBe('[EN-US] translated')
    expect(result.ru).toBe('[RU] translated')
  })

  it('does not retranslate already-filled locales when nothing changed', async () => {
    const existing = { es: 'Parque Centenario', he: 'x', en: 'y', ru: 'z' }
    const result = await enrichI18nField(existing, 'api-key', existing)

    expect(result).toEqual(existing)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('propagates an edit in one locale to the others (edit flow)', async () => {
    const previous = {
      es: 'Parque Centenario',
      he: 'פארק המאה',
      en: 'Centenario Park',
      ru: 'Парк Сентенарио',
    }
    const edited = { ...previous, es: 'Parque Central Nuevo' }

    const result = await enrichI18nField(edited, 'api-key', previous)

    // The manually edited locale is preserved as-is
    expect(result.es).toBe('Parque Central Nuevo')
    // Every other locale gets retranslated from the new Spanish text — not left stale
    expect(result.he).toBe('[HE] translated')
    expect(result.en).toBe('[EN-US] translated')
    expect(result.ru).toBe('[RU] translated')
  })

  it('preserves multiple manually-edited locales in the same save', async () => {
    const previous = {
      es: 'Parque Centenario',
      he: 'פארק המאה',
      en: 'Centenario Park',
      ru: 'Парк Сентенарио',
    }
    const edited = { ...previous, es: 'Parque Central Nuevo', en: 'New Central Park' }

    const result = await enrichI18nField(edited, 'api-key', previous)

    expect(result.es).toBe('Parque Central Nuevo')
    expect(result.en).toBe('New Central Park')
    // Only the untouched locales get overwritten
    expect(result.he).toBe('[HE] translated')
    expect(result.ru).toBe('[RU] translated')
  })

  it('returns existing unchanged when the source text is blank', async () => {
    const result = await enrichI18nField({ es: '', he: '' }, 'api-key')
    expect(result).toEqual({ es: '', he: '' })
    expect(fetch).not.toHaveBeenCalled()
  })
})
