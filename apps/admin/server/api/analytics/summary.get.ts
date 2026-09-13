import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const [
    activities,
    places,
    providers,
    suggestions,
    pendingSuggestions,
    contactRequests,
    pendingContactRequests,
    recentFeedbacks,
  ] = await Promise.all([
    supabase.from('activities').select('*', { count: 'exact', head: true }),
    supabase.from('places').select('*', { count: 'exact', head: true }),
    supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
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
    supabase
      .from('contact_requests')
      .select('id, name, email, message, created_at, status')
      .eq('intent', 'feedback' as 'feedback' | 'outdated_activity' | 'provider_inquiry' | 'other')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    totalActivities: activities.count ?? 0,
    totalPlaces: places.count ?? 0,
    totalProviders: providers.count ?? 0,
    totalSuggestions: suggestions.count ?? 0,
    pendingSuggestions: pendingSuggestions.count ?? 0,
    totalContactRequests: contactRequests.count ?? 0,
    pendingContactRequests: pendingContactRequests.count ?? 0,
    recentFeedbacks: recentFeedbacks.data ?? [],
  }
})
