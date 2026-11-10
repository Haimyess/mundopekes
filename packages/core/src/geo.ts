export interface GeoPoint {
  lat: number
  lng: number
}

export interface GeoBounds {
  south: number
  west: number
  north: number
  east: number
}

const EARTH_RADIUS_KM = 6371
const DEGREES_TO_RADIANS = Math.PI / 180

export function distanceKm(from: GeoPoint, to: GeoPoint): number {
  const latDelta = (to.lat - from.lat) * DEGREES_TO_RADIANS
  const lngDelta = (to.lng - from.lng) * DEGREES_TO_RADIANS
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(from.lat * DEGREES_TO_RADIANS) *
      Math.cos(to.lat * DEGREES_TO_RADIANS) *
      Math.sin(lngDelta / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine))
}

export function isInBounds(point: GeoPoint, bounds: GeoBounds): boolean {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  )
}

export function roundCoordinate(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
