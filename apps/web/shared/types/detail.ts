import type {
  GeoPoint,
  SearchAmenity,
  SearchDiscount,
  Weekday,
  WeeklyHours,
} from '@mundopekes/core'
import type { AgeSpanYears, LocalizedText, SearchResultItem } from './search'

export interface DetailContact {
  phone: string | null
  website: string | null
  whatsappUrl: string | null
  directionsUrl: string | null
  wazeUrl: string | null
}

export interface DetailHours {
  weekly: WeeklyHours | null
  isOpenNow: boolean | null
  today: Weekday
}

export interface PlaceDetail {
  id: string
  name: LocalizedText
  description: LocalizedText | null
  images: string[]
  cityName: string | null
  address: string | null
  location: GeoPoint | null
  contact: DetailContact
  hours: DetailHours
  amenities: SearchAmenity[]
  discounts: SearchDiscount[]
  isFree: boolean
  price: number | null
  ageSpan: AgeSpanYears | null
  activities: SearchResultItem[]
  updatedAt: string | null
}
