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
}

const props = defineProps<Props>()
const { t } = useI18n()

const hasCoords = computed(() =>
  props.place?.lat != null && props.place?.lng != null
)

// Leaflet espera [lat, lng] como tupla — parseFloat por si vienen como string de Supabase
const mapCenter = computed<[number, number]>(() => [
  parseFloat(String(props.place?.lat ?? 0)),
  parseFloat(String(props.place?.lng ?? 0))
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

    <!-- ─── Header ────────────────────────────────────────── -->
    <div class="info-section__title">
      <span class="info-section__title-icon-wrap">
        <UIcon name="i-heroicons-map-pin" class="info-section__title-icon" />
      </span>
      {{ t('activity.location') }}
    </div>

    <div class="info-section__body">

      <!-- Nombre del lugar + ciudad -->
      <div class="info-location__meta">
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
            style="height: 100%; width: 100%;"
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
      <div v-else-if="!hasCoords" class="info-location__no-map">
        <UIcon name="i-heroicons-map" class="info-location__no-map-icon" />
        <span>{{ t('activity.no_location') }}</span>
      </div>

      <!-- ─── Botones de navegación ─────────────────────── -->
      <div v-if="hasCoords" class="info-location__actions">
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

/* ── Card base ───────────────────────────────────────────────── */
.info-section {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--border-radius-xl);
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────── */
.info-section__title {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  font-family: var(--font-family-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-neutral-100);
  background: var(--color-neutral-50);
}

.info-section__title-icon-wrap {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--border-radius-md);
  background: #d1fae5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-section__title-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: #059669;
}

/* ── Body ────────────────────────────────────────────────────── */
.info-section__body {
  padding: var(--space-4) var(--space-5);
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
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ── Sin coordenadas ─────────────────────────────────────────── */
.info-location__no-map {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--space-3) 0;
}

.info-location__no-map-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
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
  transition: opacity var(--transition-fast), transform var(--transition-fast);
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
  background: #33ccff;
  color: #fff;
}

.info-location__btn--maps {
  background: var(--color-neutral-100);
  color: var(--color-text-primary);
  border-color: var(--color-neutral-200);
}
</style>