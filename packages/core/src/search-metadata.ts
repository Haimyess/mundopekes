import type { SearchAmenity } from './search'

export const SEARCH_AMENITY_METADATA_KEYS: Readonly<Record<SearchAmenity, string>> = {
  stroller: 'stroller_friendly',
  wheelchair: 'wheelchair',
  bathrooms: 'has_bathrooms',
  'changing-table': 'has_changing_table',
  'safe-room': 'has_safe_room',
  parking: 'has_parking',
  kosher: 'has_kosher_food',
  shade: 'has_shadow',
}

export const SEARCH_DISCOUNTS_METADATA_KEY = 'discounts'
