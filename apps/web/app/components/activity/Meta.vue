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
</script>

<template>
  <!--
    Todos los chips en un solo flex-wrap.
    "elimina edades recomendadas" → sin group-label, todo mezclado.
    Max 2 filas con scroll vertical.
  -->
  <div class="act-meta__chips">
    <!-- Edades — sin label de grupo -->
    <span v-for="ar in sortedAgeRanges(ageRanges)" :key="ar.id" class="act-chip">
      <UIcon name="i-heroicons-user-group" class="act-chip__icon" />
      {{ t(ar.label_key) }}
    </span>

    <!-- Temporadas -->
    <span v-for="s in sortedSeasons(seasons)" :key="s.id" class="act-chip">
      <UIcon :name="seasonIcon(s.value)" class="act-chip__icon" />
      {{ t(s.label_key) }}
    </span>

    <!-- Gratis / Precio -->
    <span v-if="isFree" class="act-chip act-chip--free">
      <UIcon name="i-heroicons-tag" class="act-chip__icon" />
      {{ t('activity.free') }}
    </span>
    <span v-else-if="price !== null" class="act-chip">
      <UIcon name="i-heroicons-banknotes" class="act-chip__icon" />
      ₪{{ price }}
    </span>

    <!-- Accesible cochecito -->
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
/* Chips en max 2 líneas con scroll si hay más */
.act-meta__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  max-height: calc(2 * 2.25rem + var(--space-2)); /* ~2 filas de chips */
  overflow-y: auto;
  /* Ocultar scrollbar pero mantener scroll funcional */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.act-meta__chips::-webkit-scrollbar {
  display: none;
}

/* Chip — estilo igual a sf-pill del homepage (sin background) */
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

/* Chip Gratis — destaque verde relleno */
.act-chip--free {
  background: var(--color-secondary-600, #16a34a);
  color: #fff;
  border-color: var(--color-secondary-600, #16a34a);
}

.act-chip__icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  opacity: 0.9;
}
</style>
