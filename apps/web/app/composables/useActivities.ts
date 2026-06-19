/**
 * useActivities
 * Composable para fetch de actividades con todos los joins necesarios.
 * La tabla `activities` no tiene location, type ni age_range como campos directos —
 * toda esa info viene de joins con places, cities, categories, age_ranges y seasons.
 */

import type { Activity } from '~/types'

// Select reutilizable con todos los joins
export const ACTIVITY_SELECT = `
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
  place:places (
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
  category:categories ( id, name_i18n, slug, icon, parent_id ),
  age_ranges:activity_age_ranges (
    age_range:age_ranges ( id, label_key, min_months, max_months, sort_order )
  ),
  seasons:activity_seasons (
    season:seasons ( id, value, label_key, sort_order )
  )
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
      .select(ACTIVITY_SELECT)
      .eq('status', 'approved')
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
      .select(ACTIVITY_SELECT)
      .eq('status', 'approved')
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
   * Todas las actividades aprobadas — para búsqueda/filtros en memoria
   */
  const getAllActivities = async (): Promise<Activity[]> => {
    const { data, error } = await client
      .from('activities')
      .select(ACTIVITY_SELECT)
      .eq('status', 'approved')
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
    getAllActivities,
  }
}
