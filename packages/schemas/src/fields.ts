import { z } from 'zod'
import { VALIDATION_ERRORS } from './errors'

export const requiredText = (maxLength: number) =>
  z
    .string({ error: VALIDATION_ERRORS.required })
    .trim()
    .min(1, { error: VALIDATION_ERRORS.required })
    .max(maxLength, { error: VALIDATION_ERRORS.tooLong })

export const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength, { error: VALIDATION_ERRORS.tooLong }).optional()

export const httpUrl = (maxLength: number) =>
  z
    .url({ protocol: /^https?$/, error: VALIDATION_ERRORS.invalidUrl })
    .max(maxLength, { error: VALIDATION_ERRORS.tooLong })

export const optionalHttpUrl = (maxLength: number) =>
  z
    .union([httpUrl(maxLength), z.literal('')])
    .optional()
    .transform((value) => value || undefined)

export const email = () => z.email({ error: VALIDATION_ERRORS.invalidEmail })
