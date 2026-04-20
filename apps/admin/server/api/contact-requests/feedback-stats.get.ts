import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

  const [totalRes, thisMonthRes, pendingRes, resolvedRes, byMonthRes] = await Promise.all([
    supabase
      .from('contact_requests')
      .select('*', { count: 'exact', head: true })
      .eq('intent', 'feedback'),
    supabase
      .from('contact_requests')
      .select('*', { count: 'exact', head: true })
      .eq('intent', 'feedback')
      .gte('created_at', startOfMonth),
    supabase
      .from('contact_requests')
      .select('*', { count: 'exact', head: true })
      .eq('intent', 'feedback')
      .eq('status', 'pending'),
    supabase
      .from('contact_requests')
      .select('*', { count: 'exact', head: true })
      .eq('intent', 'feedback')
      .eq('status', 'resolved'),
    supabase
      .from('contact_requests')
      .select('created_at')
      .eq('intent', 'feedback')
      .gte('created_at', sixMonthsAgo)
      .order('created_at', { ascending: true }),
  ])

  const byMonthMap: Record<string, number> = {}
  for (const r of byMonthRes.data ?? []) {
    const d = new Date(r.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonthMap[key] = (byMonthMap[key] ?? 0) + 1
  }
  const byMonth = Object.entries(byMonthMap).map(([month, count]) => ({ month, count }))

  return {
    total: totalRes.count ?? 0,
    thisMonth: thisMonthRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    resolved: resolvedRes.count ?? 0,
    byMonth,
  }
})
