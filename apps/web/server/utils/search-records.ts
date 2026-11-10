import {
  parseOpeningHoursText,
  SEARCH_AMENITIES,
  SEARCH_AMENITY_METADATA_KEYS,
  SEARCH_DISCOUNTS,
  SEARCH_DISCOUNTS_METADATA_KEY,
  type AgeRangeMonths,
  type GeoPoint,
  type SearchAmenity,
  type SearchDiscount,
  type SearchRecord,
  type WeeklyHours,
} from '@mundopekes/core'
import { SCHEDULE_DAYS, type WizardSchedule } from '@mundopekes/types'
import type { AgeSpanYears, LocalizedText, SearchResultItem } from '#shared/types/search'

const MONTHS_PER_YEAR = 12
const SINGLE_ACTIVITY = 1

export interface CategoryRow {
  id: string
  slug: string
  parent_id: string | null
}

interface CityRow {
  name: string
}

export interface PlaceRow {
  id: string
  lat: number | null
  lng: number | null
  name_i18n: LocalizedText | null
  description_i18n?: LocalizedText | null
  updated_at?: string | null
  images: string[] | null
  created_at: string | null
  metadata: Record<string, unknown> | null
  city: CityRow | CityRow[] | null
}

export interface ActivityRow {
  id: string
  title_i18n: LocalizedText | null
  price: number | null
  is_free: boolean | null
  stroller_friendly: boolean | null
  images: string[] | null
  created_at: string | null
  metadata: Record<string, unknown> | null
  category_id: string | null
  place: PlaceRow | PlaceRow[] | null
  age_ranges: { age_range: { min_months: number; max_months: number } | null }[] | null
}

export interface SearchDataset {
  activities: ActivityRow[]
  places: PlaceRow[]
  categories: CategoryRow[]
}

export interface SearchResultRecord extends SearchRecord {
  item: Omit<SearchResultItem, 'fit' | 'matchingAges' | 'location' | 'distanceKm'>
}

function placeLocation(place: PlaceRow | null): GeoPoint | null {
  if (place?.lat === null || place?.lat === undefined) return null
  if (place.lng === null || place.lng === undefined) return null
  return { lat: Number(place.lat), lng: Number(place.lng) }
}

function single<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null
}

function textValues(text: LocalizedText | null | undefined): string[] {
  return Object.values(text ?? {}).filter(Boolean)
}

function isWizardSchedule(value: unknown): value is WizardSchedule {
  if (typeof value !== 'object' || value === null) return false
  return SCHEDULE_DAYS.every((day) => typeof (value as Record<string, unknown>)[day] === 'object')
}

function scheduleToHours(schedule: WizardSchedule): WeeklyHours | null {
  return parseOpeningHoursText(
    SCHEDULE_DAYS.map((day) => {
      const { open, start, end } = schedule[day]
      return open ? `${day}: ${start}–${end}` : `${day}: closed`
    })
  )
}

function placeHours(place: PlaceRow | null): WeeklyHours | null {
  const lines = place?.metadata?.opening_hours_text
  if (!Array.isArray(lines)) return null
  return parseOpeningHoursText(lines.filter((line): line is string => typeof line === 'string'))
}

function activityHours(activity: ActivityRow, place: PlaceRow | null): WeeklyHours | null {
  const schedule = activity.metadata?.schedule_structured
  return (isWizardSchedule(schedule) ? scheduleToHours(schedule) : null) ?? placeHours(place)
}

function activityAgeRanges(activity: ActivityRow): AgeRangeMonths[] {
  return (activity.age_ranges ?? []).flatMap(({ age_range }) =>
    age_range ? [{ minMonths: age_range.min_months, maxMonths: age_range.max_months }] : []
  )
}

export function toAgeSpanYears(ranges: readonly AgeRangeMonths[]): AgeSpanYears | null {
  if (ranges.length === 0) return null
  return {
    min: Math.floor(Math.min(...ranges.map(({ minMonths }) => minMonths)) / MONTHS_PER_YEAR),
    max: Math.floor(Math.max(...ranges.map(({ maxMonths }) => maxMonths)) / MONTHS_PER_YEAR),
  }
}

function createCategorySlugsResolver(categories: readonly CategoryRow[]) {
  const byId = new Map(categories.map((category) => [category.id, category]))
  return (categoryId: string | null): string[] => {
    const category = categoryId ? byId.get(categoryId) : undefined
    if (!category) return []
    const parent = category.parent_id ? byId.get(category.parent_id) : undefined
    return parent ? [category.slug, parent.slug] : [category.slug]
  }
}

type Metadata = Record<string, unknown> | null | undefined

function amenitiesFrom(sources: readonly Metadata[]): SearchAmenity[] {
  return SEARCH_AMENITIES.filter((amenity) =>
    sources.some((metadata) => metadata?.[SEARCH_AMENITY_METADATA_KEYS[amenity]] === true)
  )
}

function discountsFrom(sources: readonly Metadata[]): SearchDiscount[] {
  const declared = new Set(
    sources.flatMap((metadata) => {
      const discounts = metadata?.[SEARCH_DISCOUNTS_METADATA_KEY]
      return Array.isArray(discounts) ? discounts : []
    })
  )
  return SEARCH_DISCOUNTS.filter((discount) => declared.has(discount))
}

function activitySources(activity: ActivityRow, place: PlaceRow | null): Metadata[] {
  return [
    activity.metadata,
    place?.metadata,
    { [SEARCH_AMENITY_METADATA_KEYS.stroller]: activity.stroller_friendly === true },
  ]
}

function mergeValues<T extends string>(order: readonly T[], lists: readonly (readonly T[])[]): T[] {
  const merged = new Set(lists.flat())
  return order.filter((value) => merged.has(value))
}

function metadataPrice(metadata: Record<string, unknown> | null): number | null {
  const raw = metadata?.price
  if (raw === null || raw === undefined || raw === '') return null
  const price = Number(raw)
  return Number.isFinite(price) ? price : null
}

function lowestPrice(prices: readonly (number | null)[]): number | null {
  const known = prices.filter((price): price is number => price !== null)
  return known.length ? Math.min(...known) : null
}

function groupByPlace(
  activities: readonly ActivityRow[],
  records: readonly SearchResultRecord[]
): Map<string, SearchResultRecord[]> {
  const groups = new Map<string, SearchResultRecord[]>()
  activities.forEach((activity, index) => {
    const placeId = single(activity.place)?.id
    const record = records[index]
    if (!placeId || !record) return
    groups.set(placeId, [...(groups.get(placeId) ?? []), record])
  })
  return groups
}

function toActivityRecord(
  activity: ActivityRow,
  resolveCategorySlugs: (categoryId: string | null) => string[]
): SearchResultRecord {
  const place = single(activity.place)
  const ageRanges = activityAgeRanges(activity)
  const isFree = activity.is_free === true
  return {
    kind: 'activity',
    id: activity.id,
    searchText: [...textValues(activity.title_i18n), ...textValues(place?.name_i18n)].join(' '),
    categorySlugs: resolveCategorySlugs(activity.category_id),
    isFree,
    price: activity.price,
    ageRanges,
    weeklyHours: activityHours(activity, place),
    amenities: amenitiesFrom(activitySources(activity, place)),
    discounts: discountsFrom(activitySources(activity, place)),
    location: placeLocation(place),
    createdAt: activity.created_at ?? '',
    item: {
      kind: 'activity',
      id: activity.id,
      title: activity.title_i18n ?? {},
      placeName: place?.name_i18n ?? null,
      imageUrl: activity.images?.[0] ?? place?.images?.[0] ?? null,
      cityName: single(place?.city)?.name.trim() ?? null,
      isFree,
      price: activity.price,
      ageSpan: toAgeSpanYears(ageRanges),
      activityCount: null,
    },
  }
}

function toPlaceRecord(
  place: PlaceRow,
  activities: readonly SearchResultRecord[]
): SearchResultRecord {
  const ageRanges = activities.flatMap((record) => record.ageRanges)
  const isFree = place.metadata?.is_free === true || activities.some((record) => record.isFree)
  const price = lowestPrice([
    metadataPrice(place.metadata),
    ...activities.map((record) => record.price),
  ])
  const fallbackImage = activities.find((record) => record.item.imageUrl)?.item.imageUrl ?? null
  return {
    kind: 'place',
    id: place.id,
    searchText: textValues(place.name_i18n).join(' '),
    categorySlugs: [...new Set(activities.flatMap((record) => record.categorySlugs))],
    isFree,
    price,
    ageRanges,
    weeklyHours: placeHours(place),
    amenities: mergeValues(SEARCH_AMENITIES, [
      amenitiesFrom([place.metadata]),
      ...activities.map((record) => record.amenities),
    ]),
    discounts: mergeValues(SEARCH_DISCOUNTS, [
      discountsFrom([place.metadata]),
      ...activities.map((record) => record.discounts),
    ]),
    location: placeLocation(place),
    createdAt: place.created_at ?? '',
    item: {
      kind: 'place',
      id: place.id,
      title: place.name_i18n ?? {},
      placeName: null,
      imageUrl: place.images?.[0] ?? fallbackImage,
      cityName: single(place.city)?.name.trim() ?? null,
      isFree,
      price,
      ageSpan: toAgeSpanYears(ageRanges),
      activityCount: activities.length,
    },
  }
}

export function buildSearchRecords({
  activities,
  places,
  categories,
}: SearchDataset): SearchResultRecord[] {
  const resolveCategorySlugs = createCategorySlugsResolver(categories)
  const activityRecords = activities.map((activity) =>
    toActivityRecord(activity, resolveCategorySlugs)
  )
  const activitiesByPlace = groupByPlace(activities, activityRecords)
  const placeRecords = places
    .map((place) => ({ place, placeActivities: activitiesByPlace.get(place.id) ?? [] }))
    .filter(({ placeActivities }) => placeActivities.length !== SINGLE_ACTIVITY)
    .map(({ place, placeActivities }) => toPlaceRecord(place, placeActivities))
  return [...activityRecords, ...placeRecords]
}

export interface PlaceRecords {
  place: PlaceRow
  record: SearchResultRecord
  activities: SearchResultRecord[]
}

export function buildPlaceRecords(dataset: SearchDataset, placeId: string): PlaceRecords | null {
  const place = dataset.places.find(({ id }) => id === placeId)
  if (!place) return null
  const resolveCategorySlugs = createCategorySlugsResolver(dataset.categories)
  const activities = dataset.activities
    .filter((activity) => single(activity.place)?.id === placeId)
    .map((activity) => toActivityRecord(activity, resolveCategorySlugs))
  return { place, record: toPlaceRecord(place, activities), activities }
}

export function toListedResultItem(record: SearchResultRecord): SearchResultItem {
  return {
    ...record.item,
    fit: 'all',
    matchingAges: [],
    location: record.location,
    distanceKm: null,
  }
}
