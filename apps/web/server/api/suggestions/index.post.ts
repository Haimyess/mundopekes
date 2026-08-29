import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { logError, logInfo } from '../../utils/logger'
// findPlaceDuplicates / findExperienceDuplicates come from
// layers/domain/server/utils/duplicate-detection.ts via Nitro's cross-layer
// server/utils auto-import (same mechanism that exposes checkRateLimit here).

const scheduleDaySchema = z.object({
  open: z.boolean(),
  start: z.string().max(10),
  end: z.string().max(10),
})

const wizardScheduleSchema = z.object({
  sunday: scheduleDaySchema,
  monday: scheduleDaySchema,
  tuesday: scheduleDaySchema,
  wednesday: scheduleDaySchema,
  thursday: scheduleDaySchema,
  friday: scheduleDaySchema,
  saturday: scheduleDaySchema,
})

type WizardSchedule = z.infer<typeof wizardScheduleSchema>

// ── Fields shared by both suggestion types (all experience-level) ──────────
const experienceFieldsSchema = z.object({
  title_i18n: z.record(z.string(), z.string().max(200)).optional(),
  category_id: z.string().min(1, 'El tipo de actividad es requerido'),
  age_range_ids: z.array(z.number()).max(20).default([]),
  best_season: z.array(z.string().max(50)).max(10).default([]),
  type: z.array(z.string().max(50)).max(20).default([]),
  is_free: z.boolean().default(true),
  price: z.number().min(0).max(1_000_000).optional(),
  stroller_friendly: z.boolean().default(false),
  has_shadow: z.boolean().default(false),
  has_bathrooms: z.boolean().default(false),
  open_weekends: z.boolean().default(false),
  schedule_structured: wizardScheduleSchema.nullish(),
})

// ── Branch A: place doesn't exist yet — user proposes both ─────────────────
const newPlaceSchema = experienceFieldsSchema.extend({
  suggestion_type: z.literal('new_place_with_experience'),
  name_i18n: z.record(z.string(), z.string().max(200)),
  description_i18n: z.record(z.string(), z.string().max(2000)).optional(),
  location: z.object({
    address: z.string().max(300).optional().default(''),
    city: z.string().max(120).optional().default(''),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  metadata: z
    .object({
      google_place_id: z.string().max(200).optional(),
      place_photo_url: z.string().max(2000).optional(),
      google_types: z.array(z.string().max(100)).max(30).optional(),
      google_url: z.string().max(2000).optional(),
      phone: z.string().max(50).optional(),
      website: z.string().max(2000).optional(),
      wheelchair: z.boolean().nullish(),
      opening_hours_text: z.array(z.string().max(200)).max(20).optional(),
      photos: z.array(z.string().max(2000)).max(30).optional(),
      generated_title: z.string().max(300).optional(),
      custom_activity: z.string().max(2000).optional(),
      hours_unknown: z.boolean().optional(),
    })
    .optional(),
})

// ── Branch B: place already exists in our DB — only the experience is new ──
const existingPlaceSchema = experienceFieldsSchema.extend({
  suggestion_type: z.literal('experience_for_existing_place'),
  place_id: z.string().uuid('place_id inválido'),
  metadata: z
    .object({
      generated_title: z.string().max(300).optional(),
      custom_activity: z.string().max(2000).optional(),
      hours_unknown: z.boolean().optional(),
    })
    .optional(),
})

const bodySchema = z
  .discriminatedUnion('suggestion_type', [newPlaceSchema, existingPlaceSchema])
  .superRefine((body, ctx) => {
    if (body.suggestion_type === 'new_place_with_experience') {
      if (Object.keys(body.name_i18n).length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['name_i18n'],
          message: 'El nombre es requerido en al menos un idioma',
        })
      }
      if (!body.location.city.trim() && !body.location.address.trim()) {
        ctx.addIssue({ code: 'custom', path: ['location'], message: 'La ubicación es requerida' })
      }
    } else {
      // experience_for_existing_place: no place name to fall back on server-side —
      // the activity title must be provided by the client.
      if (!body.title_i18n || Object.values(body.title_i18n).every((v) => !v.trim())) {
        ctx.addIssue({
          code: 'custom',
          path: ['title_i18n'],
          message: 'El título de la actividad es requerido',
        })
      }
    }
  })

function buildScheduleText(schedule: WizardSchedule | null | undefined): string {
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const DAY_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return DAYS.map((d, i) => {
    const day = schedule?.[d as keyof WizardSchedule]
    if (!day?.open) return null
    return `${DAY_ES[i]}: ${day.start}–${day.end}`
  })
    .filter(Boolean)
    .join(', ')
}

export default defineEventHandler(async (event) => {
  await checkRateLimit(event, 'suggestions/create', { limit: 5, windowSeconds: 3600 })

  const client = await serverSupabaseClient(event)
  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid request body',
    })
  }

  const body = parsed.data
  const meta = body.metadata ?? {}
  const hoursUnknown = meta.hours_unknown === true
  const scheduleText = hoursUnknown ? '' : buildScheduleText(body.schedule_structured)

  const sharedFields = {
    category_id: body.category_id,
    age_range: { ids: body.age_range_ids ?? [] },
    type: body.type ?? [],
    best_season: body.best_season ?? [],
    stroller_friendly: body.stroller_friendly ?? false,
    open_weekends: body.open_weekends ?? false,
    is_free: body.is_free ?? true,
    schedule: scheduleText,
    images: [] as string[],
    status: 'pending' as const,
  }

  // ── Branch B: experience for an existing place ──────────────────────────
  if (body.suggestion_type === 'experience_for_existing_place') {
    const { data: place, error: placeError } = await client
      .from('places')
      .select('id')
      .eq('id', body.place_id)
      .eq('status', 'active')
      .single()

    if (placeError || !place) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El lugar seleccionado no existe o no está activo',
      })
    }

    const titleText = body.title_i18n ? (Object.values(body.title_i18n)[0] ?? '') : ''

    const dupMatches = await findExperienceDuplicates(client, {
      placeId: place.id,
      title: titleText,
      categoryId: body.category_id,
    })

    await logInfo(
      event,
      'suggestions/create',
      'Creating experience-for-existing-place suggestion',
      {
        place_id: place.id,
        title: titleText,
        flagged: dupMatches.length > 0,
      }
    )

    const { data, error } = await client
      .from('suggestions')
      .insert({
        ...sharedFields,
        suggestion_type: 'experience_for_existing_place',
        place_id: place.id,
        name_i18n: {},
        description_i18n: {},
        location: null,
        flagged_possible_duplicate: dupMatches.length > 0,
        possible_duplicate_activity_id: dupMatches[0]?.id ?? null,
        metadata: {
          generated_title: meta.generated_title ?? null,
          custom_activity: meta.custom_activity ?? null,
          title_i18n:
            body.title_i18n && Object.keys(body.title_i18n).length ? body.title_i18n : null,
          has_shadow: body.has_shadow ?? false,
          has_bathrooms: body.has_bathrooms ?? false,
          price: body.is_free ? null : (body.price ?? null),
          hours_unknown: hoursUnknown,
          schedule_structured: hoursUnknown ? null : (body.schedule_structured ?? null),
          age_range_ids: body.age_range_ids ?? [],
        },
      })
      .select()
      .single()

    if (error) {
      await logError(event, 'suggestions/create', 'Failed to insert suggestion (existing place)', {
        place_id: place.id,
        error: error.message,
      })
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return { success: true, data }
  }

  // ── Branch A: new place + experience ─────────────────────────────────────
  const firstName = Object.values(body.name_i18n)[0] ?? 'unknown'
  await logInfo(event, 'suggestions/create', 'Creating new-place suggestion', { name: firstName })

  const dupMatches = await findPlaceDuplicates(client, {
    name: firstName,
    lat: body.location.lat,
    lng: body.location.lng,
    googlePlaceId: meta.google_place_id,
  })

  const { data, error } = await client
    .from('suggestions')
    .insert({
      ...sharedFields,
      suggestion_type: 'new_place_with_experience',
      place_id: null,
      name_i18n: body.name_i18n,
      description_i18n: body.description_i18n ?? {},
      location: body.location,
      flagged_possible_duplicate: dupMatches.length > 0,
      possible_duplicate_of: dupMatches[0]?.id ?? null,
      metadata: {
        // ── Google Place identifiers ──────────────────────────────
        google_place_id: meta.google_place_id ?? null,
        place_photo_url: meta.place_photo_url ?? null,
        google_types: meta.google_types ?? null,
        // ── Editable place info ───────────────────────────────────
        google_url: meta.google_url ?? null,
        phone: meta.phone ?? null,
        website: sanitizeHttpUrl(meta.website),
        wheelchair: meta.wheelchair ?? null,
        opening_hours_text: meta.opening_hours_text?.length ? meta.opening_hours_text : null,
        photos: meta.photos?.length ? meta.photos : null,
        // ── Activity ─────────────────────────────────────────────
        generated_title: meta.generated_title ?? null,
        custom_activity: meta.custom_activity ?? null,
        title_i18n: body.title_i18n && Object.keys(body.title_i18n).length ? body.title_i18n : null,
        // ── Details ──────────────────────────────────────────────
        has_shadow: body.has_shadow ?? false,
        has_bathrooms: body.has_bathrooms ?? false,
        price: body.is_free ? null : (body.price ?? null),
        // ── Schedule ─────────────────────────────────────────────
        hours_unknown: hoursUnknown,
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
