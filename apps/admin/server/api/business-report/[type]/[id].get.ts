import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

const DEFAULT_RANGE_DAYS = 30

export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')
  const id = getRouterParam(event, 'id')
  if ((type !== 'place' && type !== 'provider' && type !== 'activity') || !id) {
    throw createError({
      statusCode: 400,
      message: 'type debe ser "place", "provider" o "activity"',
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const query = getQuery(event)

  const to = typeof query.to === 'string' && query.to ? new Date(query.to) : new Date()
  const from =
    typeof query.from === 'string' && query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)
  const fromIso = from.toISOString()
  const toIso = to.toISOString()

  let entityName: string
  let cityName: string | null
  let placeIds: string[] = []
  let activityIds: string[] = []
  let categoryIds: string[] = []

  if (type === 'place') {
    const { data: place, error } = await supabase
      .from('places')
      .select('id, name_i18n, city:cities(name)')
      .eq('id', id)
      .single()
    if (error || !place) throw createError({ statusCode: 404, message: 'Lugar no encontrado' })
    entityName = Object.values(place.name_i18n as Record<string, string>)[0] ?? ''
    cityName = place.city?.name ?? null
    placeIds = [place.id]
  } else if (type === 'provider') {
    const { data: provider, error } = await supabase
      .from('providers')
      .select('id, name, city:cities(name)')
      .eq('id', id)
      .single()
    if (error || !provider)
      throw createError({ statusCode: 404, message: 'Proveedor no encontrado' })
    entityName = provider.name
    cityName = provider.city?.name ?? null

    const { data: places } = await supabase.from('places').select('id').eq('provider_id', id)
    placeIds = (places ?? []).map((p) => p.id)
  } else {
    // type === 'activity' — reporte acotado a UNA actividad puntual, sin
    // sumar el resto de las actividades del mismo lugar. Se logra pasando
    // placeIds vacío (así no cuenta place_view) y activityIds con solo esta.
    const { data: activity, error } = await supabase
      .from('activities')
      .select('id, title_i18n, category_id, place:places(city:cities(name))')
      .eq('id', id)
      .single()
    if (error || !activity)
      throw createError({ statusCode: 404, message: 'Actividad no encontrada' })
    entityName = Object.values(activity.title_i18n as Record<string, string>)[0] ?? ''
    cityName = activity.place?.city?.name ?? null
    activityIds = [activity.id]
    if (activity.category_id) categoryIds = [activity.category_id]
  }

  if (type !== 'activity') {
    const { data: activities } =
      placeIds.length > 0
        ? await supabase.from('activities').select('id, category_id').in('place_id', placeIds)
        : { data: [] as Array<{ id: string; category_id: string | null }> }

    activityIds = (activities ?? []).map((a) => a.id)
    categoryIds = [
      ...new Set((activities ?? []).map((a) => a.category_id).filter(Boolean)),
    ] as string[]
  }

  const categoriesRef =
    categoryIds.length > 0
      ? await supabase.from('categories').select('id, slug, name_i18n').in('id', categoryIds)
      : { data: [] as Array<{ id: string; slug: string; name_i18n: unknown }> }

  const categorySlugs = (categoriesRef.data ?? []).map((c) => c.slug)

  const [reportRaw, timeseriesRaw, marketContextRaw] = await Promise.all([
    supabase.rpc('analytics_business_report', {
      p_place_ids: placeIds,
      p_activity_ids: activityIds,
      p_from: fromIso,
      p_to: toIso,
    }),
    supabase.rpc('analytics_business_timeseries', {
      p_place_ids: placeIds,
      p_activity_ids: activityIds,
      p_from: fromIso,
      p_to: toIso,
    }),
    supabase.rpc('analytics_market_context', {
      p_category_slugs: categorySlugs,
      p_city: cityName ?? '',
      p_from: fromIso,
      p_to: toIso,
    }),
  ])

  const report = reportRaw.data?.[0] ?? {
    views: 0,
    directions: 0,
    contacts: 0,
    unique_sessions: 0,
    searching_sessions: 0,
  }

  return {
    entity: {
      type,
      id,
      name: entityName,
      city: cityName,
      categories: (categoriesRef.data ?? []).map((c) => ({
        slug: c.slug,
        name_i18n: c.name_i18n as Record<string, string>,
      })),
    },
    range: { from: fromIso, to: toIso },
    report: {
      views: report.views,
      directions: report.directions,
      contacts: report.contacts,
      uniqueSessions: report.unique_sessions,
      searchingSessions: report.searching_sessions,
    },
    timeseries: timeseriesRaw.data ?? [],
    marketContext: {
      categorySearches: marketContextRaw.data?.[0]?.category_searches ?? 0,
      citySearches: marketContextRaw.data?.[0]?.city_searches ?? 0,
    },
  }
})
