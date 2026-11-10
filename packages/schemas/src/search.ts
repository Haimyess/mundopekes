import {
  CHILD_AGE_LIMITS,
  parseWhen,
  parseWhere,
  SEARCH_RADII_KM,
  SEARCH_AMENITIES,
  SEARCH_DISCOUNTS,
  SEARCH_KINDS,
  SEARCH_PRICE_BANDS,
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

export const SEARCH_VIEWS = ['list', 'map'] as const

const BBOX_PATTERN = /^-?\d{1,3}(?:\.\d+)?(?:,-?\d{1,3}(?:\.\d+)?){3}$/

export const whereQuerySchema = z.string().transform((value, context) => {
  const where = parseWhere(value)
  if (!where) {
    context.addIssue({ code: 'custom', message: VALIDATION_ERRORS.invalidOption })
    return z.NEVER
  }
  return where
})

export const bboxQuerySchema = z
  .string()
  .regex(BBOX_PATTERN)
  .transform((value) => value.split(',').map(Number) as [number, number, number, number])
  .refine(
    ([south, west, north, east]) => south < north && west < east && south >= -90 && north <= 90
  )
  .transform(([south, west, north, east]) => ({ south, west, north, east }))

export const SEARCH_QUERY_LIMITS = {
  maxTextLength: 80,
  maxPage: 100,
} as const

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TRUE_FLAG = 'true'
const OPEN_NOW_FLAG = 'now'
const LIST_SEPARATOR = ','

const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined)

const canonicalList = <const T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((value) => [...new Set(value.split(LIST_SEPARATOR))])
    .pipe(z.array(z.enum(values)).min(1))
    .transform((selected) =>
      values.filter((value): value is T[number] => (selected as readonly string[]).includes(value))
    )

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
  where: optional(whereQuerySchema),
  radius: optional(
    z.coerce
      .number()
      .refine((value): value is (typeof SEARCH_RADII_KM)[number] =>
        (SEARCH_RADII_KM as readonly number[]).includes(value)
      )
  ),
  bbox: optional(bboxQuerySchema),
  view: optional(z.enum(SEARCH_VIEWS)),
  ages: optional(childAgesQuerySchema.transform((ages) => (ages.length ? ages : undefined))),
  free: optional(z.literal(TRUE_FLAG).transform(() => true)),
  kind: optional(z.enum(SEARCH_KINDS)),
  price: optional(z.enum(SEARCH_PRICE_BANDS)),
  amenities: optional(canonicalList(SEARCH_AMENITIES)),
  discounts: optional(canonicalList(SEARCH_DISCOUNTS)),
  open: optional(z.literal(OPEN_NOW_FLAG)),
  sort: optional(z.enum(SEARCH_SORTS)),
  page: optional(z.coerce.number().int().min(1).max(SEARCH_QUERY_LIMITS.maxPage)),
})

export type SearchQuery = z.output<typeof searchQuerySchema>
