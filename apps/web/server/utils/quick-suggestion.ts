import { serverSupabaseClient } from '#supabase/server'
import { quickSuggestionRequestSchema } from '@mundopekes/schemas'
import { setResponseStatus, type H3Event } from 'h3'

const QUICK_SOURCE = 'quick'
const NEW_PLACE_TYPE = 'new_place_with_experience'
const PENDING_STATUS = 'pending'

export async function createQuickSuggestion(event: H3Event, raw: unknown) {
  const parsed = quickSuggestionRequestSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid request body',
    })
  }
  const body = parsed.data

  if (!(await verifyTurnstileToken(event, body.turnstileToken))) {
    throw createError({ statusCode: 403, statusMessage: 'Verification failed' })
  }

  const client = await serverSupabaseClient(event)
  const googlePlaceId = await resolveGooglePlaceId(body.link)
  const duplicates = await findPlaceDuplicates(client, { name: body.name, googlePlaceId })
  const duplicate = duplicates[0] ?? null

  const { error } = await client.from('suggestions').insert({
    suggestion_type: NEW_PLACE_TYPE,
    status: PENDING_STATUS,
    name_i18n: { [body.locale]: body.name },
    location: { city: body.where, address: '' },
    age_range: { ids: [] },
    type: [],
    best_season: [],
    images: [],
    flagged_possible_duplicate: duplicate !== null,
    possible_duplicate_of: duplicate?.id ?? null,
    metadata: {
      source: QUICK_SOURCE,
      origin: body.origin ?? null,
      where: body.where,
      link: body.link ?? null,
      why: body.why ?? null,
      locale: body.locale,
      google_place_id: googlePlaceId,
    },
  })

  if (error) {
    await logError(event, 'suggestions/quick', 'Failed to save quick suggestion', {
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: 'Could not save the suggestion' })
  }

  await logInfo(event, 'suggestions/quick', 'Quick suggestion received', {
    duplicate: duplicate?.id ?? null,
    origin: body.origin ?? null,
  })
  setResponseStatus(event, 201)
  return { ok: true }
}
