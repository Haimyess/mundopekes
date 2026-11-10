import {
  findUpcomingOccasion,
  resolveWhen,
  searchRecords,
  todayIn,
  type DateRange,
  type When,
} from '@mundopekes/core'
import { searchQuerySchema } from '@mundopekes/schemas'
import type { SearchOccasion, SearchResponse } from '#shared/types/search'
import { buildSearchRecords } from '../utils/search-records'
import { getSearchDataset, getUpcomingOccasions } from '../utils/search-dataset'

function resolveDateRange(
  when: When | undefined,
  today: string,
  occasions: readonly SearchOccasion[]
): DateRange | null {
  if (!when) return null
  return resolveWhen(when, { today, occasions })
}

export default defineEventHandler(async (event): Promise<SearchResponse> => {
  const query = searchQuerySchema.parse(getQuery(event))
  const today = todayIn()
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
      sort: query.sort ?? 'recommended',
    },
    query.page ?? 1
  )

  return {
    items: result.hits.map(({ record, fit, matchingAges }) => ({
      ...record.item,
      fit,
      matchingAges,
    })),
    total: result.total,
    page: result.page,
    pageCount: result.pageCount,
    facets: result.facets,
    occasion: findUpcomingOccasion(occasions, today),
    today,
  }
})
