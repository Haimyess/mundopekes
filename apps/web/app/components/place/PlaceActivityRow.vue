<script setup lang="ts">
// Full-width activity row used on the Place Page's activities list — styled
// off the Activity page's Location→Place link card + the map hover popup,
// not a resized SharedActivityCard.
import type { Activity } from '~/types'
import type { ActivityBadgeKey } from '../../../../../layers/domain/config/badges'
// useActivityBadges se auto-importa desde layers/domain/composables

const props = defineProps<{ activity: Activity }>()

const { t } = useI18n()
const { tc } = useI18nContent()

const imageUrl = computed(
  () => props.activity?.images?.[0] ?? props.activity?.place?.images?.[0] ?? null
)

const cityName = computed(() => props.activity?.place?.city?.name ?? null)
const categoryName = computed(() =>
  props.activity?.category ? tc(props.activity.category.name_i18n) : null
)
const hasMeta = computed(() => !!(cityName.value || categoryName.value))

const BADGE_LABEL_KEYS: Record<ActivityBadgeKey, string> = {
  is_free: 'activity.free',
  stroller_friendly: 'activity.stroller_friendly',
  open_weekends: 'activity.open_weekends',
  has_shadow: 'activity.has_shadow',
  has_bathrooms: 'activity.has_bathrooms',
}

const badges = computed(() =>
  useActivityBadges(props.activity).map((key) => t(BADGE_LABEL_KEYS[key]))
)
</script>

<template>
  <NuxtLink :to="`/activity/${activity.id}`" class="place-activity-row">
    <div class="place-activity-row__img-wrap">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="tc(activity.title_i18n)"
        class="place-activity-row__img"
        loading="lazy"
      />
      <SharedNoImage v-else />
    </div>

    <div class="place-activity-row__body">
      <h3 class="place-activity-row__title">{{ tc(activity.title_i18n) }}</h3>

      <div v-if="hasMeta" class="place-activity-row__meta">
        <UIcon name="i-heroicons-map-pin" class="place-activity-row__meta-icon" />
        <span v-if="cityName">{{ cityName }}</span>
        <span v-if="cityName && categoryName" class="place-activity-row__dot">•</span>
        <span v-if="categoryName">{{ categoryName }}</span>
      </div>

      <div v-if="badges.length" class="place-activity-row__badges">
        <span v-for="badge in badges" :key="badge" class="place-activity-row__badge">
          {{ badge }}
        </span>
      </div>
    </div>

    <UIcon name="i-heroicons-chevron-right" class="place-activity-row__chevron icon--directional" />
  </NuxtLink>
</template>

<style scoped>
.place-activity-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--border-radius-lg, 0.75rem);
  background: var(--color-secondary-50, #f0fdf4);
  border: 0.5px solid var(--color-secondary-200, #bbf7d0);
  text-decoration: none;
  transition: background 0.15s;
}

.place-activity-row:hover {
  background: var(--color-secondary-100, #dcfce7);
}

.place-activity-row__img-wrap {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: var(--border-radius-md, 0.5rem);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-neutral-100);
}

.place-activity-row__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.place-activity-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.place-activity-row__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  margin: 0;
}

.place-activity-row__meta {
  display: flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.place-activity-row__meta-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  color: var(--color-secondary-600, #16a34a);
}

.place-activity-row__dot {
  color: var(--color-neutral-400);
}

.place-activity-row__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5, 0.375rem);
}

.place-activity-row__badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem var(--space-2, 0.5rem);
  border-radius: 9999px;
  background: var(--color-accent-50);
  color: var(--color-accent-700);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
  white-space: nowrap;
}

.place-activity-row__chevron {
  width: 1rem;
  height: 1rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .place-activity-row__img-wrap {
    width: 3.75rem;
    height: 3.75rem;
  }
}
</style>
