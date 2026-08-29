import { describe, it, expect, vi, beforeEach } from 'vitest'

let _deeplApiKey: string | undefined = 'fake-key'
let _existingRow: unknown = null

vi.mock('../../server/utils/admin-runtime-config', () => ({
  getDeeplApiKey: vi.fn(() => _deeplApiKey),
}))

vi.mock('../../server/utils/translate', () => ({
  translateI18nField: vi.fn(
    async ({
      existing,
      forceLocales,
    }: {
      existing: Record<string, string>
      forceLocales?: string[]
    }) => {
      const value = { ...existing }
      const status: Record<string, unknown> = { sourceLocale: 'en' }
      for (const locale of forceLocales ?? []) {
        value[locale] = `[${locale}] retried`
        status[locale] = { status: 'auto', updatedAt: 't' }
      }
      return { value, status }
    }
  ),
}))

const mockUpdate = vi.fn()
const mockFrom = vi.fn((table: string) => {
  if (table === 'suggestions') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: _existingRow, error: null }),
        })),
      })),
      update: mockUpdate,
    }
  }
  return {}
})

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({ from: mockFrom })),
}))

vi.stubGlobal('defineEventHandler', (fn: (e: unknown) => unknown) => fn)
vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('sug-001'))
vi.stubGlobal('createError', (input: Record<string, unknown>) => {
  const err = new Error(String(input.message ?? 'error')) as Error & { statusCode: number }
  err.statusCode = (input.statusCode as number) ?? 500
  return err
})

const { default: handler } =
  await import('../../server/api/suggestions/[id]/retry-translation.post')

function makeEvent() {
  return {} as Parameters<typeof handler>[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  _deeplApiKey = 'fake-key'
  _existingRow = null
  mockUpdate.mockReturnValue({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'sug-001' }, error: null }),
      })),
    })),
  })
})

describe('POST /api/suggestions/[id]/retry-translation', () => {
  it('retries only the field(s) that have an error locale', async () => {
    _existingRow = {
      name_i18n: { en: 'Park', ru: '' },
      description_i18n: { en: 'A nice park', es: 'Un lindo parque', ru: 'ok', he: 'ok' },
      metadata: null,
      i18n_status: {
        name: {
          sourceLocale: 'en',
          en: { status: 'manual', updatedAt: 't' },
          ru: { status: 'error', updatedAt: 't', error: 'timeout' },
        },
        description: {
          sourceLocale: 'en',
          en: { status: 'manual', updatedAt: 't' },
          es: { status: 'auto', updatedAt: 't' },
          ru: { status: 'auto', updatedAt: 't' },
          he: { status: 'auto', updatedAt: 't' },
        },
      },
    }

    let captured: Record<string, unknown> | null = null
    mockUpdate.mockImplementation((data) => {
      captured = data as Record<string, unknown>
      return {
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'sug-001' }, error: null }),
          })),
        })),
      }
    })

    const result = await handler(makeEvent())

    expect((result as { retried: string[] }).retried).toEqual(['name'])
    expect((captured as Record<string, unknown>)?.name_i18n).toEqual({
      en: 'Park',
      ru: '[ru] retried',
    })
    // description was never touched — no error locales there
    expect(captured).not.toHaveProperty('description_i18n')
  })

  it('returns retried: [] and does not call update when nothing is in error state', async () => {
    _existingRow = {
      name_i18n: { en: 'Park' },
      description_i18n: {},
      metadata: null,
      i18n_status: {
        name: { sourceLocale: 'en', en: { status: 'manual', updatedAt: 't' } },
      },
    }

    const result = await handler(makeEvent())

    expect(result).toMatchObject({ retried: [] })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('throws 400 when DeepL is not configured', async () => {
    _deeplApiKey = undefined
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when the suggestion does not exist', async () => {
    _existingRow = null
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 404 })
  })
})
