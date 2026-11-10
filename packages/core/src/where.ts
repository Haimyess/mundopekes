import { findCity } from './cities'
import { roundCoordinate, type GeoPoint } from './geo'

export type Where = { kind: 'city'; slug: string } | { kind: 'point'; point: GeoPoint }

export const SEARCH_RADII_KM = [5, 10, 25, 50] as const

export type SearchRadiusKm = (typeof SEARCH_RADII_KM)[number]

export const DEFAULT_RADIUS_KM: SearchRadiusKm = 25

export const POINT_PRECISION_DECIMALS = 2

const CITY_PREFIX = 'city:'
const POINT_PREFIX = 'point:'
const COORDINATE_SEPARATOR = ','
const COORDINATE_PATTERN = /^-?\d{1,3}(?:\.\d+)?$/

function isValidPoint({ lat, lng }: GeoPoint): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function toPrivatePoint({ lat, lng }: GeoPoint): GeoPoint {
  return {
    lat: roundCoordinate(lat, POINT_PRECISION_DECIMALS),
    lng: roundCoordinate(lng, POINT_PRECISION_DECIMALS),
  }
}

function parsePoint(value: string): GeoPoint | null {
  const parts = value.split(COORDINATE_SEPARATOR)
  if (parts.length !== 2 || !parts.every((part) => COORDINATE_PATTERN.test(part))) return null
  const point = { lat: Number(parts[0]), lng: Number(parts[1]) }
  return isValidPoint(point) ? toPrivatePoint(point) : null
}

export function parseWhere(raw: string): Where | null {
  const value = raw.trim()
  if (value.startsWith(CITY_PREFIX)) {
    const slug = value.slice(CITY_PREFIX.length)
    return findCity(slug) ? { kind: 'city', slug } : null
  }
  if (value.startsWith(POINT_PREFIX)) {
    const point = parsePoint(value.slice(POINT_PREFIX.length))
    return point ? { kind: 'point', point } : null
  }
  return null
}

export function serializeWhere(where: Where): string {
  if (where.kind === 'city') return `${CITY_PREFIX}${where.slug}`
  const { lat, lng } = toPrivatePoint(where.point)
  return `${POINT_PREFIX}${lat}${COORDINATE_SEPARATOR}${lng}`
}

export function resolveWhereOrigin(where: Where): GeoPoint | null {
  if (where.kind === 'point') return where.point
  const city = findCity(where.slug)
  return city ? { lat: city.lat, lng: city.lng } : null
}
