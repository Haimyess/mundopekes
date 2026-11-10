import { z } from 'zod'
import { VALIDATION_ERRORS } from './errors'

const MIN_REQUIRED_LENGTH = 1

export const requiredText = (maxLength: number, minLength: number = MIN_REQUIRED_LENGTH) =>
  z
    .string({ error: VALIDATION_ERRORS.required })
    .trim()
    .min(MIN_REQUIRED_LENGTH, { error: VALIDATION_ERRORS.required })
    .min(minLength, { error: VALIDATION_ERRORS.tooShort })
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
