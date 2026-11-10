<script setup lang="ts">
import type { GeoBounds, GeoPoint } from '@mundopekes/core'

export interface MapPin extends GeoPoint {
  id: string
  label: string
  title: string
}

interface LeafletBounds {
  getSouth(): number
  getWest(): number
  getNorth(): number
  getEast(): number
}

interface LeafletMap {
  fitBounds(
    bounds: [number, number][],
    options: { padding: [number, number]; maxZoom: number }
  ): void
  getBounds(): LeafletBounds
  on(event: 'moveend', handler: () => void): void
  invalidateSize(): void
}

interface LeafletMarker {
  getElement(): HTMLElement | undefined
}

interface LeafletModule {
  divIcon(options: { className: string; html: string; iconSize: null }): unknown
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

const ISRAEL_CENTER: [number, number] = [31.6, 34.95]
const DEFAULT_ZOOM = 8
const FIT_PADDING: [number, number] = [48, 48]
const FIT_MAX_ZOOM = 14
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const leaflet = shallowRef<LeafletModule | null>(null)
const map = shallowRef<LeafletMap | null>(null)
let isProgrammaticMove = false

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]!)

function pinIcon(pin: MapPin) {
  const isActive = pin.id === props.activeId || pin.id === props.highlightedId
  return leaflet.value?.divIcon({
    className: `map-canvas__pin${isActive ? ' map-canvas__pin--active' : ''}`,
    html: `<span class="map-canvas__pin-label" dir="ltr">${escapeHtml(pin.label)}</span>`,
    iconSize: null,
  })
}

function fitToPins() {
  if (!map.value || !props.shouldFitPins || props.pins.length === 0) return
  isProgrammaticMove = true
  map.value.fitBounds(
    props.pins.map(({ lat, lng }) => [lat, lng]),
    { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM }
  )
}

function handleMoveEnd() {
  if (isProgrammaticMove) {
    isProgrammaticMove = false
    return
  }
  const bounds = map.value?.getBounds()
  if (!bounds) return
  emit('move', {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  })
}

const handleReady = (instance: LeafletMap) => {
  map.value = instance
  instance.on('moveend', handleMoveEnd)
  fitToPins()
}
const ACTIVATION_KEYS = new Set(['Enter', ' '])

const handleSelect = (id: string) => emit('select', id)
const handleMarkerReady = (id: string, marker: LeafletMarker) => {
  marker.getElement()?.addEventListener('keydown', (event) => {
    if (!ACTIVATION_KEYS.has(event.key)) return
    event.preventDefault()
    handleSelect(id)
  })
}
const handleHighlight = (id: string | null) => emit('highlight', id)

watch(() => props.pins.map(({ id }) => id).join(), fitToPins)

onMounted(async () => {
  leaflet.value = (await import('leaflet')) as unknown as LeafletModule
})
</script>

<template>
  <div class="map-canvas" role="region" :aria-label="label">
    <LMap
      v-if="leaflet"
      :zoom="DEFAULT_ZOOM"
      :center="ISRAEL_CENTER"
      :use-global-leaflet="false"
      class="map-canvas__map"
      @ready="handleReady"
    >
      <LTileLayer :url="TILE_URL" :attribution="TILE_ATTRIBUTION" layer-type="base" name="OSM" />
      <LMarker
        v-for="pin in pins"
        :key="pin.id"
        :lat-lng="[pin.lat, pin.lng]"
        :icon="pinIcon(pin)"
        :options="{ title: pin.title, alt: pin.title, keyboard: true }"
        @click="handleSelect(pin.id)"
        @ready="handleMarkerReady(pin.id, $event)"
        @mouseover="handleHighlight(pin.id)"
        @mouseout="handleHighlight(null)"
      />
    </LMap>
  </div>
</template>

<style>
@import 'leaflet/dist/leaflet.css';

.map-canvas .leaflet-control-attribution {
  font-size: 9px;
}

.map-canvas__pin {
  inline-size: auto !important;
  block-size: auto !important;
  background: none;
  border: 0;
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
  transform: translate(-50%, -100%);
}

.map-canvas__pin--active .map-canvas__pin-label {
  background: var(--mp-ink);
  color: var(--mp-surface);
}

.map-canvas__pin:focus,
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
</style>
