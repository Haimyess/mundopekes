import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

const DEFAULT_RANGE_DAYS = 30

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)
  const query = getQuery(event)

  const to = typeof query.to === 'string' && query.to ? new Date(query.to) : new Date()
  const from =
    typeof query.from === 'string' && query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)

  const fromIso = from.toISOString()
  const toIso = to.toISOString()

  const [
    totalEvents,
    eventsInRange,
    distinctSessions,
    eventsByType,
    timeseries,
    topSearches,
    zeroResultSearches,
    topCategoriesRaw,
    topCities,
    topAgeRangesRaw,
    topActivitiesRaw,
    topPlaces,
    searchStatsRaw,
    categoriesRef,
    ageRangesRef,
  ] = await Promise.all([
    supabase.from('activity_events').select('*', { count: 'exact', head: true }),
    supabase
      .from('activity_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
    supabase.rpc('analytics_distinct_sessions', { p_from: fromIso, p_to: toIso }),
    supabase.rpc('analytics_events_by_type', { p_from: fromIso, p_to: toIso }),
    supabase.rpc('analytics_timeseries', { p_from: fromIso, p_to: toIso }),
    supabase.rpc('analytics_top_search_terms', {
      p_from: fromIso,
      p_to: toIso,
      p_limit: 10,
      p_zero_results: false,
    }),
    supabase.rpc('analytics_top_search_terms', {
      p_from: fromIso,
      p_to: toIso,
      p_limit: 10,
      p_zero_results: true,
    }),
    supabase.rpc('analytics_top_categories', { p_from: fromIso, p_to: toIso, p_limit: 10 }),
    supabase.rpc('analytics_top_cities', { p_from: fromIso, p_to: toIso, p_limit: 10 }),
    supabase.rpc('analytics_top_age_ranges', { p_from: fromIso, p_to: toIso, p_limit: 10 }),
    supabase.rpc('analytics_top_activities', { p_from: fromIso, p_to: toIso, p_limit: 10 }),
    supabase.rpc('analytics_top_places', { p_from: fromIso, p_to: toIso, p_limit: 10 }),
    supabase.rpc('analytics_search_stats', { p_from: fromIso, p_to: toIso }),
    supabase.from('categories').select('id, slug, name_i18n'),
    supabase.from('age_ranges').select('id, label_key, min_months, max_months'),
  ])

  // Los nombres de categoría/rango etario se resuelven acá (una consulta chica
  // a cada tabla) para no hardcodear un locale del lado del servidor — el
  // front resuelve name_i18n con tc() (useI18nContent), igual que el resto
  // del admin (ver apps/admin/app/pages/activities/index.vue).
  const categoryBySlug = new Map((categoriesRef.data ?? []).map((c) => [c.slug, c]))
  const ageRangeById = new Map((ageRangesRef.data ?? []).map((a) => [String(a.id), a]))

  const topCategories = (topCategoriesRaw.data ?? []).map((row) => ({
    slug: row.category_slug,
    name_i18n: categoryBySlug.get(row.category_slug ?? '')?.name_i18n ?? null,
    count: row.count,
  }))

  const topAgeRanges = (topAgeRangesRaw.data ?? []).map((row) => {
    const ageRange = ageRangeById.get(row.age_range_id ?? '')
    return {
      id: row.age_range_id,
      label_key: ageRange?.label_key ?? null,
      min_months: ageRange?.min_months ?? null,
      max_months: ageRange?.max_months ?? null,
      count: row.count,
    }
  })

  return {
    range: { from: fromIso, to: toIso },
    totalEvents: totalEvents.count ?? 0,
    eventsInRange: eventsInRange.count ?? 0,
    distinctSessions: distinctSessions.data ?? 0,
    eventsByType: eventsByType.data ?? [],
    timeseries: timeseries.data ?? [],
    topSearches: topSearches.data ?? [],
    zeroResultSearches: zeroResultSearches.data ?? [],
    topCategories,
    topCities: topCities.data ?? [],
    topAgeRanges,
    topActivities: topActivitiesRaw.data ?? [],
    topPlaces: topPlaces.data ?? [],
    searchStats: {
      total: searchStatsRaw.data?.[0]?.total_searches ?? 0,
      zeroResults: searchStatsRaw.data?.[0]?.zero_result_searches ?? 0,
    },
  }
})
