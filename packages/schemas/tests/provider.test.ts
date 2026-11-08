import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'
import type { Enums } from '@mundopekes/types'
import {
  PROVIDER_REVIEW_STATUSES,
  VALIDATION_ERRORS,
  providerSignupSchema,
  providerStatusUpdateSchema,
} from '../src'
import type { ProviderReviewStatus } from '../src'

const legacyStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'rejected']),
  notes: z.string().optional(),
})

describe('providerStatusUpdateSchema', () => {
  it('only allows review statuses that exist in the database enum', () => {
    expectTypeOf<ProviderReviewStatus>().toExtend<Enums<'provider_status'>>()
    expect(PROVIDER_REVIEW_STATUSES).not.toContain('pending')
  })

  it.each([
    { status: 'active' },
    { status: 'suspended', notes: 'duplicated listing' },
    { status: 'rejected', notes: '' },
    { status: 'pending' },
    { status: 'deleted' },
    { notes: 'missing status' },
    { status: 'active', notes: 42 },
  ])('accepts and rejects exactly like the current endpoint schema: %o', (sample) => {
    expect(providerStatusUpdateSchema.safeParse(sample).success).toBe(
      legacyStatusSchema.safeParse(sample).success
    )
  })
})

const VALID_SIGNUP = {
  name: 'Kids Park',
  email: 'hello@kidspark.co.il',
  description: 'A large indoor play area for children up to ten years old in Haifa.',
  activity_types: ['playground'],
}

const firstSignupError = (input: unknown) =>
  providerSignupSchema.safeParse(input).error?.issues[0]?.message

describe('providerSignupSchema', () => {
  it('accepts the required fields', () => {
    expect(providerSignupSchema.parse(VALID_SIGNUP)).toEqual(VALID_SIGNUP)
  })

  it('accepts the full optional shape', () => {
    const signup = {
      ...VALID_SIGNUP,
      phone: '+972500000000',
      website: 'https://kidspark.co.il',
      address: 'Herzl 1',
      city: 'Haifa',
      schedule: { sunday: { open: '09:00', close: '18:00' }, saturday: { closed: true } },
      price_range: { from: 30, to: 60, currency: 'ILS' },
    }
    expect(providerSignupSchema.parse(signup)).toEqual(signup)
  })

  it('rejects an invalid email', () => {
    expect(firstSignupError({ ...VALID_SIGNUP, email: 'nope' })).toBe(
      VALIDATION_ERRORS.invalidEmail
    )
  })

  it('requires a description of at least 50 characters', () => {
    expect(firstSignupError({ ...VALID_SIGNUP, description: 'Too short' })).toBe(
      VALIDATION_ERRORS.tooShort
    )
  })

  it('requires at least one activity type', () => {
    expect(firstSignupError({ ...VALID_SIGNUP, activity_types: [] })).toBe(
      VALIDATION_ERRORS.selectAtLeastOne
    )
  })

  it('treats an empty website as absent', () => {
    expect(providerSignupSchema.parse({ ...VALID_SIGNUP, website: '' }).website).toBeUndefined()
  })

  it('rejects non http websites', () => {
    expect(firstSignupError({ ...VALID_SIGNUP, website: 'javascript:alert(1)' })).toBe(
      VALIDATION_ERRORS.invalidUrl
    )
  })

  it('rejects unsupported currencies', () => {
    expect(firstSignupError({ ...VALID_SIGNUP, price_range: { from: 10, currency: 'EUR' } })).toBe(
      VALIDATION_ERRORS.invalidOption
    )
  })
})
