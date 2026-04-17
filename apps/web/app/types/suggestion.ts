/**
 * Types para Suggestions (Sugerencias de usuarios)
 *
 * A diferencia de `activities`, la tabla `suggestions` SÍ guarda
 * location y age_range como jsonb directamente (sin joins).
 * También guarda type[] y best_season[] como arrays de texto.
 */

import type { SuggestionLocation, SuggestionAgeRange } from './database.types'

// Re-exportamos para uso externo
export type { SuggestionLocation, SuggestionAgeRange }

export type SuggestionStatus = 'pending' | 'approved' | 'rejected'

export interface Suggestion {
  id: string
  name: string
  description: string | null
  location: SuggestionLocation   // jsonb: { address, city, coordinates? }
  age_range: SuggestionAgeRange  // jsonb: { min, max } en meses
  type: string[]                 // array de texto libre
  best_season: string[]          // array de texto libre
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

/**
 * Input para crear una sugerencia desde el formulario público.
 * Excluye campos auto-generados y los de revisión admin.
 */
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