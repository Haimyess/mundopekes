import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    activities,
    places,
    suggestions,
    pendingSuggestions,
    contactRequests,
    pendingContactRequests,
    totalLogs,
    errorLogs,
    recentErrors,
  ] = await Promise.all([
    supabase.from('activities').select('*', { count: 'exact', head: true }),
    supabase.from('places').select('*', { count: 'exact', head: true }),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }),
    supabase
      .from('suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('contact_requests').select('*', { count: 'exact', head: true }),
    supabase
      .from('contact_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('app_logs').select('*', { count: 'exact', head: true }),
    supabase
      .from('app_logs')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'error')
      .gte('created_at', since24h),
    supabase
      .from('app_logs')
      .select('id, level, context, message, created_at, metadata')
      .eq('level', 'error')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    totalActivities: activities.count ?? 0,
    totalPlaces: places.count ?? 0,
    totalSuggestions: suggestions.count ?? 0,
    pendingSuggestions: pendingSuggestions.count ?? 0,
    totalContactRequests: contactRequests.count ?? 0,
    pendingContactRequests: pendingContactRequests.count ?? 0,
    totalLogs: totalLogs.count ?? 0,
    errorLogs: errorLogs.count ?? 0,
    recentErrors: recentErrors.data ?? [],
  }
})
