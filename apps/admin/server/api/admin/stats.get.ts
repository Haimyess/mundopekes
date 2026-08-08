import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const [places, activities, categories] = await Promise.all([
    supabase.from('places').select('*', { count: 'exact', head: true }),
    supabase.from('activities').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
  ])

  return {
    places: places.count ?? 0,
    activities: activities.count ?? 0,
    categories: categories.count ?? 0,
  }
})
