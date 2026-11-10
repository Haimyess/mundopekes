import {
  DEFAULT_RADIUS_KM,
  findUpcomingOccasion,
  ISRAEL_TIME_ZONE,
  resolveWhereOrigin,
  resolveWhen,
  searchRecords,
  todayIn,
  toZonedMoment,
  type DateRange,
  type SearchHit,
  type When,
} from '@mundopekes/core'
import { searchQuerySchema } from '@mundopekes/schemas'
import type {
  SearchOccasion,
  SearchPin,
  SearchResponse,
  SearchResultItem,
} from '#shared/types/search'
import { buildSearchRecords, type SearchResultRecord } from '../utils/search-records'
import { getSearchDataset, getUpcomingOccasions } from '../utils/search-dataset'

function resolveDateRange(
  when: When | undefined,
  today: string,
  occasions: readonly SearchOccasion[]
): DateRange | null {
  if (!when) return null
  return resolveWhen(when, { today, occasions })
}

const MAP_PIN_LIMIT = 300
const DISTANCE_DECIMALS = 10

function toResultItem({
  record,
  fit,
  matchingAges,
  distanceKm,
}: SearchHit<SearchResultRecord>): SearchResultItem {
  return {
    ...record.item,
    fit,
    matchingAges,
    location: record.location,
    distanceKm:
      distanceKm === null ? null : Math.round(distanceKm * DISTANCE_DECIMALS) / DISTANCE_DECIMALS,
  }
}

function isPin(item: SearchResultItem): item is SearchPin {
  return item.location !== null
}

export default defineEventHandler(async (event): Promise<SearchResponse> => {
  const query = searchQuerySchema.parse(getQuery(event))
  const now = new Date()
  const today = todayIn(ISRAEL_TIME_ZONE, now)
  const [dataset, occasions] = await Promise.all([
    getSearchDataset(event),
    getUpcomingOccasions(event, today),
  ])

  const result = searchRecords(
    buildSearchRecords(dataset),
    {
      text: query.q,
      categorySlug: query.category,
      isFree: query.free,
      childAges: query.ages ?? [],
      dateRange: resolveDateRange(query.when, today, occasions),
      kind: query.kind,
      amenities: query.amenities,
      discounts: query.discounts,
      priceBand: query.price,
      openAt: query.open ? toZonedMoment(now) : null,
      origin: query.where ? resolveWhereOrigin(query.where) : null,
      radiusKm: query.radius ?? DEFAULT_RADIUS_KM,
      bounds: query.bbox ?? null,
      sort: query.sort ?? 'recommended',
    },
    query.page ?? 1
  )

  return {
    items: result.hits.map(toResultItem),
    total: result.total,
    page: result.page,
    pageCount: result.pageCount,
    facets: result.facets,
    occasion: findUpcomingOccasion(occasions, today),
    today,
    pins: result.matches.map(toResultItem).filter(isPin).slice(0, MAP_PIN_LIMIT),
  }
})
