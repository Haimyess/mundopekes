import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '@mundopekes/types'
import type { H3Event } from 'h3'
import type { SearchOccasion } from '#shared/types/search'
import type { ActivityRow, CategoryRow, PlaceRow, SearchDataset } from './search-records'

const SEARCH_CACHE_MAX_AGE_SECONDS = 60

const ACTIVITY_SELECT = `
  id, title_i18n, description_i18n, price, is_free, stroller_friendly, images, created_at, updated_at,
  metadata, category_id,
  place:places!inner ( id, lat, lng, name_i18n, images, created_at, metadata, city:cities ( name ) ),
  age_ranges:activity_age_ranges ( age_range:age_ranges ( min_months, max_months ) )
`
const PLACE_SELECT =
  'id, lat, lng, name_i18n, description_i18n, images, created_at, updated_at, metadata, city:cities ( name )'
const CATEGORY_SELECT = 'id, slug, parent_id, name_i18n'
const OCCASION_SELECT = 'key, name_i18n, starts_on, ends_on'

function failOnError(event: H3Event, source: string, error: { message: string } | null) {
  if (!error) return
  void logError(event, 'search', `Failed to load ${source}`, { error: error.message })
  throw createError({ statusCode: 502, statusMessage: 'Search data unavailable' })
}

async function loadSearchDataset(event: H3Event): Promise<SearchDataset> {
  const client = await serverSupabaseClient<Database>(event)
  const [activities, places, categories] = await Promise.all([
    client
      .from('activities')
      .select(ACTIVITY_SELECT)
      .eq('status', 'approved')
      .eq('place.status', 'active'),
    client.from('places').select(PLACE_SELECT).eq('status', 'active'),
    client.from('categories').select(CATEGORY_SELECT),
  ])
  failOnError(event, 'activities', activities.error)
  failOnError(event, 'places', places.error)
  failOnError(event, 'categories', categories.error)
  return {
    activities: (activities.data ?? []) as unknown as ActivityRow[],
    places: (places.data ?? []) as unknown as PlaceRow[],
    categories: (categories.data ?? []) as unknown as CategoryRow[],
  }
}

async function loadUpcomingOccasions(event: H3Event, today: string): Promise<SearchOccasion[]> {
  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client
    .from('occasions')
    .select(OCCASION_SELECT)
    .gte('ends_on', today)
    .order('starts_on')
  failOnError(event, 'occasions', error)
  return (data ?? []).map((row) => ({
    key: row.key,
    name: (row.name_i18n ?? {}) as Record<string, string>,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
  }))
}

export const getSearchDataset = defineCachedFunction(loadSearchDataset, {
  name: 'search-dataset',
  maxAge: SEARCH_CACHE_MAX_AGE_SECONDS,
  getKey: () => 'all',
})

export const getUpcomingOccasions = defineCachedFunction(loadUpcomingOccasions, {
  name: 'search-occasions',
  maxAge: SEARCH_CACHE_MAX_AGE_SECONDS,
  getKey: (_event: H3Event, today: string) => today,
})

export async function getPlaceStatus(event: H3Event, id: string): Promise<string | null> {
  try {
    const client = serverSupabaseServiceRole<Database>(event)
    const { data } = await client.from('places').select('status').eq('id', id).maybeSingle()
    return data?.status ?? null
  } catch {
    return null
  }
}

export interface ActivityStatus {
  status: string | null
  placeStatus: string | null
}

export async function getActivityStatus(
  event: H3Event,
  id: string
): Promise<ActivityStatus | null> {
  try {
    const client = serverSupabaseServiceRole<Database>(event)
    const { data } = await client
      .from('activities')
      .select('status, place:places ( status )')
      .eq('id', id)
      .maybeSingle()
    if (!data) return null
    const place = Array.isArray(data.place) ? data.place[0] : data.place
    return { status: data.status ?? null, placeStatus: place?.status ?? null }
  } catch {
    return null
  }
}
