import { ref } from 'vue'
import { stringifyQuery, type LocationQueryRaw, type RouteLocationRaw } from 'vue-router'

type RouteLike = { name?: unknown; path?: string } | null | undefined

const ROUTE_NAMES_BY_PATH: [RegExp, string][] = [
  [/^\/$/, 'index'],
  [/^\/search$/, 'search'],
  [/^\/place\/[^/]+$/, 'place-id'],
  [/^\/activity\/[^/]+$/, 'activity-id'],
]

function toPath(route: RouteLocationRaw): string {
  if (typeof route === 'string') return route
  const { path = '/', query } = route as { path?: string; query?: LocationQueryRaw }
  const search = query ? stringifyQuery(query) : ''
  return search ? `${path}?${search}` : path
}

export const useLocalePath = () => (route: RouteLocationRaw) => toPath(route)

export const useLocaleRoute = () => (route: RouteLocationRaw) => ({ fullPath: toPath(route) })

export const useSwitchLocalePath = () => (locale: string) => (locale === 'he' ? '/' : `/${locale}`)

export const useRouteBaseName = () => (route: RouteLike) => {
  if (typeof route?.name === 'string') return route.name.split('___')[0]
  const path = route?.path ?? ''
  return ROUTE_NAMES_BY_PATH.find(([pattern]) => pattern.test(path))?.[1]
}

export const useLocaleHead = () => ref({ htmlAttrs: {}, link: [], meta: [] })

export const useSetI18nParams = () => () => undefined
export const useBrowserLocale = () => null
export const useCookieLocale = () => ref('')
export const useI18nPreloadKeys = () => undefined
export const defineI18nRoute = () => undefined
export const defineI18nLocale = <T>(loader: T) => loader
export const defineI18nConfig = <T>(loader: T) => loader
