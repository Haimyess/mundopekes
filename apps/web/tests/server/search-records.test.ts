import { describe, expect, it } from 'vitest'
import {
  buildSearchRecords,
  toAgeSpanYears,
  type ActivityRow,
  type PlaceRow,
} from '../../server/utils/search-records'

const BEACH: PlaceRow = {
  id: 'place-beach',
  name_i18n: { he: 'חוף רמבם', es: 'Playa Rambam' },
  images: null,
  created_at: '2026-02-01T00:00:00Z',
  metadata: {
    opening_hours_text: ['יום שבת: סגור', 'יום ראשון: 6:00–20:00'],
    is_free: true,
    wheelchair: true,
  },
  city: { name: 'Haifa' },
}

const PICNIC: ActivityRow = {
  id: 'activity-picnic',
  title_i18n: { he: 'פיקניק', es: 'Picnic en el parque' },
  price: 30,
  is_free: false,
  stroller_friendly: true,
  images: ['https://example.com/picnic.jpg'],
  created_at: '2026-03-01T00:00:00Z',
  metadata: {
    has_shadow: true,
    schedule_structured: {
      sunday: { open: false, start: '09:00', end: '17:00' },
      monday: { open: true, start: '09:00', end: '17:00' },
      tuesday: { open: true, start: '09:00', end: '17:00' },
      wednesday: { open: true, start: '09:00', end: '17:00' },
      thursday: { open: true, start: '09:00', end: '17:00' },
      friday: { open: true, start: '09:00', end: '14:00' },
      saturday: { open: true, start: '10:00', end: '16:00' },
    },
  },
  category_id: 'cat-picnic',
  place: [BEACH],
  age_ranges: [
    { age_range: { min_months: 36, max_months: 71 } },
    { age_range: { min_months: 72, max_months: 143 } },
  ],
}

const CATEGORIES = [
  { id: 'cat-outdoor', slug: 'aire-libre', parent_id: null },
  { id: 'cat-picnic', slug: 'picnic', parent_id: 'cat-outdoor' },
]

describe('toAgeSpanYears', () => {
  it('converts month ranges into whole years', () => {
    expect(toAgeSpanYears([{ minMonths: 36, maxMonths: 143 }])).toEqual({ min: 3, max: 11 })
    expect(toAgeSpanYears([])).toBeNull()
  })
})

describe('buildSearchRecords', () => {
  const SWIM: ActivityRow = { ...PICNIC, id: 'activity-swim', images: null, price: 50 }
  const [activity, , place] = buildSearchRecords({
    activities: [PICNIC, SWIM],
    places: [BEACH],
    categories: CATEGORIES,
  })

  it('maps an activity with its category, parent category and schedule', () => {
    expect(activity).toMatchObject({
      kind: 'activity',
      categorySlugs: ['picnic', 'aire-libre'],
      price: 30,
      ageRanges: [
        { minMonths: 36, maxMonths: 71 },
        { minMonths: 72, maxMonths: 143 },
      ],
      weeklyHours: { 0: [], 6: [{ start: 600, end: 960 }] },
      amenities: ['stroller', 'wheelchair', 'shade'],
      item: {
        title: PICNIC.title_i18n,
        placeName: BEACH.name_i18n,
        imageUrl: 'https://example.com/picnic.jpg',
        cityName: 'Haifa',
        ageSpan: { min: 3, max: 11 },
        activityCount: null,
      },
    })
    expect(activity?.searchText).toContain('Playa Rambam')
  })

  it('derives the place attributes from its activities and Google hours', () => {
    expect(place).toMatchObject({
      kind: 'place',
      categorySlugs: ['picnic', 'aire-libre'],
      isFree: true,
      price: 30,
      weeklyHours: { 6: [], 0: [{ start: 360, end: 1200 }] },
      amenities: ['stroller', 'wheelchair', 'shade'],
      item: {
        imageUrl: 'https://example.com/picnic.jpg',
        activityCount: 2,
        ageSpan: { min: 3, max: 11 },
      },
    })
  })

  it('represents a place with a single activity by that activity only', () => {
    const records = buildSearchRecords({ activities: [PICNIC], places: [BEACH], categories: [] })
    expect(records.map(({ kind }) => kind)).toEqual(['activity'])
  })

  it('keeps places without activities with their own amenities', () => {
    const records = buildSearchRecords({ activities: [], places: [BEACH], categories: [] })
    expect(records).toMatchObject([
      { kind: 'place', amenities: ['wheelchair'], item: { activityCount: 0, ageSpan: null } },
    ])
  })

  it('falls back to the place hours when the activity has no schedule', () => {
    const [withoutSchedule] = buildSearchRecords({
      activities: [{ ...PICNIC, metadata: null }],
      places: [],
      categories: [],
    })
    expect(withoutSchedule?.weeklyHours).toEqual({ 6: [], 0: [{ start: 360, end: 1200 }] })
    expect(withoutSchedule?.categorySlugs).toEqual([])
  })
})
