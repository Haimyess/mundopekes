import {
  CHILD_AGE_LIMITS,
  parseWhen,
  SEARCH_AMENITIES,
  SEARCH_KINDS,
  SEARCH_SORTS,
} from '@mundopekes/core'
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

export const SEARCH_QUERY_LIMITS = {
  maxTextLength: 80,
  maxPage: 100,
} as const

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TRUE_FLAG = 'true'
const OPEN_NOW_FLAG = 'now'
const LIST_SEPARATOR = ','

const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined)

export const searchQuerySchema = z.object({
  q: optional(
    z
      .string()
      .trim()
      .max(SEARCH_QUERY_LIMITS.maxTextLength)
      .transform((value) => value || undefined)
  ),
  category: optional(z.string().regex(SLUG_PATTERN)),
  when: optional(whenQuerySchema),
  ages: optional(childAgesQuerySchema.transform((ages) => (ages.length ? ages : undefined))),
  free: optional(z.literal(TRUE_FLAG).transform(() => true)),
  kind: optional(z.enum(SEARCH_KINDS)),
  amenities: optional(
    z
      .string()
      .transform((value) => [...new Set(value.split(LIST_SEPARATOR))])
      .pipe(z.array(z.enum(SEARCH_AMENITIES)).min(1))
      .transform((amenities) => SEARCH_AMENITIES.filter((amenity) => amenities.includes(amenity)))
  ),
  open: optional(z.literal(OPEN_NOW_FLAG)),
  sort: optional(z.enum(SEARCH_SORTS)),
  page: optional(z.coerce.number().int().min(1).max(SEARCH_QUERY_LIMITS.maxPage)),
})

export type SearchQuery = z.output<typeof searchQuerySchema>
