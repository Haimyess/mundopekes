import { serverSupabaseClient } from '#supabase/server'
import { logError, logInfo } from '../../utils/logger'

interface ScheduleDay {
  open: boolean
  start: string
  end: string
}

interface WizardSchedule {
  sunday: ScheduleDay
  monday: ScheduleDay
  tuesday: ScheduleDay
  wednesday: ScheduleDay
  thursday: ScheduleDay
  friday: ScheduleDay
  saturday: ScheduleDay
}

interface SuggestionPayload {
  // ── Lugar ──────────────────────────────────────────────────────
  name_i18n: Record<string, string>
  description_i18n?: Record<string, string>
  location: {
    address: string
    city: string
    lat?: number
    lng?: number
  }
  // ── Actividad ──────────────────────────────────────────────────
  // Título de la actividad (distinto de name_i18n que es el nombre del lugar)
  title_i18n?: Record<string, string>
  category_id: string
  age_range_ids: number[]
  best_season: string[]
  type: string[]
  // ── Detalles ───────────────────────────────────────────────────
  is_free: boolean
  price?: number
  stroller_friendly: boolean
  has_shadow: boolean
  has_bathrooms: boolean
  open_weekends: boolean
  // Undefined when hours_unknown=true; null/structured when known
  schedule_structured?: WizardSchedule | null
  // ── Metadata ───────────────────────────────────────────────────
  metadata?: {
    // Google Place identifiers
    google_place_id?: string
    place_photo_url?: string
    google_types?: string[]
    // Editable place info (seeded from Google, may be user-edited)
    google_url?: string
    phone?: string
    website?: string
    wheelchair?: boolean | null
    opening_hours_text?: string[]
    photos?: string[]
    // Activity metadata
    generated_title?: string
    custom_activity?: string
    // Schedule
    hours_unknown?: boolean
  }
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body = await readBody<SuggestionPayload>(event)

  if (!body.name_i18n || Object.keys(body.name_i18n).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El nombre es requerido en al menos un idioma',
    })
  }
  if (!body.location?.city?.trim() && !body.location?.address?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'La ubicación es requerida' })
  }
  if (!body.category_id) {
    throw createError({ statusCode: 400, statusMessage: 'El tipo de actividad es requerido' })
  }

  const firstName = Object.values(body.name_i18n)[0] ?? 'unknown'
  await logInfo(event, 'suggestions/create', 'Creating suggestion', { name: firstName })

  // Build human-readable schedule text.
  // When hours_unknown=true the wizard sends schedule_structured=undefined → scheduleText=''.
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const DAY_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const scheduleText = DAYS.map((d, i) => {
    const day = body.schedule_structured?.[d as keyof WizardSchedule]
    if (!day?.open) return null
    return `${DAY_ES[i]}: ${day.start}–${day.end}`
  })
    .filter(Boolean)
    .join(', ')

  const meta = body.metadata ?? {}
  const hoursUnknown = meta.hours_unknown === true

  const { data, error } = await client
    .from('suggestions')
    .insert({
      name_i18n: body.name_i18n,
      description_i18n: body.description_i18n ?? {},
      location: body.location,
      category_id: body.category_id,
      age_range: {
        ids: body.age_range_ids ?? [],
      },
      type: body.type ?? [],
      best_season: body.best_season ?? [],
      stroller_friendly: body.stroller_friendly ?? false,
      open_weekends: body.open_weekends ?? false,
      is_free: body.is_free ?? true,
      schedule: scheduleText,
      images: [],
      status: 'pending',
      metadata: {
        // ── Google Place identifiers ──────────────────────────────
        google_place_id: meta.google_place_id ?? null,
        place_photo_url: meta.place_photo_url ?? null,
        google_types: meta.google_types ?? null,
        // ── Editable place info ───────────────────────────────────
        google_url: meta.google_url ?? null,
        phone: meta.phone ?? null,
        website: meta.website ?? null,
        wheelchair: meta.wheelchair ?? null,
        opening_hours_text: meta.opening_hours_text?.length ? meta.opening_hours_text : null,
        photos: meta.photos?.length ? meta.photos : null,
        // ── Activity ─────────────────────────────────────────────
        generated_title: meta.generated_title ?? null,
        custom_activity: meta.custom_activity ?? null,
        // Activity title (locale-keyed; approval will DeepL-enrich to all 4 locales)
        title_i18n: body.title_i18n && Object.keys(body.title_i18n).length ? body.title_i18n : null,
        // ── Details ──────────────────────────────────────────────
        has_shadow: body.has_shadow ?? false,
        has_bathrooms: body.has_bathrooms ?? false,
        price: body.is_free ? null : (body.price ?? null),
        // ── Schedule ─────────────────────────────────────────────
        hours_unknown: hoursUnknown,
        // null when hours_unknown=true (schedule_structured arrives undefined → ?? null)
        schedule_structured: hoursUnknown ? null : (body.schedule_structured ?? null),
        age_range_ids: body.age_range_ids ?? [],
      },
    })
    .select()
    .single()

  if (error) {
    await logError(event, 'suggestions/create', 'Failed to insert suggestion', {
      name: firstName,
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, data }
})
