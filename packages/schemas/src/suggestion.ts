import { z } from 'zod'
import { CONTENT_LOCALES } from '@mundopekes/i18n'
import { VALIDATION_ERRORS } from './errors'
import { optionalHttpUrl, optionalText, requiredText } from './fields'

export const SUGGESTION_LIMITS = {
  minText: 2,
  name: 120,
  where: 160,
  link: 2000,
  why: 500,
  turnstileToken: 2048,
} as const

export const SUGGESTION_ORIGINS = ['home', 'search', 'detail'] as const

export const QUICK_SUGGESTION_SOURCE = 'quick'

export const suggestionShortFormSchema = z.object({
  name: requiredText(SUGGESTION_LIMITS.name, SUGGESTION_LIMITS.minText),
  where: requiredText(SUGGESTION_LIMITS.where, SUGGESTION_LIMITS.minText),
  link: optionalHttpUrl(SUGGESTION_LIMITS.link),
  why: optionalText(SUGGESTION_LIMITS.why),
})

export const suggestionShortRequestSchema = suggestionShortFormSchema.extend({
  locale: z.enum(CONTENT_LOCALES, { error: VALIDATION_ERRORS.invalidOption }),
})

export const quickSuggestionRequestSchema = suggestionShortRequestSchema.extend({
  source: z.literal(QUICK_SUGGESTION_SOURCE),
  origin: z.enum(SUGGESTION_ORIGINS).optional().catch(undefined),
  turnstileToken: z
    .string({ error: VALIDATION_ERRORS.required })
    .min(1, { error: VALIDATION_ERRORS.required })
    .max(SUGGESTION_LIMITS.turnstileToken, { error: VALIDATION_ERRORS.tooLong }),
})

export type SuggestionShortFormInput = z.input<typeof suggestionShortFormSchema>
export type SuggestionShortForm = z.output<typeof suggestionShortFormSchema>
export type SuggestionShortRequest = z.output<typeof suggestionShortRequestSchema>
export type QuickSuggestionRequest = z.output<typeof quickSuggestionRequestSchema>
export type SuggestionOrigin = (typeof SUGGESTION_ORIGINS)[number]
