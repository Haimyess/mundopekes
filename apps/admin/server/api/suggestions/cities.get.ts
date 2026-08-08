// server/api/suggestions/cities.get.ts
// Distinct city values across suggestions, for the city filter dropdown.
// Suggestions store `location.city` as free text (the catalog-agent extracts
// it from Google's formatted_address), so it isn't a foreign key into the
// curated `cities` table — a plain Supabase query can't DISTINCT on a JSONB
// path, so this fetches just the location column and dedupes in memory.
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase.from('suggestions').select('location')
  if (error) throw createError({ statusCode: 500, message: error.message })

  const cities = new Set<string>()
  for (const row of data ?? []) {
    const city = (row.location as { city?: string } | null)?.city
    if (city?.trim()) cities.add(city.trim())
  }

  return [...cities].sort((a, b) => a.localeCompare(b, 'he'))
})
