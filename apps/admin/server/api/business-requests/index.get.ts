import { serverSupabaseServiceRole } from '#supabase/server'
import { BUSINESS_REQUEST_KINDS, BUSINESS_REQUEST_STATUSES } from '@mundopekes/schemas'
import type { Database } from '@mundopekes/types'

const PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function pickOption<Option extends string>(options: readonly Option[], value: unknown) {
  return options.find((option) => option === value)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.limit) || PAGE_SIZE))
  const from = (page - 1) * limit
  const kind = pickOption(BUSINESS_REQUEST_KINDS, query.kind)
  const status = pickOption(BUSINESS_REQUEST_STATUSES, query.status)

  const supabase = serverSupabaseServiceRole<Database>(event)
  let request = supabase
    .from('business_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (kind) request = request.eq('kind', kind)
  if (status) request = request.eq('status', status)

  const { data, error, count } = await request
  if (error) {
    await logError(event, 'business-requests/list', 'Failed to list business requests', {
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: 'Could not load business requests' })
  }

  return {
    data: data ?? [],
    count: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
})
