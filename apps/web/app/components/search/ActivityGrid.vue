<script setup lang="ts">
import type { Activity, ActivityFilters } from '~/types'

const { t } = useI18n()

const props = defineProps<{
  activities: Activity[]
  loading: boolean
  total: number
  filters?: ActivityFilters // para mostrar contexto en el empty state
}>()

const emit = defineEmits<{
  clear: []
}>()

// Texto descriptivo del query activo
const queryText = computed(() => (props.filters?.search ? `"${props.filters.search}"` : null))

// Hay algún filtro activo (además del search)
const hasActiveFilters = computed(() => {
  if (!props.filters) return false
  const { search: _, ...rest } = props.filters
  return Object.keys(rest).length > 0
})

// Hay algo activo (search o filtros)
const hasAnything = computed(() => !!props.filters?.search || hasActiveFilters.value)
</script>

<template>
  <div class="grid-wrapper">
    <!-- ── Skeleton de carga ──────────────────────────────────── -->
    <div v-if="loading" class="grid-wrapper__grid">
      <div v-for="n in 8" :key="n" class="grid-wrapper__skeleton-item">
        <USkeleton class="grid-wrapper__skeleton-img" />
        <USkeleton class="grid-wrapper__skeleton-title" />
        <USkeleton class="grid-wrapper__skeleton-sub" />
      </div>
    </div>

    <!-- ── Empty state ────────────────────────────────────────── -->
    <div v-else-if="!activities.length" class="empty-state">
      <!-- Ícono — telescopio para "no encontramos nada" -->
      <div class="empty-state__icon-wrap">
        <UIcon name="i-heroicons-face-frown" class="empty-state__icon" />
      </div>

      <!-- Título dinámico según si hay query o no -->
      <p class="empty-state__title">
        <template v-if="queryText">
          {{ t('search.no_results_for', { query: queryText }) }}
        </template>
        <template v-else>
          {{ t('search.no_results') }}
        </template>
      </p>

      <!-- Descripción de filtros activos -->
      <p v-if="hasActiveFilters" class="empty-state__subtitle">
        {{ t('search.no_results_hint') }}
      </p>
      <p v-else class="empty-state__subtitle">
        {{ t('search.try_different_filters') }}
      </p>

      <!-- Botón limpiar — solo si hay algo que limpiar -->
      <button v-if="hasAnything" class="empty-state__clear-btn" @click="emit('clear')">
        <UIcon name="i-heroicons-arrow-path" class="empty-state__clear-icon" />
        {{ t('search.clear_and_show_all') }}
      </button>
    </div>

    <!-- ── Grid de resultados ─────────────────────────────────── -->
    <template v-else>
      <p class="grid-wrapper__count">
        {{ t('search.results', { count: total }) }}
      </p>
      <div class="grid-wrapper__grid">
        <SharedActivityCard
          v-for="activity in activities"
          :key="activity.id"
          :activity="activity"
          variant="detailed"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Grid ──────────────────────────────────────────────────────── */
.grid-wrapper__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-4);
}

.grid-wrapper__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}

@media (min-width: 640px) {
  .grid-wrapper__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1024px) {
  .grid-wrapper__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 1280px) {
  .grid-wrapper__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* ── Skeleton ──────────────────────────────────────────────────── */
.grid-wrapper__skeleton-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.grid-wrapper__skeleton-img {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--border-radius-xl);
}

.grid-wrapper__skeleton-title {
  height: 1.25rem;
  width: 75%;
  border-radius: var(--border-radius-sm);
}

.grid-wrapper__skeleton-sub {
  height: 1rem;
  width: 50%;
  border-radius: var(--border-radius-sm);
}

/* ── Empty state ───────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-20) var(--space-4);
  text-align: center;
  gap: var(--space-3);
}

.empty-state__icon-wrap {
  width: 4rem;
  height: 4rem;
  border-radius: var(--border-radius-full);
  background-color: var(--color-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
}

.empty-state__icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-neutral-400);
}

.empty-state__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.empty-state__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

/* Botón limpiar — verde secondary, ghost */
.empty-state__clear-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--border-radius-full);
  border: 1.5px solid var(--color-secondary-300);
  background: var(--color-secondary-50);
  color: var(--color-secondary-700);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.empty-state__clear-btn:hover {
  background: var(--color-secondary-100);
  border-color: var(--color-secondary-400);
}

.empty-state__clear-icon {
  width: 1rem;
  height: 1rem;
}
</style>
