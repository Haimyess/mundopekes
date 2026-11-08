import { z } from 'zod'
import type { Enums } from '@mundopekes/types'
import { VALIDATION_ERRORS } from './errors'
import { email, optionalHttpUrl } from './fields'

export const PROVIDER_REVIEW_STATUSES = [
  'active',
  'suspended',
  'rejected',
] as const satisfies readonly Enums<'provider_status'>[]

export const providerStatusUpdateSchema = z.object({
  status: z.enum(PROVIDER_REVIEW_STATUSES, { error: VALIDATION_ERRORS.invalidOption }),
  notes: z.string().optional(),
})

export const PROVIDER_SIGNUP_LIMITS = {
  descriptionMin: 50,
  website: 2000,
} as const

export const PROVIDER_CURRENCIES = ['ILS', 'USD'] as const

const providerDayScheduleSchema = z.object({
  open: z.string().optional(),
  close: z.string().optional(),
  closed: z.boolean().optional(),
})

const optionalNumber = () => z.number({ error: VALIDATION_ERRORS.invalidNumber }).optional()

export const providerSignupSchema = z.object({
  name: z
    .string({ error: VALIDATION_ERRORS.required })
    .trim()
    .min(1, { error: VALIDATION_ERRORS.required }),
  email: email(),
  phone: z.string().optional(),
  website: optionalHttpUrl(PROVIDER_SIGNUP_LIMITS.website),
  description: z
    .string({ error: VALIDATION_ERRORS.required })
    .trim()
    .min(PROVIDER_SIGNUP_LIMITS.descriptionMin, { error: VALIDATION_ERRORS.tooShort }),
  activity_types: z.array(z.string()).min(1, { error: VALIDATION_ERRORS.selectAtLeastOne }),
  address: z.string().optional(),
  city: z.string().optional(),
  schedule: z
    .object({
      sunday: providerDayScheduleSchema.optional(),
      monday: providerDayScheduleSchema.optional(),
      tuesday: providerDayScheduleSchema.optional(),
      wednesday: providerDayScheduleSchema.optional(),
      thursday: providerDayScheduleSchema.optional(),
      friday: providerDayScheduleSchema.optional(),
      saturday: providerDayScheduleSchema.optional(),
    })
    .optional(),
  price_range: z
    .object({
      from: optionalNumber(),
      to: optionalNumber(),
      currency: z.enum(PROVIDER_CURRENCIES, { error: VALIDATION_ERRORS.invalidOption }).optional(),
    })
    .optional(),
})

export type ProviderReviewStatus = (typeof PROVIDER_REVIEW_STATUSES)[number]
export type ProviderStatusUpdate = z.output<typeof providerStatusUpdateSchema>
export type ProviderSignupInput = z.input<typeof providerSignupSchema>
export type ProviderSignup = z.output<typeof providerSignupSchema>
