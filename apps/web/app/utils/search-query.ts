import { SEARCH_AMENITIES, serializeWhen } from '@mundopekes/core'
import { searchQuerySchema, type SearchQuery } from '@mundopekes/schemas'
import type { LocationQuery, RouteLocationRaw } from 'vue-router'

export const SEARCH_PATH = '/search'

const DEFAULT_SORT = 'recommended'
const FIRST_PAGE = 1

export type SearchState = SearchQuery

export function parseSearchQuery(query: LocationQuery): SearchState {
  return searchQuerySchema.parse(query)
}

export function toSearchQuery(state: SearchState): Record<string, string> {
  const query: Record<string, string> = {}
  if (state.q) query.q = state.q
  if (state.category) query.category = state.category
  if (state.when) query.when = serializeWhen(state.when)
  if (state.ages?.length) query.ages = state.ages.join(',')
  if (state.free) query.free = 'true'
  if (state.kind) query.kind = state.kind
  if (state.amenities?.length) {
    query.amenities = SEARCH_AMENITIES.filter((amenity) => state.amenities?.includes(amenity)).join(
      ','
    )
  }
  if (state.open) query.open = state.open
  if (state.sort && state.sort !== DEFAULT_SORT) query.sort = state.sort
  if (state.page && state.page > FIRST_PAGE) query.page = String(state.page)
  return query
}

export function patchSearchState(state: SearchState, patch: Partial<SearchState>): SearchState {
  const isPageChange = Object.keys(patch).every((key) => key === 'page')
  return { ...state, ...(isPageChange ? {} : { page: undefined }), ...patch }
}

export function toSearchLocation(state: SearchState): RouteLocationRaw {
  return { path: SEARCH_PATH, query: toSearchQuery(state) }
}
