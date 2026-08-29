import type { PlaceSearchResult, PlaceDetails } from '~/composables/usePlacesSearch'
import type { LocalPlaceMatch } from '~/composables/useLocalPlaceSearch'
import type { LocalActivityMatch } from '~/composables/useLocalActivitySearch'

export type { PlaceDetails }

export interface ScheduleDay {
  open: boolean
  start: string
  end: string
}

export interface WizardSchedule {
  sunday: ScheduleDay
  monday: ScheduleDay
  tuesday: ScheduleDay
  wednesday: ScheduleDay
  thursday: ScheduleDay
  friday: ScheduleDay
  saturday: ScheduleDay
}

export interface WizardCategory {
  id: string
  slug: string
  name_i18n: Record<string, string>
}

export interface WizardPlaceInfo {
  phone: string
  website: string
  googleUrl: string
  // Newline-separated weekday text from Google, editable by the user
  openingHoursText: string
  wheelchair: boolean | null
}

// A place can have several activities suggested in the same submission. Each
// slot is either a reference to an activity that already exists at the place
// (nothing to create — reused as-is) or a brand-new activity with its own
// fields (was previously "Detalles", now folded per-activity).
export interface ActivityDraftNew {
  mode: 'new'
  localId: string
  category: WizardCategory | null
  customActivity: string
  selectedSeasons: string[] // season VALUEs, e.g. ['spring', 'summer']
  selectedAgeIds: number[]
  selectedAgeLabels: string[] // translated at selection time
  isFree: boolean
  price: string
  stroller: boolean
  shadow: boolean
  bathrooms: boolean
  weekends: boolean
  schedule: WizardSchedule
  hoursUnknown: boolean
  titleManual: string
  titleTouched: boolean
}

export interface ActivityDraftExisting {
  mode: 'existing'
  localId: string
  id: string
  title: string
}

export type ActivityDraft = ActivityDraftNew | ActivityDraftExisting

export interface WizardState {
  // Set when the user picked an existing place from our own DB (local search).
  // When non-null, the suggestion is `experience_for_existing_place` and no
  // place-detail fields (name/address/description/etc.) are collected at all.
  matchedPlace: LocalPlaceMatch | null
  // Toggled on when the user can't find their place in local search and opts
  // to propose a new one (reveals the Google-search-or-manual UI below).
  showNewPlaceForm: boolean
  placeResult: PlaceSearchResult | null
  placeDetails: PlaceDetails | null
  name_i18n: Record<string, string>
  description_i18n: Record<string, string>
  manualName: string
  manualCity: string
  manualAddress: string
  description: string
  isManual: boolean
  placeInfo: WizardPlaceInfo
  manualLat: number | null
  manualLng: number | null
  activities: ActivityDraft[]
}

// Order: place first ("where?"), then activity/activities ("what can you do
// here?") — an existing place skips straight to picking/creating activities;
// a new place is completed once, then one or more activities are added.
export const WIZARD_STEPS = [
  { labelKey: 'suggest.step_lugar' },
  { labelKey: 'suggest.step_actividad' },
  { labelKey: 'suggest.step_resumen' },
]

export const defaultSchedule = (): WizardSchedule => ({
  sunday: { open: false, start: '09:00', end: '17:00' },
  monday: { open: true, start: '09:00', end: '17:00' },
  tuesday: { open: true, start: '09:00', end: '17:00' },
  wednesday: { open: true, start: '09:00', end: '17:00' },
  thursday: { open: true, start: '09:00', end: '17:00' },
  friday: { open: false, start: '09:00', end: '14:00' },
  saturday: { open: false, start: '10:00', end: '16:00' },
})

let localIdCounter = 0
const nextLocalId = () => `draft-${Date.now()}-${localIdCounter++}`

export const defaultActivityDraft = (): ActivityDraftNew => ({
  mode: 'new',
  localId: nextLocalId(),
  category: null,
  customActivity: '',
  selectedSeasons: [],
  selectedAgeIds: [],
  selectedAgeLabels: [],
  isFree: true,
  price: '',
  stroller: false,
  shadow: false,
  bathrooms: false,
  weekends: false,
  schedule: defaultSchedule(),
  hoursUnknown: false,
  titleManual: '',
  titleTouched: false,
})

const defaultState = (): WizardState => ({
  matchedPlace: null,
  showNewPlaceForm: false,
  placeResult: null,
  placeDetails: null,
  name_i18n: {},
  description_i18n: {},
  manualName: '',
  manualCity: '',
  manualAddress: '',
  description: '',
  isManual: false,
  placeInfo: { phone: '', website: '', googleUrl: '', openingHoursText: '', wheelchair: null },
  manualLat: null,
  manualLng: null,
  activities: [],
})

// Parses a price string. Unlike `Number.parseFloat(s) || undefined`, this
// correctly keeps an explicit "0" instead of collapsing it to undefined
// (0 is falsy, so the old `||` pattern silently dropped a legitimate ₪0).
export function parsePrice(raw: string): number | undefined {
  const n = Number.parseFloat(raw)
  return Number.isNaN(n) ? undefined : n
}

export function useSuggestionWizard() {
  const state = useState<WizardState>('suggestion-wizard', defaultState)

  const { t, locale } = useI18n()
  const { tc } = useI18nContent()

  // ─── Computed: place ────────────────────────────────────────────
  const placeName = computed(() => {
    if (state.value.matchedPlace) return tc(state.value.matchedPlace.name_i18n)
    return state.value.isManual ? state.value.manualName : (state.value.placeResult?.name ?? '')
  })

  const placeAddress = computed(() => {
    if (state.value.matchedPlace) return state.value.matchedPlace.city?.name ?? ''
    return state.value.isManual
      ? [state.value.manualCity, state.value.manualAddress].filter(Boolean).join(', ')
      : (state.value.placeResult?.address ?? '')
  })

  const placePhoto = computed(
    () => state.value.matchedPlace?.thumbnail ?? state.value.placeResult?.photo_url ?? null
  )

  const hasPlace = computed(() => {
    if (state.value.matchedPlace) return true
    if (!state.value.showNewPlaceForm) return false
    return state.value.isManual ? !!state.value.manualName.trim() : !!state.value.placeResult
  })

  // Discriminator sent to the server — mirrors suggestions.suggestion_type.
  const suggestionType = computed<'new_place_with_experience' | 'experience_for_existing_place'>(
    () => (state.value.matchedPlace ? 'experience_for_existing_place' : 'new_place_with_experience')
  )

  // ─── Computed: activities ───────────────────────────────────────
  // Only "new" drafts produce a suggestion row — picking an existing activity
  // means there's nothing to submit for that slot (it's already there).
  const newActivityCount = computed(
    () => state.value.activities.filter((a) => a.mode === 'new').length
  )
  const hasActivity = computed(() => newActivityCount.value > 0)

  // Title for a single new-activity draft: free text wins over the category
  // (fixes a prior bug where the category always won even when the user had
  // typed something more specific in "activity not found").
  const activityDraftTitle = (draft: ActivityDraftNew): string => {
    const activityTerm =
      draft.customActivity || (draft.category ? tc(draft.category.name_i18n) : '')
    const name = placeName.value
    if (!activityTerm && !name) return ''
    if (!activityTerm) return name
    if (!name) return activityTerm
    return t('suggest.title_template', { activity: activityTerm, place: name })
  }

  const effectiveDraftTitle = (draft: ActivityDraftNew): string =>
    draft.titleTouched ? draft.titleManual : activityDraftTitle(draft)

  // ─── Actions: place ─────────────────────────────────────────────
  // First call (no details): resets nothing activity-related — activities are
  // now independent of the place result. Second call (with details): seeds
  // names, description textarea, and editable place info.
  const setPlace = (place: PlaceSearchResult, details?: PlaceDetails) => {
    state.value.placeResult = place
    state.value.isManual = false
    state.value.name_i18n = { ...place.name_i18n }
    state.value.description_i18n = {}

    if (details) {
      state.value.name_i18n = { ...details.name_i18n }
      state.value.description_i18n = { ...details.description_i18n }
      state.value.placeDetails = details

      if (!state.value.description.trim()) {
        state.value.description = tc(details.description_i18n)
      }

      state.value.placeInfo = {
        phone: details.phone ?? '',
        website: details.website ?? '',
        googleUrl: details.google_url ?? '',
        openingHoursText: (details.opening_hours?.weekday_text ?? []).join('\n'),
        wheelchair: details.wheelchair_accessible ?? null,
      }
    }
  }

  const clearPlace = () => {
    state.value.placeResult = null
    state.value.placeDetails = null
    state.value.name_i18n = {}
    state.value.description_i18n = {}
    state.value.description = ''
    state.value.placeInfo = {
      phone: '',
      website: '',
      googleUrl: '',
      openingHoursText: '',
      wheelchair: null,
    }
  }

  const setMatchedPlace = (place: LocalPlaceMatch) => {
    state.value.matchedPlace = place
    state.value.showNewPlaceForm = false
    clearPlace()
    state.value.isManual = false
    state.value.manualName = ''
    state.value.manualCity = ''
    state.value.manualAddress = ''
    state.value.manualLat = null
    state.value.manualLng = null
  }

  const clearMatchedPlace = () => {
    state.value.matchedPlace = null
  }

  const toggleNewPlaceForm = () => {
    state.value.showNewPlaceForm = !state.value.showNewPlaceForm
    if (state.value.showNewPlaceForm) state.value.matchedPlace = null
  }

  // ─── Actions: activities ────────────────────────────────────────
  const addActivityDraft = (draft: ActivityDraftNew) => {
    state.value.activities.push({ ...draft, localId: nextLocalId() })
  }

  const updateActivityDraft = (localId: string, patch: Partial<ActivityDraftNew>) => {
    const idx = state.value.activities.findIndex((a) => a.localId === localId)
    if (idx === -1) return
    const current = state.value.activities[idx]
    if (current?.mode !== 'new') return
    state.value.activities[idx] = { ...current, ...patch }
  }

  const addExistingActivity = (match: LocalActivityMatch) => {
    const title = Object.values(match.title_i18n).find((v) => v) ?? ''
    state.value.activities.push({
      mode: 'existing',
      localId: nextLocalId(),
      id: match.id,
      title,
    })
  }

  const removeActivityDraft = (localId: string) => {
    state.value.activities = state.value.activities.filter((a) => a.localId !== localId)
  }

  const toggleDay = (draft: ActivityDraftNew, day: keyof WizardSchedule) => {
    draft.schedule[day].open = !draft.schedule[day].open
  }

  const reset = () => {
    state.value = defaultState()
  }

  // ─── Payload ──────────────────────────────────────────────────
  const buildNewActivityPayload = (draft: ActivityDraftNew) => ({
    mode: 'new' as const,
    title_i18n: { [locale.value]: effectiveDraftTitle(draft) },
    category_id: draft.category?.id ?? '',
    age_range_ids: draft.selectedAgeIds,
    best_season: draft.selectedSeasons,
    type: draft.category ? [tc(draft.category.name_i18n)] : [],
    is_free: draft.isFree,
    price: draft.isFree ? undefined : parsePrice(draft.price),
    stroller_friendly: draft.stroller,
    has_shadow: draft.shadow,
    has_bathrooms: draft.bathrooms,
    open_weekends: draft.weekends,
    schedule_structured: draft.hoursUnknown ? undefined : draft.schedule,
    metadata: {
      generated_title: activityDraftTitle(draft),
      custom_activity: draft.customActivity || undefined,
      hours_unknown: draft.hoursUnknown || undefined,
    },
  })

  const buildPayload = () => {
    const s = state.value

    const activities = s.activities.map((a) =>
      a.mode === 'existing'
        ? { mode: 'existing' as const, activity_id: a.id }
        : buildNewActivityPayload(a)
    )

    // ── Matched an existing place: only the experience(s) are new ──────
    if (s.matchedPlace) {
      return {
        place: { mode: 'existing' as const, place_id: s.matchedPlace.id },
        activities,
        locale: locale.value,
      }
    }

    // ── No match: propose the place once, alongside the experience(s) ──
    const pi = s.placeInfo
    const name_i18n = s.isManual ? { [locale.value]: s.manualName } : { ...s.name_i18n }
    const description_i18n = s.description.trim()
      ? { ...s.description_i18n, [locale.value]: s.description.trim() }
      : { ...s.description_i18n }
    const openingHoursLines = pi.openingHoursText
      ? pi.openingHoursText.split('\n').filter(Boolean)
      : undefined

    return {
      place: {
        mode: 'new' as const,
        name_i18n,
        description_i18n,
        location: {
          address: s.isManual ? s.manualAddress : (s.placeResult?.address ?? ''),
          city: s.isManual ? s.manualCity : (s.placeResult?.address ?? ''),
          lat: s.isManual ? (s.manualLat ?? undefined) : (s.placeResult?.lat ?? undefined),
          lng: s.isManual ? (s.manualLng ?? undefined) : (s.placeResult?.lng ?? undefined),
        },
        metadata: {
          google_place_id: s.placeResult?.google_place_id ?? undefined,
          place_photo_url: s.placeResult?.photo_url ?? undefined,
          google_types: s.placeResult?.types ?? undefined,
          google_url: pi.googleUrl || undefined,
          phone: pi.phone || undefined,
          website: pi.website || undefined,
          wheelchair: pi.wheelchair ?? undefined,
          opening_hours_text: openingHoursLines?.length ? openingHoursLines : undefined,
          photos: s.placeDetails?.photos?.length ? s.placeDetails.photos : undefined,
        },
      },
      activities,
      locale: locale.value,
    }
  }

  return {
    state,
    STEPS: WIZARD_STEPS,
    // computed
    placeName,
    placeAddress,
    placePhoto,
    hasPlace,
    hasActivity,
    newActivityCount,
    suggestionType,
    activityDraftTitle,
    effectiveDraftTitle,
    // actions: place
    setPlace,
    clearPlace,
    setMatchedPlace,
    clearMatchedPlace,
    toggleNewPlaceForm,
    // actions: activities
    addActivityDraft,
    updateActivityDraft,
    addExistingActivity,
    removeActivityDraft,
    toggleDay,
    reset,
    buildPayload,
  }
}
