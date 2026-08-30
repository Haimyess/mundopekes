import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  enrichI18nField,
  translateI18nField,
  translateSingleFieldInput,
} from '../../server/utils/translate'

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

describe('translateI18nField (status tracking)', () => {
  beforeEach(() => {
    mockDeepl((lang) => `[${lang}] translated`)
  })

  afterEach(() => vi.restoreAllMocks())

  it('marks the source locale manual and filled targets auto on create', async () => {
    const { status } = await translateI18nField({
      existing: { es: 'Parque Centenario' },
      apiKey: 'api-key',
    })

    expect(status?.sourceLocale).toBe('es')
    expect(status?.es).toEqual({ status: 'manual', updatedAt: expect.any(String) })
    expect(status?.en).toMatchObject({ status: 'auto' })
    expect(status?.he).toMatchObject({ status: 'auto' })
    expect(status?.ru).toMatchObject({ status: 'auto' })
  })

  it('marks only the changed locale manual on edit, others auto', async () => {
    const previous = { es: 'Parque Centenario', he: 'x', en: 'y', ru: 'z' }
    const edited = { ...previous, es: 'Parque Central Nuevo' }

    const { status } = await translateI18nField({ existing: edited, apiKey: 'api-key', previous })

    expect(status?.es).toMatchObject({ status: 'manual' })
    expect(status?.he).toMatchObject({ status: 'auto' })
    expect(status?.en).toMatchObject({ status: 'auto' })
    expect(status?.ru).toMatchObject({ status: 'auto' })
  })

  it('records error status and keeps prior text when the provider fails for a locale', async () => {
    global.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string) as { target_lang: string }
      if (body.target_lang === 'RU') {
        return { ok: false, status: 456, text: async () => 'quota exceeded' } as Response
      }
      return {
        ok: true,
        json: async () => ({ translations: [{ text: `[${body.target_lang}] translated` }] }),
      } as Response
    }) as unknown as typeof fetch

    const { value, status } = await translateI18nField({
      existing: { es: 'Parque Centenario' },
      apiKey: 'api-key',
    })

    expect(value.ru).toBeUndefined() // never blanked — just never filled
    expect(status?.ru).toMatchObject({ status: 'error' })
    expect(status?.en).toMatchObject({ status: 'auto' })
  })

  it('does not overwrite a locale protected as manual from a previous save, even when unrelated to the current edit', async () => {
    // Simulates: an admin hand-edited Spanish last week (marked 'manual' in
    // priorStatus). Today, someone edits English only — Spanish never
    // changes in this save, but without the manual-protection policy it
    // would still get silently retranslated from the new English text.
    const previous = { en: 'Old name', es: 'Nombre a mano', he: 'x', ru: 'y' }
    const edited = { ...previous, en: 'New name' }
    const priorStatus = {
      sourceLocale: 'en',
      es: { status: 'manual' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
      he: { status: 'auto' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
      ru: { status: 'auto' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
    }

    const { value, status } = await translateI18nField({
      existing: edited,
      apiKey: 'api-key',
      previous,
      priorStatus,
    })

    // Spanish is untouched: same text, same (not refreshed) status entry.
    expect(value.es).toBe('Nombre a mano')
    expect(status?.es).toEqual(priorStatus.es)
    // he/ru were 'auto' — free to regenerate from the new English source.
    expect(value.he).toBe('[HE] translated')
    expect(value.ru).toBe('[RU] translated')
    expect(status?.en).toMatchObject({ status: 'manual' })
  })

  it('forceLocales retranslates a locale even when nothing changed and it already has text (retry)', async () => {
    const existing = { es: 'Parque Centenario', he: 'x', en: 'y', ru: 'z' }
    const priorStatus = {
      sourceLocale: 'es',
      es: { status: 'manual' as const, updatedAt: 't' },
      en: { status: 'auto' as const, updatedAt: 't' },
      ru: { status: 'error' as const, updatedAt: 't', error: 'timeout' },
      he: { status: 'auto' as const, updatedAt: 't' },
    }

    const { value, status } = await translateI18nField({
      existing,
      apiKey: 'api-key',
      previous: existing,
      priorStatus,
      forceLocales: ['ru'],
    })

    expect(value.ru).toBe('[RU] translated')
    expect(status?.ru).toMatchObject({ status: 'auto' })
    // Untouched locales stay exactly as they were
    expect(value.en).toBe('y')
    expect(status?.en).toEqual(priorStatus.en)
  })

  it('leaves priorStatus untouched on a genuine no-op save', async () => {
    const existing = { es: 'Parque Centenario', he: 'x', en: 'y', ru: 'z' }
    const priorStatus = {
      sourceLocale: 'es',
      es: { status: 'manual' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
    }

    const { status } = await translateI18nField({
      existing,
      apiKey: 'api-key',
      previous: existing,
      priorStatus,
    })

    expect(status).toEqual(priorStatus)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('translateSingleFieldInput (single-input mode, UiI18nTabs)', () => {
  beforeEach(() => {
    global.fetch = vi.fn() as unknown as typeof fetch
  })
  afterEach(() => vi.restoreAllMocks())

  function mockDeeplWithDetection(
    detectedSource: string,
    translateFn: (targetLang: string) => string
  ) {
    global.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string) as { target_lang: string }
      return {
        ok: true,
        json: async () => ({
          translations: [
            { text: translateFn(body.target_lang), detected_source_language: detectedSource },
          ],
        }),
      } as Response
    }) as unknown as typeof fetch
  }

  it('detects the source locale and translates the rest (create flow)', async () => {
    mockDeeplWithDetection('HE', (lang) => `[${lang}] translated`)

    const { value, status } = await translateSingleFieldInput({
      text: 'פארק המאה',
      apiKey: 'api-key',
    })

    expect(status?.sourceLocale).toBe('he')
    expect(value.he).toBe('פארק המאה')
    expect(value.es).toBe('[ES] translated')
    expect(value.en).toBe('[EN-US] translated')
    expect(value.ru).toBe('[RU] translated')
  })

  it('protects a previously manual locale from being overwritten', async () => {
    mockDeeplWithDetection('EN', (lang) => `[${lang}] translated`)

    const previous = { en: 'Old name', es: 'Nombre a mano', he: 'x', ru: 'y' }
    const priorStatus = {
      sourceLocale: 'en',
      es: { status: 'manual' as const, updatedAt: 't' },
      he: { status: 'auto' as const, updatedAt: 't' },
      ru: { status: 'auto' as const, updatedAt: 't' },
    }

    const { value } = await translateSingleFieldInput({
      text: 'New name',
      apiKey: 'api-key',
      previous,
      priorStatus,
    })

    expect(value.es).toBe('Nombre a mano')
    expect(value.he).toBe('[HE] translated')
    expect(value.ru).toBe('[RU] translated')
  })

  it('returns previous unchanged when text is blank', async () => {
    const previous = { es: 'x' }
    const result = await translateSingleFieldInput({ text: '  ', apiKey: 'api-key', previous })
    expect(result.value).toEqual(previous)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('falls back to the first configured locale when DeepL detects an unsupported language', async () => {
    mockDeeplWithDetection('FR', (lang) => `[${lang}] translated`)

    const { status } = await translateSingleFieldInput({ text: 'Bonjour', apiKey: 'api-key' })
    expect(status?.sourceLocale).toBe('es')
  })

  it('skips detection when locale is already known (editing a labeled, already-visible input)', async () => {
    global.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string) as { target_lang: string }
      return {
        ok: true,
        json: async () => ({ translations: [{ text: `[${body.target_lang}] translated` }] }),
      } as Response
    }) as unknown as typeof fetch

    const { value, status } = await translateSingleFieldInput({
      text: 'New English text',
      locale: 'en',
      apiKey: 'api-key',
    })

    expect(status?.sourceLocale).toBe('en')
    expect(value.en).toBe('New English text')
    // Only 3 translate calls (es/ru/he) — no extra detect call.
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})
