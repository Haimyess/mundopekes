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
      <span class="act-meta__group-label">{{ t('activity.ages') }}</span>
      <div class="act-meta__chips">
        <span
          v-for="ar in sortedAgeRanges(ageRanges)"
          :key="ar.id"
          class="act-chip act-chip--outline"
        >
          {{ t(ar.label_key) }}
        </span>
      </div>
    </div>

    <!-- Seasons -->
    <div v-if="seasons.length" class="act-meta__group">
      <span class="act-meta__group-label">{{ t('activity.seasons') }}</span>
      <div class="act-meta__chips">
        <span v-for="s in sortedSeasons(seasons)" :key="s.id" class="act-chip act-chip--outline">
          {{ t(s.label_key) }}
        </span>
      </div>
    </div>

    <!-- Feature chips -->
    <div class="act-meta__chips">
      <span v-if="isFree" class="act-chip act-chip--filled">
        {{ t('activity.free') }}
      </span>
      <span v-else-if="price !== null" class="act-chip act-chip--outline"> ₪{{ price }} </span>

      <span v-if="strollerFriendly" class="act-chip act-chip--outline">
        {{ t('activity.stroller_friendly') }}
      </span>

      <span v-if="openWeekends" class="act-chip act-chip--outline">
        {{ t('activity.open_weekends') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.act-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.act-meta__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1-5, 0.375rem);
}

.act-meta__group-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.act-meta__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

/* Chip base */
.act-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

/* Outline — borde verde, texto verde, fondo blanco */
.act-chip--outline {
  border: 1px solid var(--color-secondary-400, #4ade80);
  color: var(--color-secondary-700, #15803d);
  background: transparent;
}

/* Filled — fondo verde, texto blanco (para "Gratis") */
.act-chip--filled {
  border: 1px solid var(--color-secondary-600, #16a34a);
  background: var(--color-secondary-600, #16a34a);
  color: #fff;
}
</style>
