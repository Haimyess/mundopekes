export interface SuggestionLocation {
  address: string
  city: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface SuggestionAgeRange {
  min: number
  max: number
}

export type SuggestionStatus = 'pending' | 'approved' | 'rejected'

export interface Suggestion {
  id: string
  name: string
  description: string | null
  location: SuggestionLocation
  age_range: SuggestionAgeRange
  type: string[]
  best_season: string[]
  stroller_friendly: boolean
  open_weekends: boolean
  is_free: boolean
  schedule: string | null
  images: string[]
  status: SuggestionStatus
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
}

export interface CreateSuggestionInput {
  name: string
  description?: string
  location: SuggestionLocation
  age_range: SuggestionAgeRange
  type: string[]
  best_season: string[]
  stroller_friendly: boolean
  open_weekends: boolean
  is_free: boolean
  schedule?: string
  images?: string[]
}

export interface SuggestionResponse {
  success: boolean
  data?: Suggestion
  error?: string
}
