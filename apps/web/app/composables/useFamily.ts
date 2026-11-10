import {
  FAMILY_COOKIE_MAX_AGE_SECONDS,
  FAMILY_COOKIE_NAME,
  familyCookieToSearchQuery,
  parseFamilyCookie,
  toFamilyCookie,
} from '@mundopekes/schemas'
import type { SearchState } from '~/utils/search-query'

function comparableQuery(state: SearchState): string {
  const { sort: _sort, page: _page, view: _view, bbox: _bbox, q: _q, ...saved } = state
  const query = toSearchQuery({
    ...saved,
    where: saved.where?.kind === 'city' ? saved.where : undefined,
  })
  return new URLSearchParams(query).toString()
}

export function hasFamilyCriteria(state: SearchState): boolean {
  return !!(state.ages?.length || state.where?.kind === 'city' || state.when)
}

export function useFamily() {
  const cookie = useCookie<unknown>(FAMILY_COOKIE_NAME, {
    maxAge: FAMILY_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: !import.meta.dev,
    default: () => null,
  })

  const family = computed<SearchState | null>(() => {
    const parsed = parseFamilyCookie(cookie.value)
    return parsed ? familyCookieToSearchQuery(parsed) : null
  })

  function save(state: SearchState) {
    cookie.value = toFamilyCookie(state, new Date())
  }

  function clear() {
    cookie.value = null
  }

  function isSaved(state: SearchState): boolean {
    return !!family.value && comparableQuery(family.value) === comparableQuery(state)
  }

  return { family, save, clear, isSaved }
}
