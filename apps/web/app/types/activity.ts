/**
 * Types para Activities
 */

// ── Entidades relacionadas ────────────────────────────────────────

export interface City {
  id: number
  name: string
  region: string | null
}

export interface Place {
  id: string
  name_i18n: Record<string, string>
  description_i18n: Record<string, string> | null
  lat: number | null
  lng: number | null
  images: string[]
  status: 'active' | 'inactive'
  city: City | null
  metadata: Record<string, unknown> | null
}

export interface Category {
  id: string
  name_i18n: Record<string, string>
  slug: string
  icon: string | null
  parent_id: string | null
}

export interface AgeRange {
  id: number
  label_key: string
  min_months: number
  max_months: number
  sort_order: number
}

export interface Season {
  id: number
  value: string
  label_key: string
  sort_order: number
}

// ── Status ───────────────────────────────────────────────────────

export type ActivityStatus = 'pending' | 'approved' | 'rejected'

// ── Season value (para filtros) ───────────────────────────────────
export type SeasonValue = 'spring' | 'summer' | 'autumn' | 'winter'

// ── Pivot rows tal como vienen de Supabase ────────────────────────
export interface ActivityAgeRangeRow {
  age_range: AgeRange
}

export interface ActivitySeasonRow {
  season: Season
}

// ── Entidad principal ─────────────────────────────────────────────
export interface Activity {
  id: string
  title_i18n: Record<string, string>
  description_i18n: Record<string, string> | null
  price: number | null
  is_free: boolean
  stroller_friendly: boolean
  open_weekends: boolean
  schedule: string | null
  images: string[]
  status: ActivityStatus
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
  place_id: string
  place: Place | null
  category: Category | null
  activity_age_ranges: ActivityAgeRangeRow[]
  activity_seasons: ActivitySeasonRow[]
  age_ranges?: AgeRange[]
  seasons?: Season[]
}

// ── Filtros ───────────────────────────────────────────────────────
export interface ActivityFilters {
  search?: string
  city?: string
  season?: SeasonValue
  age_id?: number // ← ID único del age_range (en URL como ?age=6)
  age_min?: number // derivado del age_id, usado para filtrar
  age_max?: number // derivado del age_id, usado para filtrar
  is_free?: boolean
  stroller_friendly?: boolean
  open_weekends?: boolean
  category?: string // slug de la categoría
}

// ── Respuesta paginada ────────────────────────────────────────────
export interface ActivitiesResponse {
  data: Activity[]
  total: number
  page: number
  limit: number
}
