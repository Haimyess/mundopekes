import type { SupabaseClient } from '@supabase/supabase-js'

export interface AgeRange {
  id: number
  label: string
  min_months: number
  max_months: number
}

// Populated at startup via loadAgeRanges() — never hardcode these ids, they come from Supabase.
export const AGE_RANGES: AgeRange[] = []

export async function loadAgeRanges(supabase: SupabaseClient): Promise<AgeRange[]> {
  const { data, error } = await supabase
    .from('age_ranges')
    .select('id, label_key, min_months, max_months')
    .order('sort_order')

  if (error) {
    throw new Error(`Failed to load age_ranges from Supabase: ${error.message}`)
  }

  AGE_RANGES.length = 0
  for (const row of data ?? []) {
    AGE_RANGES.push({
      id: row.id,
      label: row.label_key,
      min_months: row.min_months,
      max_months: row.max_months,
    })
  }

  return AGE_RANGES
}
