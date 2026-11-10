import type { AgeFit, GeoPoint, IsoDate, SearchFacets } from '@mundopekes/core'

export type LocalizedText = Record<string, string>

export interface AgeSpanYears {
  min: number
  max: number
}

export interface SearchResultItem {
  kind: 'activity' | 'place'
  id: string
  title: LocalizedText
  placeName: LocalizedText | null
  imageUrl: string | null
  cityName: string | null
  isFree: boolean
  price: number | null
  ageSpan: AgeSpanYears | null
  activityCount: number | null
  fit: Exclude<AgeFit, 'none'>
  matchingAges: number[]
  location: GeoPoint | null
  distanceKm: number | null
}

export type SearchPin = SearchResultItem & { location: GeoPoint }

export interface SearchOccasion {
  key: string
  name: LocalizedText
  startsOn: IsoDate
  endsOn: IsoDate
}

export interface SearchResponse {
  items: SearchResultItem[]
  total: number
  page: number
  pageCount: number
  facets: SearchFacets
  occasion: SearchOccasion | null
  today: IsoDate
  pins: SearchPin[]
}
