import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50))
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = serverSupabaseServiceRole<Database>(event)

  let req = supabase
    .from('activity_events')
    .select('id, event_type, session_id, locale, payload, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const eventType = typeof query.eventType === 'string' ? query.eventType : undefined
  if (eventType) req = req.eq('event_type', eventType)

  // Filtro secundario, dependiente del tipo de evento elegido — ver
  // apps/admin/server/api/user-events/filter-options.get.ts para las
  // opciones que alimentan estos selectores en el front.
  if (query.term) req = req.eq('payload->>query', query.term as string)
  if (query.category) req = req.eq('payload->>category', query.category as string)
  if (query.targetId) {
    const field =
      eventType === 'place_view'
        ? 'payload->>place_id'
        : eventType === 'activity_view'
          ? 'payload->>activity_id'
          : 'payload->>target_id'
    req = req.eq(field, query.targetId as string)
  }

  const { data, error, count } = await req
  if (error) throw createError({ statusCode: 500, message: error.message })

  const totalPages = Math.ceil((count ?? 0) / limit)
  return { data: data ?? [], count: count ?? 0, page, totalPages }
})
