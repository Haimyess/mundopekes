// server/api/places/facets.get.ts
// Lightweight projection (city name + status, every place, unfiltered) used
// to compute faceted filter counts client-side — see useFacets.ts.
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase.from('places').select('status, city:cities(name)')

  if (error) throw createError({ statusCode: 500, message: error.message })

  return (data ?? []).map((row) => ({
    status: row.status as string,
    city: (row.city as { name?: string } | null)?.name ?? null,
  }))
})
