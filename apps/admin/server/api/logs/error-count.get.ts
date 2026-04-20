import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('app_logs')
    .select('*', { count: 'exact', head: true })
    .eq('level', 'error' as 'error' | 'warn' | 'info')
    .gte('created_at', since)

  return { count: count ?? 0 }
})
