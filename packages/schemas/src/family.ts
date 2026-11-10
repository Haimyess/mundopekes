import {
  CHILD_AGE_LIMITS,
  findCity,
  parseWhen,
  SEARCH_AMENITIES,
  SEARCH_DISCOUNTS,
  SEARCH_KINDS,
  SEARCH_PRICE_BANDS,
  SEARCH_RADII_KM,
  serializeWhen,
  type SearchAmenity,
  type SearchDiscount,
} from '@mundopekes/core'
import { z } from 'zod'
import type { SearchQuery } from './search'

export const FAMILY_COOKIE_NAME = 'mp_family'
export const FAMILY_COOKIE_VERSION = 1
export const FAMILY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const FILTER_SEPARATOR = ':'
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_FILTERS = 20

const childAgeRange = z
  .tuple([z.number().int(), z.number().int()])
  .refine(
    ([min, max]) =>
      min >= CHILD_AGE_LIMITS.minYears && max <= CHILD_AGE_LIMITS.maxYears && min <= max
  )

export const familyCookieSchema = z.object({
  v: z.literal(FAMILY_COOKIE_VERSION),
  ages: z.array(childAgeRange).max(CHILD_AGE_LIMITS.maxChildren),
  city: z
    .string()
    .refine((slug) => !!findCity(slug))
    .optional()
    .catch(undefined),
  radiusKm: z
    .number()
    .refine((value) => (SEARCH_RADII_KM as readonly number[]).includes(value))
    .optional()
    .catch(undefined),
  when: z
    .string()
    .refine((value) => parseWhen(value) !== null)
    .optional()
    .catch(undefined),
  filters: z.array(z.string().max(60)).max(MAX_FILTERS).catch([]),
  savedAt: z.iso.datetime({ offset: true }),
})

export type FamilyCookie = z.output<typeof familyCookieSchema>

type FilterToken = [key: string, value?: string]

function token(key: string, value?: string): string {
  return value === undefined ? key : `${key}${FILTER_SEPARATOR}${value}`
}

function toFilterTokens(state: SearchQuery): string[] {
  return [
    state.category ? token('category', state.category) : null,
    state.free ? token('free') : null,
    state.kind ? token('kind', state.kind) : null,
    state.price ? token('price', state.price) : null,
    state.open ? token('open', state.open) : null,
    ...(state.amenities ?? []).map((amenity) => token('amenity', amenity)),
    ...(state.discounts ?? []).map((discount) => token('discount', discount)),
  ].filter((value): value is string => value !== null)
}

function parseToken(raw: string): FilterToken {
  const separatorIndex = raw.indexOf(FILTER_SEPARATOR)
  return separatorIndex === -1
    ? [raw]
    : [raw.slice(0, separatorIndex), raw.slice(separatorIndex + 1)]
}

function isOneOf<T extends string>(values: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (values as readonly string[]).includes(value)
}

function applyFilterToken(state: SearchQuery, [key, value]: FilterToken): SearchQuery {
  if (key === 'category' && value && SLUG_PATTERN.test(value)) return { ...state, category: value }
  if (key === 'free' && value === undefined) return { ...state, free: true }
  if (key === 'kind' && isOneOf(SEARCH_KINDS, value)) return { ...state, kind: value }
  if (key === 'price' && isOneOf(SEARCH_PRICE_BANDS, value)) return { ...state, price: value }
  if (key === 'open' && value === 'now') return { ...state, open: 'now' }
  if (key === 'amenity' && isOneOf(SEARCH_AMENITIES, value)) {
    return { ...state, amenities: [...(state.amenities ?? []), value as SearchAmenity] }
  }
  if (key === 'discount' && isOneOf(SEARCH_DISCOUNTS, value)) {
    return { ...state, discounts: [...(state.discounts ?? []), value as SearchDiscount] }
  }
  return state
}

export function toFamilyCookie(state: SearchQuery, savedAt: Date): FamilyCookie {
  const city = state.where?.kind === 'city' ? state.where.slug : undefined
  return {
    v: FAMILY_COOKIE_VERSION,
    ages: (state.ages ?? []).map((age) => [age, age] as [number, number]),
    city,
    radiusKm: city ? state.radius : undefined,
    when: state.when ? serializeWhen(state.when) : undefined,
    filters: toFilterTokens(state),
    savedAt: savedAt.toISOString(),
  }
}

export function familyCookieToSearchQuery(cookie: FamilyCookie): SearchQuery {
  const base: SearchQuery = {
    ages: cookie.ages.length ? cookie.ages.map(([min]) => min) : undefined,
    where: cookie.city ? { kind: 'city', slug: cookie.city } : undefined,
    radius: cookie.city ? (cookie.radiusKm as SearchQuery['radius']) : undefined,
    when: cookie.when ? (parseWhen(cookie.when) ?? undefined) : undefined,
  }
  return cookie.filters.map(parseToken).reduce(applyFilterToken, base)
}

export function parseFamilyCookie(raw: unknown): FamilyCookie | null {
  const result = familyCookieSchema.safeParse(raw)
  return result.success ? result.data : null
}
