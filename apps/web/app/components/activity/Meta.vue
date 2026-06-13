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
  <div class="activity-meta">
    <!-- Age ranges -->
    <div v-if="ageRanges.length" class="activity-meta__group">
      <span class="activity-meta__group-label">{{ t('activity.ages') }}</span>
      <div class="activity-meta__chips">
        <UiBadge
          v-for="ar in sortedAgeRanges(ageRanges)"
          :key="ar.id"
          variant="secondary"
          size="sm"
        >
          {{ t(ar.label_key) }}
        </UiBadge>
      </div>
    </div>

    <!-- Seasons -->
    <div v-if="seasons.length" class="activity-meta__group">
      <span class="activity-meta__group-label">{{ t('activity.seasons') }}</span>
      <div class="activity-meta__chips">
        <UiBadge v-for="s in sortedSeasons(seasons)" :key="s.id" variant="secondary" size="sm">
          {{ t(s.label_key) }}
        </UiBadge>
      </div>
    </div>

    <!-- Feature chips -->
    <div class="activity-meta__chips">
      <UiBadge v-if="isFree" variant="success" size="sm">
        {{ t('activity.free') }}
      </UiBadge>
      <UiBadge v-else-if="price !== null" variant="secondary" size="sm"> ₪{{ price }} </UiBadge>

      <UiBadge v-if="strollerFriendly" variant="secondary" size="sm">
        <UiIcon name="i-lucide-baby" size="xs" />
        {{ t('activity.stroller_friendly') }}
      </UiBadge>

      <UiBadge v-if="openWeekends" variant="secondary" size="sm">
        <UiIcon name="i-lucide-calendar" size="xs" />
        {{ t('activity.open_weekends') }}
      </UiBadge>
    </div>
  </div>
</template>

<style scoped>
.activity-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.activity-meta__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1-5, 0.375rem);
}

.activity-meta__group-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  color: var(--color-text-tertiary);
}

.activity-meta__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}
</style>
