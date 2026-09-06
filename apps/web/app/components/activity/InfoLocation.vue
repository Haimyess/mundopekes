<script setup lang="ts">
/**
 * Activity > InfoLocation
 * Mapa con @nuxtjs/leaflet — los componentes LMap, LTileLayer, LMarker, LPopup
 * son auto-importados por el módulo, no hace falta importar nada manualmente.
 *
 * El mapa se envuelve en <ClientOnly> porque Leaflet requiere window/document.
 */

import type { Place } from '~/types'

interface Props {
  place: Place
  hideActions?: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()

const hasCoords = computed(() => props.place?.lat != null && props.place?.lng != null)

// Leaflet espera [lat, lng] como tupla — parseFloat por si vienen como string de Supabase
const mapCenter = computed<[number, number]>(() => [
  Number.parseFloat(String(props.place?.lat ?? 0)),
  Number.parseFloat(String(props.place?.lng ?? 0)),
])

const wazeUrl = computed(() => {
  if (!hasCoords.value) return null
  const [lat, lng] = mapCenter.value
  return `https://www.waze.com/ul?ll=${lat}%2C${lng}&navigate=yes&zoom=17`
})

const mapsUrl = computed(() => {
  if (!hasCoords.value) return null
  const [lat, lng] = mapCenter.value
  return `https://maps.google.com/?q=${lat},${lng}`
})
</script>

<template>
  <div class="info-section">
    <div class="info-section__body">
      <!-- Nombre del lugar + ciudad (solo cuando hay mapa) -->
      <div v-if="hasCoords" class="info-location__meta">
        <p class="info-location__place-name">{{ place.name }}</p>
        <p v-if="place.city?.name" class="info-location__city">
          <UIcon name="i-heroicons-building-office-2" class="info-location__city-icon" />
          {{ place.city.name }}
          <template v-if="place.city.region"> · {{ place.city.region }}</template>
        </p>
      </div>

      <!-- ─── Mapa Leaflet ──────────────────────────────── -->
      <!-- ClientOnly es obligatorio: Leaflet usa window/document -->
      <ClientOnly v-if="hasCoords">
        <div class="info-location__map">
          <LMap
            :zoom="14"
            :center="mapCenter"
            :use-global-leaflet="false"
            style="height: 100%; width: 100%"
          >
            <LTileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              layer-type="base"
              name="OpenStreetMap"
            />
            <LMarker :lat-lng="mapCenter">
              <LPopup>
                <strong>{{ place.name }}</strong>
                <br v-if="place.city?.name" />
                <span v-if="place.city?.name">{{ place.city.name }}</span>
              </LPopup>
            </LMarker>
          </LMap>
        </div>

        <!-- Skeleton mientras carga -->
        <template #fallback>
          <div class="info-location__map-skeleton" />
        </template>
      </ClientOnly>

      <!-- Sin coordenadas -->
      <div v-else class="info-location__no-map">
        <UIcon name="i-heroicons-map-pin-slash" class="info-location__no-map-icon" />
        <div class="info-location__no-map-text">
          <span class="info-location__no-map-title">{{ t('activity.no_location') }}</span>
          <span v-if="place.name" class="info-location__no-map-sub">{{ place.name }}</span>
        </div>
      </div>

      <!-- ─── Botones de navegación ─────────────────────── -->
      <div v-if="hasCoords && !hideActions" class="info-location__actions">
        <a
          :href="wazeUrl!"
          target="_blank"
          rel="noopener noreferrer"
          class="info-location__btn info-location__btn--waze"
        >
          <UIcon name="i-heroicons-map" class="info-location__btn-icon" />
          Waze
        </a>
        <a
          :href="mapsUrl!"
          target="_blank"
          rel="noopener noreferrer"
          class="info-location__btn info-location__btn--maps"
        >
          <UIcon name="i-heroicons-globe-alt" class="info-location__btn-icon" />
          Google Maps
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import 'leaflet/dist/leaflet.css';

/* Sin controles de zoom +/- ni atribución "Leaflet | OpenStreetMap"
   flotando sobre el mapa — Leaflet los inyecta fuera del árbol scoped,
   por eso :global(). Mismo criterio que search/MapView.vue. */
:global(.leaflet-control-zoom) {
  display: none;
}

:global(.leaflet-control-attribution) {
  display: none;
}

/* ── Card base ───────────────────────────────────────────────── */
.info-section {
  overflow: hidden;
}

/* ── Label ───────────────────────────────────────────────────── */
.info-section__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 var(--space-3);
}

/* ── Body ────────────────────────────────────────────────────── */
.info-section__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ── Meta ────────────────────────────────────────────────────── */
.info-location__meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.info-location__place-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.info-location__city {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.info-location__city-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}

/* ── Mapa ────────────────────────────────────────────────────── */
.info-location__map {
  width: 100%;
  height: 220px;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-neutral-200);
  /* z-index necesario para que los controles de Leaflet no queden debajo */
  position: relative;
  z-index: 0;
}

.info-location__map-skeleton {
  width: 100%;
  height: 220px;
  border-radius: var(--border-radius-lg);
  background: var(--color-neutral-100);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ── Sin coordenadas ─────────────────────────────────────────── */
.info-location__no-map {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-neutral-50, #fafafa);
  border: 1px solid var(--color-neutral-200, #e5e5e5);
  border-radius: var(--border-radius-lg);
}

.info-location__no-map-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  color: var(--color-neutral-400, #a3a3a3);
}

.info-location__no-map-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-location__no-map-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.info-location__no-map-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary, #a3a3a3);
}

/* ── Botones de navegación ───────────────────────────────────── */
.info-location__actions {
  display: flex;
  gap: var(--space-2);
}

.info-location__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--border-radius-lg);
  text-decoration: none;
  border: 1px solid transparent;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.info-location__btn:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.info-location__btn-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.info-location__btn--waze {
  background: var(--color-secondary-600, #16a34a);
  color: #fff;
  border-color: transparent;
}

.info-location__btn--maps {
  background: #fff;
  color: var(--color-text-primary);
  border-color: var(--color-neutral-200);
}
</style>
