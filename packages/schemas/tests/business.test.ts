import { describe, expect, it } from 'vitest'
import {
  businessClaimFormSchema,
  businessJoinFormSchema,
  businessRequestSchema,
  businessRequestStatusUpdateSchema,
  VALIDATION_ERRORS,
} from '../src'

const JOIN = {
  businessName: 'Taller Barro y Color',
  activityType: 'Taller',
  city: 'Tel Aviv',
  phone: '+972 50-123-4567',
}

const CLAIM = {
  role: 'owner',
  name: 'Dana Levi',
  email: 'dana@barro.co.il',
  phone: '050 123 4567',
  acceptTerms: true,
}

const CONTEXT = { locale: 'he', turnstileToken: 'token' }
const PLACE_ID = '7b0c3f5e-9a55-4c63-8a51-3f8f7c1c2d4e'

const firstError = (schema: { safeParse: (value: unknown) => unknown }, input: unknown) =>
  (schema.safeParse(input) as { error?: { issues: { message: string }[] } }).error?.issues[0]
    ?.message

describe('businessJoinFormSchema', () => {
  it('accepts the four join fields and trims them', () => {
    expect(businessJoinFormSchema.parse({ ...JOIN, city: '  Tel Aviv ' })).toEqual(JOIN)
  })

  it.each(['12345', 'call me', '+972 50 123 4567 8901 2345', '050-abc-4567'])(
    'rejects the invalid phone %s',
    (phone) => {
      expect(firstError(businessJoinFormSchema, { ...JOIN, phone })).toBe(
        VALIDATION_ERRORS.invalidPhone
      )
    }
  )

  it('requires every field', () => {
    expect(firstError(businessJoinFormSchema, { ...JOIN, city: ' ' })).toBe(
      VALIDATION_ERRORS.required
    )
    expect(firstError(businessJoinFormSchema, { ...JOIN, activityType: 'x' })).toBe(
      VALIDATION_ERRORS.tooShort
    )
  })
})

describe('businessClaimFormSchema', () => {
  it('accepts a complete claim', () => {
    expect(businessClaimFormSchema.parse(CLAIM)).toEqual(CLAIM)
  })

  it('requires accepting the business terms', () => {
    expect(firstError(businessClaimFormSchema, { ...CLAIM, acceptTerms: false })).toBe(
      VALIDATION_ERRORS.mustAccept
    )
  })

  it('validates the role and the business email', () => {
    expect(firstError(businessClaimFormSchema, { ...CLAIM, role: 'fan' })).toBe(
      VALIDATION_ERRORS.invalidOption
    )
    expect(firstError(businessClaimFormSchema, { ...CLAIM, email: 'dana@' })).toBe(
      VALIDATION_ERRORS.invalidEmail
    )
    expect(firstError(businessClaimFormSchema, { ...CLAIM, email: '' })).toBe(
      VALIDATION_ERRORS.required
    )
  })
})

describe('businessRequestSchema', () => {
  it('accepts join and claim requests by kind', () => {
    expect(businessRequestSchema.parse({ kind: 'join', ...JOIN, ...CONTEXT }).kind).toBe('join')
    expect(
      businessRequestSchema.parse({ kind: 'claim', placeId: PLACE_ID, ...CLAIM, ...CONTEXT })
    ).toMatchObject({ kind: 'claim', placeId: PLACE_ID })
  })

  it('needs a valid place, a verification token and a known locale', () => {
    expect(
      businessRequestSchema.safeParse({ kind: 'claim', placeId: 'nope', ...CLAIM, ...CONTEXT })
        .success
    ).toBe(false)
    expect(
      businessRequestSchema.safeParse({ kind: 'join', ...JOIN, ...CONTEXT, turnstileToken: '' })
        .success
    ).toBe(false)
    expect(
      businessRequestSchema.safeParse({ kind: 'join', ...JOIN, ...CONTEXT, locale: 'fr' }).success
    ).toBe(false)
  })

  it('rejects unknown kinds', () => {
    expect(businessRequestSchema.safeParse({ kind: 'spam', ...JOIN, ...CONTEXT }).success).toBe(
      false
    )
  })
})

describe('businessRequestStatusUpdateSchema', () => {
  it('accepts the review statuses only', () => {
    expect(businessRequestStatusUpdateSchema.parse({ status: 'contacted' })).toEqual({
      status: 'contacted',
    })
    expect(businessRequestStatusUpdateSchema.safeParse({ status: 'read' }).success).toBe(false)
  })
})
