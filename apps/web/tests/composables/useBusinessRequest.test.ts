import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    locale: { value: 'ru' },
  }),
}))

vi.stubGlobal('$fetch', mockFetch)

const { useBusinessClaim, useBusinessJoin } = await import('~/app/composables/useBusinessRequest')

describe('useBusinessJoin', () => {
  beforeEach(() => mockFetch.mockReset())

  it('starts empty and reports the length limits in errors', () => {
    const join = useBusinessJoin()
    expect(join.form).toEqual({ businessName: '', activityType: '', city: '', phone: '' })
    join.form.city = 'x'
    join.touch('city')
    expect(join.errorFor('city')).toBe('validation.tooShort:{"min":2,"max":80}')
  })

  it('posts a join request', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const join = useBusinessJoin()
    Object.assign(join.form, {
      businessName: 'Taller',
      activityType: 'Taller',
      city: 'Haifa',
      phone: '04 123 4567',
    })
    join.token.value = 'token'
    await expect(join.submit()).resolves.toBe(true)
    expect(mockFetch.mock.calls[0]![1].body).toMatchObject({ kind: 'join', locale: 'ru' })
  })
})

describe('useBusinessClaim', () => {
  beforeEach(() => mockFetch.mockReset())

  it('starts without a role and with the terms unaccepted', () => {
    const claim = useBusinessClaim('place-1')
    expect(claim.form.role).toBeNull()
    expect(claim.form.acceptTerms).toBe(false)
    claim.touch('role')
    expect(claim.errorFor('role')).toBe('validation.invalidOption')
  })

  it('needs every field, the terms and a token before it can submit', () => {
    const claim = useBusinessClaim('place-1')
    Object.assign(claim.form, {
      role: 'employee',
      name: 'Dana',
      email: 'dana@museo.co.il',
      phone: '050 123 4567',
    })
    claim.token.value = 'token'
    expect(claim.canSubmit.value).toBe(false)
    claim.form.acceptTerms = true
    expect(claim.canSubmit.value).toBe(true)
  })
})
