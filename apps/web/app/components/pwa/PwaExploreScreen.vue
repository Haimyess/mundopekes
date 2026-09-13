<script setup lang="ts">
/**
 * Pantalla "Explorar" de la PWA (Fase 3) — mapa a pantalla completa con
 * controles flotantes, en vez del stack tradicional header/búsqueda/
 * filtros/lista/mapa. Composición fina sobre piezas que ya existen: no
 * duplica fetch de datos (recibe activities/loading ya resueltos por
 * search.vue), reutiliza FilterDrawer.vue sin modificar, y MapView.vue en
 * su variante chrome="fullbleed" (ver ese componente para la lógica de
 * sincronización pin↔carousel, que ya existía para el hover pin↔card del
 * modo split de escritorio).
 *
 * Import explícito de useRouter (no auto-import): mismo motivo que
 * PwaBottomNav.vue — necesario acá para actualizar el texto de búsqueda
 * en la URL, y el auto-import no es mockeable con la infra de test actual
 * (ver memory project_test_infra).
 */
import { useRouter } from 'nuxt/app'
import { useDebounceFn } from '@vueuse/core'
import type { Activity, ActivityFilters } from '~/types'

interface Props {
  activities: Activity[]
  filters: ActivityFilters
  activeFiltersCount: number
  allActivities: Activity[]
  loadingAllActivities: boolean
  /** "Cerca de mí" (search.vue) — se reenvía tal cual a MapView para el
   * badge de distancia en las cards del carousel. */
  userCoords?: { lat: number; lng: number } | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'apply-filters': [filters: ActivityFilters]
  'clear-filters': []
}>()

const drawerOpen = defineModel<boolean>('drawerOpen', { default: false })

const router = useRouter()
const { buildQueryFromFilters } = useActivityFilters()

// ── Texto de búsqueda — search.vue no tenía un input propio (el buscador
// vivía solo en el home); acá sí hace falta uno, flotando sobre el mapa.
// Reutiliza el mismo mecanismo URL-as-source-of-truth que el resto de los
// filtros: cambiar el texto arma una query nueva y navega, lo que dispara
// el watch(route.query) ya existente en search.vue — cero fetch duplicado.
const searchText = ref(props.filters.search ?? '')

watch(
  () => props.filters.search,
  (val) => {
    if (val !== searchText.value) searchText.value = val ?? ''
  }
)

const pushSearch = useDebounceFn((value: string) => {
  const query = buildQueryFromFilters({ ...props.filters, search: value || undefined })
  void router.push({ path: '/search', query })
}, 400)

function onSearchInput(value: string) {
  searchText.value = value
  void pushSearch(value)
}

function onApplyFilters(filters: ActivityFilters) {
  drawerOpen.value = false
  emit('apply-filters', filters)
}
</script>

<template>
  <div class="pwa-explore">
    <PwaFloatingSearchBar
      :model-value="searchText"
      :active-filters-count="activeFiltersCount"
      @update:model-value="onSearchInput"
      @open-filters="drawerOpen = true"
    />

    <SearchMapView
      :activities="activities"
      chrome="fullbleed"
      :user-coords="userCoords"
      :show-toggle="false"
    />

    <SearchFilterDrawer
      v-model:open="drawerOpen"
      :model-value="filters"
      :base-activities="allActivities"
      :loading-base="loadingAllActivities"
      @apply="onApplyFilters"
      @clear="
        () => {
          drawerOpen = false
          emit('clear-filters')
        }
      "
    />
  </div>
</template>

<style scoped>
/* absolute + inset:0 contra el .pwa-shell__content (position:relative) en
   vez de height:100% — más robusto contra el timing de montaje del mapa
   (ver comentario en MapView.vue, .search-map--fullbleed). */
.pwa-explore {
  position: absolute;
  inset: 0;
}
</style>
