// server/api/activities/facets.get.ts
// Lightweight projection (status/category/place, every activity, unfiltered)
// used to compute faceted filter counts client-side — see useFacets.ts.
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase.from('activities').select('status, category_id, place_id')

  if (error) throw createError({ statusCode: 500, message: error.message })

  return (data ?? []).map((row) => ({
    status: row.status as string,
    category_id: row.category_id as string | null,
    place_id: row.place_id as string | null,
  }))
})
