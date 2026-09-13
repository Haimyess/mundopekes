import type { FieldI18nStatus } from '../../../../layers/domain/types/i18n-status'

export interface Place {
  id: string
  name_i18n: Record<string, string>
  description_i18n: Record<string, string> | null
  city_id: number | null
  lat: number | null
  lng: number | null
  images: string[]
  metadata: Record<string, unknown>
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  city?: { id: number; name: string; region: string }
  activities?: { count: number }[]
  i18n_status?: Record<string, FieldI18nStatus> | null
}

export interface Activity {
  id: string
  place_id: string
  category_id: string | null
  title_i18n: Record<string, string>
  description_i18n: Record<string, string> | null
  price: number | null
  is_free: boolean
  stroller_friendly: boolean
  open_weekends: boolean
  schedule: string | null
  images: string[]
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  place?: { id: string; name_i18n: Record<string, string>; city: { name: string } }
  category?: { id: string; name_i18n: Record<string, string>; slug: string }
  i18n_status?: Record<string, FieldI18nStatus> | null
}

export interface Category {
  id: string
  name_i18n: Record<string, string>
  slug: string
  order: number
  parent_id: string | null
  created_at: string
}

// Usados por el scaffold de dashboard (HomeChart/HomeDateRangePicker/
// HomePeriodSelect) y por la página de analytics de eventos de usuario.
export type Range = { start: Date; end: Date }
export type Period = 'daily' | 'weekly' | 'monthly'
