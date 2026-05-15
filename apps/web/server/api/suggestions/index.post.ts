import { serverSupabaseClient } from '#supabase/server'
import { logError, logInfo } from '../../utils/logger'

interface ScheduleDay {
  open: boolean
  start: string
  end: string
}

interface SuggestionPayload {
  // Lugar
  name_i18n: Record<string, string>
  description_i18n?: Record<string, string>
  location: {
    address: string
    city: string
    lat?: number
    lng?: number
  }
  // Actividad
  category_id: string
  age_range_ids: number[]
  best_season: string[]
  type: string[]
  // Detalles
  is_free: boolean
  price?: number
  stroller_friendly: boolean
  has_shadow: boolean
  has_bathrooms: boolean
  open_weekends: boolean
  // Horarios — objeto por día
  schedule_structured: {
    sunday: ScheduleDay
    monday: ScheduleDay
    tuesday: ScheduleDay
    wednesday: ScheduleDay
    thursday: ScheduleDay
    friday: ScheduleDay
    saturday: ScheduleDay
  }
  // Metadata de Google
  metadata: {
    google_place_id?: string
    place_photo_url?: string
    google_types?: string[]
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

  // Construir schedule como texto legible también
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const DAY_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const scheduleText = DAYS.map((d, i) => {
    const day = body.schedule_structured?.[d as keyof typeof body.schedule_structured]
    if (!day?.open) return null
    return `${DAY_ES[i]}: ${day.start}–${day.end}`
  })
    .filter(Boolean)
    .join(', ')

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
        ...body.metadata,
        has_shadow: body.has_shadow ?? false,
        has_bathrooms: body.has_bathrooms ?? false,
        price: body.is_free ? null : (body.price ?? null),
        schedule_structured: body.schedule_structured ?? null,
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
