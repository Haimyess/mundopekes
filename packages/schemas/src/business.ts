import { z } from 'zod'
import { CONTENT_LOCALES } from '@mundopekes/i18n'
import { VALIDATION_ERRORS } from './errors'
import { email, requiredText } from './fields'

export const BUSINESS_LIMITS = {
  minText: 2,
  businessName: 120,
  activityType: 80,
  city: 80,
  contactName: 120,
  email: 254,
  minPhoneDigits: 7,
  maxPhoneDigits: 15,
  phone: 32,
  turnstileToken: 2048,
} as const

export const BUSINESS_REQUEST_KINDS = ['join', 'claim'] as const
export const BUSINESS_ROLES = ['owner', 'manager', 'employee'] as const
export const BUSINESS_REQUEST_STATUSES = ['pending', 'contacted', 'approved', 'rejected'] as const

const PHONE_CHARACTERS = /^\+?[\d\s().-]+$/

const phone = () =>
  z
    .string({ error: VALIDATION_ERRORS.required })
    .trim()
    .min(1, { error: VALIDATION_ERRORS.required })
    .max(BUSINESS_LIMITS.phone, { error: VALIDATION_ERRORS.tooLong })
    .refine((value) => PHONE_CHARACTERS.test(value), { error: VALIDATION_ERRORS.invalidPhone })
    .refine(
      (value) => {
        const digits = value.replace(/\D/g, '').length
        return digits >= BUSINESS_LIMITS.minPhoneDigits && digits <= BUSINESS_LIMITS.maxPhoneDigits
      },
      { error: VALIDATION_ERRORS.invalidPhone }
    )

const turnstileToken = () =>
  z
    .string({ error: VALIDATION_ERRORS.required })
    .min(1, { error: VALIDATION_ERRORS.required })
    .max(BUSINESS_LIMITS.turnstileToken, { error: VALIDATION_ERRORS.tooLong })

const requestContext = {
  locale: z.enum(CONTENT_LOCALES, { error: VALIDATION_ERRORS.invalidOption }),
  turnstileToken: turnstileToken(),
}

export const businessJoinFormSchema = z.object({
  businessName: requiredText(BUSINESS_LIMITS.businessName, BUSINESS_LIMITS.minText),
  activityType: requiredText(BUSINESS_LIMITS.activityType, BUSINESS_LIMITS.minText),
  city: requiredText(BUSINESS_LIMITS.city, BUSINESS_LIMITS.minText),
  phone: phone(),
})

export const businessClaimFormSchema = z.object({
  role: z.enum(BUSINESS_ROLES, { error: VALIDATION_ERRORS.invalidOption }),
  name: requiredText(BUSINESS_LIMITS.contactName, BUSINESS_LIMITS.minText),
  email: z
    .string({ error: VALIDATION_ERRORS.required })
    .trim()
    .min(1, { error: VALIDATION_ERRORS.required })
    .max(BUSINESS_LIMITS.email, { error: VALIDATION_ERRORS.tooLong })
    .pipe(email()),
  phone: phone(),
  acceptTerms: z.literal(true, { error: VALIDATION_ERRORS.mustAccept }),
})

export const businessRequestSchema = z.discriminatedUnion(
  'kind',
  [
    businessJoinFormSchema.extend({ kind: z.literal('join'), ...requestContext }),
    businessClaimFormSchema.extend({
      kind: z.literal('claim'),
      placeId: z.uuid({ error: VALIDATION_ERRORS.invalidOption }),
      ...requestContext,
    }),
  ],
  { error: VALIDATION_ERRORS.invalidOption }
)

export const businessRequestStatusUpdateSchema = z.object({
  status: z.enum(BUSINESS_REQUEST_STATUSES, { error: VALIDATION_ERRORS.invalidOption }),
  notes: z.string().trim().max(2000, { error: VALIDATION_ERRORS.tooLong }).optional(),
})

export type BusinessRequestKind = (typeof BUSINESS_REQUEST_KINDS)[number]
export type BusinessRole = (typeof BUSINESS_ROLES)[number]
export type BusinessRequestStatus = (typeof BUSINESS_REQUEST_STATUSES)[number]
export type BusinessJoinFormInput = z.input<typeof businessJoinFormSchema>
export type BusinessClaimFormInput = z.input<typeof businessClaimFormSchema>
export type BusinessRequest = z.output<typeof businessRequestSchema>
export type BusinessRequestStatusUpdate = z.output<typeof businessRequestStatusUpdateSchema>
