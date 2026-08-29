import { z } from 'zod'
import { randomUUID } from 'node:crypto'
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

// ── A place can carry one or several activities in the same submission ─────
const newActivitySchema = z.object({
  mode: z.literal('new'),
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
  metadata: z
    .object({
      generated_title: z.string().max(300).optional(),
      custom_activity: z.string().max(2000).optional(),
      hours_unknown: z.boolean().optional(),
    })
    .optional(),
})

// Reference to an activity that already exists at the place — nothing gets
// created for it, it's only here so the client can show it in the review
// step; the server silently ignores these when building suggestion rows.
const existingActivitySchema = z.object({
  mode: z.literal('existing'),
  activity_id: z.string().uuid(),
})

const activityItemSchema = z.discriminatedUnion('mode', [newActivitySchema, existingActivitySchema])

// ── The place itself: either a reference to one that already exists, or a
// brand-new one proposed alongside the activities ──────────────────────────
const newPlaceSchema = z.object({
  mode: z.literal('new'),
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
    })
    .optional(),
})

const existingPlaceSchema = z.object({
  mode: z.literal('existing'),
  place_id: z.string().uuid('place_id inválido'),
})

const placeSchema = z.discriminatedUnion('mode', [newPlaceSchema, existingPlaceSchema])

const bodySchema = z
  .object({
    place: placeSchema,
    activities: z.array(activityItemSchema).min(1).max(20),
    locale: z.string().max(10).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.place.mode === 'new') {
      if (Object.keys(body.place.name_i18n).length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['place', 'name_i18n'],
          message: 'El nombre es requerido en al menos un idioma',
        })
      }
      if (!body.place.location.city.trim() && !body.place.location.address.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['place', 'location'],
          message: 'La ubicación es requerida',
        })
      }
    }

    const newActivities = body.activities.filter((a) => a.mode === 'new')
    if (newActivities.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['activities'],
        message: 'Agregá al menos una actividad nueva',
      })
    }
    for (const [i, a] of newActivities.entries()) {
      if (!a.title_i18n || Object.values(a.title_i18n).every((v) => !v.trim())) {
        ctx.addIssue({
          code: 'custom',
          path: ['activities', i, 'title_i18n'],
          message: 'El título de la actividad es requerido',
        })
      }
    }
  })

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

const DAY_NAMES: Record<string, string[]> = {
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  he: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
}

function buildScheduleText(
  schedule: WizardSchedule | null | undefined,
  locale: string | undefined
): string {
  const names = DAY_NAMES[locale ?? ''] ?? DAY_NAMES.es!
  return DAY_KEYS.map((d, i) => {
    const day = schedule?.[d]
    if (!day?.open) return null
    return `${names[i]}: ${day.start}–${day.end}`
  })
    .filter(Boolean)
    .join(', ')
}

type NewActivity = z.infer<typeof newActivitySchema>

function buildActivitySharedFields(a: NewActivity, locale: string | undefined) {
  const meta = a.metadata ?? {}
  const hoursUnknown = meta.hours_unknown === true
  return {
    category_id: a.category_id,
    age_range: { ids: a.age_range_ids ?? [] },
    type: a.type ?? [],
    best_season: a.best_season ?? [],
    stroller_friendly: a.stroller_friendly ?? false,
    open_weekends: a.open_weekends ?? false,
    is_free: a.is_free ?? true,
    schedule: hoursUnknown ? '' : buildScheduleText(a.schedule_structured, locale),
    images: [] as string[],
    status: 'pending' as const,
    metadata: {
      generated_title: meta.generated_title ?? null,
      custom_activity: meta.custom_activity ?? null,
      title_i18n: a.title_i18n && Object.keys(a.title_i18n).length ? a.title_i18n : null,
      has_shadow: a.has_shadow ?? false,
      has_bathrooms: a.has_bathrooms ?? false,
      price: a.is_free ? null : (a.price ?? null),
      hours_unknown: hoursUnknown,
      schedule_structured: hoursUnknown ? null : (a.schedule_structured ?? null),
      age_range_ids: a.age_range_ids ?? [],
    },
  }
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
  const newActivities = body.activities.filter((a) => a.mode === 'new')
  const groupId = newActivities.length > 1 ? randomUUID() : null

  // ── Place resolves to either an existing row or new place fields ────────
  if (body.place.mode === 'existing') {
    const { data: place, error: placeError } = await client
      .from('places')
      .select('id')
      .eq('id', body.place.place_id)
      .eq('status', 'active')
      .single()

    if (placeError || !place) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El lugar seleccionado no existe o no está activo',
      })
    }

    await logInfo(event, 'suggestions/create', 'Creating experience(s) for existing place', {
      place_id: place.id,
      count: newActivities.length,
    })

    const rows = []
    for (const a of newActivities) {
      const titleText = a.title_i18n ? (Object.values(a.title_i18n)[0] ?? '') : ''
      const dupMatches = await findExperienceDuplicates(client, {
        placeId: place.id,
        title: titleText,
        categoryId: a.category_id,
      })
      rows.push({
        ...buildActivitySharedFields(a, body.locale),
        suggestion_type: 'experience_for_existing_place',
        place_id: place.id,
        suggestion_group_id: groupId,
        is_primary: true,
        name_i18n: {},
        description_i18n: {},
        location: null,
        flagged_possible_duplicate: dupMatches.length > 0,
        possible_duplicate_activity_id: dupMatches[0]?.id ?? null,
      })
    }

    const { data, error } = await client.from('suggestions').insert(rows).select()

    if (error) {
      await logError(event, 'suggestions/create', 'Failed to insert suggestions (existing place)', {
        place_id: place.id,
        error: error.message,
      })
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return { success: true, data }
  }

  // ── Branch A: new place + one or more experiences ──────────────────────
  const placeInput = body.place
  const meta = placeInput.metadata ?? {}
  const firstName = Object.values(placeInput.name_i18n)[0] ?? 'unknown'

  await logInfo(event, 'suggestions/create', 'Creating new-place suggestion(s)', {
    name: firstName,
    count: newActivities.length,
  })

  const dupMatches = await findPlaceDuplicates(client, {
    name: firstName,
    lat: placeInput.location.lat,
    lng: placeInput.location.lng,
    googlePlaceId: meta.google_place_id,
  })
  const flagged = dupMatches.length > 0
  const possibleDuplicateOf = dupMatches[0]?.id ?? null

  const rows = newActivities.map((a, i) => {
    const isPrimary = i === 0
    return {
      ...buildActivitySharedFields(a, body.locale),
      suggestion_type: 'new_place_with_experience',
      place_id: null,
      suggestion_group_id: groupId,
      is_primary: isPrimary,
      name_i18n: isPrimary ? placeInput.name_i18n : {},
      description_i18n: isPrimary ? (placeInput.description_i18n ?? {}) : {},
      location: isPrimary ? placeInput.location : null,
      flagged_possible_duplicate: flagged,
      possible_duplicate_of: possibleDuplicateOf,
      metadata: {
        ...buildActivitySharedFields(a, body.locale).metadata,
        // Place-level fields only carried on the primary row — approval
        // reads them from whichever sibling has `is_primary = true`.
        ...(isPrimary
          ? {
              google_place_id: meta.google_place_id ?? null,
              place_photo_url: meta.place_photo_url ?? null,
              google_types: meta.google_types ?? null,
              google_url: meta.google_url ?? null,
              phone: meta.phone ?? null,
              website: sanitizeHttpUrl(meta.website),
              wheelchair: meta.wheelchair ?? null,
              opening_hours_text: meta.opening_hours_text?.length ? meta.opening_hours_text : null,
              photos: meta.photos?.length ? meta.photos : null,
            }
          : {}),
      },
    }
  })

  const { data, error } = await client.from('suggestions').insert(rows).select()

  if (error) {
    await logError(event, 'suggestions/create', 'Failed to insert suggestions', {
      name: firstName,
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, data }
})
