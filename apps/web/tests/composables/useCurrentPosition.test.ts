import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCurrentPosition } from '~/app/composables/useCurrentPosition'

function stubGeolocation(
  outcome: { coords: { latitude: number; longitude: number } } | { code: number }
) {
  const getCurrentPosition = vi.fn((success: PositionCallback, failure: PositionErrorCallback) => {
    if ('coords' in outcome) success(outcome as unknown as GeolocationPosition)
    else failure(outcome as unknown as GeolocationPositionError)
  })
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  return getCurrentPosition
}

describe('useCurrentPosition', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks for the position once and only when called', async () => {
    const getCurrentPosition = stubGeolocation({ coords: { latitude: 32.08, longitude: 34.78 } })
    const { locate, isLocating, error } = useCurrentPosition()
    expect(getCurrentPosition).not.toHaveBeenCalled()
    await expect(locate()).resolves.toEqual({ lat: 32.08, lng: 34.78 })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(isLocating.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('distinguishes a denied permission from other failures', async () => {
    stubGeolocation({ code: 1 })
    const denied = useCurrentPosition()
    await expect(denied.locate()).resolves.toBeNull()
    expect(denied.error.value).toBe('denied')
    stubGeolocation({ code: 3 })
    const timedOut = useCurrentPosition()
    await timedOut.locate()
    expect(timedOut.error.value).toBe('unavailable')
  })

  it('reports browsers without geolocation', async () => {
    vi.stubGlobal('navigator', {})
    const { locate, error } = useCurrentPosition()
    await expect(locate()).resolves.toBeNull()
    expect(error.value).toBe('unsupported')
  })
})
