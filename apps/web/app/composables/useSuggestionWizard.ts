import type { PlaceSearchResult, PlaceDetails } from '~/composables/usePlacesSearch'

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

export interface WizardState {
  placeResult: PlaceSearchResult | null
  placeDetails: PlaceDetails | null
  name_i18n: Record<string, string>
  description_i18n: Record<string, string>
  manualName: string
  manualCity: string
  manualAddress: string
  description: string
  isManual: boolean
  // Free-text activity term (e.g. "Videojuegos") — feeds the activity title
  customActivity: string
  selectedCategories: WizardCategory[]
  selectedSeasons: string[] // season VALUES, e.g. ['spring', 'summer']
  selectedAgeIds: number[]
  selectedAgeLabels: string[] // translated at selection time
  isFree: boolean
  price: string
  stroller: boolean
  shadow: boolean
  bathrooms: boolean
  weekends: boolean
  schedule: WizardSchedule
  titleManual: string
  titleTouched: boolean
}

export const WIZARD_STEPS = [
  { labelKey: 'suggest.step_lugar' },
  { labelKey: 'suggest.step_actividad' },
  { labelKey: 'suggest.step_detalles' },
  { labelKey: 'suggest.step_resumen' },
]

const defaultSchedule = (): WizardSchedule => ({
  sunday: { open: false, start: '09:00', end: '17:00' },
  monday: { open: true, start: '09:00', end: '17:00' },
  tuesday: { open: true, start: '09:00', end: '17:00' },
  wednesday: { open: true, start: '09:00', end: '17:00' },
  thursday: { open: true, start: '09:00', end: '17:00' },
  friday: { open: false, start: '09:00', end: '14:00' },
  saturday: { open: false, start: '10:00', end: '16:00' },
})

const defaultState = (): WizardState => ({
  placeResult: null,
  placeDetails: null,
  name_i18n: {},
  description_i18n: {},
  manualName: '',
  manualCity: '',
  manualAddress: '',
  description: '',
  isManual: false,
  customActivity: '',
  selectedCategories: [],
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
  titleManual: '',
  titleTouched: false,
})

export function useSuggestionWizard() {
  const state = useState<WizardState>('suggestion-wizard', defaultState)
  const editOpen = useState<boolean>('wizard-edit-open', () => false)
  const editDraft = useState<Partial<WizardState> | null>('wizard-edit-draft', () => null)

  const { t, locale } = useI18n()
  const { tc } = useI18nContent()

  // ─── Edit draft ───────────────────────────────────────────────
  const openEdit = () => {
    const s = state.value
    editDraft.value = {
      selectedCategories: [...s.selectedCategories],
      selectedSeasons: [...s.selectedSeasons],
      selectedAgeIds: [...s.selectedAgeIds],
      selectedAgeLabels: [...s.selectedAgeLabels],
      customActivity: s.customActivity,
    }
    editOpen.value = true
  }

  const confirmEdit = () => {
    if (editDraft.value) {
      state.value.selectedCategories = editDraft.value.selectedCategories ?? []
      state.value.selectedSeasons = editDraft.value.selectedSeasons ?? []
      state.value.selectedAgeIds = editDraft.value.selectedAgeIds ?? []
      state.value.selectedAgeLabels = editDraft.value.selectedAgeLabels ?? []
      state.value.customActivity = editDraft.value.customActivity ?? ''
    }
    editDraft.value = null
    editOpen.value = false
  }

  const closeEdit = () => {
    editDraft.value = null
    editOpen.value = false
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
    const idx = editDraft.value.selectedCategories!.findIndex((c) => c.id === cat.id)
    if (idx === -1) editDraft.value.selectedCategories = [cat]
    else editDraft.value.selectedCategories!.splice(idx, 1)
  }

  // Stores season VALUE ('spring'). 'all' clears specifics; a specific clears 'all'.
  const draftToggleSeason = (seasonValue: string) => {
    if (!editDraft.value) return
    if (seasonValue === 'all') {
      editDraft.value.selectedSeasons = ['all']
      return
    }
    const allIdx = editDraft.value.selectedSeasons!.indexOf('all')
    if (allIdx !== -1) editDraft.value.selectedSeasons!.splice(allIdx, 1)
    const idx = editDraft.value.selectedSeasons!.indexOf(seasonValue)
    if (idx === -1) editDraft.value.selectedSeasons!.push(seasonValue)
    else editDraft.value.selectedSeasons!.splice(idx, 1)
  }

  // isAll=true → replace everything with this entry.
  // allId → remove the "all ages" entry when adding a specific one.
  const draftToggleAge = (id: number, label: string, isAll = false, allId?: number) => {
    if (!editDraft.value) return
    if (isAll) {
      editDraft.value.selectedAgeIds = [id]
      editDraft.value.selectedAgeLabels = [label]
      return
    }
    if (allId !== undefined) {
      const allIdx = editDraft.value.selectedAgeIds!.indexOf(allId)
      if (allIdx !== -1) {
        editDraft.value.selectedAgeIds!.splice(allIdx, 1)
        editDraft.value.selectedAgeLabels!.splice(allIdx, 1)
      }
    }
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
    state.value.isManual ? state.value.manualName : (state.value.placeResult?.name ?? '')
  )

  const placeAddress = computed(() =>
    state.value.isManual
      ? [state.value.manualCity, state.value.manualAddress].filter(Boolean).join(', ')
      : (state.value.placeResult?.address ?? '')
  )

  const placePhoto = computed(() => state.value.placeResult?.photo_url ?? null)

  const hasPlace = computed(() =>
    state.value.isManual ? !!state.value.manualName.trim() : !!state.value.placeResult
  )

  const hasActivity = computed(
    () => state.value.selectedCategories.length > 0 || !!state.value.customActivity
  )

  // Activity title derived from selection + i18n template. Reactive to locale.
  const generatedTitle = computed(() => {
    const activityTerm = state.value.selectedCategories[0]
      ? tc(state.value.selectedCategories[0].name_i18n)
      : state.value.customActivity
    const name = placeName.value
    if (!activityTerm && !name) return ''
    if (!activityTerm) return name
    if (!name) return activityTerm
    return t('suggest.title_template', { activity: activityTerm, place: name })
  })

  // The title shown/sent. User may override by setting titleTouched + titleManual.
  const effectiveTitle = computed(() =>
    state.value.titleTouched ? state.value.titleManual : generatedTitle.value
  )

  // ─── Actions ──────────────────────────────────────────────────
  // First call (no details): clears selectedCategories so StepActividad can reconcile
  // them against real DB subcategories. Second call (with details): only updates names.
  const setPlace = (place: PlaceSearchResult, details?: PlaceDetails) => {
    state.value.placeResult = place
    state.value.isManual = false
    state.value.name_i18n = { ...place.name_i18n }
    state.value.description_i18n = {}

    if (!details) {
      state.value.selectedCategories = []
    }

    if (details) {
      state.value.name_i18n = { ...details.name_i18n }
      state.value.description_i18n = { ...details.description_i18n }
      state.value.placeDetails = details
    }
  }

  const clearPlace = () => {
    state.value.placeResult = null
    state.value.placeDetails = null
    state.value.name_i18n = {}
    state.value.description_i18n = {}
    state.value.selectedCategories = []
  }

  const toggleCategory = (cat: WizardCategory) => {
    const idx = state.value.selectedCategories.findIndex((c) => c.id === cat.id)
    if (idx === -1) state.value.selectedCategories.push(cat)
    else state.value.selectedCategories.splice(idx, 1)
  }

  // Stores VALUE. 'all' clears specifics; a specific clears 'all'.
  const toggleSeason = (seasonValue: string) => {
    if (seasonValue === 'all') {
      state.value.selectedSeasons = ['all']
      return
    }
    const allIdx = state.value.selectedSeasons.indexOf('all')
    if (allIdx !== -1) state.value.selectedSeasons.splice(allIdx, 1)
    const idx = state.value.selectedSeasons.indexOf(seasonValue)
    if (idx === -1) state.value.selectedSeasons.push(seasonValue)
    else state.value.selectedSeasons.splice(idx, 1)
  }

  // isAll=true → replace everything. allId → remove "all ages" when adding specific.
  const toggleAge = (id: number, label: string, isAll = false, allId?: number) => {
    if (isAll) {
      state.value.selectedAgeIds = [id]
      state.value.selectedAgeLabels = [label]
      return
    }
    if (allId !== undefined) {
      const allIdx = state.value.selectedAgeIds.indexOf(allId)
      if (allIdx !== -1) {
        state.value.selectedAgeIds.splice(allIdx, 1)
        state.value.selectedAgeLabels.splice(allIdx, 1)
      }
    }
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
    state.value = defaultState()
    editDraft.value = null
    editOpen.value = false
  }

  // ─── Payload ──────────────────────────────────────────────────
  const buildPayload = () => {
    const s = state.value
    const pd = s.placeDetails

    const name_i18n = s.isManual ? { es: s.manualName } : { ...s.name_i18n }

    const description_i18n = s.description.trim()
      ? { ...s.description_i18n, es: s.description.trim() }
      : { ...s.description_i18n }

    return {
      name_i18n,
      description_i18n,
      // Activity title (distinct from the place name)
      title_i18n: { [locale.value]: effectiveTitle.value },
      location: {
        address: s.isManual ? s.manualAddress : (s.placeResult?.address ?? ''),
        city: s.isManual ? s.manualCity : (s.placeResult?.address ?? ''),
        lat: s.isManual ? undefined : (s.placeResult?.lat ?? undefined),
        lng: s.isManual ? undefined : (s.placeResult?.lng ?? undefined),
      },
      category_id: s.selectedCategories[0]?.id ?? '',
      age_range_ids: s.selectedAgeIds,
      best_season: s.selectedSeasons, // season values: ['spring', 'all', ...]
      type: s.selectedCategories.map((c) => tc(c.name_i18n)),
      is_free: s.isFree,
      price: s.isFree ? undefined : Number.parseFloat(s.price) || undefined,
      stroller_friendly: s.stroller,
      has_shadow: s.shadow,
      has_bathrooms: s.bathrooms,
      open_weekends: s.weekends,
      schedule_structured: s.schedule,
      metadata: {
        google_place_id: s.placeResult?.google_place_id ?? undefined,
        place_photo_url: s.placeResult?.photo_url ?? undefined,
        google_types: s.placeResult?.types ?? undefined,
        generated_title: generatedTitle.value,
        custom_activity: s.customActivity || undefined,
        google_url: pd?.google_url ?? undefined,
        phone: pd?.phone ?? undefined,
        website: pd?.website ?? undefined,
        photos: pd?.photos?.length ? pd.photos : undefined,
        wheelchair: pd?.wheelchair_accessible ?? undefined,
        opening_hours_text: pd?.opening_hours?.weekday_text ?? undefined,
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
    effectiveTitle,
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
