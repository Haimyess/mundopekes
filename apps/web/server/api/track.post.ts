import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

const VALID_EVENT_TYPES = [
  'page_view',
  'search',
  'activity_view',
  'contact_send',
  'suggestion_submit',
  'provider_interest',
] as const

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    event_type: string
    session_id: string
    locale: string
    payload: object
  }>(event)

  if (!VALID_EVENT_TYPES.includes(body.event_type as (typeof VALID_EVENT_TYPES)[number])) {
    throw createError({ statusCode: 400, message: 'Invalid event_type' })
  }

  const client = serverSupabaseServiceRole<Database>(event)

  const { error } = await client.from('activity_events').insert({
    event_type: body.event_type,
    session_id: body.session_id,
    locale: body.locale,
    payload: body.payload,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { ok: true }
})
