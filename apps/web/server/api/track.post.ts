import { trackingEventSchema } from '@mundopekes/schemas'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '@mundopekes/types'

export default defineEventHandler(async (event) => {
  await checkRateLimit(event, 'track', { limit: 60, windowSeconds: 60 })

  const raw = await readBody(event)
  const parsed = trackingEventSchema.safeParse(raw)

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
