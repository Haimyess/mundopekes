import { isEvergreenWhen } from '@mundopekes/core'
import { toSearchQuery, type SearchState } from './search-query'

export const SITE_NAME = 'MundoPekes'
export const DEFAULT_SHARE_IMAGE_PATH = '/pwa-icons/icon-512.png'
export const INDEXABLE_SEARCH_QUERIES = ['category', 'free', 'kind', 'where', 'when', 'page']

export function brandTitle(title: string | null | undefined): string {
  if (!title) return SITE_NAME
  return title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`
}

export function absoluteUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

export function isIndexableSearch(state: SearchState): boolean {
  if (state.when && !isEvergreenWhen(state.when)) return false
  if (state.where && state.where.kind !== 'city') return false
  return Object.keys(toSearchQuery(state)).every((key) => INDEXABLE_SEARCH_QUERIES.includes(key))
}
