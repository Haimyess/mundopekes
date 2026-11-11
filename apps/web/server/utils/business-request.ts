import { serverSupabaseServiceRole } from '#supabase/server'
import { businessRequestSchema, type BusinessRequest } from '@mundopekes/schemas'
import type { Database } from '@mundopekes/types'
import { setResponseStatus, type H3Event } from 'h3'
import { getSearchDataset } from './search-dataset'

type ClaimRequest = Extract<BusinessRequest, { kind: 'claim' }>
type JoinRequest = Extract<BusinessRequest, { kind: 'join' }>
type BusinessRequestInsert = Database['public']['Tables']['business_requests']['Insert']
type ServiceClient = ReturnType<typeof serverSupabaseServiceRole<Database>>

const PENDING_STATUS = 'pending'
const LOG_CONTEXT = 'business-requests/create'
const FALLBACK_NAME_LOCALES = ['he', 'en', 'es', 'ru'] as const

function placeName(names: Record<string, string> | null | undefined, locale: string) {
  if (!names) return null
  const preferred = [locale, ...FALLBACK_NAME_LOCALES].map((key) => names[key]?.trim())
  return preferred.find(Boolean) ?? null
}

async function resolveClaimedPlaceName(event: H3Event, request: ClaimRequest) {
  const dataset = await getSearchDataset(event)
  const place = dataset.places.find(({ id }) => id === request.placeId)
  const name = placeName(place?.name_i18n as Record<string, string> | undefined, request.locale)
  if (!name) throw createError({ statusCode: 404, statusMessage: 'Place not found' })
  return name
}

function joinRow(request: JoinRequest): BusinessRequestInsert {
  return {
    kind: request.kind,
    business_name: request.businessName,
    activity_type: request.activityType,
    city: request.city,
    phone: request.phone,
    locale: request.locale,
  }
}

function claimRow(request: ClaimRequest, businessName: string): BusinessRequestInsert {
  return {
    kind: request.kind,
    place_id: request.placeId,
    business_name: businessName,
    contact_name: request.name,
    role: request.role,
    email: request.email.toLowerCase(),
    phone: request.phone,
    locale: request.locale,
    accepted_terms_at: new Date().toISOString(),
  }
}

async function hasPendingClaim(client: ServiceClient, request: ClaimRequest) {
  const { count } = await client
    .from('business_requests')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'claim')
    .eq('status', PENDING_STATUS)
    .eq('place_id', request.placeId)
    .eq('email', request.email.toLowerCase())
  return (count ?? 0) > 0
}

export async function createBusinessRequest(event: H3Event, raw: unknown) {
  const parsed = businessRequestSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid request body',
    })
  }
  const request = parsed.data

  if (!(await verifyTurnstileToken(event, request.turnstileToken))) {
    throw createError({ statusCode: 403, statusMessage: 'Verification failed' })
  }

  const client = serverSupabaseServiceRole<Database>(event)
  const row: BusinessRequestInsert =
    request.kind === 'claim'
      ? claimRow(request, await resolveClaimedPlaceName(event, request))
      : joinRow(request)

  if (request.kind === 'claim' && (await hasPendingClaim(client, request))) {
    await logInfo(event, LOG_CONTEXT, 'Duplicate pending claim ignored', {
      placeId: request.placeId,
    })
    setResponseStatus(event, 201)
    return { ok: true }
  }

  const { error } = await client.from('business_requests').insert(row)
  if (error) {
    await logError(event, LOG_CONTEXT, 'Failed to save business request', {
      kind: request.kind,
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: 'Could not save the request' })
  }

  await logInfo(event, LOG_CONTEXT, 'Business request received', {
    kind: request.kind,
    placeId: request.kind === 'claim' ? request.placeId : null,
  })
  setResponseStatus(event, 201)
  return { ok: true }
}
