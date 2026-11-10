<script setup lang="ts">
import type { GeoBounds, GeoPoint } from '@mundopekes/core'
import type { Map as MapboxMap, MapEvents, Marker as MapboxMarker } from 'mapbox-gl'

export interface MapPin extends GeoPoint {
  id: string
  label: string
  title: string
}

interface Props {
  pins: readonly MapPin[]
  label: string
  activeId?: string | null
  highlightedId?: string | null
  shouldFitPins?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeId: null,
  highlightedId: null,
  shouldFitPins: true,
})

const emit = defineEmits<{
  select: [id: string]
  highlight: [id: string | null]
  move: [bounds: GeoBounds]
}>()

const STYLE_URL = 'mapbox://styles/mapbox/streets-v12'
const ISRAEL_CENTER: [number, number] = [34.95, 31.6]
const DEFAULT_ZOOM = 6.5
const FIT_PADDING = 48
const FIT_MAX_ZOOM = 14
const PIN_CLASS = 'map-canvas__pin'
const ACTIVE_PIN_CLASS = 'map-canvas__pin--active'

const { t, locale } = useI18n()
const token = useRuntimeConfig().public.mapboxToken as string | undefined
const container = useTemplateRef<HTMLDivElement>('container')

let map: MapboxMap | null = null
let createMarker: ((element: HTMLElement, pin: MapPin) => MapboxMarker) | null = null
const markers = new Map<string, { marker: MapboxMarker; element: HTMLButtonElement }>()

function createPinElement(pin: MapPin): HTMLButtonElement {
  const element = document.createElement('button')
  const label = document.createElement('span')
  element.type = 'button'
  element.className = PIN_CLASS
  element.title = pin.title
  element.setAttribute('aria-label', pin.title)
  label.className = 'map-canvas__pin-label'
  label.dir = 'ltr'
  label.textContent = pin.label
  element.append(label)
  element.addEventListener('click', () => emit('select', pin.id))
  element.addEventListener('mouseenter', () => emit('highlight', pin.id))
  element.addEventListener('mouseleave', () => emit('highlight', null))
  element.addEventListener('focus', () => emit('highlight', pin.id))
  element.addEventListener('blur', () => emit('highlight', null))
  return element
}

function refreshActivePins() {
  markers.forEach(({ element }, id) => {
    element.classList.toggle(ACTIVE_PIN_CLASS, id === props.activeId || id === props.highlightedId)
  })
}

function syncMarkers() {
  if (!map || !createMarker) return
  markers.forEach(({ marker }) => marker.remove())
  markers.clear()
  for (const pin of props.pins) {
    const element = createPinElement(pin)
    markers.set(pin.id, { marker: createMarker(element, pin), element })
  }
  refreshActivePins()
}

function fitToPins() {
  if (!map || !props.shouldFitPins || props.pins.length === 0) return
  const longitudes = props.pins.map(({ lng }) => lng)
  const latitudes = props.pins.map(({ lat }) => lat)
  map.fitBounds(
    [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ],
    { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, duration: 0 }
  )
}

function handleMoveEnd(event: MapEvents['moveend']) {
  if (!map || !event.originalEvent) return
  const bounds = map.getBounds()
  if (!bounds) return
  emit('move', {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  })
}

onMounted(async () => {
  if (!token || !container.value) return
  const { default: mapboxgl } = await import('mapbox-gl')
  map = new mapboxgl.Map({
    container: container.value,
    accessToken: token,
    style: STYLE_URL,
    center: ISRAEL_CENTER,
    zoom: DEFAULT_ZOOM,
    language: locale.value,
  })
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }))
  map.on('moveend', handleMoveEnd)
  createMarker = (element, pin) =>
    new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat([pin.lng, pin.lat]).addTo(map!)
  syncMarkers()
  fitToPins()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
  markers.clear()
})

watch(
  () => props.pins.map(({ id, label }) => `${id}:${label}`).join(),
  () => {
    syncMarkers()
    fitToPins()
  }
)
watch(() => [props.activeId, props.highlightedId], refreshActivePins)
</script>

<template>
  <div class="map-canvas" role="region" :aria-label="label">
    <div v-if="token" ref="container" class="map-canvas__map" />
    <p v-else class="map-canvas__unavailable" role="status">{{ t('map.unavailable') }}</p>
  </div>
</template>

<style>
@import 'mapbox-gl/dist/mapbox-gl.css';

.map-canvas__pin {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.map-canvas__pin-label {
  display: inline-block;
  padding: 4px 10px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font-family: var(--mp-font);
  font-size: var(--mp-fs-label-sm);
  font-weight: var(--mp-fw-bold);
  white-space: nowrap;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
}

.map-canvas__pin--active .map-canvas__pin-label {
  background: var(--mp-ink);
  color: var(--mp-surface);
}

.map-canvas__pin:focus-visible {
  outline: none;
}

.map-canvas__pin:focus-visible .map-canvas__pin-label {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}
</style>

<style scoped>
.map-canvas,
.map-canvas__map {
  inline-size: 100%;
  block-size: 100%;
}

.map-canvas__unavailable {
  display: grid;
  place-items: center;
  block-size: 100%;
  margin: 0;
  padding: 16px;
  color: var(--mp-text-2);
  text-align: center;
}
</style>
