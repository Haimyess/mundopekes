import { describe, it, expect } from 'vitest'
import { buildSaveBody, initEditForm } from '~/utils/suggestion-edit-body'
import type { EditForm, SuggestionMetaForEdit } from '~/utils/suggestion-edit-body'

// ── Helpers ────────────────────────────────────────────────────────────────
const baseForm = (): EditForm => ({
  name_i18n: { he: 'גן הירקון', es: 'Parque HaYarkon' },
  description_i18n: { es: 'Un parque hermoso' },
  location: { city: 'Tel Aviv', address: 'Sderot Rokach' },
  category_id: 'cat-001',
  age_range_ids: [1, 2],
  best_season: ['spring', 'summer'],
  stroller_friendly: true,
  open_weekends: false,
  is_free: false,
  schedule: 'Lunes–Viernes 9–17',
  meta_title_i18n: { es: 'Juegos en HaYarkon' },
  meta_phone: '+972-3-123',
  meta_website: 'https://park.il',
  meta_opening_hours_text: 'Lunes: 8am–6pm\nMartes: 8am–6pm',
  meta_hours_unknown: false,
})

const baseSuggestion = () => ({
  name_i18n: { he: 'גן הירקון', es: 'Parque HaYarkon' },
  description_i18n: { es: 'Un parque hermoso' },
  location: { city: 'Tel Aviv', address: 'Sderot Rokach' },
  category_id: 'cat-001',
  age_range: { ids: [1, 2] },
  best_season: ['spring', 'summer'],
  stroller_friendly: true,
  open_weekends: false,
  is_free: false,
  schedule: 'Lunes–Viernes 9–17',
  metadata: {},
})

// ═══════════════════════════════════════════════════════════════════════════
//  buildSaveBody
// ═══════════════════════════════════════════════════════════════════════════
describe('buildSaveBody', () => {
  it('maps form to PUT body shape', () => {
    const body = buildSaveBody(baseForm())
    expect(body.name_i18n).toEqual({ he: 'גן הירקון', es: 'Parque HaYarkon' })
    expect(body.location).toEqual({ city: 'Tel Aviv', address: 'Sderot Rokach' })
    expect(body.age_range).toEqual({ ids: [1, 2] })
    expect(body.best_season).toEqual(['spring', 'summer'])
  })

  it('converts opening_hours_text to array split by newline', () => {
    const body = buildSaveBody(baseForm())
    expect(body.metadata.opening_hours_text).toEqual(['Lunes: 8am–6pm', 'Martes: 8am–6pm'])
  })

  it('sets opening_hours_text to null when empty string', () => {
    const form = { ...baseForm(), meta_opening_hours_text: '' }
    const body = buildSaveBody(form)
    expect(body.metadata.opening_hours_text).toBeNull()
  })

  it('sets phone to null when empty string', () => {
    const form = { ...baseForm(), meta_phone: '' }
    const body = buildSaveBody(form)
    expect(body.metadata.phone).toBeNull()
  })

  it('sets website to null when empty string', () => {
    const form = { ...baseForm(), meta_website: '' }
    const body = buildSaveBody(form)
    expect(body.metadata.website).toBeNull()
  })

  it('sets category_id to null when empty string', () => {
    const form = { ...baseForm(), category_id: '' }
    const body = buildSaveBody(form)
    expect(body.category_id).toBeNull()
  })

  it('preserves meta_title_i18n in metadata', () => {
    const body = buildSaveBody(baseForm())
    expect(body.metadata.title_i18n).toEqual({ es: 'Juegos en HaYarkon' })
  })

  it('preserves meta_hours_unknown in metadata', () => {
    const form = { ...baseForm(), meta_hours_unknown: true }
    const body = buildSaveBody(form)
    expect(body.metadata.hours_unknown).toBe(true)
  })

  it('does NOT include a "type" legacy field', () => {
    const body = buildSaveBody(baseForm()) as Record<string, unknown>
    expect(body).not.toHaveProperty('type')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
//  initEditForm (startEditing logic)
// ═══════════════════════════════════════════════════════════════════════════
describe('initEditForm', () => {
  it('seeds category_id from suggestion', () => {
    const form = initEditForm(baseSuggestion(), {})
    expect(form.category_id).toBe('cat-001')
  })

  it('seeds age_range_ids from suggestion.age_range.ids', () => {
    const form = initEditForm(baseSuggestion(), {})
    expect(form.age_range_ids).toEqual([1, 2])
  })

  it('seeds best_season values (not labels) from suggestion', () => {
    const form = initEditForm(baseSuggestion(), {})
    expect(form.best_season).toEqual(['spring', 'summer'])
  })

  it('seeds meta_title_i18n from metadata.title_i18n', () => {
    const meta: SuggestionMetaForEdit = { title_i18n: { es: 'Juegos en HaYarkon' } }
    const form = initEditForm(baseSuggestion(), meta)
    expect(form.meta_title_i18n).toEqual({ es: 'Juegos en HaYarkon' })
  })

  it('converts opening_hours_text array to newline-separated string', () => {
    const meta: SuggestionMetaForEdit = {
      opening_hours_text: ['Lunes: 8am–6pm', 'Martes: 8am–6pm'],
    }
    const form = initEditForm(baseSuggestion(), meta)
    expect(form.meta_opening_hours_text).toBe('Lunes: 8am–6pm\nMartes: 8am–6pm')
  })

  it('sets meta_opening_hours_text to empty string when null/absent', () => {
    const form = initEditForm(baseSuggestion(), {})
    expect(form.meta_opening_hours_text).toBe('')
  })

  it('sets meta_hours_unknown=true when metadata.hours_unknown is true', () => {
    const meta: SuggestionMetaForEdit = { hours_unknown: true }
    const form = initEditForm(baseSuggestion(), meta)
    expect(form.meta_hours_unknown).toBe(true)
  })

  it('handles null/missing suggestion fields gracefully', () => {
    const form = initEditForm({}, {})
    expect(form.category_id).toBe('')
    expect(form.age_range_ids).toEqual([])
    expect(form.best_season).toEqual([])
  })
})
