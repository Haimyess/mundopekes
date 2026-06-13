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
  <div class="act-meta">
    <!-- Ages -->
    <div v-if="ageRanges.length" class="act-meta__group">
      <p class="act-meta__group-label">{{ t('activity.ages') }}</p>
      <div class="act-meta__chips">
        <span v-for="ar in sortedAgeRanges(ageRanges)" :key="ar.id" class="act-chip">
          <UIcon name="i-heroicons-user-group" class="act-chip__icon" />
          {{ t(ar.label_key) }}
        </span>
      </div>
    </div>

    <!-- Seasons -->
    <div v-if="seasons.length" class="act-meta__group">
      <p class="act-meta__group-label">{{ t('activity.seasons') }}</p>
      <div class="act-meta__chips">
        <span v-for="s in sortedSeasons(seasons)" :key="s.id" class="act-chip">
          <UIcon :name="seasonIcon(s.value)" class="act-chip__icon" />
          {{ t(s.label_key) }}
        </span>
      </div>
    </div>

    <!-- Feature chips -->
    <div class="act-meta__chips">
      <span v-if="isFree" class="act-chip act-chip--highlight">
        <UIcon name="i-heroicons-banknotes" class="act-chip__icon" />
        {{ t('activity.free') }}
      </span>
      <span v-else-if="price !== null" class="act-chip">
        <UIcon name="i-heroicons-banknotes" class="act-chip__icon" />
        ₪{{ price }}
      </span>

      <span v-if="strollerFriendly" class="act-chip">
        <UIcon name="i-heroicons-heart" class="act-chip__icon" />
        {{ t('activity.stroller_friendly') }}
      </span>

      <span v-if="openWeekends" class="act-chip">
        <UIcon name="i-heroicons-calendar-days" class="act-chip__icon" />
        {{ t('activity.open_weekends') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.act-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.act-meta__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.act-meta__group-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  margin: 0;
}

.act-meta__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* Chip — estilo igual a los filtros del hero */
.act-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  background: var(--color-secondary-100, #dcfce7);
  color: var(--color-secondary-800, #166534);
  border: 1px solid var(--color-secondary-200, #bbf7d0);
}

/* Highlight (Gratis) — verde más oscuro */
.act-chip--highlight {
  background: var(--color-secondary-600, #16a34a);
  color: #fff;
  border-color: var(--color-secondary-600, #16a34a);
}

.act-chip__icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  opacity: 0.85;
}
</style>
