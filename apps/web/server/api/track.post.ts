import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '~/types/database.types'

const VALID_EVENT_TYPES = [
  'page_view',
  'search',
  'activity_view',
  'place_view',
  'directions_click',
  'contact_send',
  'suggestion_submit',
  'provider_interest',
] as const

const bodySchema = z.object({
  event_type: z.enum(VALID_EVENT_TYPES),
  session_id: z.string().min(1).max(100),
  locale: z.string().min(1).max(10),
  payload: z
    .record(z.string(), z.unknown())
    .refine((p) => JSON.stringify(p).length <= 4000, 'payload too large'),
})

export default defineEventHandler(async (event) => {
  await checkRateLimit(event, 'track', { limit: 60, windowSeconds: 60 })

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? 'Invalid event_type',
    })
  }

  const body = parsed.data
  const client = serverSupabaseServiceRole<Database>(event)

  const { error } = await client.from('activity_events').insert({
    event_type: body.event_type,
    session_id: body.session_id,
    locale: body.locale,
    // Ya validado como JSON-serializable arriba (refine sobre JSON.stringify).
    payload: body.payload as Json,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { ok: true }
})
