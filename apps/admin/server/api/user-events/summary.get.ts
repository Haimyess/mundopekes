import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const since7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    totalEvents,
    eventsLast7Days,
    searchEvents,
    activityViewEvents,
    eventTypeEvents,
    recentEvents,
  ] = await Promise.all([
    supabase.from('activity_events').select('*', { count: 'exact', head: true }),
    supabase
      .from('activity_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since7days),
    supabase
      .from('activity_events')
      .select('payload')
      .eq('event_type', 'search')
      .gte('created_at', since7days)
      .limit(500),
    supabase
      .from('activity_events')
      .select('payload')
      .eq('event_type', 'activity_view')
      .gte('created_at', since7days)
      .limit(500),
    supabase.from('activity_events').select('event_type').gte('created_at', since7days).limit(2000),
    supabase
      .from('activity_events')
      .select('id, event_type, session_id, locale, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const searchCounts: Record<string, number> = {}
  for (const row of searchEvents.data ?? []) {
    const payload = row.payload as Record<string, string>
    const query = payload?.query
    if (!query) continue
    searchCounts[query] = (searchCounts[query] ?? 0) + 1
  }
  const topSearches = Object.entries(searchCounts)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const activityCounts: Record<string, { title: string; count: number }> = {}
  for (const row of activityViewEvents.data ?? []) {
    const payload = row.payload as Record<string, string>
    const id = payload?.activity_id
    if (!id) continue
    if (!activityCounts[id]) activityCounts[id] = { title: payload?.title ?? id, count: 0 }
    activityCounts[id].count++
  }
  const topActivities = Object.entries(activityCounts)
    .map(([activity_id, { title, count }]) => ({ activity_id, title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const typeCounts: Record<string, number> = {}
  for (const row of eventTypeEvents.data ?? []) {
    typeCounts[row.event_type] = (typeCounts[row.event_type] ?? 0) + 1
  }
  const eventsByType = Object.entries(typeCounts)
    .map(([event_type, count]) => ({ event_type, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalEvents: totalEvents.count ?? 0,
    eventsLast7Days: eventsLast7Days.count ?? 0,
    topSearches,
    topActivities,
    eventsByType,
    recentEvents: recentEvents.data ?? [],
  }
})
