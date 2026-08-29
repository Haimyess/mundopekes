<script setup lang="ts">
/**
 * Search > MapView
 * Vista dividida: lista de tarjetas a la izquierda + mapa (Leaflet) a la
 * derecha, igual que Airbnb/Fillo. Hover/click en una tarjeta resalta y
 * abre el popup del pin correspondiente en el mapa, y viceversa (hover en
 * un pin resalta y hace scroll a su tarjeta).
 *
 * Markers declarativos (<LMarker><LPopup>) en vez de la composable
 * imperativa useLMarkerCluster: esta última depende de que `window.L`
 * quede poblado a tiempo (use-global-leaflet) y de un import dinámico de
 * leaflet.markercluster que resultó frágil en producción (no se veían
 * pines). El patrón declarativo ya está probado en este mismo repo
 * (ActivityInfoLocation.vue) y además permite que el popup sea contenido
 * Vue real (estilos con scope, i18n) en vez de un string de HTML armado
 * a mano. Se pierde el agrupado automático (clustering) — se puede sumar
 * más adelante si hace falta con resultados muy densos.
 */
import type { ComponentPublicInstance } from 'vue'
import type { Activity } from '~/types'

interface Props {
  activities: Activity[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'switch-to-list': []
}>()

const { tc } = useI18nContent()
const { t } = useI18n()

type GeoActivity = Activity & {
  place: NonNullable<Activity['place']> & { lat: number; lng: number }
}

const geoActivities = computed<GeoActivity[]>(
  () =>
    props.activities.filter((a) => a.place?.lat != null && a.place?.lng != null) as GeoActivity[]
)

const hasNonGeoResults = computed(
  () => props.activities.length > 0 && geoActivities.value.length < props.activities.length
)

// Centro aprox. de Israel — fallback cuando no hay actividades geolocalizadas
const DEFAULT_CENTER: [number, number] = [31.7683, 35.2137]
const DEFAULT_ZOOM = 8

const mapCenter = computed<[number, number]>(() => {
  if (!geoActivities.value.length) return DEFAULT_CENTER
  const lats = geoActivities.value.map((a) => Number(a.place.lat))
  const lngs = geoActivities.value.map((a) => Number(a.place.lng))
  return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2]
})

// Ícono uniforme (pin circular con el color de acento). Se construye una
// sola vez, en el cliente, importando `leaflet` directamente (no depende
// de window.L / use-global-leaflet).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinIcon = shallowRef<any>(null)
onMounted(async () => {
  const L = await import('leaflet')
  pinIcon.value = L.divIcon({
    className: 'map-pin',
    html: '<span class="map-pin__dot"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const leafletMap = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const markerById = new Map<string, any>()
const cardElById = new Map<string, HTMLElement>()

// ID de la actividad resaltada (hover en tarjeta o en pin) — sincroniza
// ambos lados. hoverSource viaja junto con hoveredId (mismo tick) para que
// el watcher siempre lea el valor correcto — una variable plana reseteada
// de forma síncrona no sirve acá porque watch() corre en el siguiente
// microtask, para cuando ya se había vuelto a poner en false.
const hoveredId = ref<string | null>(null)
const hoverSource = ref<'card' | 'marker' | null>(null)

function registerMarker(id: string, marker: unknown) {
  markerById.set(id, marker)
}

function setCardEl(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) cardElById.set(id, el)
  else cardElById.delete(id)
}

// Al scrollear la lista (rueda del mouse o trackpad) el cursor queda
// quieto y las tarjetas se mueven debajo suyo — eso dispara mouseenter
// en cada una al pasar. isListScrolling se marca en @scroll y se apaga
// un rato después del último evento de scroll; mientras esté activo,
// se ignora cualquier hover (ni highlight ni flyTo), sea cual sea su
// duración — así el hover solo se confirma cuando el mouse se queda
// quieto por decisión propia, no porque el scroll se frenó debajo de él.
const isListScrolling = ref(false)
let scrollEndTimer: ReturnType<typeof setTimeout> | undefined
let cardHoverTimer: ReturnType<typeof setTimeout> | undefined

function onListScroll() {
  isListScrolling.value = true
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  scrollEndTimer = setTimeout(() => {
    isListScrolling.value = false
  }, 200)
}

function onCardEnter(id: string) {
  if (isListScrolling.value) return
  if (cardHoverTimer) clearTimeout(cardHoverTimer)
  cardHoverTimer = setTimeout(() => {
    if (isListScrolling.value) return
    hoverSource.value = 'card'
    hoveredId.value = id
  }, 200)
}

function onCardLeave() {
  if (cardHoverTimer) {
    clearTimeout(cardHoverTimer)
    cardHoverTimer = undefined
  }
  hoveredId.value = null
  hoverSource.value = null
}

function onPinEnter(id: string) {
  hoverSource.value = 'marker'
  hoveredId.value = id
}

function onPinLeave() {
  hoveredId.value = null
  hoverSource.value = null
}

function priceLabel(activity: Activity): string {
  if (activity.is_free) return t('activity.free')
  if (activity.price != null) return `₪${activity.price}`
  return ''
}

function imageFor(activity: GeoActivity): string | null {
  return activity.images?.[0] ?? activity.place?.images?.[0] ?? null
}

const canvasEl = ref<HTMLElement | null>(null)
let canvasResizeObserver: ResizeObserver | undefined

function onMapReady(map: unknown) {
  leafletMap.value = map
}

// Leaflet cachea el tamaño en píxeles de su contenedor al montar y NO
// detecta solo un resize por CSS/flex (como el height medido en JS que
// llega después, en search.vue). Con el tamaño cacheado desactualizado,
// la conversión lat/lng → píxel queda mal y flyTo termina centrando en
// el punto equivocado (o el pin ni se ve). invalidateSize() lo corrige
// cada vez que el contenedor realmente cambia de tamaño.
watch(leafletMap, (map) => {
  if (!map || !canvasEl.value || !import.meta.client) return
  canvasResizeObserver?.disconnect()
  canvasResizeObserver = new ResizeObserver(() => {
    map.invalidateSize()
  })
  canvasResizeObserver.observe(canvasEl.value)
})

// Hover en pin → resalta + abre popup + hace scroll en la lista para
// mostrar la tarjeta. Hover en tarjeta → resalta + abre popup + acerca
// el mapa a ese pin (flyTo).
watch(hoveredId, (id, prevId) => {
  if (prevId) markerById.get(prevId)?.getElement()?.classList.remove('map-pin--active')
  if (!id) return

  const marker = markerById.get(id)
  marker?.getElement()?.classList.add('map-pin--active')
  marker?.openPopup?.()

  if (hoverSource.value === 'marker') {
    cardElById.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } else if (hoverSource.value === 'card') {
    const activity = geoActivities.value.find((a) => a.id === id)
    const map = leafletMap.value
    if (activity && map) {
      const targetZoom = Math.max(map.getZoom(), 15)
      map.flyTo([Number(activity.place.lat), Number(activity.place.lng)], targetZoom, {
        duration: 0.5,
      })
    }
  }
})

// Encuadrar el mapa a los resultados cuando cambian
watch([leafletMap, geoActivities], async ([map]) => {
  if (!map || !geoActivities.value.length) return
  await nextTick()
  const L = await import('leaflet')
  if (geoActivities.value.length === 1) {
    map.setView(mapCenter.value, 14)
    return
  }
  const bounds = L.latLngBounds(
    geoActivities.value.map((a) => [Number(a.place.lat), Number(a.place.lng)] as [number, number])
  )
  map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 })
})

onBeforeUnmount(() => {
  if (cardHoverTimer) clearTimeout(cardHoverTimer)
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  canvasResizeObserver?.disconnect()
  markerById.clear()
  cardElById.clear()
})
</script>

<template>
  <div class="search-map">
    <!-- ── Lista de tarjetas ─────────────────────────────────────── -->
    <div class="search-map__list" @scroll="onListScroll">
      <div
        v-for="activity in geoActivities"
        :key="activity.id"
        :ref="(el) => setCardEl(activity.id, el)"
        class="search-map__card"
        :class="{ 'search-map__card--focused': hoveredId === activity.id }"
        @mouseenter="onCardEnter(activity.id)"
        @mouseleave="onCardLeave"
      >
        <SharedActivityCard :activity="activity" variant="compact" />
      </div>

      <div v-if="!geoActivities.length && activities.length" class="search-map__empty">
        <UIcon name="i-heroicons-map-pin" class="search-map__empty-icon" />
        <p>{{ t('search.map_no_locations') }}</p>
      </div>
    </div>

    <!-- ── Mapa ──────────────────────────────────────────────────── -->
    <div class="search-map__map">
      <ClientOnly>
        <div ref="canvasEl" class="search-map__canvas">
          <LMap
            :zoom="DEFAULT_ZOOM"
            :center="mapCenter"
            :use-global-leaflet="false"
            style="height: 100%; width: 100%"
            @ready="onMapReady"
          >
            <LTileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              layer-type="base"
              name="OpenStreetMap"
            />

            <LMarker
              v-for="activity in geoActivities"
              :key="activity.id"
              :lat-lng="[Number(activity.place.lat), Number(activity.place.lng)]"
              :icon="pinIcon ?? undefined"
              @ready="(marker: unknown) => registerMarker(activity.id, marker)"
              @mouseover="onPinEnter(activity.id)"
              @mouseout="onPinLeave"
            >
              <LPopup>
                <NuxtLink :to="`/activity/${activity.id}`" class="map-popup">
                  <div class="map-popup__img-wrap">
                    <img
                      v-if="imageFor(activity)"
                      :src="imageFor(activity)!"
                      alt=""
                      class="map-popup__img"
                    />
                    <SharedNoImage v-else />
                  </div>
                  <div class="map-popup__body">
                    <span class="map-popup__title">{{ tc(activity.title_i18n) }}</span>
                    <span v-if="activity.place.city?.name" class="map-popup__city">
                      {{ activity.place.city.name }}
                    </span>
                    <span v-if="priceLabel(activity)" class="map-popup__price">
                      {{ priceLabel(activity) }}
                    </span>
                  </div>
                </NuxtLink>
              </LPopup>
            </LMarker>
          </LMap>

          <!-- Toggle List/Mapa flotando sobre el mapa (no sobre toda la
               página) — centrado en el mapa, deja más espacio libre para
               el resto del contenido. -->
          <div class="search-map__toggle" role="group">
            <button type="button" class="search-map__toggle-btn" @click="emit('switch-to-list')">
              <UIcon name="i-heroicons-list-bullet" class="search-map__toggle-icon" />
              <span class="search-map__toggle-label">{{ t('search.view_list') }}</span>
            </button>
            <button type="button" class="search-map__toggle-btn search-map__toggle-btn--active">
              <UIcon name="i-heroicons-map" class="search-map__toggle-icon" />
              <span class="search-map__toggle-label">{{ t('search.view_map') }}</span>
            </button>
          </div>
        </div>

        <template #fallback>
          <div class="search-map__skeleton" />
        </template>
      </ClientOnly>

      <!-- Aviso: actividades sin ubicación no aparecen en el mapa -->
      <p v-if="hasNonGeoResults" class="search-map__notice">
        {{ t('search.map_missing_location') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
@import 'leaflet/dist/leaflet.css';

.search-map {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  /* En desktop crece para llenar el wrap (ver .search-page__map-wrap) */
  flex: 1;
  min-height: 0;
}

/* ── Lista ───────────────────────────────────────────────────────── */
.search-map__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 48vh;
  overflow-y: auto;
  padding-inline-end: 2px;
  /* Sigue siendo scrolleable — solo se oculta la barra visual, mismo
     patrón que el resto de los scrolls horizontales del sitio. */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.search-map__list::-webkit-scrollbar {
  display: none;
}

.search-map__card {
  border-radius: var(--border-radius-lg);
  transition:
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

/* Enfoque al hacer hover sobre el pin correspondiente en el mapa — sutil,
   mismo lenguaje visual que el hover nativo de las cards (sin color que
   sobresalga ni reflow del resto de la lista). */
.search-map__card--focused {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* ── Mapa ────────────────────────────────────────────────────────── */
.search-map__map {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.search-map__canvas {
  width: 100%;
  height: 50vh;
  min-height: 360px;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-neutral-200);
  position: relative;
  z-index: 0;
}

/* Toggle List/Mapa — centrado sobre el borde inferior del mapa mismo,
   no de toda la página, para no competir por espacio con el resto. */
.search-map__toggle {
  position: absolute;
  bottom: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: var(--border-radius-full);
  background: var(--color-bg-primary);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-neutral-200);
}

.search-map__toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  padding: var(--space-1-5, 0.375rem) var(--space-3);
  border-radius: var(--border-radius-full);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-map__toggle-btn--active {
  background: var(--color-accent-50);
  color: var(--color-accent-700);
  box-shadow: var(--shadow-xs);
}

.search-map__toggle-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.search-map__toggle-label {
  display: none;
}

@media (min-width: 480px) {
  .search-map__toggle-label {
    display: inline;
  }
}

.search-map__skeleton {
  width: 100%;
  height: 50vh;
  min-height: 360px;
  border-radius: var(--border-radius-lg);
  background: var(--color-neutral-100);
  animation: search-map-pulse 1.5s ease-in-out infinite;
}

@keyframes search-map-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.search-map__notice {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.search-map__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8);
  color: var(--color-text-tertiary);
  text-align: center;
}

.search-map__empty-icon {
  width: 2rem;
  height: 2rem;
}

/* ── Desktop: lista a la izquierda + mapa a la derecha ──────────── */
@media (min-width: 768px) {
  .search-map {
    flex-direction: row;
    /* stretch (no flex-start): lista y mapa toman la misma altura, la
       que termine dando el flex:1 heredado desde .search-page__map-wrap
       — así ambos crecen hacia abajo si hay lugar antes del footer. */
    align-items: stretch;
  }

  .search-map__list {
    width: 22rem;
    flex-shrink: 0;
    max-height: none;
  }

  .search-map__map {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .search-map__canvas {
    flex: 1;
    height: auto;
    min-height: 420px;
  }

  .search-map__skeleton {
    flex: 1;
    height: auto;
    min-height: 420px;
  }
}

/* ── Pin custom (divIcon) ──────────────────────────────────────── */
:global(.map-pin) {
  background: none;
  border: none;
}

:global(.map-pin__dot) {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: var(--color-accent-500);
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.15s ease,
    background-color 0.15s ease;
}

:global(.map-pin--active .map-pin__dot) {
  transform: scale(1.35);
  background: var(--color-accent-700);
}

/* ── Popup preview (contenido Vue real dentro del popup de Leaflet) ─ */
:global(.leaflet-popup-content-wrapper) {
  padding: 0;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

:global(.leaflet-popup-content) {
  margin: 0;
  width: 230px !important;
}

/*
 * Horizontal y compacto: la imagen no tiene una altura propia — hace
 * stretch (align-items: stretch en .map-popup) para tomar exactamente
 * la altura que termina ocupando el bloque de texto, ni más ni menos.
 * Texto casi sin espaciado entre líneas (título / dirección / gratis).
 */
.map-popup {
  display: flex;
  align-items: stretch;
  text-decoration: none;
  color: inherit;
}

.map-popup__img-wrap {
  width: 3.5rem;
  height: 3.5rem;
  flex-shrink: 0;
  overflow: hidden;
}

.map-popup__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.map-popup__img-wrap :deep(.no-image) {
  padding: 4px;
}

.map-popup__img-wrap :deep(.no-image__icon) {
  width: 1rem;
  height: 1rem;
  margin-bottom: 0;
}

.map-popup__img-wrap :deep(.no-image__label) {
  display: none;
}

.map-popup__body {
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.map-popup__title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.3;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-popup__city {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.3;
  font-weight: var(--font-weight-normal);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-popup__price {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.3;
  font-weight: var(--font-weight-bold);
  color: var(--color-accent-700);
}
</style>
