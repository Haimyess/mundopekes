<script setup lang="ts">
import type { DetailVenue } from '#shared/types/detail'

interface Props {
  venue: DetailVenue
}

const props = defineProps<Props>()

const PROXIED_IMAGE_PREFIX = '/api/'

const { t } = useI18n()
const { tc } = useI18nContent()

const name = computed(() => tc(props.venue.name))
const context = computed(() =>
  [props.venue.address, props.venue.cityName].filter(Boolean).join(', ')
)
const isImageOptimized = computed(() => !props.venue.imageUrl?.startsWith(PROXIED_IMAGE_PREFIX))
</script>

<template>
  <NuxtLinkLocale :to="`/place/${venue.id}`" class="venue-card">
    <span class="venue-card__media" aria-hidden="true">
      <NuxtImg
        v-if="venue.imageUrl && isImageOptimized"
        :src="venue.imageUrl"
        alt=""
        sizes="96px"
        loading="lazy"
        class="venue-card__image"
      />
      <img
        v-else-if="venue.imageUrl"
        :src="venue.imageUrl"
        alt=""
        loading="lazy"
        decoding="async"
        class="venue-card__image"
      />
      <UiIcon v-else name="i-hugeicons-location-01" :size="24" />
    </span>
    <span class="venue-card__body">
      <span class="venue-card__kind">{{ t('detail.venue') }}</span>
      <span class="venue-card__name">{{ name }}</span>
      <span v-if="context" class="venue-card__context">{{ context }}</span>
    </span>
    <UiIcon name="i-hugeicons-arrow-right-01" :size="20" class="venue-card__chevron" />
  </NuxtLinkLocale>
</template>

<style scoped>
.venue-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-card);
  color: var(--mp-ink);
  text-decoration: none;
}

.venue-card:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}

.venue-card__media {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  inline-size: 64px;
  block-size: 64px;
  overflow: hidden;
  border-radius: var(--mp-r-photo);
  background: var(--mp-skeleton);
  color: var(--mp-text-3);
}

.venue-card__image {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.venue-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-inline-size: 0;
}

.venue-card__kind,
.venue-card__context {
  color: var(--mp-text-2);
  font-size: var(--mp-fs-label-sm);
}

.venue-card__name {
  font-weight: var(--mp-fw-bold);
}

[dir='rtl'] .venue-card__chevron {
  transform: scaleX(-1);
}
</style>
