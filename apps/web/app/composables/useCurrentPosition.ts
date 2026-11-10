import type { GeoPoint } from '@mundopekes/core'

export type PositionError = 'unsupported' | 'denied' | 'unavailable'

const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 60_000,
}

const PERMISSION_DENIED_CODE = 1

export function useCurrentPosition() {
  const isLocating = ref(false)
  const error = ref<PositionError | null>(null)

  function locate(): Promise<GeoPoint | null> {
    error.value = null
    if (!import.meta.client || !('geolocation' in navigator)) {
      error.value = 'unsupported'
      return Promise.resolve(null)
    }
    isLocating.value = true
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          isLocating.value = false
          resolve({ lat: coords.latitude, lng: coords.longitude })
        },
        ({ code }) => {
          isLocating.value = false
          error.value = code === PERMISSION_DENIED_CODE ? 'denied' : 'unavailable'
          resolve(null)
        },
        POSITION_OPTIONS
      )
    })
  }

  return { isLocating, error, locate }
}
