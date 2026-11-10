import { vi } from 'vitest'

export const mapEvents = new Map<string, ((event: Record<string, unknown>) => void)[]>()
export const fitBounds = vi.fn()
export const removeMap = vi.fn()
export const mapOptions: Record<string, unknown>[] = []
export const markerElements: HTMLElement[] = []

class FakeMap {
  constructor(options: Record<string, unknown>) {
    mapOptions.push(options)
  }

  addControl() {}

  on(event: string, handler: (event: Record<string, unknown>) => void) {
    mapEvents.set(event, [...(mapEvents.get(event) ?? []), handler])
  }

  fitBounds(...args: unknown[]) {
    fitBounds(...args)
  }

  getBounds() {
    return { getSouth: () => 32, getWest: () => 34.7, getNorth: () => 32.2, getEast: () => 34.9 }
  }

  remove() {
    removeMap()
  }
}

class FakeMarker {
  private readonly element: HTMLElement

  constructor({ element }: { element: HTMLElement }) {
    this.element = element
  }

  setLngLat() {
    return this
  }

  addTo() {
    markerElements.push(this.element)
    document.body.append(this.element)
    return this
  }

  remove() {
    this.element.remove()
  }
}

const FakeNavigationControl = vi.fn()

export function resetMapbox() {
  mapEvents.clear()
  fitBounds.mockClear()
  removeMap.mockClear()
  mapOptions.length = 0
  markerElements.forEach((element) => element.remove())
  markerElements.length = 0
}

export default { Map: FakeMap, Marker: FakeMarker, NavigationControl: FakeNavigationControl }
