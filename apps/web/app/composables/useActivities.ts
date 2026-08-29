/**
 * useActivities
 * Composable para fetch de actividades con todos los joins necesarios.
 * La tabla `activities` no tiene location, type ni age_range como campos directos —
 * toda esa info viene de joins con places, cities, categories, age_ranges y seasons.
 */

import type { Activity } from '~/types'

// Campos base compartidos por ACTIVITY_SELECT — separados del embed de
// age_ranges/seasons porque useActivityFilters.ts necesita poder pedirlos
// con !inner (para filtrar por edad/season en SQL en vez de en JS) sin
// duplicar el resto del select.
export const ACTIVITY_SELECT_BASE = `
  id,
  title_i18n,
  description_i18n,
  price,
  is_free,
  stroller_friendly,
  open_weekends,
  schedule,
  images,
  status,
  created_at,
  updated_at,
  metadata,
  place:places!inner (
    id,
    name_i18n,
    description_i18n,
    lat,
    lng,
    images,
    status,
    metadata,
    city:cities ( id, name, region )
  ),
  category:categories ( id, name_i18n, slug, icon, parent_id )
`

// Campos base para la grilla/mapa de búsqueda (SearchActivityGrid + MapView)
// y para el fetch de conteos de filtros — necesitan description_i18n
// (variant="detailed") y place.lat/lng (pines del mapa), a diferencia de
// ACTIVITY_CARD_SELECT (carruseles, sin mapa). No necesitan schedule,
// metadata, updated_at, ni los campos del place/category que no se
// renderizan en ninguna de esas dos vistas.
export const ACTIVITY_LIST_SELECT_BASE = `
  id,
  title_i18n,
  description_i18n,
  price,
  is_free,
  stroller_friendly,
  open_weekends,
  images,
  status,
  created_at,
  place:places!inner (
    id,
    name_i18n,
    lat,
    lng,
    images,
    status,
    city:cities ( id, name, region )
  ),
  category:categories ( id, name_i18n )
`

// Embed normal (left join): trae age_ranges/seasons si existen, sin excluir
// actividades que no tengan ninguno asignado. Es el default para todo lo
// que no filtra por edad/season.
export const AGE_RANGES_EMBED = `
  age_ranges:activity_age_ranges (
    age_range:age_ranges ( id, label_key, min_months, max_months, sort_order )
  )
`
export const SEASONS_EMBED = `
  seasons:activity_seasons (
    season:seasons ( id, value, label_key, sort_order )
  )
`

// Embed !inner: solo para cuando el filtro correspondiente está activo —
// PostgREST necesita !inner en ambos niveles del join para poder filtrar
// por una columna del join anidado (age_range.min_months, season.value) sin
// perder el filtro de existencia (activities sin ningún age_range/season
// asignado deben desaparecer solo cuando el filtro está activo, no siempre).
export const AGE_RANGES_EMBED_INNER = `
  age_ranges:activity_age_ranges!inner (
    age_range:age_ranges!inner ( id, label_key, min_months, max_months, sort_order )
  )
`
export const SEASONS_EMBED_INNER = `
  seasons:activity_seasons!inner (
    season:seasons!inner ( id, value, label_key, sort_order )
  )
`

// Select reutilizable con todos los joins
export const ACTIVITY_SELECT = `${ACTIVITY_SELECT_BASE},
  ${AGE_RANGES_EMBED},
  ${SEASONS_EMBED}
` as const

// Select liviano para los carruseles del Home (SharedActivityCard nada más,
// sin filtro de edad/season) — evita traer schedule/metadata/updated_at,
// los mismos campos pesados del place anidado, y los dos joins pivot
// completos (age_ranges/seasons) que esas vistas no usan para nada.
export const ACTIVITY_CARD_SELECT = `
  id,
  title_i18n,
  description_i18n,
  price,
  is_free,
  stroller_friendly,
  open_weekends,
  images,
  status,
  created_at,
  place:places!inner (
    id,
    name_i18n,
    images,
    status,
    city:cities ( id, name, region )
  ),
  category:categories ( id, name_i18n )
` as const

/**
 * Normaliza el resultado de Supabase al tipo Activity.
 * Los joins anidados devuelven objetos con una capa extra que hay que aplanar.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalizeActivity = (raw: any): Activity => ({
  id: raw.id,
  title_i18n: raw.title_i18n ?? {},
  description_i18n: raw.description_i18n ?? null,
  price: raw.price ?? null,
  is_free: raw.is_free ?? false,
  stroller_friendly: raw.stroller_friendly ?? false,
  open_weekends: raw.open_weekends ?? false,
  schedule: raw.schedule ?? null,
  images: raw.images ?? [],
  status: raw.status ?? 'approved',
  created_at: raw.created_at ?? '',
  updated_at: raw.updated_at ?? '',
  metadata: raw.metadata ?? {},
  // place_id — puede venir directo o desde el join
  place_id: raw.place_id ?? raw.place?.id ?? '',
  // place viene como objeto directo del join
  place: raw.place ?? null,
  // category viene como objeto directo del join
  category: raw.category ?? null,
  // activity_age_ranges — filas pivot tal como vienen de Supabase (sin aplanar)
  activity_age_ranges: raw.age_ranges ?? [],
  // activity_seasons — filas pivot tal como vienen de Supabase (sin aplanar)
  activity_seasons: raw.seasons ?? [],
  // age_ranges — aplanado (opcional, para compatibilidad)
  age_ranges: (raw.age_ranges ?? [])
    .map((r: { age_range: unknown }) => r.age_range)
    .filter(Boolean),
  // seasons — aplanado (opcional, para compatibilidad)
  seasons: (raw.seasons ?? []).map((r: { season: unknown }) => r.season).filter(Boolean),
})

export const useActivities = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = useSupabaseClient() as any

  /**
   * Obtener actividad por ID con todos los joins
   */
  const getActivityById = async (id: string): Promise<Activity | null> => {
    const { data, error } = await client
      .from('activities')
      .select(ACTIVITY_SELECT)
      .eq('id', id)
      .eq('status', 'approved')
      .eq('place.status', 'active')
      .single()

    if (error) {
      console.error('Error fetching activity:', error)
      return null
    }

    return data ? normalizeActivity(data) : null
  }

  /**
   * Actividades recientes — ordenadas por created_at DESC
   */
  const getRecentActivities = async (limit = 10): Promise<Activity[]> => {
    const { data, error } = await client
      .from('activities')
      .select(ACTIVITY_CARD_SELECT)
      .eq('status', 'approved')
      .eq('place.status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent activities:', error)
      return []
    }

    return (data ?? []).map(normalizeActivity)
  }

  /**
   * Actividades populares — por ahora shuffle aleatorio
   * TODO: reemplazar con campo metadata->>'views' cuando haya analytics
   */
  const getPopularActivities = async (limit = 10): Promise<Activity[]> => {
    const { data, error } = await client
      .from('activities')
      .select(ACTIVITY_CARD_SELECT)
      .eq('status', 'approved')
      .eq('place.status', 'active')
      .limit(limit * 3)

    if (error) {
      console.error('Error fetching popular activities:', error)
      return []
    }

    const normalized = (data ?? []).map(normalizeActivity)
    return normalized.sort(() => Math.random() - 0.5).slice(0, limit)
  }

  /**
   * Actividades recomendadas — filtradas por rango de edad si se proporciona.
   * El filtro se hace en memoria sobre los age_ranges del join (array de objetos).
   */
  const getRecommendedActivities = async (ageMonths?: number, limit = 10): Promise<Activity[]> => {
    const { data, error } = await client
      .from('activities')
      .select(ACTIVITY_SELECT)
      .eq('status', 'approved')
      .eq('place.status', 'active')
      .limit(ageMonths !== undefined ? 50 : limit * 2)

    if (error) {
      console.error('Error fetching recommended activities:', error)
      return []
    }

    let normalized = (data ?? []).map(normalizeActivity)

    // Filtrar por edad si se proporcionó — usando min_months/max_months del join
    if (ageMonths !== undefined) {
      normalized = normalized.filter((activity) =>
        activity.age_ranges.some((ar) => ar.min_months <= ageMonths && ar.max_months >= ageMonths)
      )
    }

    return normalized.sort(() => Math.random() - 0.5).slice(0, limit)
  }

  /**
   * Actividades de un lugar puntual — usado por la Place Page ("What can you
   * do here?") y por la Experience Page ("other activities at this place").
   * excludeId opcional para no repetir la actividad que ya se está mostrando.
   */
  const getActivitiesByPlaceId = async (
    placeId: string,
    { excludeId, limit = 20 }: { excludeId?: string; limit?: number } = {}
  ): Promise<Activity[]> => {
    let query = client
      .from('activities')
      .select(ACTIVITY_SELECT)
      .eq('place_id', placeId)
      .eq('status', 'approved')
      .eq('place.status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (excludeId) query = query.neq('id', excludeId)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching activities for place:', error)
      return []
    }

    return (data ?? []).map(normalizeActivity)
  }

  /**
   * Todas las actividades aprobadas — para búsqueda/filtros en memoria
   */
  const getAllActivities = async (): Promise<Activity[]> => {
    const { data, error } = await client
      .from('activities')
      .select(ACTIVITY_SELECT)
      .eq('status', 'approved')
      .eq('place.status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all activities:', error)
      return []
    }

    return (data ?? []).map(normalizeActivity)
  }

  return {
    getActivityById,
    getRecentActivities,
    getPopularActivities,
    getRecommendedActivities,
    getActivitiesByPlaceId,
    getAllActivities,
  }
}
