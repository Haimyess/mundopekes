<script setup lang="ts">
import type { GeoPoint } from '@mundopekes/core'
import type { MapPin } from '~/components/map/Canvas.vue'

interface Props {
  name: string
  location: GeoPoint | null
  address?: string | null
  cityName?: string | null
}

const props = withDefaults(defineProps<Props>(), { address: null, cityName: null })

const { t } = useI18n()

const addressLine = computed(() => [props.address, props.cityName].filter(Boolean).join(', '))
const pins = computed<MapPin[]>(() =>
  props.location
    ? [{ id: 'location', ...props.location, label: props.name, title: props.name }]
    : []
)
</script>

<template>
  <div class="detail-location">
    <p v-if="addressLine" class="detail-location__address">
      <UiIcon name="i-hugeicons-location-01" :size="16" />
      {{ addressLine }}
    </p>
    <div v-if="location" class="detail-location__map">
      <ClientOnly>
        <LazyMapCanvas :pins="pins" :label="t('detail.mapLabel', { name })" />
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.detail-location {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-location__address {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-sm);
}

.detail-location__map {
  block-size: 240px;
  overflow: hidden;
  border-radius: var(--mp-r-panel);
  background: var(--mp-skeleton);
}
</style>
