import type { PlaceSearchResult } from '~/composables/usePlacesSearch'

export interface ScheduleDay {
  open: boolean
  start: string
  end: string
}

export interface WizardSchedule {
  sunday:    ScheduleDay
  monday:    ScheduleDay
  tuesday:   ScheduleDay
  wednesday: ScheduleDay
  thursday:  ScheduleDay
  friday:    ScheduleDay
  saturday:  ScheduleDay
}

export interface WizardCategory {
  id: string
  name: string
}

export interface WizardState {
  placeResult:        PlaceSearchResult | null
  manualName:         string
  manualCity:         string
  manualAddress:      string
  description:        string
  isManual:           boolean
  customActivity:     string
  selectedCategories: WizardCategory[]
  selectedSeasons:    string[]
  selectedAgeIds:     number[]
  selectedAgeLabels:  string[]
  isFree:             boolean
  price:              string
  stroller:           boolean
  shadow:             boolean
  bathrooms:          boolean
  weekends:           boolean
  schedule:           WizardSchedule
}

export const WIZARD_STEPS = [
  { label: 'Lugar' },
  { label: 'Actividad' },
  { label: 'Detalles' },
  { label: 'Resumen' },
]

const defaultSchedule = (): WizardSchedule => ({
  sunday:    { open: false, start: '09:00', end: '17:00' },
  monday:    { open: true,  start: '09:00', end: '17:00' },
  tuesday:   { open: true,  start: '09:00', end: '17:00' },
  wednesday: { open: true,  start: '09:00', end: '17:00' },
  thursday:  { open: true,  start: '09:00', end: '17:00' },
  friday:    { open: false, start: '09:00', end: '14:00' },
  saturday:  { open: false, start: '10:00', end: '16:00' },
})

const defaultState = (): WizardState => ({
  placeResult:        null,
  manualName:         '',
  manualCity:         '',
  manualAddress:      '',
  description:        '',
  isManual:           false,
  customActivity:     '',
  selectedCategories: [],
  selectedSeasons:    [],
  selectedAgeIds:     [],
  selectedAgeLabels:  [],
  isFree:             true,
  price:              '',
  stroller:           false,
  shadow:             false,
  bathrooms:          false,
  weekends:           false,
  schedule:           defaultSchedule(),
})

export function useSuggestionWizard() {
  const state     = useState<WizardState>('suggestion-wizard', defaultState)
  const editOpen  = useState<boolean>('wizard-edit-open', () => false)
const editDraft = useState<Partial<WizardState> | null>('wizard-edit-draft', () => null)

  // ─── Edit draft ───────────────────────────────────────────────
  const openEdit = () => {
    const s = state.value
    editDraft.value = {
      selectedCategories: [...s.selectedCategories],
      selectedSeasons:    [...s.selectedSeasons],
      selectedAgeIds:     [...s.selectedAgeIds],
      selectedAgeLabels:  [...s.selectedAgeLabels],
      customActivity:     s.customActivity,
    }
    editOpen.value = true
  }

  const confirmEdit = () => {
    if (editDraft.value) {
      state.value.selectedCategories = editDraft.value.selectedCategories ?? []
      state.value.selectedSeasons    = editDraft.value.selectedSeasons    ?? []
      state.value.selectedAgeIds     = editDraft.value.selectedAgeIds     ?? []
      state.value.selectedAgeLabels  = editDraft.value.selectedAgeLabels  ?? []
      state.value.customActivity     = editDraft.value.customActivity     ?? ''
    }
    editDraft.value = null
    editOpen.value  = false
  }

  const closeEdit = () => {
    editDraft.value = null
    editOpen.value  = false
  }

  const toggleEdit = () => {
    if (editOpen.value) closeEdit()
    else openEdit()
  }

  // ─── Draft helpers ────────────────────────────────────────────
  const draftSetCategory = (cat: WizardCategory) => {
    if (!editDraft.value) return
    editDraft.value.selectedCategories = [cat]
  }

  const draftToggleCategory = (cat: WizardCategory) => {
    if (!editDraft.value) return
    const idx = editDraft.value.selectedCategories!.findIndex(c => c.id === cat.id)
    if (idx === -1) editDraft.value.selectedCategories = [cat]
    else editDraft.value.selectedCategories!.splice(idx, 1)
  }

  const draftToggleSeason = (season: string) => {
    if (!editDraft.value) return
    const idx = editDraft.value.selectedSeasons!.indexOf(season)
    if (idx === -1) editDraft.value.selectedSeasons!.push(season)
    else editDraft.value.selectedSeasons!.splice(idx, 1)
  }

  const draftToggleAge = (id: number, label: string) => {
    if (!editDraft.value) return
    const idx = editDraft.value.selectedAgeIds!.indexOf(id)
    if (idx === -1) {
      editDraft.value.selectedAgeIds!.push(id)
      editDraft.value.selectedAgeLabels!.push(label)
    } else {
      editDraft.value.selectedAgeIds!.splice(idx, 1)
      editDraft.value.selectedAgeLabels!.splice(idx, 1)
    }
  }

  const draftClearCustomActivity = () => {
    if (!editDraft.value) return
    editDraft.value.customActivity = ''
  }

  // ─── Computed ─────────────────────────────────────────────────
  const placeName = computed(() =>
    state.value.isManual
      ? state.value.manualName
      : state.value.placeResult?.name ?? ''
  )

  const placeAddress = computed(() =>
    state.value.isManual
      ? [state.value.manualCity, state.value.manualAddress].filter(Boolean).join(', ')
      : state.value.placeResult?.address ?? ''
  )

  const placePhoto = computed(() =>
    state.value.placeResult?.photo_url ?? null
  )

  const hasPlace = computed(() =>
    state.value.isManual
      ? !!state.value.manualName.trim()
      : !!state.value.placeResult
  )

  const hasActivity = computed(() =>
    state.value.selectedCategories.length > 0 ||
    !!state.value.customActivity
  )

  const generatedTitle = computed(() => {
    const cat  = state.value.selectedCategories[0]?.name
              ?? state.value.customActivity
              ?? ''
    const name = placeName.value
    if (!cat && !name) return ''
    if (!cat) return name
    if (!name) return cat
    return `${cat} en ${name}`
  })

  // ─── Actions ──────────────────────────────────────────────────
  const setPlace = (place: PlaceSearchResult) => {
    state.value.placeResult        = place
    state.value.isManual           = false
    state.value.selectedCategories = place.suggested_categories
  }

  const clearPlace = () => {
    state.value.placeResult        = null
    state.value.selectedCategories = []
  }

  const toggleCategory = (cat: WizardCategory) => {
    const idx = state.value.selectedCategories.findIndex(c => c.id === cat.id)
    if (idx === -1) state.value.selectedCategories.push(cat)
    else state.value.selectedCategories.splice(idx, 1)
  }

  const toggleSeason = (season: string) => {
    const idx = state.value.selectedSeasons.indexOf(season)
    if (idx === -1) state.value.selectedSeasons.push(season)
    else state.value.selectedSeasons.splice(idx, 1)
  }

  const toggleAge = (id: number, label: string) => {
    const idx = state.value.selectedAgeIds.indexOf(id)
    if (idx === -1) {
      state.value.selectedAgeIds.push(id)
      state.value.selectedAgeLabels.push(label)
    } else {
      state.value.selectedAgeIds.splice(idx, 1)
      state.value.selectedAgeLabels.splice(idx, 1)
    }
  }

  const toggleDay = (day: keyof WizardSchedule) => {
    state.value.schedule[day].open = !state.value.schedule[day].open
  }

  const reset = () => {
    state.value     = defaultState()
    editDraft.value = null
    editOpen.value  = false
  }

  // ─── Payload ──────────────────────────────────────────────────
  const buildPayload = () => {
    const s = state.value
    return {
      name:        placeName.value,
      description: s.description.trim() || undefined,
      location: {
        address: s.isManual ? s.manualAddress : (s.placeResult?.address ?? ''),
        city:    s.isManual ? s.manualCity    : (s.placeResult?.address ?? ''),
        lat:     s.isManual ? undefined       : (s.placeResult?.lat     ?? undefined),
        lng:     s.isManual ? undefined       : (s.placeResult?.lng     ?? undefined),
      },
      category_id:         s.selectedCategories[0]?.id ?? '',
      age_range_ids:       s.selectedAgeIds,
      best_season:         s.selectedSeasons,
      type:                s.selectedCategories.map(c => c.name),
      is_free:             s.isFree,
      price:               s.isFree ? undefined : (parseFloat(s.price) || undefined),
      stroller_friendly:   s.stroller,
      has_shadow:          s.shadow,
      has_bathrooms:       s.bathrooms,
      open_weekends:       s.weekends,
      schedule_structured: s.schedule,
      metadata: {
        google_place_id: s.placeResult?.google_place_id ?? undefined,
        place_photo_url: s.placeResult?.photo_url       ?? undefined,
        google_types:    s.placeResult?.types           ?? undefined,
        generated_title: generatedTitle.value,
        custom_activity: s.customActivity               || undefined,
      },
    }
  }

  return {
    state,
    editDraft,
    editOpen,
    STEPS: WIZARD_STEPS,
    // computed
    placeName,
    placeAddress,
    placePhoto,
    hasPlace,
    hasActivity,
    generatedTitle,
    // edit
    openEdit,
    closeEdit,
    confirmEdit,
    toggleEdit,
    // draft helpers
    draftSetCategory,
    draftToggleCategory,
    draftToggleSeason,
    draftToggleAge,
    draftClearCustomActivity,
    // actions
    setPlace,
    clearPlace,
    toggleCategory,
    toggleSeason,
    toggleAge,
    toggleDay,
    reset,
    buildPayload,
  }
}