import { beforeEach, describe, expect, it, vi } from 'vitest'
const mockFetch = vi.fn()

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    locale: { value: 'he' },
  }),
}))

vi.stubGlobal('$fetch', mockFetch)

const { useQuickSuggestion } = await import('~/app/composables/useQuickSuggestion')

const fillValid = (form: Record<string, string>) => {
  form.name = 'Granja Los Olivos'
  form.where = 'Ramat HaSharon'
  form.link = 'https://instagram.com/granja'
}

describe('useQuickSuggestion', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('hides validation errors until a field is touched', () => {
    const { errorFor, touch } = useQuickSuggestion('home')
    expect(errorFor('name')).toBeUndefined()
    touch('name')
    expect(errorFor('name')).toMatch(/^validation\./)
  })

  it('rejects non-http links live', () => {
    const { form, errorFor, touch } = useQuickSuggestion('home')
    fillValid(form)
    form.link = 'javascript:alert(1)'
    touch('link')
    expect(errorFor('link')).toBeDefined()
  })

  it('needs valid data and a verification token to submit', () => {
    const { form, token, canSubmit } = useQuickSuggestion('home')
    fillValid(form)
    expect(canSubmit.value).toBe(false)
    token.value = 'turnstile-token'
    expect(canSubmit.value).toBe(true)
  })

  it('sends the quick payload with origin, locale and token', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const { form, token, status, submit } = useQuickSuggestion('search')
    fillValid(form)
    token.value = 'turnstile-token'

    await expect(submit()).resolves.toBe(true)

    expect(status.value).toBe('success')
    expect(mockFetch).toHaveBeenCalledWith('/api/suggestions', {
      method: 'POST',
      body: expect.objectContaining({
        name: 'Granja Los Olivos',
        where: 'Ramat HaSharon',
        source: 'quick',
        origin: 'search',
        locale: 'he',
        turnstileToken: 'turnstile-token',
      }),
    })
  })

  it.each([
    [429, 'rateLimited'],
    [403, 'verification'],
    [503, 'verification'],
    [500, 'generic'],
  ])('maps a %i response to the %s failure and drops the token', async (statusCode, failure) => {
    mockFetch.mockImplementation(() =>
      Promise.reject(Object.assign(new Error('x'), { statusCode }))
    )
    const quick = useQuickSuggestion('home')
    fillValid(quick.form)
    quick.token.value = 'turnstile-token'

    await expect(quick.submit()).resolves.toBe(false)

    expect(quick.status.value).toBe('error')
    expect(quick.failure.value).toBe(failure)
    expect(quick.token.value).toBeNull()
  })

  it('does not call the server when the form is invalid', async () => {
    const { token, submit, errorFor } = useQuickSuggestion('home')
    token.value = 'turnstile-token'
    await expect(submit()).resolves.toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(errorFor('where')).toBeDefined()
  })

  it('resets back to an empty idle form', () => {
    const quick = useQuickSuggestion('home')
    fillValid(quick.form)
    quick.token.value = 'turnstile-token'
    quick.touch('name')
    quick.reset()
    expect(quick.form.name).toBe('')
    expect(quick.token.value).toBeNull()
    expect(quick.status.value).toBe('idle')
    expect(quick.errorFor('name')).toBeUndefined()
  })
})
