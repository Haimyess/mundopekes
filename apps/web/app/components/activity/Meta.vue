<script setup lang="ts">
import type { AgeRange, Season } from '~/types'

interface Props {
  ageRanges: AgeRange[]
  seasons: Season[]
  isFree: boolean
  price: number | null
  strollerFriendly: boolean
  openWeekends: boolean
}

defineProps<Props>()
const { t } = useI18n()

const SEASON_ICONS: Record<string, string> = {
  spring: 'i-heroicons-sparkles',
  summer: 'i-heroicons-sun',
  autumn: 'i-heroicons-leaf',
  fall: 'i-heroicons-leaf',
  winter: 'i-heroicons-cloud',
}

function seasonIcon(value: string) {
  return SEASON_ICONS[value.toLowerCase()] ?? 'i-heroicons-sparkles'
}

function sortedAgeRanges(ranges: AgeRange[]) {
  return [...ranges].sort((a, b) => a.sort_order - b.sort_order)
}

function sortedSeasons(seasons: Season[]) {
  return [...seasons].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Convierte el label_key de la DB al path de traducción correcto.
 * El DB guarda: "age.babies" → locale espera: "search.age_babies"
 * Mismo patrón usado en useActivityFilters.ts
 */
function ageLabel(labelKey: string): string {
  // Intenta la clave directa primero (por si ya es un path completo)
  const direct = t(labelKey)
  if (direct !== labelKey) return direct
  // Si falló (devolvió la misma key), aplica conversión: age.babies → search.age_babies
  const converted = `search.${labelKey.replace('.', '_')}`
  return t(converted)
}
</script>

<template>
  <!--
    Todos los chips en un flex-wrap, max 2 filas con scroll.
    Sin label de grupo — sin "Edades recomendadas".
    Estilo sf-pill: sin background, borde secondary-300.
  -->
  <div class="act-meta__chips">
    <!-- Edades -->
    <span v-for="ar in sortedAgeRanges(ageRanges)" :key="ar.id" class="act-chip">
      <UIcon name="i-heroicons-user-group" class="act-chip__icon" />
      {{ ageLabel(ar.label_key) }}
    </span>

    <!-- Temporadas -->
    <span v-for="s in sortedSeasons(seasons)" :key="s.id" class="act-chip">
      <UIcon :name="seasonIcon(s.value)" class="act-chip__icon" />
      {{ t(s.label_key) }}
    </span>

    <!-- Gratis — mismo estilo que los demás (sin background) -->
    <span v-if="isFree" class="act-chip">
      <UIcon name="i-heroicons-tag" class="act-chip__icon" />
      {{ t('activity.free') }}
    </span>
    <span v-else-if="price !== null" class="act-chip">
      <UIcon name="i-heroicons-banknotes" class="act-chip__icon" />
      ₪{{ price }}
    </span>

    <!-- Cochecito -->
    <span v-if="strollerFriendly" class="act-chip">
      <UIcon name="i-heroicons-heart" class="act-chip__icon" />
      {{ t('activity.stroller_friendly') }}
    </span>

    <!-- Fines de semana -->
    <span v-if="openWeekends" class="act-chip">
      <UIcon name="i-heroicons-calendar-days" class="act-chip__icon" />
      {{ t('activity.open_weekends') }}
    </span>
  </div>
</template>

<style scoped>
/* Max 2 filas con scroll oculto */
.act-meta__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  max-height: calc(2 * 2.25rem + var(--space-2));
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.act-meta__chips::-webkit-scrollbar {
  display: none;
}

/* Chip — igual a sf-pill del homepage: sin background */
.act-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  padding: var(--space-2) var(--space-3);
  border-radius: 9999px;
  border: 1.5px solid var(--color-secondary-300, #86efac);
  background: transparent;
  color: var(--color-secondary-700, #15803d);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  line-height: 1;
  min-height: 2.25rem;
  flex-shrink: 0;
}

.act-chip__icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  opacity: 0.9;
}
</style>
