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
 * a mano.
 *
 * Clustering (Fase 4): sí se agrega, pero con clusterPoints()
 * (useMarkerClustering.ts) — matemática pura de proyección Web Mercator,
 * sin ninguna librería de clustering ni window.L, evitando el problema
 * que descartó el intento anterior. Los clusters se recalculan
 * reactivamente con el zoom real del mapa (evento 'zoomend').
 */
import type { ComponentPublicInstance } from 'vue'
import type { Activity } from '~/types'
import { clusterPoints, type ClusterMarker } from '~/composables/useMarkerClustering'

interface Props {
  activities: Activity[]
  /** 'split' (default): lista + mapa lado a lado, comportamiento actual
   * sin cambios. 'fullbleed': mapa a pantalla completa con un carousel
   * horizontal flotante abajo en vez de la lista lateral — usado por
   * PwaExploreScreen.vue (Fase 3). Aditivo: nunca cambia el default. */
  chrome?: 'split' | 'fullbleed'
  /** Coordenadas de "Cerca de mí" (search.vue) — si están presentes, el
   * carousel del mapa (fullbleed) muestra la distancia en un badge sobre
   * cada card. null/undefined = sin "cerca de mí" activo, sin badge. */
  userCoords?: { lat: number; lng: number } | null
  /** Toggle Lista/Mapa flotante. true en split (siempre) y en el fullbleed
   * de mobile web (search.vue) — ahí es la única forma de volver a la
   * lista. false en PwaExploreScreen: la PWA instalada no tiene un modo
   * "lista" para el mapa, ese switch no aplica. */
  showToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  chrome: 'split',
  userCoords: null,
  showToggle: true,
})

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

// Ícono uniforme (pin circular con el color de acento) + el módulo de
// leaflet cargado, reutilizado también para construir íconos de cluster
// on-demand (buildClusterIcon). Se importa una sola vez, en el cliente,
// directamente (no depende de window.L / use-global-leaflet).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const leaflet = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinIcon = shallowRef<any>(null)
onMounted(async () => {
  leaflet.value = await import('leaflet')
  pinIcon.value = leaflet.value.divIcon({
    className: 'map-pin',
    html: '<span class="map-pin__dot"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
})

// Tamaño del ícono de cluster escalonado por cantidad — más actividades
// agrupadas, círculo un poco más grande (tope en 3 escalones, no crece
// indefinidamente).
function buildClusterIcon(count: number) {
  if (!leaflet.value) return undefined
  const size = count < 10 ? 34 : count < 50 ? 42 : 50
  return leaflet.value.divIcon({
    className: 'map-cluster',
    html: `<span class="map-cluster__dot" style="width:${size}px;height:${size}px">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Zoom reactivo del mapa — arranca en DEFAULT_ZOOM, se actualiza con cada
// 'zoomend' real (ver onMapReady). Es el input clave de clusterPoints():
// a menos zoom, más agresivo el agrupamiento.
const zoom = ref(DEFAULT_ZOOM)

type ClusterableItem = { id: string; lat: number; lng: number; activity: GeoActivity }

const clusterableItems = computed<ClusterableItem[]>(() =>
  geoActivities.value.map((a) => ({
    id: a.id,
    lat: Number(a.place.lat),
    lng: Number(a.place.lng),
    activity: a,
  }))
)

// Con el volumen de actividades actual (decenas, no miles), agrupar
// agresivamente terminaba mostrando 1-2 clusters gigantes y CERO pines
// individuales apenas el mapa cargaba — la grilla de 60px cubre decenas
// de km en un zoom alejado, y en un país geográficamente chico eso basta
// para meter casi todo en la misma celda. Clustering solo entra en juego
// a partir de este piso; por debajo, cada actividad es su propio pin
// (ver plan: "no implementar optimizaciones innecesarias si el volumen
// actual no las justifica, pero dejar la arquitectura preparada").
const CLUSTERING_MIN_ACTIVITIES = 30

const clusters = computed(() => {
  // Sin leaflet cargado todavía no hay pinIcon/buildClusterIcon reales —
  // renderizar antes de eso deja que Leaflet caiga a su ícono por
  // defecto (imagen que en un build con bundler casi siempre da 404 y
  // queda invisible, sin que se note ningún error — el resto del mapa se
  // ve normal). Mejor esperar el instante que tarda el import dinámico
  // que arriesgar pines invisibles.
  if (!leaflet.value) return []
  if (clusterableItems.value.length <= CLUSTERING_MIN_ACTIVITIES) {
    return clusterableItems.value.map((point) => ({ type: 'point' as const, point }))
  }
  return clusterPoints(clusterableItems.value, zoom.value)
})

function flyToCluster(cluster: ClusterMarker<ClusterableItem>) {
  const map = leafletMap.value
  if (!map) return
  const targetZoom = Math.min(map.getZoom() + 3, 18)
  map.flyTo([cluster.lat, cluster.lng], targetZoom, { duration: 0.5 })
}

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
  // Bug real detrás de "no se ven los pines": vue-leaflet (setupMarker/
  // shouldBlankIcon en vue-leaflet.es.js) blanquea el `icon` prop a un
  // divIcon vacío (className: "", sin iconSize custom → cae al default de
  // Leaflet de 12x12) cada vez que detecta contenido en el slot default
  // del <LMarker> que no reconoce como su propio LPopup/LTooltip por
  // nombre de componente — y no lo reconoce porque acá <LPopup> llega
  // auto-importado globalmente por Nuxt (@nuxtjs/leaflet), no con el
  // import directo que esa función espera. Confirmado con Playwright
  // contra el dev server real: los 15 markers se creaban bien posicionados
  // pero sin la clase "map-pin" ni el <span> del punto — exactamente este
  // blanqueo. Se pisa acá, después de creado, con el ícono real.
  if (pinIcon.value) (marker as { setIcon?: (icon: unknown) => void }).setIcon?.(pinIcon.value)
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
  // En chrome="fullbleed" el alto real del canvas depende de una cadena de
  // position:absolute/flex que puede no estar terminada de asentar en el
  // layout del browser en el mismo instante en que Vue termina de aplicar
  // el patch del DOM — nextTick() garantiza lo segundo, no lo primero. Se
  // encadena requestAnimationFrame (espera al siguiente paint real) y
  // además un segundo invalidateSize demorado como red de seguridad, ya
  // que sin esto Leaflet cachea un tamaño viejo/chico y los pines quedan
  // mal posicionados o directamente no se ven hasta un resize real.
  if (import.meta.client) {
    const m = map as { invalidateSize: () => void }
    nextTick(() => {
      requestAnimationFrame(() => m.invalidateSize())
    })
    setTimeout(() => m.invalidateSize(), 300)
  }
}

// Leaflet cachea el tamaño en píxeles de su contenedor al montar y NO
// detecta solo un resize por CSS/flex (como el height medido en JS que
// llega después, en search.vue). Con el tamaño cacheado desactualizado,
// la conversión lat/lng → píxel queda mal y flyTo termina centrando en
// el punto equivocado (o el pin ni se ve). invalidateSize() lo corrige
// cada vez que el contenedor realmente cambia de tamaño.
//
// En chrome="fullbleed" además se reintenta fitToResults() acá mismo, no
// solo con nextTick/rAF/setTimeout (que en dispositivo real seguían sin
// alcanzar: el mapa quedaba en el centro/zoom por defecto del país
// entero en vez de encuadrar a los resultados, aunque split sí
// encuadraba bien). ResizeObserver es la única señal 100% confiable de
// "el contenedor YA tiene su tamaño final real" — la cadena de
// position:absolute anidada de PwaExploreScreen puede tardar más de un
// frame en asentarse, y este observer sigue disparando hasta que lo haga.
watch(leafletMap, (map) => {
  if (!map || !canvasEl.value || !import.meta.client) return
  canvasResizeObserver?.disconnect()
  canvasResizeObserver = new ResizeObserver(() => {
    map.invalidateSize()
    if (props.chrome === 'fullbleed') fitToResults(map)
  })
  canvasResizeObserver.observe(canvasEl.value)

  // Zoom real del mapa → clusters se recalculan solos (ver `clusters`).
  zoom.value = map.getZoom()
  map.on('zoomend', () => {
    zoom.value = map.getZoom()
  })
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

  const activity = geoActivities.value.find((a) => a.id === id)
  const map = leafletMap.value
  if (activity && map) {
    const targetZoom = Math.max(map.getZoom(), 15)
    map.flyTo([Number(activity.place.lat), Number(activity.place.lng)], targetZoom, {
      duration: 0.5,
    })
  }

  if (hoverSource.value === 'marker') {
    // inline: 'center' (no el 'nearest' por default) — la card enfocada
    // debe quedar centrada en el carousel horizontal, no solo visible.
    cardElById.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }
})

// Encuadrar el mapa a los resultados cuando cambian.
// fitBounds/setView calculan el zoom en base al tamaño CACHEADO del
// contenedor (map.getSize()) — en chrome="fullbleed" este watcher puede
// dispararse antes de que el layout async (position:absolute/flex)
// termine de asentarse, así que fitBounds calcula un zoom/centro en base
// a un tamaño chico o viejo. El resultado: el mapa "funciona" (se ve,
// tiene tiles) pero encuadra a un punto/zoom donde ningún pin cae dentro
// del viewport visible. invalidateSize() antes de fitBounds ataca esto,
// pero un solo intento puede seguir corriendo antes de que el layout
// termine de asentarse del todo — por eso se reintenta una vez más 300ms
// después (mismo patrón defensivo que onMapReady, que sí resolvió el bug
// original de "pines invisibles").
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fitToResults(map: any) {
  if (!geoActivities.value.length) return
  map.invalidateSize()

  // Solo coordenadas realmente numéricas: Number(a.place.lat/lng) puede dar
  // NaN si el dato en DB viene mal formado — L.latLng(NaN, NaN) tira
  // "Invalid LatLng object" sin capturar si se cuela acá.
  const points = geoActivities.value
    .map((a) => [Number(a.place.lat), Number(a.place.lng)] as [number, number])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))

  if (points.length <= 1) {
    map.setView(points[0] ?? mapCenter.value, 14)
    return
  }

  // Antes esto construía el bounds con L.latLngBounds() usando NUESTRO
  // propio `await import('leaflet')` — pero LMap corre con
  // use-global-leaflet="false", así que arma el mapa con SU PROPIA copia
  // del módulo. Vite en dev no siempre dedupea un import() dinámico contra
  // el leaflet que ya trae vue-leaflet, y map.fitBounds() hace un
  // `instanceof LatLngBounds` interno contra SU copia — si el bounds vino
  // de la copia equivocada, ese instanceof falla, Leaflet lo trata como
  // dato crudo sin poder iterarlo, y arma un bounds nunca inicializado →
  // "Bounds are not valid.", siempre, no por una carrera (confirmado: el
  // catch de abajo lo atrapaba en cada llamada, no de forma intermitente).
  // Pasarle el array plano directo a fitBounds() lo esquiva del todo: lo
  // convierte internamente con SU PROPIA copia de Leaflet, sin construir
  // nada nosotros — mismo array [[lat,lng], ...] que antes, sin el
  // intermediario. Ya no hace falta el import de leaflet acá.
  try {
    map.fitBounds(points, { padding: [32, 32], maxZoom: 15 })
  } catch (err) {
    if (import.meta.dev) console.warn('[map] fitBounds failed, falling back to setView', err)
    map.setView(mapCenter.value, 12)
  }
}

watch([leafletMap, geoActivities], async ([map]) => {
  if (!map) return
  await nextTick()
  fitToResults(map)
  // Tamaño de contenedor 0 (o muy chico) al primer intento → getSize()
  // sigue reportando eso hasta el próximo invalidateSize real; reintentar
  // el encuadre completo (no solo invalidateSize) cubre el caso donde el
  // primer fitBounds ya calculó mal el zoom con un tamaño viejo.
  setTimeout(() => fitToResults(map), 350)
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
  <div class="search-map" :class="{ 'search-map--fullbleed': chrome === 'fullbleed' }">
    <!-- ── Lista de tarjetas (solo chrome="split") ─────────────────── -->
    <div v-if="chrome === 'split'" class="search-map__list" @scroll="onListScroll">
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

      <div v-if="!activities.length" class="search-map__empty">
        <UIcon name="i-heroicons-face-frown" class="search-map__empty-icon" />
        <p>{{ t('search.no_results') }}</p>
      </div>
      <div v-else-if="!geoActivities.length" class="search-map__empty">
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

            <template
              v-for="item in clusters"
              :key="item.type === 'point' ? item.point.id : item.id"
            >
              <!-- Cluster: círculo con conteo, click acerca zoom (no hay
                   una sola actividad que resaltar/scrollear). -->
              <LMarker
                v-if="item.type === 'cluster'"
                :lat-lng="[item.lat, item.lng]"
                :icon="buildClusterIcon(item.count)"
                @click="flyToCluster(item)"
              />

              <LMarker
                v-else
                :lat-lng="[item.point.lat, item.point.lng]"
                :icon="pinIcon ?? undefined"
                @ready="(marker: unknown) => registerMarker(item.point.id, marker)"
                @mouseover="onPinEnter(item.point.id)"
                @mouseout="onPinLeave"
                @click="onPinEnter(item.point.id)"
              >
                <!-- Se renderiza siempre, incluso en fullbleed (donde el
                     "preview" real es el carousel de abajo) — queda oculto
                     por CSS (.search-map--fullbleed :global(.leaflet-popup-pane)),
                     no sacado del todo. Prueba puntual: es la única
                     diferencia estructural entre split (pines OK) y
                     fullbleed (pines invisibles) que quedaba sin descartar
                     — si esto arregla fullbleed, confirma que vue-leaflet
                     necesita el slot de LPopup para terminar de montar el
                     marker en el mapa. -->
                <LPopup>
                  <NuxtLink :to="`/activity/${item.point.activity.id}`" class="map-popup">
                    <div class="map-popup__img-wrap">
                      <img
                        v-if="imageFor(item.point.activity)"
                        :src="imageFor(item.point.activity)!"
                        alt=""
                        class="map-popup__img"
                      />
                      <SharedNoImage v-else />
                    </div>
                    <div class="map-popup__body">
                      <span class="map-popup__title">{{ tc(item.point.activity.title_i18n) }}</span>
                      <span v-if="item.point.activity.place.city?.name" class="map-popup__city">
                        {{ item.point.activity.place.city.name }}
                      </span>
                      <span v-if="priceLabel(item.point.activity)" class="map-popup__price">
                        {{ priceLabel(item.point.activity) }}
                      </span>
                    </div>
                  </NuxtLink>
                </LPopup>
              </LMarker>
            </template>
          </LMap>

          <!-- Toggle List/Mapa flotando sobre el mapa. -->
          <div v-if="showToggle" class="search-map__toggle" role="group">
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
      <p v-if="hasNonGeoResults && chrome === 'split'" class="search-map__notice">
        {{ t('search.map_missing_location') }}
      </p>
    </div>

    <!-- ── Carousel flotante de resultados (solo chrome="fullbleed") ── -->
    <div v-if="chrome === 'fullbleed'" class="search-map__carousel" @scroll="onListScroll">
      <div
        v-for="activity in geoActivities"
        :key="activity.id"
        :ref="(el) => setCardEl(activity.id, el)"
        class="search-map__carousel-item"
        :class="{ 'search-map__carousel-item--focused': hoveredId === activity.id }"
      >
        <SearchMapCard :activity="activity" :user-coords="userCoords" />
      </div>

      <div v-if="!activities.length" class="search-map__carousel-empty">
        <UIcon name="i-heroicons-face-frown" class="search-map__empty-icon" />
        <p>{{ t('search.no_results') }}</p>
      </div>
      <div v-else-if="!geoActivities.length" class="search-map__carousel-empty">
        <UIcon name="i-heroicons-map-pin" class="search-map__empty-icon" />
        <p>{{ t('search.map_no_locations') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import 'leaflet/dist/leaflet.css';

/* Sin controles de zoom +/- (pinch-to-zoom / rueda alcanzan en mobile y
   desktop) — mismo patrón :global() que .leaflet-popup-pane más abajo, ya
   que Leaflet los inyecta fuera del árbol scoped. La atribución (OSM) NO
   se oculta: su política de uso de tiles exige mostrarla visiblemente
   sobre el mapa — solo se le baja el tamaño/opacidad para que estorbe lo
   menos posible.
   Tiles: OpenStreetMap directo, sin API key (CARTO Voyager se probó acá
   y mostraba "API KEY REQUIRED" superpuesto en cada tile — su plan
   gratuito ya no sirve tiles anónimos sin key). */
:global(.leaflet-control-zoom) {
  display: none;
}

:global(.leaflet-control-attribution) {
  font-size: 9px;
  background: rgba(255, 255, 255, 0.7);
  padding: 0 4px;
}

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

/* ── Fullbleed (PWA Explore, Fase 3): mapa a pantalla completa + ─── */
/* carousel horizontal flotante abajo en vez de la lista lateral.     */
/* position:absolute + inset:0 en vez de una cadena de height:100% —
   más robusto contra el timing de montaje async de ClientOnly/Leaflet
   (un height:100% en cascada podía resolver a 0 en el primer paint,
   dejando el mapa y sus pines invisibles hasta un resize real). */
.search-map--fullbleed {
  position: absolute;
  inset: 0;
  gap: 0;
}

.search-map--fullbleed .search-map__map {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.search-map--fullbleed .search-map__canvas {
  flex: 1;
  min-height: 0;
  height: auto;
  border-radius: 0;
  border: none;
}

.search-map--fullbleed .search-map__skeleton {
  flex: 1;
  min-height: 0;
  height: auto;
  border-radius: 0;
}

/* El toggle base se posiciona pegado al fondo del canvas (bottom: space-4)
   — en fullbleed ese fondo queda tapado por el carousel de cards. Lo subo
   lo justo para que quede flotando arriba de esas cards en vez de
   superpuesto. Alto aproximado de una card del carousel (ver
   MapCard.vue: imagen 8rem + body ~3.5rem) + el mismo offset de fondo que
   usa el carousel (--pwa-bottom-nav-height, chico/0 fuera de la PWA
   instalada) + un respiro. */
.search-map--fullbleed .search-map__toggle {
  bottom: calc(12.5rem + var(--pwa-bottom-nav-height, 0px) + var(--space-3));
}

/* El LPopup se renderiza siempre (ver comentario en el template) pero en
   fullbleed el preview real es el carousel de abajo — se oculta visual,
   no se saca del DOM. */
.search-map--fullbleed :global(.leaflet-popup-pane) {
  display: none;
}

.search-map__carousel {
  position: absolute;
  inset-inline: 0;
  /* El mapa fullbleed llega hasta el borde real de la pantalla (el bottom
     nav flota ENCIMA, con z-index más alto) — el carousel sí necesita
     restar la altura reservada del nav para no quedar tapado por él. */
  bottom: var(--pwa-bottom-nav-height);
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-inline: var(--space-3);
  padding-bottom: var(--space-2);
  scrollbar-width: none;
  -ms-overflow-style: none;
  z-index: 5;
}

.search-map__carousel::-webkit-scrollbar {
  display: none;
}

.search-map__carousel-item {
  flex: 0 0 auto;
  /* 65% de la pantalla (antes 10.5rem fijo, quedaban chicas) — el min()
     evita que se vuelvan enormes en un teléfono grande/tablet en modo
     retrato, único contexto donde corre este carousel (fullbleed = solo
     mobile, ver isMobileViewport en search.vue). */
  width: min(65vw, 22rem);
  scroll-snap-align: center;
  /* width real (no transform:scale) — así crecer empuja a las vecinas de
     verdad en vez de superponerse encima, y el gap del carousel mantiene
     la separación sola. transition en width anima el crecimiento sin
     saltos. */
  transition:
    width var(--transition-slow),
    box-shadow var(--transition-slow);
}

/* Pin tocado → la card correspondiente crece ~20% EN ANCHO (no alto, ver
   height fijo en SearchMapCard) y se destaca con shadow — así nunca se
   mueve verticalmente ni se recorta contra el borde del carousel, solo
   se desplaza hacia los lados, empujando a sus vecinas y manteniendo la
   separación entre cards. */
.search-map__carousel-item--focused {
  position: relative;
  z-index: 1;
  width: min(75vw, 25rem);
  box-shadow: var(--shadow-lg);
  border-radius: var(--border-radius-sm);
}

.search-map__carousel-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
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

/* ── Cluster custom (divIcon, Fase 4) ────────────────────────────── */
:global(.map-cluster) {
  background: none;
  border: none;
}

:global(.map-cluster__dot) {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--color-accent-600);
  color: white;
  font-size: 0.75rem;
  font-weight: var(--font-weight-bold);
  border: 3px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: transform 0.15s ease;
}

:global(.map-cluster__dot:hover) {
  transform: scale(1.08);
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
