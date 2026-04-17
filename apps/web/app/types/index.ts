/**
 * Re-exports de todos los types
 */

// ── Activity ──────────────────────────────────────────────────────
export type {
  Activity,
  Place,
  City,
  Category,
  AgeRange,
  Season,
  ActivityStatus,
  ActivityFilters,
  ActivitiesResponse,
  SeasonValue,
  ActivityAgeRangeRow,
  ActivitySeasonRow,
} from './activity'

// ── Suggestion ────────────────────────────────────────────────────
export type {
  Suggestion,
  SuggestionStatus,
  SuggestionLocation,
  SuggestionAgeRange,
  CreateSuggestionInput,
  SuggestionResponse
} from './suggestion'

// ── UI ────────────────────────────────────────────────────────────
export type {
  ButtonVariant,
  BadgeVariant,
  ComponentSize,
  DropdownItem,
  SelectOption,
  BaseComponentProps
} from './ui'

// ── Filter options ────────────────────────────────────────────────
export interface CityOption {
  id: number
  name: string
  region: string | null
}

export interface AgeRangeOption {
  id: number
  label_key: string
  min_months: number
  max_months: number
  sort_order: number
}

export interface SeasonOption {
  id: number
  value: string
  label_key: string
  sort_order: number
}

export interface CategoryOption {
  id: string
  name: string
  slug: string
  icon: string | null
}

export interface FilterOptions {
  cities: CityOption[]
  ageRanges: AgeRangeOption[]
  seasons: SeasonOption[]
  categories: CategoryOption[]
}

// ── Database ──────────────────────────────────────────────────────
export type { Database } from './database.types'