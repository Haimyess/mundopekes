import { CHILD_AGE_LIMITS, parseWhen } from '@mundopekes/core'
import { z } from 'zod'
import { VALIDATION_ERRORS } from './errors'

const AGE_LIST_SEPARATOR = ','

export const childAgeSchema = z
  .number({ error: VALIDATION_ERRORS.invalidNumber })
  .int({ error: VALIDATION_ERRORS.invalidNumber })
  .min(CHILD_AGE_LIMITS.minYears, { error: VALIDATION_ERRORS.invalidNumber })
  .max(CHILD_AGE_LIMITS.maxYears, { error: VALIDATION_ERRORS.invalidNumber })

export const childAgesSchema = z
  .array(childAgeSchema)
  .max(CHILD_AGE_LIMITS.maxChildren, { error: VALIDATION_ERRORS.tooLong })

export const childAgesQuerySchema = z
  .string()
  .trim()
  .transform((value) => (value ? value.split(AGE_LIST_SEPARATOR).map(Number) : []))
  .pipe(childAgesSchema)

export const whenQuerySchema = z.string().transform((value, context) => {
  const when = parseWhen(value)
  if (!when) {
    context.addIssue({ code: 'custom', message: VALIDATION_ERRORS.invalidOption })
    return z.NEVER
  }
  return when
})

export type ChildAges = z.output<typeof childAgesSchema>
