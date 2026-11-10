<script setup lang="ts">
import { DEFAULT_RADIUS_KM, serializeWhere, toPrivatePoint, type Where } from '@mundopekes/core'
import type { HomeSection } from '#shared/types/home'
import type { SearchResponse } from '#shared/types/search'
import type { MapPin } from '~/components/map/Canvas.vue'

const NEARBY_SORT = 'distance'

const { t } = useI18n()
const { toMapPins } = useMapPins()
const { isLocating, error: positionError, locate } = useCurrentPosition()

const section = ref<HomeSection | null>(null)
const pins = ref<MapPin[]>([])
const hasLoadError = ref(false)
const isLoadingResults = ref(false)

const errorMessage = computed(() => {
  if (positionError.value) return t(`results.where.errors.${positionError.value}`)
  return hasLoadError.value ? t('errors.generic.description') : null
})

async function loadNearby(where: Where) {
  const query = { where: serializeWhere(where), sort: NEARBY_SORT }
  isLoadingResults.value = true
  hasLoadError.value = false
  try {
    const response = await $fetch<SearchResponse>('/api/search', { query })
    section.value = { items: response.items, total: response.total, query }
    pins.value = toMapPins(response.pins)
  } catch {
    hasLoadError.value = true
  } finally {
    isLoadingResults.value = false
  }
}

const handleUseLocation = async () => {
  const point = await locate()
  if (point) await loadNearby({ kind: 'point', point: toPrivatePoint(point) })
}
</script>

<template>
  <section class="home-nearby" aria-labelledby="home-nearby-title">
    <UiSectionHeader
      :title="t('home.nearby.title')"
      :subtitle="t('home.nearby.subtitle', { radius: DEFAULT_RADIUS_KM })"
      heading-id="home-nearby-title"
    />
    <div v-if="!section" class="home-nearby__prompt">
      <UiButton
        variant="secondary"
        icon="i-hugeicons-gps-01"
        :loading="isLocating || isLoadingResults"
        @click="handleUseLocation"
      >
        {{ t('home.nearby.useLocation') }}
      </UiButton>
      <p class="home-nearby__privacy">{{ t('results.where.privacy') }}</p>
      <p v-if="errorMessage" class="home-nearby__error" role="alert">{{ errorMessage }}</p>
    </div>
    <template v-else>
      <div v-if="pins.length" class="home-nearby__map">
        <ClientOnly>
          <LazyMapCanvas :pins="pins" :label="t('home.nearby.mapLabel')" />
        </ClientOnly>
      </div>
      <HomeCarouselSection
        v-if="section.items.length"
        :title="t('home.nearby.results')"
        :section="section"
      />
      <p v-else class="home-nearby__empty" role="status">{{ t('home.nearby.empty') }}</p>
    </template>
  </section>
</template>

<style scoped>
.home-nearby {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.home-nearby__prompt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 20px;
  border: 1px dashed var(--mp-border);
  border-radius: var(--mp-r-panel);
}

.home-nearby__privacy,
.home-nearby__error,
.home-nearby__empty {
  margin: 0;
  font-size: var(--mp-fs-label-sm);
}

.home-nearby__privacy,
.home-nearby__empty {
  color: var(--mp-text-2);
}

.home-nearby__error {
  color: var(--mp-coral-700);
}

.home-nearby__map {
  block-size: 220px;
  overflow: hidden;
  border-radius: var(--mp-r-panel);
  background: var(--mp-skeleton);
}
</style>
