// server/api/suggestions/facets.get.ts
// Lightweight projection (4 fields, every suggestion, unfiltered) used to
// compute faceted filter counts client-side — see useSuggestionFacets.ts.
// Deliberately NOT the full paginated row shape: this is the "how many
// suggestions would each filter option leave me with" dataset, not the
// list itself, so it stays cheap even as the table grows.
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('suggestions')
    .select('status, category_id, location, is_free')

  if (error) throw createError({ statusCode: 500, message: error.message })

  return (data ?? []).map((row) => ({
    status: row.status as string,
    category_id: row.category_id as string | null,
    city: (row.location as { city?: string } | null)?.city ?? null,
    is_free: row.is_free as boolean,
  }))
})
