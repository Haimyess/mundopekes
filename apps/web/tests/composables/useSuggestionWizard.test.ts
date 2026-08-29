import { describe, it, expect, beforeEach, vi } from 'vitest'
import { __resetStore } from '../__mocks__/nuxt-state'

import {
  useSuggestionWizard,
  defaultActivityDraft,
  parsePrice,
  WIZARD_STEPS,
} from '~/app/composables/useSuggestionWizard'
import type { ActivityDraftNew } from '~/app/composables/useSuggestionWizard'

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

const makeLocalMatch = () => ({
  id: '11111111-1111-4111-8111-111111111111',
  name_i18n: { es: 'Parque HaYarkon', he: 'פארק הירקון' },
  lat: 32.1,
  lng: 34.8,
  thumbnail: '/img/park.jpg',
  google_place_id: 'gp-existing',
  city: { id: 1, name: 'Tel Aviv' },
})

const makeNewDraft = (overrides: Partial<ActivityDraftNew> = {}): ActivityDraftNew => ({
  ...defaultActivityDraft(),
  ...overrides,
})

beforeEach(() => {
  __resetStore()
})

// ═══════════════════════════════════════════════════════════════════════════
//  parsePrice — fixes the price=0 falsy-coercion bug
// ═══════════════════════════════════════════════════════════════════════════
describe('parsePrice', () => {
  it('parses a normal number', () => {
    expect(parsePrice('42.5')).toBe(42.5)
  })

  it('keeps an explicit 0 instead of dropping it', () => {
    expect(parsePrice('0')).toBe(0)
  })

  it('returns undefined for empty/invalid input', () => {
    expect(parsePrice('')).toBeUndefined()
    expect(parsePrice('abc')).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  Activity drafts: add / update / remove / existing
// ═══════════════════════════════════════════════════════════════════════════
describe('activity drafts', () => {
  it('addActivityDraft pushes a new draft with a fresh localId', () => {
    const { state, addActivityDraft } = useSuggestionWizard()
    addActivityDraft(makeNewDraft({ category: makeCat('cat-1', 'Parques') }))
    expect(state.value.activities).toHaveLength(1)
    expect(state.value.activities[0]!.mode).toBe('new')
    expect(state.value.activities[0]!.localId).toBeTruthy()
  })

  it('addExistingActivity pushes an existing-mode entry with the resolved title', () => {
    const { state, addExistingActivity } = useSuggestionWizard()
    addExistingActivity({ id: 'act-1', title_i18n: { es: 'Toboganes' }, category_id: 'cat-1' })
    expect(state.value.activities).toHaveLength(1)
    const a = state.value.activities[0]!
    expect(a.mode).toBe('existing')
    if (a.mode === 'existing') {
      expect(a.id).toBe('act-1')
      expect(a.title).toBe('Toboganes')
    }
  })

  it('updateActivityDraft merges a patch by localId', () => {
    const { state, addActivityDraft, updateActivityDraft } = useSuggestionWizard()
    addActivityDraft(makeNewDraft({ customActivity: 'Yoga' }))
    const localId = state.value.activities[0]!.localId
    updateActivityDraft(localId, { customActivity: 'Pilates' })
    const a = state.value.activities[0]!
    expect(a.mode).toBe('new')
    if (a.mode === 'new') expect(a.customActivity).toBe('Pilates')
  })

  it('removeActivityDraft removes only the matching entry', () => {
    const { state, addActivityDraft, removeActivityDraft } = useSuggestionWizard()
    addActivityDraft(makeNewDraft({ customActivity: 'A' }))
    addActivityDraft(makeNewDraft({ customActivity: 'B' }))
    const idToRemove = state.value.activities[0]!.localId
    removeActivityDraft(idToRemove)
    expect(state.value.activities).toHaveLength(1)
    expect(state.value.activities[0]!.localId).not.toBe(idToRemove)
  })

  it('hasActivity is false with only existing-activity entries', () => {
    const { addExistingActivity, hasActivity } = useSuggestionWizard()
    addExistingActivity({ id: 'act-1', title_i18n: { es: 'Toboganes' }, category_id: null })
    expect(hasActivity.value).toBe(false)
  })

  it('hasActivity is true once at least one new draft is added', () => {
    const { addActivityDraft, hasActivity } = useSuggestionWizard()
    addActivityDraft(makeNewDraft({ category: makeCat('cat-1', 'Parques') }))
    expect(hasActivity.value).toBe(true)
  })

  it('newActivityCount only counts new drafts, not existing references', () => {
    const { addActivityDraft, addExistingActivity, newActivityCount } = useSuggestionWizard()
    addExistingActivity({ id: 'act-1', title_i18n: { es: 'A' }, category_id: null })
    addActivityDraft(makeNewDraft({ customActivity: 'B' }))
    addActivityDraft(makeNewDraft({ customActivity: 'C' }))
    expect(newActivityCount.value).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  activityDraftTitle — fixes the "category wins over custom text" bug
// ═══════════════════════════════════════════════════════════════════════════
describe('activityDraftTitle', () => {
  it('custom activity text wins over the selected category', () => {
    const { state, activityDraftTitle } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    const draft = makeNewDraft({
      category: makeCat('cat-1', 'Parques'),
      customActivity: 'Videojuegos',
    })
    expect(activityDraftTitle(draft)).toContain('Videojuegos')
    expect(activityDraftTitle(draft)).not.toContain('Parques')
  })

  it('falls back to the category name when there is no custom text', () => {
    const { state, activityDraftTitle } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    const draft = makeNewDraft({ category: makeCat('cat-1', 'Parques') })
    expect(activityDraftTitle(draft)).toContain('Parques')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  WIZARD_STEPS order — place first, then activity/activities, then summary
// ═══════════════════════════════════════════════════════════════════════════
describe('WIZARD_STEPS order', () => {
  it('step 1 is lugar, step 2 is actividad, step 3 is resumen', () => {
    expect(WIZARD_STEPS[0]?.labelKey).toBe('suggest.step_lugar')
    expect(WIZARD_STEPS[1]?.labelKey).toBe('suggest.step_actividad')
    expect(WIZARD_STEPS[2]?.labelKey).toBe('suggest.step_resumen')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  matchedPlace (own-DB search result) — experience_for_existing_place path
// ═══════════════════════════════════════════════════════════════════════════
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

  it('placeName/placeAddress/placePhoto read from matchedPlace when set', () => {
    const { setMatchedPlace, placeName, placeAddress, placePhoto } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    expect(placeName.value).toBe('Parque HaYarkon')
    expect(placeAddress.value).toBe('Tel Aviv')
    expect(placePhoto.value).toBe('/img/park.jpg')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  buildPayload — new place
// ═══════════════════════════════════════════════════════════════════════════
describe('buildPayload — new place, single activity', () => {
  it('place.mode is "new" and carries name/location/metadata from the Google result', () => {
    const { state, addActivityDraft, buildPayload } = useSuggestionWizard()
    const place = makeGooglePlace()
    state.value.placeResult = place
    state.value.name_i18n = { ...place.name_i18n }
    addActivityDraft(makeNewDraft({ category: makeCat('cat-1', 'Parques') }))

    const payload = buildPayload()
    expect(payload.place.mode).toBe('new')
    if (payload.place.mode === 'new') {
      expect(payload.place.name_i18n).toEqual({ he: 'גן הנגב', es: 'Gan HaNegev' })
      expect(payload.place.location.lat).toBe(32.1)
      expect(payload.place.metadata?.google_place_id).toBe('gp-001')
    }
  })

  it('activities array has exactly one "new" entry with the built fields', () => {
    const { state, addActivityDraft, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    addActivityDraft(
      makeNewDraft({
        category: makeCat('cat-1', 'Parques'),
        selectedSeasons: ['spring'],
        isFree: false,
        price: '25',
      })
    )

    const payload = buildPayload()
    expect(payload.activities).toHaveLength(1)
    const a = payload.activities[0]!
    expect(a.mode).toBe('new')
    if (a.mode === 'new') {
      expect(a.category_id).toBe('cat-1')
      expect(a.best_season).toEqual(['spring'])
      expect(a.price).toBe(25)
    }
  })

  it('sends the active locale alongside the payload', () => {
    const { state, addActivityDraft, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    addActivityDraft(makeNewDraft({ category: makeCat('cat-1', 'Parques') }))
    expect(buildPayload().locale).toBe('es')
  })

  it('is_free=false and price=0 → price is 0, not undefined', () => {
    const { state, addActivityDraft, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    addActivityDraft(
      makeNewDraft({ category: makeCat('cat-1', 'Parques'), isFree: false, price: '0' })
    )
    const a = buildPayload().activities[0]!
    if (a.mode === 'new') expect(a.price).toBe(0)
  })
})

describe('buildPayload — new place, multiple activities', () => {
  it('activities array has one entry per draft', () => {
    const { state, addActivityDraft, addExistingActivity, buildPayload } = useSuggestionWizard()
    state.value.isManual = true
    state.value.manualName = 'Parque'
    addActivityDraft(makeNewDraft({ customActivity: 'Toboganes' }))
    addActivityDraft(makeNewDraft({ customActivity: 'Hamacas' }))
    addExistingActivity({ id: 'act-1', title_i18n: { es: 'Arenero' }, category_id: null })

    const payload = buildPayload()
    expect(payload.activities).toHaveLength(3)
    expect(payload.activities.filter((a) => a.mode === 'new')).toHaveLength(2)
    expect(payload.activities.filter((a) => a.mode === 'existing')).toHaveLength(1)
  })
})

describe('buildPayload — experience_for_existing_place', () => {
  it('place.mode is "existing" with the matched place_id, no name/location sent', () => {
    const { setMatchedPlace, addActivityDraft, buildPayload } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    addActivityDraft(makeNewDraft({ category: makeCat('cat-1', 'Toboganes') }))

    const payload = buildPayload()
    expect(payload.place).toEqual({
      mode: 'existing',
      place_id: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('still carries experience-level fields (category, season, price)', () => {
    const { setMatchedPlace, addActivityDraft, buildPayload } = useSuggestionWizard()
    setMatchedPlace(makeLocalMatch())
    addActivityDraft(
      makeNewDraft({
        category: makeCat('cat-1', 'Toboganes'),
        selectedSeasons: ['summer'],
        isFree: false,
        price: '25',
      })
    )

    const a = buildPayload().activities[0]!
    if (a.mode === 'new') {
      expect(a.category_id).toBe('cat-1')
      expect(a.best_season).toEqual(['summer'])
      expect(a.price).toBe(25)
    }
  })
})
