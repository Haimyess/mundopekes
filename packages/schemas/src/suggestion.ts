import { z } from 'zod'
import { CONTENT_LOCALES } from '@mundopekes/i18n'
import { VALIDATION_ERRORS } from './errors'
import { optionalHttpUrl, optionalText, requiredText } from './fields'

export const SUGGESTION_LIMITS = {
  name: 200,
  where: 300,
  link: 2000,
  why: 2000,
} as const

export const suggestionShortFormSchema = z.object({
  name: requiredText(SUGGESTION_LIMITS.name),
  where: requiredText(SUGGESTION_LIMITS.where),
  link: optionalHttpUrl(SUGGESTION_LIMITS.link),
  why: optionalText(SUGGESTION_LIMITS.why),
})

export const suggestionShortRequestSchema = suggestionShortFormSchema.extend({
  locale: z.enum(CONTENT_LOCALES, { error: VALIDATION_ERRORS.invalidOption }),
})

export type SuggestionShortFormInput = z.input<typeof suggestionShortFormSchema>
export type SuggestionShortForm = z.output<typeof suggestionShortFormSchema>
export type SuggestionShortRequest = z.output<typeof suggestionShortRequestSchema>
