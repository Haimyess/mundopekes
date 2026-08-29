<script setup lang="ts">
// Compact Place result card — used in the search page's "Places" strip.
// Takes the same shape useLocalPlaceSearch()/local-search.get.ts returns
// (id, name_i18n, city, thumbnail), so no adapter is needed between the
// wizard's place search and this card.
import type { LocalPlaceMatch } from '~/composables/useLocalPlaceSearch'

defineProps<{ place: LocalPlaceMatch }>()

const { tc } = useI18nContent()
const { t } = useI18n()
</script>

<template>
  <NuxtLink :to="`/place/${place.id}`" class="place-card">
    <UiCard class="place-card__card">
      <div class="place-card__image-wrap">
        <img
          v-if="place.thumbnail"
          :src="place.thumbnail"
          :alt="tc(place.name_i18n)"
          class="place-card__image"
          loading="lazy"
        />
        <SharedNoImage v-else />
      </div>
      <div class="place-card__body">
        <span class="place-card__badge">{{ t('search.place_badge') }}</span>
        <h3 class="place-card__title">{{ tc(place.name_i18n) }}</h3>
        <div v-if="place.city" class="place-card__meta">
          <UiIcon name="i-heroicons-map-pin" size="sm" />
          <span>{{ place.city.name }}</span>
        </div>
      </div>
    </UiCard>
  </NuxtLink>
</template>

<style scoped>
.place-card {
  display: block;
  flex-shrink: 0;
  width: 220px;
}

.place-card__card {
  height: 100%;
}

.place-card :deep(.rounded-lg) {
  border: none;
  box-shadow: none;
}

.place-card__image-wrap {
  aspect-ratio: 16 / 10;
  width: 100%;
  overflow: hidden;
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  background-color: var(--color-neutral-100);
}

.place-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.place-card__body {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.place-card__badge {
  align-self: flex-start;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  padding: 0.1rem var(--space-2);
  border-radius: 9999px;
  background: var(--color-secondary-100, #dcfce7);
  color: var(--color-secondary-700, #15803d);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.place-card__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.place-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>
