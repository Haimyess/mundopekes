import { describe, it, expect, vi, beforeEach } from 'vitest'
import { __resetStore } from '../__mocks__/nuxt-state'

import { useSuggestionWizard, WIZARD_STEPS } from '~/app/composables/useSuggestionWizard'
import type { WizardState } from '~/app/composables/useSuggestionWizard'

// ── vue-i18n mock (used by useI18nContent AND resolved by Nuxt's auto-import
//    as the source for useI18n in useSuggestionWizard under @nuxtjs/i18n) ──
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'es' },
    t: (key: string, params?: unknown) => {
      if (
        key === 'suggest.title_template' &&
        params &&
        typeof params === 'object' &&
        'activity' in (params as object)
      ) {
        const p = params as Record<string, string>
        return `${p.activity} en ${p.place}`
      }
      return key
    },
  }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
const makeCat = (id: string, esName: string) => ({
  id,
  slug: id,
  name_i18n: { es: esName, he: esName },
})

const makeGooglePlace = () => ({
  google_place_id: 'gp-001',
  name: 'Gan HaNegev',
  name_i18n: { he: 'גן הנגב', es: 'Gan HaNegev' },
  address: 'Tel Aviv',
  lat: 32.1,
  lng: 34.8,
  photo_url: '/api/places/photo?ref=abc',
  photo_ref: 'abc',
  types: ['park'],
  suggested_categories: [],
})

beforeEach(() => {
  __resetStore()
})

// ═══════════════════════════════════════════════════════════════════════════
//  buildPayload
// ═══════════════════════════════════════════════════════════════════════════
describe('buildPayload — Google place', () => {
  it('uses name_i18n from placeResult', () => {
    const { state, buildPayload } = useSuggestionWizard()
    const place = makeGooglePlace()
    state.value.placeResult = place
    state.value.name_i18n = { ...place.name_i18n }
    state.value.isManual = false
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]

    const payload = buildPayload()
    expect(payload.name_i18n).toEqual({ he: 'גן הנגב', es: 'Gan HaNegev' })
  })

  it('takes lat/lng from placeResult', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.placeResult = makeGooglePlace()
    state.value.isManual = false
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]

    const payload = buildPayload()
    expect(payload.location.lat).toBe(32.1)
    expect(payload.location.lng).toBe(34.8)
  })

  it('puts google_place_id in metadata', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.placeResult = makeGooglePlace()
    state.value.isManual = false
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]

    const payload = buildPayload()
    expect(payload.metadata.google_place_id).toBe('gp-001')
  })

  it('puts photos in metadata when placeDetails has photos', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.placeResult = makeGooglePlace()
    state.value.isManual = false
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.placeDetails = {
      name_i18n: { es: 'Gan HaNegev' },
      description_i18n: {},
      phone: null,
      website: null,
      google_url: null,
      wheelchair_accessible: null,
      opening_hours: null,
      photos: ['/api/places/photo?ref=p1', '/api/places/photo?ref=p2'],
    } as WizardState['placeDetails']

    const payload = buildPayload()
    expect(payload.metadata.photos).toEqual([
      '/api/places/photo?ref=p1',
      '/api/places/photo?ref=p2',
    ])
  })
})

describe('buildPayload — manual entry', () => {
  it('uses manualLat/manualLng when geocoding provided them', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Mi Casa'
    state.value.manualCity = 'Tel Aviv'
    state.value.manualAddress = 'Herzl 5'
    state.value.manualLat = 31.5
    state.value.manualLng = 34.7
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]

    const payload = buildPayload()
    expect(payload.location.lat).toBe(31.5)
    expect(payload.location.lng).toBe(34.7)
  })

  it('coords are absent (undefined) when geocoding failed — does not throw', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Mi Casa'
    state.value.manualCity = 'Tel Aviv'
    state.value.manualAddress = 'Herzl 5'
    state.value.manualLat = null
    state.value.manualLng = null
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]

    expect(() => buildPayload()).not.toThrow()
    const payload = buildPayload()
    // null → undefined in buildPayload (null ?? undefined === undefined)
    expect(payload.location.lat).toBeUndefined()
    expect(payload.location.lng).toBeUndefined()
  })

  it('name_i18n uses active locale as key for manual name', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque Local'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]

    const payload = buildPayload()
    // locale from nuxt-imports.ts mock is 'es'
    expect(payload.name_i18n).toEqual({ es: 'Parque Local' })
  })
})

describe('buildPayload — title_i18n', () => {
  it('key in title_i18n is the active locale', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Juegos')]

    const payload = buildPayload()
    // locale = 'es' from mock
    expect(Object.keys(payload.title_i18n!)).toContain('es')
  })

  it('titleTouched=true — title_i18n uses titleManual, not generated', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Juegos')]
    state.value.titleTouched = true
    state.value.titleManual = 'Título personalizado'

    const payload = buildPayload()
    expect(payload.title_i18n!['es']).toBe('Título personalizado')
  })

  it('titleTouched=false — title_i18n uses generated title (not titleManual)', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Juegos')]
    state.value.titleTouched = false
    state.value.titleManual = 'Ignorado'

    const payload = buildPayload()
    expect(payload.title_i18n!['es']).not.toBe('Ignorado')
  })

  // FINDING: La lógica actual usa el nombre de la categoría cuando existe,
  // ignorando customActivity. El requisito dice "custom activity gana sobre categoría".
  // Marcado como .fails para reportar el comportamiento actual.
  it.fails(
    'FINDING: customActivity wins over category name in title (current code: category wins)',
    () => {
      const { state, generatedTitle } = useSuggestionWizard()
      state.value.isManual = true
      state.value.manualName = 'Parque'
      state.value.manualCity = 'Tel Aviv'
      state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
      state.value.customActivity = 'Videojuegos'

      // If customActivity wins, generatedTitle should use 'Videojuegos'
      // But the code uses tc(cat.name_i18n) = 'Parques' when category exists
      expect(generatedTitle.value).toContain('Videojuegos')
    }
  )
})

describe('buildPayload — hoursUnknown', () => {
  it('hoursUnknown=true → schedule_structured is undefined', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.hoursUnknown = true

    const payload = buildPayload()
    expect(payload.schedule_structured).toBeUndefined()
  })

  it('hoursUnknown=true → metadata.hours_unknown is true', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.hoursUnknown = true

    const payload = buildPayload()
    expect(payload.metadata.hours_unknown).toBe(true)
  })

  it('hoursUnknown=false → schedule_structured is the schedule object', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.hoursUnknown = false

    const payload = buildPayload()
    expect(payload.schedule_structured).toBeTruthy()
    expect(typeof payload.schedule_structured).toBe('object')
  })
})

describe('buildPayload — is_free / price', () => {
  it('is_free=true → price is undefined', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.isFree = true
    state.value.price = '50'

    const payload = buildPayload()
    expect(payload.price).toBeUndefined()
  })

  it('is_free=false → price is a number', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.isFree = false
    state.value.price = '42.5'

    const payload = buildPayload()
    expect(payload.price).toBe(42.5)
  })

  it('is_free=true is passed through to payload', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.isFree = true

    expect(buildPayload().is_free).toBe(true)
  })
})

describe('buildPayload — description locale', () => {
  it('description stored under active locale, not hardcoded es', () => {
    const { state, buildPayload } = useSuggestionWizard()
    // Simulate locale = 'es' (from nuxt-imports.ts mock)
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.description = 'Un parque hermoso'
    state.value.description_i18n = {}

    const payload = buildPayload()
    // locale is 'es' from mock → key should be 'es'
    expect(payload.description_i18n).toMatchObject({ es: 'Un parque hermoso' })
  })

  it('empty description → description_i18n does not inject empty string', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.description = '   '
    state.value.description_i18n = {}

    const payload = buildPayload()
    // Trimmed description is empty → should not add locale key
    expect(Object.values(payload.description_i18n)).not.toContain('')
    expect(Object.keys(payload.description_i18n)).toHaveLength(0)
  })

  it('preserves existing description_i18n locales', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.description = 'Nueva desc'
    state.value.description_i18n = { he: 'גן יפה' }

    const payload = buildPayload()
    expect(payload.description_i18n).toMatchObject({ he: 'גן יפה', es: 'Nueva desc' })
  })
})

describe('buildPayload — best_season', () => {
  it('stores season VALUES (not Spanish labels)', () => {
    const { state, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    state.value.manualCity = 'Tel Aviv'
    state.value.selectedCategories = [makeCat('cat-1', 'Parques')]
    state.value.selectedSeasons = ['spring', 'summer']

    const payload = buildPayload()
    expect(payload.best_season).toEqual(['spring', 'summer'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  toggleSeason (main state)
// ═══════════════════════════════════════════════════════════════════════════
describe('toggleSeason', () => {
  it("toggleSeason('all') sets selectedSeasons to ['all']", () => {
    const { state, toggleSeason } = useSuggestionWizard()
    state.value.selectedSeasons = ['spring', 'summer']
    toggleSeason('all')
    expect(state.value.selectedSeasons).toEqual(['all'])
  })

  it("toggleSeason('all') clears any specific seasons", () => {
    const { state, toggleSeason } = useSuggestionWizard()
    state.value.selectedSeasons = ['spring']
    toggleSeason('all')
    expect(state.value.selectedSeasons).not.toContain('spring')
  })

  it("toggleSeason(specific) with 'all' active removes 'all'", () => {
    const { state, toggleSeason } = useSuggestionWizard()
    state.value.selectedSeasons = ['all']
    toggleSeason('spring')
    expect(state.value.selectedSeasons).not.toContain('all')
    expect(state.value.selectedSeasons).toContain('spring')
  })

  it('toggleSeason(specific) toggles: adds when absent', () => {
    const { state, toggleSeason } = useSuggestionWizard()
    state.value.selectedSeasons = []
    toggleSeason('winter')
    expect(state.value.selectedSeasons).toContain('winter')
  })

  it('toggleSeason(specific) toggles: removes when present', () => {
    const { state, toggleSeason } = useSuggestionWizard()
    state.value.selectedSeasons = ['winter']
    toggleSeason('winter')
    expect(state.value.selectedSeasons).not.toContain('winter')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  toggleAge (main state)
// ═══════════════════════════════════════════════════════════════════════════
describe('toggleAge', () => {
  it('isAll=true replaces all selected ages with the "all" entry', () => {
    const { state, toggleAge } = useSuggestionWizard()
    state.value.selectedAgeIds = [2, 3]
    state.value.selectedAgeLabels = ['Bebés', 'Pequeños']
    toggleAge(1, 'Todas', true)
    expect(state.value.selectedAgeIds).toEqual([1])
    expect(state.value.selectedAgeLabels).toEqual(['Todas'])
  })

  it('adding a specific age with allId removes the "all ages" entry', () => {
    const { state, toggleAge } = useSuggestionWizard()
    state.value.selectedAgeIds = [1]
    state.value.selectedAgeLabels = ['Todas']
    toggleAge(2, 'Bebés', false, 1)
    expect(state.value.selectedAgeIds).not.toContain(1)
    expect(state.value.selectedAgeIds).toContain(2)
  })

  it('toggleAge adds when absent', () => {
    const { state, toggleAge } = useSuggestionWizard()
    state.value.selectedAgeIds = []
    state.value.selectedAgeLabels = []
    toggleAge(3, 'Escolar')
    expect(state.value.selectedAgeIds).toContain(3)
  })

  it('toggleAge removes when present', () => {
    const { state, toggleAge } = useSuggestionWizard()
    state.value.selectedAgeIds = [3]
    state.value.selectedAgeLabels = ['Escolar']
    toggleAge(3, 'Escolar')
    expect(state.value.selectedAgeIds).not.toContain(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  draftToggleSeason
// ═══════════════════════════════════════════════════════════════════════════
describe('draftToggleSeason', () => {
  it("draftToggleSeason('all') sets draft to ['all']", () => {
    const { editDraft, openEdit, draftToggleSeason } = useSuggestionWizard()
    openEdit()
    editDraft.value!.selectedSeasons = ['spring']
    draftToggleSeason('all')
    expect(editDraft.value!.selectedSeasons).toEqual(['all'])
  })

  it("draftToggleSeason(specific) with 'all' active removes 'all'", () => {
    const { editDraft, openEdit, draftToggleSeason } = useSuggestionWizard()
    openEdit()
    editDraft.value!.selectedSeasons = ['all']
    draftToggleSeason('autumn')
    expect(editDraft.value!.selectedSeasons).not.toContain('all')
    expect(editDraft.value!.selectedSeasons).toContain('autumn')
  })

  it('no-ops when editDraft is null', () => {
    const { editDraft, draftToggleSeason } = useSuggestionWizard()
    editDraft.value = null
    expect(() => draftToggleSeason('spring')).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  draftToggleAge
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
//  Step order — activity first, then place (see useSuggestionWizard.ts)
// ═══════════════════════════════════════════════════════════════════════════
describe('WIZARD_STEPS order', () => {
  it('step 1 is actividad, step 2 is lugar', () => {
    expect(WIZARD_STEPS[0]?.labelKey).toBe('suggest.step_actividad')
    expect(WIZARD_STEPS[1]?.labelKey).toBe('suggest.step_lugar')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  matchedPlace (own-DB search result) — experience_for_existing_place path
// ═══════════════════════════════════════════════════════════════════════════
const makeLocalMatch = () => ({
  id: '11111111-1111-4111-8111-111111111111',
  name_i18n: { es: 'Parque HaYarkon', he: 'פארק הירקון' },
  lat: 32.1,
  lng: 34.8,
  thumbnail: '/img/park.jpg',
  google_place_id: 'gp-existing',
  city: { id: 1, name: 'Tel Aviv' },
})

describe('setMatchedPlace / clearMatchedPlace / toggleNewPlaceForm', () => {
  it('setMatchedPlace makes hasPlace true without any Google/manual data', () => {
    const { state, setMatchedPlace, hasPlace } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    expect(hasPlace.value).toBe(true)
    expect(state.value.placeResult).toBeNull()
    expect(state.value.isManual).toBe(false)
  })

  it('setMatchedPlace sets suggestionType to experience_for_existing_place', () => {
    const { setMatchedPlace, suggestionType } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    expect(suggestionType.value).toBe('experience_for_existing_place')
  })

  it('without a match, suggestionType defaults to new_place_with_experience', () => {
    const { suggestionType } = useSuggestionWizard()
    expect(suggestionType.value).toBe('new_place_with_experience')
  })

  it('clearMatchedPlace resets suggestionType and hasPlace (with no new-place form open)', () => {
    const { setMatchedPlace, clearMatchedPlace, suggestionType, hasPlace } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    clearMatchedPlace()
    expect(suggestionType.value).toBe('new_place_with_experience')
    expect(hasPlace.value).toBe(false)
  })

  it('toggleNewPlaceForm(on) clears any existing match', () => {
    const { state, setMatchedPlace, toggleNewPlaceForm } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    toggleNewPlaceForm()
    expect(state.value.matchedPlace).toBeNull()
    expect(state.value.showNewPlaceForm).toBe(true)
  })

  it('hasPlace is false when showNewPlaceForm is on but nothing selected yet', () => {
    const { toggleNewPlaceForm, hasPlace } = useSuggestionWizard()
    toggleNewPlaceForm()
    expect(hasPlace.value).toBe(false)
  })

  it('placeName/placeAddress/placePhoto read from matchedPlace when set', () => {
    const { setMatchedPlace, placeName, placeAddress, placePhoto } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    expect(placeName.value).toBe('Parque HaYarkon')
    expect(placeAddress.value).toBe('Tel Aviv')
    expect(placePhoto.value).toBe('/img/park.jpg')
  })
})

describe('buildPayload — experience_for_existing_place', () => {
  it('payload has suggestion_type + place_id, no name_i18n/location', () => {
    const { setMatchedPlace, state, buildPayload } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    state.value.selectedCategories = [makeCat('cat-1', 'Toboganes')]

    const payload = buildPayload()
    expect(payload.suggestion_type).toBe('experience_for_existing_place')
    expect(payload).toMatchObject({ place_id: '11111111-1111-4111-8111-111111111111' })
    expect('name_i18n' in payload).toBe(false)
    expect('location' in payload).toBe(false)
  })

  it('still carries experience-level fields (title, category, age, season, price)', () => {
    const { setMatchedPlace, state, buildPayload } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    state.value.selectedCategories = [makeCat('cat-1', 'Toboganes')]
    state.value.selectedSeasons = ['summer']
    state.value.isFree = false
    state.value.price = '25'

    const payload = buildPayload()
    expect(payload.category_id).toBe('cat-1')
    expect(payload.best_season).toEqual(['summer'])
    expect(payload.price).toBe(25)
    expect(Object.keys(payload.title_i18n!)).toContain('es')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  draftToggleAge
// ═══════════════════════════════════════════════════════════════════════════
describe('draftToggleAge', () => {
  it('isAll=true replaces draft ages', () => {
    const { editDraft, openEdit, draftToggleAge } = useSuggestionWizard()
    openEdit()
    editDraft.value!.selectedAgeIds = [2, 3]
    editDraft.value!.selectedAgeLabels = ['Bebés', 'Pequeños']
    draftToggleAge(1, 'Todas', true)
    expect(editDraft.value!.selectedAgeIds).toEqual([1])
  })

  it('adding specific with allId removes all-ages from draft', () => {
    const { editDraft, openEdit, draftToggleAge } = useSuggestionWizard()
    openEdit()
    editDraft.value!.selectedAgeIds = [1]
    editDraft.value!.selectedAgeLabels = ['Todas']
    draftToggleAge(2, 'Bebés', false, 1)
    expect(editDraft.value!.selectedAgeIds).not.toContain(1)
    expect(editDraft.value!.selectedAgeIds).toContain(2)
  })
})
