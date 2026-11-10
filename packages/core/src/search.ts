import { addDays, daysBetween, weekdayOf, type DateRange } from './calendar'
import { rankByAgeFit, type AgeFit, type AgeRangeMonths } from './ages'
import type { WeeklyHours } from './opening-hours'
import { matchesSearchText } from './text'

export const SEARCH_SORTS = ['recommended', 'newest', 'price'] as const

export type SearchSort = (typeof SEARCH_SORTS)[number]

export const SEARCH_PAGE_SIZE = 20

export interface SearchRecord {
  kind: 'activity' | 'place'
  id: string
  searchText: string
  categorySlugs: readonly string[]
  isFree: boolean
  price: number | null
  ageRanges: readonly AgeRangeMonths[]
  weeklyHours: WeeklyHours | null
  createdAt: string
}

export interface SearchCriteria {
  text?: string
  categorySlug?: string
  isFree?: boolean
  childAges: readonly number[]
  dateRange?: DateRange | null
  sort: SearchSort
}

export interface SearchHit<T extends SearchRecord> {
  record: T
  fit: Exclude<AgeFit, 'none'>
  matchingAges: number[]
}

export interface SearchFacets {
  total: number
  categories: Record<string, number>
}

export interface SearchPage<T extends SearchRecord> {
  hits: SearchHit<T>[]
  total: number
  page: number
  pageCount: number
  facets: SearchFacets
}

const DAYS_PER_WEEK = 7

export function isAvailableInRange(hours: WeeklyHours | null, range: DateRange): boolean {
  if (!hours) return true
  const dayCount = Math.min(daysBetween(range.from, range.to) + 1, DAYS_PER_WEEK)
  return Array.from(
    { length: dayCount },
    (_, offset) => hours[weekdayOf(addDays(range.from, offset))]
  ).some((intervals) => intervals === undefined || intervals.length > 0)
}

function isFreeRecord(record: SearchRecord): boolean {
  return record.isFree || record.price === 0
}

function matchesBaseCriteria(record: SearchRecord, criteria: SearchCriteria): boolean {
  if (criteria.text && !matchesSearchText(record.searchText, criteria.text)) return false
  if (criteria.isFree && !isFreeRecord(record)) return false
  if (criteria.dateRange && !isAvailableInRange(record.weeklyHours, criteria.dateRange))
    return false
  return true
}

function matchesCategory(record: SearchRecord, categorySlug: string | undefined): boolean {
  return !categorySlug || record.categorySlugs.includes(categorySlug)
}

function byNewest(first: SearchRecord, second: SearchRecord): number {
  return second.createdAt.localeCompare(first.createdAt)
}

function priceRank(record: SearchRecord): number {
  if (isFreeRecord(record)) return 0
  return record.price ?? Number.POSITIVE_INFINITY
}

function byPrice(first: SearchRecord, second: SearchRecord): number {
  return priceRank(first) - priceRank(second) || byNewest(first, second)
}

function rank<T extends SearchRecord>(
  records: readonly T[],
  criteria: SearchCriteria
): SearchHit<T>[] {
  const newestFirst = [...records].sort(byNewest)
  const ranked = rankByAgeFit(newestFirst, (record) => record.ageRanges, criteria.childAges).map(
    ({ item, fit, matchingAges }) => ({ record: item, fit, matchingAges })
  )
  if (criteria.sort === 'price')
    return ranked.sort((first, second) => byPrice(first.record, second.record))
  if (criteria.sort === 'newest')
    return ranked.sort((first, second) => byNewest(first.record, second.record))
  return ranked
}

export function searchRecords<T extends SearchRecord>(
  records: readonly T[],
  criteria: SearchCriteria,
  page: number = 1,
  pageSize: number = SEARCH_PAGE_SIZE
): SearchPage<T> {
  const candidates = records.filter((record) => matchesBaseCriteria(record, criteria))
  const countFor = (categorySlug?: string) =>
    rank(
      candidates.filter((record) => matchesCategory(record, categorySlug)),
      criteria
    ).length
  const categorySlugs = new Set(candidates.flatMap((record) => record.categorySlugs))
  const hits = rank(
    candidates.filter((record) => matchesCategory(record, criteria.categorySlug)),
    criteria
  )
  const pageCount = Math.max(1, Math.ceil(hits.length / pageSize))
  const start = (page - 1) * pageSize
  return {
    hits: hits.slice(start, start + pageSize),
    total: hits.length,
    page,
    pageCount,
    facets: {
      total: countFor(),
      categories: Object.fromEntries(
        [...categorySlugs].map((categorySlug) => [categorySlug, countFor(categorySlug)])
      ),
    },
  }
}
