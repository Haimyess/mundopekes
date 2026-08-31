<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { calculateDistance } from '~/utils/helpers'
import type { Activity, ActivityFilters } from '~/types'

definePageMeta({ layout: 'fullwidth' })

const { t } = useI18n()
const { tc } = useI18nContent()
const route = useRoute()
const router = useRouter()

const store = useActivitiesStore()
const {
  ageOptions,
  cityOptions,
  seasonOptions,
  buildFiltersFromQuery,
  buildQueryFromFilters,
  removeFilterFromQuery,
  countActiveFilters,
  fetchFilteredActivities,
  fetchFilteredActivitiesPaginated,
} = useActivityFilters()

const { categoryOptions } = useCategories()
const { trackSearch } = useTracking()
const { isStandalone } = usePwaMode()

// ── Place matches for the same free-text query — additive, doesn't touch
// the activity search/filter pipeline above. Lets one search box answer both
// "find an activity" (the existing grid) and "find a place" (this strip)
// intents without a mode toggle. Reuses the wizard's own-DB place search.
const localPlaceSearch = useLocalPlaceSearch()

// ── Vista: lista o mapa ─────────────────────────────────────────────
const viewMode = ref<'list' | 'map'>('list')
const filterBarEl = ref<HTMLElement | null>(null)
const mapWrapEl = ref<HTMLElement | null>(null)

// Alto del bloque mapa+lista en vista mapa. Se mide en JS (viewport -
// posición real del bloque) en vez de intentar lograrlo con una cadena
// de flex:1/min-height:0 — esta página vive dentro del layout compartido
// (navbar + <main class="flex-1"> + footer), que solo garantiza una
// ALTURA MÍNIMA (min-h-screen), no una altura fija. Sin un techo real en
// algún punto de la cadena, cada flex:1 termina persiguiendo el tamaño
// de su propio contenido en vez de limitarlo — por eso el mapa se
// escapaba del viewport. Midiendo con getBoundingClientRect() no hace
// falta adivinar la altura del navbar ni de los filtros.
const mapWrapHeight = ref<number | null>(null)

function updateMapWrapHeight() {
  if (!mapWrapEl.value) return
  // Mobile apila lista/mapa con alturas fijas (vh) propias y ya funciona
  // bien — esta medida es solo para el layout de escritorio (lado a lado).
  if (window.innerWidth < 768) {
    mapWrapHeight.value = null
    return
  }
  const top = mapWrapEl.value.getBoundingClientRect().top
  const available = window.innerHeight - top
  mapWrapHeight.value = Math.max(available, 400)
}

// Al pasar a mapa, bajar la página para que el mapa quede visible desde
// la barra de filtros en vez de quedar cortado más abajo, y después
// medir el espacio real que queda hasta el fondo de la ventana. Al
// volver a lista, subir de nuevo al top de la página.
// También re-fetchea: Lista pagina (una página de resultados), Mapa
// necesita el set completo para los pines — son dos formas de traer
// datos distintas, así que cambiar de modo dispara su propio fetch.
watch(viewMode, (mode) => {
  void fetchResults()

  if (mode === 'map') {
    nextTick(() => {
      filterBarEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Esperar a que termine el scroll suave antes de medir la posición final
      setTimeout(updateMapWrapHeight, 400)
    })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

onMounted(() => {
  window.addEventListener('resize', updateMapWrapHeight)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMapWrapHeight)
})

// ── Cerca de mí — reordena los resultados actuales por distancia ────
// Pedido puntual (one-shot) con la API nativa en vez de useGeolocation:
// un watcher continuo (watchPosition) queda "vivo" entre clicks y, al
// desactivar/reactivar, resume() sobre un watcher ya activo no siempre
// dispara un cambio nuevo en coords/error — se quedaba en "buscando..."
// para siempre. getCurrentPosition da un resultado (u error) por click,
// sin estado compartido que se pueda quedar rancio.
const nearMeActive = ref(false)
const nearMeLocating = ref(false)
const nearMeError = ref(false)
const userCoords = ref<{ lat: number; lng: number } | null>(null)

function toggleNearMe() {
  if (nearMeActive.value) {
    nearMeActive.value = false
    return
  }
  if (!import.meta.client || !navigator.geolocation) {
    nearMeError.value = true
    return
  }
  nearMeError.value = false
  nearMeLocating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userCoords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      nearMeLocating.value = false
      nearMeActive.value = true
    },
    () => {
      nearMeLocating.value = false
      nearMeError.value = true
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  )
}

function sortByDistance(list: Activity[]): Activity[] {
  const origin = userCoords.value
  if (!origin) return list
  return [...list].sort((a, b) => {
    const da =
      a.place?.lat != null && a.place?.lng != null
        ? calculateDistance(origin.lat, origin.lng, a.place.lat, a.place.lng)
        : Infinity
    const db =
      b.place?.lat != null && b.place?.lng != null
        ? calculateDistance(origin.lat, origin.lng, b.place.lat, b.place.lng)
        : Infinity
    return da - db
  })
}

// ── Cargar opciones al montar ─────────────────────────────────────
// Non-blocking on purpose: un `await` de nivel superior acá detendría el
// montaje de toda la página (Suspense) hasta que resuelva, retrasando la
// primera pintura de filtros/grilla sin necesidad — los selects de filtro
// ya son reactivos a `store.filterOptions` y se completan solos apenas
// llega la data. Se dispara junto con loadAllActivities para que ambas
// corran en paralelo apenas monta el componente.
onMounted(() => {
  void store.loadFilterOptions()
  void store.loadAllActivities()
})

// ── Estado principal ──────────────────────────────────────────────
const activities = ref<Activity[]>([])
const loading = ref(false)
const drawerOpen = ref(false)

// ── Paginación (solo vista Lista — Mapa siempre trae el set completo) ──
const PAGE_SIZE = 20
const currentPage = ref(1)
const totalResults = ref(0)

watch(drawerOpen, async (isOpen) => {
  if (isOpen) await store.loadAllActivities()
})

// ── Source of truth: filtros desde la URL ─────────────────────────
const filtersFromUrl = computed<ActivityFilters>(() => buildFiltersFromQuery(route.query))

const activeFiltersCount = computed(() => countActiveFilters(filtersFromUrl.value))

// ── Estado local desktop ──────────────────────────────────────────
// Estado local — junto a localAge, localCities, etc:
const localCategory = ref<string | undefined>(undefined)
const rawCategoryOpts = ref<{ label: string; value: string; name_i18n: Record<string, string> }[]>(
  []
)
const categoryOpts = computed(() =>
  rawCategoryOpts.value.map((c) => ({ label: tc(c.name_i18n), value: c.value }))
)
const localAge = ref<number | undefined>(undefined)
const localCities = ref<string[]>([])
const localSeason = ref<string | undefined>(undefined)
const localFree = ref(false)
const localStroller = ref(false)
const localWeekends = ref(false)

onMounted(async () => {
  rawCategoryOpts.value = await categoryOptions()
})

// Sincronizar local con URL — resuelve bug de filtros al venir del homepage
watch(
  () => route.query,
  (q) => {
    localAge.value = q.age ? Number(q.age) : undefined
    localCities.value = q.city ? (q.city as string).split(',') : []
    localSeason.value = q.season as string | undefined
    localFree.value = q.free === 'true'
    localStroller.value = q.stroller_friendly === 'true'
    localWeekends.value = q.open_weekends === 'true'
    localCategory.value = q.category as string | undefined
  },
  { immediate: true }
)

// ── Filtros locales como ActivityFilters para los conteos ─────────
// Refleja el estado local actual (sin haber apretado Buscar)
// para que los conteos sean reactivos mientras el usuario selecciona
const localFiltersForCounts = computed<ActivityFilters>(() => {
  const ageOption = ageOptions.value.find((o) => o.value === localAge.value)
  return {
    search: filtersFromUrl.value.search, // preservar search activo de la URL
    age_id: localAge.value,
    age_min: ageOption?.min,
    age_max: ageOption?.max,
    city: localCities.value.length ? localCities.value.join(',') : undefined,
    season: localSeason.value as ActivityFilters['season'],
    is_free: localFree.value || undefined,
    stroller_friendly: localStroller.value || undefined,
    open_weekends: localWeekends.value || undefined,
    category: localCategory.value,
  }
})

// ── Conteos dinámicos desktop — mismo composable que el drawer ────
const {
  countForAge,
  countForCity,
  countForSeason,
  isAgeDisabled,
  isCityDisabled,
  isSeasonDisabled,
  isExtraDisabled,
} = useFilterCounts(
  computed(() => store.allActivities),
  localFiltersForCounts
)

// ── Opciones con conteo inyectado en el label ─────────────────────
// Solo mostramos el conteo si es > 0 para no mostrar "(0)" en opciones disabled
const ageOptionsWithCount = computed(() =>
  ageOptions.value.map((opt) => ({
    ...opt,
    label: countForAge(opt) > 0 ? `${opt.label} (${countForAge(opt)})` : opt.label,
    disabled: isAgeDisabled(opt, localAge.value, opt.value),
  }))
)

const cityOptionsWithCount = computed(() =>
  cityOptions.value.map((opt) => ({
    ...opt,
    label:
      countForCity(opt.value as string) > 0
        ? `${opt.label} (${countForCity(opt.value as string)})`
        : opt.label,
    disabled: isCityDisabled(opt.value as string, localCities.value),
  }))
)

const seasonOptionsWithCount = computed(() =>
  seasonOptions.value.map((opt) => ({
    ...opt,
    label:
      countForSeason(opt.value as string) > 0
        ? `${opt.label} (${countForSeason(opt.value as string)})`
        : opt.label,
    disabled: isSeasonDisabled(opt.value as string, localSeason.value),
  }))
)

// ── Botón limpiar — solo si hay filtros aplicados en la URL ───────
// NO aparece por tener filtros locales pendientes sin aplicar
const showClearBtn = computed(() => activeFiltersCount.value > 0)

// ── Sticky bar ────────────────────────────────────────────────────
const filterBarRef = ref<HTMLElement | null>(null)
const showSticky = ref(false)

useIntersectionObserver(
  filterBarRef,
  (entries) => {
    const entry = entries[0]
    if (entry) showSticky.value = !entry.isIntersecting
  },
  {
    threshold: 0,
    rootMargin: '-64px 0px 0px 0px', // 64px = altura navbar h-16
  }
)

// ── Aplicar filtros desktop → URL ─────────────────────────────────
const applyDesktopFilters = () => {
  const ageOption = ageOptions.value.find((o) => o.value === localAge.value)
  const filters: ActivityFilters = {
    age_id: ageOption?.value,
    age_min: ageOption?.min,
    age_max: ageOption?.max,
    city: localCities.value.length ? localCities.value.join(',') : undefined,
    season: localSeason.value as ActivityFilters['season'],
    is_free: localFree.value || undefined,
    stroller_friendly: localStroller.value || undefined,
    open_weekends: localWeekends.value || undefined,
    category: localCategory.value,
  }
  const query = buildQueryFromFilters(filters, route.query.q as string)
  void router.push({ path: '/search', query })
}

// ── Limpiar ───────────────────────────────────────────────────────
const clearFilters = () => {
  const query = route.query.q ? { q: route.query.q as string } : {}
  void router.push({ path: '/search', query })
}

const clearAll = () => {
  void router.push({ path: '/search', query: {} })
}

// ── Remover chip individual ───────────────────────────────────────
const removeFilter = (key: keyof ActivityFilters, cityValue?: string) => {
  const newQuery = removeFilterFromQuery(route.query, key, cityValue)
  void router.push({ path: '/search', query: newQuery })
}

// ── Drawer mobile ─────────────────────────────────────────────────
const onDrawerApply = (newFilters: ActivityFilters) => {
  const query = buildQueryFromFilters(newFilters, route.query.q as string)
  void router.push({ path: '/search', query })
  drawerOpen.value = false
}

// ── Fetch ─────────────────────────────────────────────────────────
const fetchResults = async () => {
  loading.value = true
  try {
    const f = filtersFromUrl.value
    // Sin filtros activos: evitar traer el mismo dataset dos veces.
    // store.allActivities (usado para los conteos) ya es exactamente
    // el mismo query que fetchFilteredActivities({}) traería — mismo
    // select, mismo predicado approved/active, sin filtros de por medio —
    // así que se reutiliza en vez de duplicar el round-trip.
    // loadAllActivities() cachea internamente, así que si ya está
    // cargada (caso normal, se dispara en onMounted) esto no vuelve a
    // pegarle a la DB.
    const noFiltersActive = !f.search && activeFiltersCount.value === 0

    if (viewMode.value === 'map') {
      // Mapa: siempre el set completo — los pines necesitan verse todos
      // juntos, no tiene sentido paginar el mapa.
      if (noFiltersActive) {
        await store.loadAllActivities()
        activities.value = store.allActivities
      } else {
        activities.value = await fetchFilteredActivities(f)
      }
      totalResults.value = activities.value.length
    } else if (noFiltersActive) {
      // Lista sin filtros: paginar cortando store.allActivities en el
      // cliente — ya está cargada para los conteos, cero costo de red
      // extra por paginar este caso.
      await store.loadAllActivities()
      totalResults.value = store.allActivities.length
      const from = (currentPage.value - 1) * PAGE_SIZE
      activities.value = store.allActivities.slice(from, from + PAGE_SIZE)
    } else {
      // Lista con filtros: paginación real vía .range() en la DB.
      const { data, total } = await fetchFilteredActivitiesPaginated(
        f,
        currentPage.value,
        PAGE_SIZE
      )
      activities.value = data
      totalResults.value = total
    }

    trackSearch({
      query: f.search,
      category: f.category,
      city: f.city,
      resultsCount: activities.value.length,
    })
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query,
  () => {
    currentPage.value = 1
    void fetchResults()
  },
  { immediate: true, deep: true }
)

function onPageChange(page: number) {
  currentPage.value = page
  void fetchResults()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Fires the parallel place lookup whenever the free-text query changes —
// same debounce/rate-limit as the wizard, via the shared composable.
watch(
  () => filtersFromUrl.value.search,
  (q) => {
    if (q && q.trim().length >= 2) localPlaceSearch.search(q)
    else localPlaceSearch.clear()
  },
  { immediate: true }
)

// Resultados a mostrar — reordenados por distancia si "Cerca de mí" está activo
const displayActivities = computed(() =>
  nearMeActive.value ? sortByDistance(activities.value) : activities.value
)

// ── Consistencia de filtros: Places vs Activities ──────────────────
// `places` no tiene columnas propias de category/age/season/is_free/
// stroller_friendly/open_weekends — esos son atributos de la actividad,
// no del lugar. Por eso NO se inventan esas columnas ni se duplica la
// lógica de fetchFilteredActivities() en el server route de places: en
// vez de eso, un lugar "pasa" esos filtros si tiene al menos una
// actividad que ya pasó por fetchFilteredActivities() (misma fuente de
// verdad que la grilla de arriba). City sí es un atributo real del
// lugar (place.city), así que ese se aplica directo sobre el resultado
// del name-search, sin pasar por actividades.
const hasActivityOnlyFilters = computed(() => {
  const f = filtersFromUrl.value
  return !!(
    f.category ||
    f.age_id !== undefined ||
    f.season ||
    f.is_free ||
    f.stroller_friendly ||
    f.open_weekends
  )
})

const displayedPlaces = computed(() => {
  let results = localPlaceSearch.results.value

  const cityFilter = filtersFromUrl.value.city
  if (cityFilter) {
    const cities = cityFilter.split(',')
    results = results.filter((p) => p.city && cities.includes(p.city.name))
  }

  if (hasActivityOnlyFilters.value) {
    const qualifyingPlaceIds = new Set(activities.value.map((a) => a.place_id))
    results = results.filter((p) => qualifyingPlaceIds.has(p.id))
  }

  return results
})

// ── SEO ───────────────────────────────────────────────────────────
useSeoMeta({
  title: t('search.page_title'),
  description: t('search.page_description'),
})
</script>

<template>
  <PwaExploreScreen
    v-if="isStandalone"
    v-model:drawer-open="drawerOpen"
    :activities="displayActivities"
    :filters="filtersFromUrl"
    :active-filters-count="activeFiltersCount"
    :all-activities="store.allActivities"
    :loading-all-activities="store.loadingAllActivities"
    :user-coords="userCoords"
    @apply-filters="onDrawerApply"
    @clear-filters="clearFilters"
  />

  <template v-else>
    <div class="search-page">
      <div class="search-page__container">
        <div class="search-page__header">
          <div class="search-page__header-row">
            <h1 class="search-page__title">{{ t('search.title') }}</h1>

            <div class="search-page__view-toggle" role="group">
              <button
                type="button"
                class="search-page__view-btn"
                :class="{ 'search-page__view-btn--active': viewMode === 'list' }"
                @click="viewMode = 'list'"
              >
                <UIcon name="i-heroicons-list-bullet" class="search-page__view-icon" />
                <span class="search-page__view-label">{{ t('search.view_list') }}</span>
              </button>
              <button
                type="button"
                class="search-page__view-btn"
                :class="{ 'search-page__view-btn--active': viewMode === 'map' }"
                @click="viewMode = 'map'"
              >
                <UIcon name="i-heroicons-map" class="search-page__view-icon" />
                <span class="search-page__view-label">{{ t('search.view_map') }}</span>
              </button>
            </div>
          </div>
          <p class="search-page__subtitle">{{ t('search.subtitle') }}</p>
        </div>

        <!-- Barra de filtros — oculta cuando no hay resultados y no carga -->
        <div
          v-if="loading || activities.length > 0"
          ref="filterBarEl"
          class="search-page__filter-bar"
        >
          <!-- ── DESKTOP ──────────────────────────────────────────── -->
          <div class="search-page__desktop-filters">
            <UiSelect
              v-model="localCategory"
              :options="categoryOpts"
              :placeholder="t('search.category')"
              :ui="{ content: 'min-w-[12rem]' }"
            />

            <UiSelect
              v-model="localAge"
              :options="ageOptionsWithCount"
              :placeholder="t('search.age')"
              :ui="{ content: 'min-w-[14rem]' }"
            />

            <USelect
              v-model="localCities"
              :items="cityOptionsWithCount"
              :placeholder="t('search.city')"
              multiple
              :ui="{ content: 'min-w-[12rem]' }"
            />

            <UiSelect
              v-model="localSeason"
              :options="seasonOptionsWithCount"
              :placeholder="t('search.season')"
              :ui="{ content: 'min-w-[12rem]' }"
            />

            <UiCheckbox
              v-model="localFree"
              :label="t('search.free')"
              :disabled="isExtraDisabled('is_free', localFree)"
            />

            <UiCheckbox
              v-model="localStroller"
              :label="t('activity.stroller_friendly')"
              :disabled="isExtraDisabled('stroller_friendly', localStroller)"
            />

            <UiCheckbox
              v-model="localWeekends"
              :label="t('activity.open_weekends')"
              :disabled="isExtraDisabled('open_weekends', localWeekends)"
            />

            <div class="search-page__desktop-actions">
              <button
                type="button"
                class="search-page__btn-near-me"
                :class="{ 'search-page__btn-near-me--active': nearMeActive }"
                :disabled="nearMeLocating"
                @click="toggleNearMe"
              >
                <UIcon
                  :name="nearMeLocating ? 'i-heroicons-arrow-path' : 'i-heroicons-map-pin'"
                  class="search-page__btn-icon"
                  :class="{ 'animate-spin': nearMeLocating }"
                />
                {{ nearMeLocating ? t('search.near_me_locating') : t('search.near_me') }}
              </button>

              <button v-if="showClearBtn" class="search-page__btn-clear" @click="clearFilters">
                <UIcon name="i-heroicons-x-mark" class="search-page__btn-icon" />
                {{ t('search.clear_filters') }}
              </button>

              <button class="search-page__btn-search" @click="applyDesktopFilters">
                <UIcon name="i-heroicons-magnifying-glass" class="search-page__btn-icon" />
                {{ t('search.search_button') }}
              </button>
            </div>
          </div>

          <p v-if="nearMeError" class="search-page__near-me-error">
            {{ t('search.near_me_error') }}
          </p>

          <!-- DESKTOP chips -->
          <div class="search-page__desktop-chips">
            <SearchActiveFilters
              :filters="filtersFromUrl"
              @remove="removeFilter"
              @clear="clearFilters"
            />
          </div>

          <!-- ── MOBILE ───────────────────────────────────────────── -->
          <div class="search-page__mobile-bar">
            <button class="search-page__filter-btn" @click="drawerOpen = true">
              <UIcon name="i-heroicons-adjustments-horizontal" class="search-page__filter-icon" />
              <span class="search-page__filter-label">{{ t('search.filters') }}</span>
              <span v-if="activeFiltersCount > 0" class="search-page__filter-badge">
                {{ activeFiltersCount }}
              </span>
            </button>

            <button
              type="button"
              class="search-page__filter-btn"
              :class="{ 'search-page__filter-btn--active': nearMeActive }"
              :disabled="nearMeLocating"
              :aria-label="t('search.near_me')"
              :title="t('search.near_me')"
              @click="toggleNearMe"
            >
              <UIcon
                :name="nearMeLocating ? 'i-heroicons-arrow-path' : 'i-heroicons-map-pin'"
                class="search-page__filter-icon"
                :class="{ 'animate-spin': nearMeLocating }"
              />
            </button>

            <div class="search-page__divider" />

            <div class="search-page__chips-scroll">
              <SearchActiveFilters
                :filters="filtersFromUrl"
                @remove="removeFilter"
                @clear="clearFilters"
              />
            </div>
          </div>
        </div>

        <!-- Places strip — parallel to the activity results, only when the
           free-text query also matches a place in our own DB. -->
        <div v-if="displayedPlaces.length" class="search-page__places-strip">
          <span class="search-page__places-strip-label">{{ t('search.places_found') }}</span>
          <div class="search-page__places-strip-row">
            <PlaceCard v-for="place in displayedPlaces" :key="place.id" :place="place" />
          </div>
        </div>

        <template v-if="viewMode === 'list'">
          <SearchActivityGrid
            :activities="displayActivities"
            :loading="loading"
            :total="totalResults"
            :filters="filtersFromUrl"
            @clear="clearAll"
          />
          <div v-if="totalResults > PAGE_SIZE" class="search-page__pagination">
            <UPagination
              :default-page="currentPage"
              :items-per-page="PAGE_SIZE"
              :total="totalResults"
              @update:page="onPageChange"
            />
          </div>
        </template>
        <div
          v-else
          ref="mapWrapEl"
          class="search-page__map-wrap"
          :style="mapWrapHeight ? { height: `${mapWrapHeight}px` } : undefined"
        >
          <SearchMapView :activities="displayActivities" @switch-to-list="viewMode = 'list'" />
        </div>
      </div>
    </div>

    <SearchFilterDrawer
      v-model:open="drawerOpen"
      :model-value="filtersFromUrl"
      :base-activities="store.allActivities"
      :loading-base="store.loadingAllActivities"
      @apply="onDrawerApply"
      @clear="clearFilters"
    />
  </template>
</template>

<style scoped>
/* ── Página ────────────────────────────────────────────────────── */
.search-page {
  min-height: 100vh;
  /* background-color: var(--color-bg-secondary, #f9fafb); */
}

.search-page__container {
  max-width: 80rem;
  margin-top: var(--space-6);
  margin-inline: auto;
  padding: var(--space-8) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* ── Encabezado ────────────────────────────────────────────────── */
.search-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.search-page__header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.search-page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

/* ── Toggle Lista / Mapa ───────────────────────────────────────── */
.search-page__view-toggle {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: var(--border-radius-full);
  background: var(--color-neutral-100);
  flex-shrink: 0;
}

.search-page__view-btn {
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

.search-page__view-btn--active {
  background: var(--color-bg-primary);
  color: var(--color-accent-700);
  box-shadow: var(--shadow-xs);
}

.search-page__view-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.search-page__view-label {
  display: none;
}

@media (min-width: 480px) {
  .search-page__view-label {
    display: inline;
  }
}

.search-page__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* Vista mapa: crece para ocupar el espacio libre hasta el footer en vez
   de quedar en una altura fija (ver flex:1 en .search-page__container). */
/* La altura real la pone el :style inline (mapWrapHeight, medido en JS) —
   display:flex acá es solo para que MapView.vue pueda hacer height:100%. */
.search-page__map-wrap {
  display: flex;
  min-height: 400px;
}

.search-page__pagination {
  display: flex;
  justify-content: center;
  padding-block: var(--space-4);
}

/* ── Places strip ──────────────────────────────────────────────── */
.search-page__places-strip {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.search-page__places-strip-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.search-page__places-strip-row {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: var(--space-1);
}

.search-page__places-strip-row::-webkit-scrollbar {
  display: none;
}

/* ── Filter bar ────────────────────────────────────────────────── */
.search-page__filter-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  /* Al pasar a mapa, scrollIntoView({block:'start'}) respeta esto — deja
     un respiro arriba en vez de dejar los filtros pegados al borde. Tiene
     que ser menor al gap real con el header (--space-4 en desktop) para
     que ese respiro sea espacio en blanco y no un pedazo del subtítulo. */
  scroll-margin-top: var(--space-3);
}

/* ── Desktop filtros ───────────────────────────────────────────── */
.search-page__desktop-filters {
  display: none;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.search-page__desktop-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-inline-start: auto;
}

/* Botón "Cerca de mí" — ghost, se marca activo con el acento */
.search-page__btn-near-me {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--border-radius-full);
  border: 1.5px solid var(--color-neutral-200);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.search-page__btn-near-me:hover:not(:disabled) {
  border-color: var(--color-accent-300);
  color: var(--color-accent-700);
}

.search-page__btn-near-me--active {
  border-color: var(--color-accent-500);
  background-color: var(--color-accent-50);
  color: var(--color-accent-700);
}

.search-page__btn-near-me:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.search-page__near-me-error {
  font-size: var(--font-size-xs);
  color: var(--color-error, #ef4444);
  margin-inline-start: auto;
}

/* Botón limpiar — ghost verde */
.search-page__btn-clear {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--border-radius-full);
  border: 1.5px solid var(--color-secondary-300);
  background: transparent;
  color: var(--color-secondary-700);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.search-page__btn-clear:hover {
  background-color: var(--color-secondary-50);
  border-color: var(--color-secondary-400);
}

/* Botón buscar — verde sólido */
.search-page__btn-search {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--border-radius-full);
  background-color: var(--color-secondary-500);
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  white-space: nowrap;
}

.search-page__btn-search:hover {
  background-color: var(--color-secondary-600);
}

.search-page__btn-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

/* ── Desktop chips ─────────────────────────────────────────────── */
.search-page__desktop-chips {
  display: none;
}

/* ── Mobile bar ────────────────────────────────────────────────── */
.search-page__mobile-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
}

.search-page__filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: var(--space-1) var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  color: var(--color-secondary-600);
  transition: color var(--transition-fast);
  line-height: 1;
}

.search-page__filter-btn:hover {
  color: var(--color-secondary-800);
}

.search-page__filter-btn--active {
  color: var(--color-accent-700);
}

.search-page__filter-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.search-page__filter-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.search-page__filter-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1;
}

.search-page__filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: var(--border-radius-full);
  background-color: var(--color-secondary-500);
  color: white;
  font-size: 0.625rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  flex-shrink: 0;
}

.search-page__divider {
  width: 1px;
  height: 1.25rem;
  background-color: var(--color-neutral-200);
  flex-shrink: 0;
}

.search-page__chips-scroll {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow-x: auto;
  min-width: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.search-page__chips-scroll::-webkit-scrollbar {
  display: none;
}

/* ── Responsive ────────────────────────────────────────────────── */
@media (min-width: 768px) {
  .search-page__container {
    padding-inline: var(--space-6);
    /* Menos aire arriba/abajo en desktop para que filtros + contenido +
       footer entren mejor dentro del viewport en vista mapa. */
    margin-top: var(--space-3);
    padding-block: var(--space-4);
    gap: var(--space-4);
  }

  .search-page__desktop-filters {
    display: flex;
  }

  .search-page__desktop-chips {
    display: block;
  }

  .search-page__mobile-bar {
    display: none;
  }
}

@media (min-width: 1024px) {
  .search-page__container {
    padding-inline: var(--space-8);
  }
}
</style>
