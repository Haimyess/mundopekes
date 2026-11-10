import {
  findUpcomingOccasion,
  HOME_CAROUSEL_MIN_ITEMS,
  homeContextWhen,
  ISRAEL_TIME_ZONE,
  resolveWhen,
  searchRecords,
  selectHomeContext,
  serializeWhen,
  todayIn,
  type SearchCriteria,
} from '@mundopekes/core'
import type { HomeCategorySection, HomeResponse, HomeSection } from '#shared/types/home'
import { getSearchDataset, getUpcomingOccasions } from '../utils/search-dataset'
import {
  buildSearchRecords,
  toListedResultItem,
  type SearchResultRecord,
} from '../utils/search-records'

const HOME_SECTION_SIZE = 12
const BASE_CRITERIA: SearchCriteria = { childAges: [], sort: 'recommended' }

function buildSection(
  records: readonly SearchResultRecord[],
  criteria: Partial<SearchCriteria>,
  query: Record<string, string>
): HomeSection | null {
  const result = searchRecords(records, { ...BASE_CRITERIA, ...criteria }, 1, HOME_SECTION_SIZE)
  if (result.total < HOME_CAROUSEL_MIN_ITEMS) return null
  return {
    items: result.hits.map(({ record }) => toListedResultItem(record)),
    total: result.total,
    query,
  }
}

export default defineEventHandler(async (event): Promise<HomeResponse> => {
  const today = todayIn(ISRAEL_TIME_ZONE)
  const [dataset, occasions] = await Promise.all([
    getSearchDataset(event),
    getUpcomingOccasions(event, today),
  ])
  const records = buildSearchRecords(dataset)

  const context = selectHomeContext(today, occasions)
  const contextWhen = homeContextWhen(context)
  const contextSection = buildSection(
    records,
    { dateRange: resolveWhen(contextWhen, { today, occasions }) },
    { when: serializeWhen(contextWhen) }
  )

  const topLevelSlugs = dataset.categories
    .filter(({ parent_id }) => parent_id === null)
    .map(({ slug }) => slug)
  const overview = searchRecords(records, BASE_CRITERIA)
  const categories = topLevelSlugs
    .map((slug) => {
      const section = buildSection(records, { categorySlug: slug }, { category: slug })
      return section ? ({ slug, ...section } satisfies HomeCategorySection) : null
    })
    .filter((section): section is HomeCategorySection => section !== null)
    .sort((first, second) => second.total - first.total)

  return {
    today,
    occasion: findUpcomingOccasion(occasions, today),
    context: contextSection ? { ...contextSection, ...context } : null,
    free: buildSection(records, { isFree: true }, { free: 'true' }),
    categories,
    categoryCounts: Object.fromEntries(
      topLevelSlugs.map((slug) => [slug, overview.facets.categories[slug] ?? 0])
    ),
  }
})
