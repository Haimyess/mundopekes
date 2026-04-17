<script setup lang="ts">
import { useGeolocation } from '@vueuse/core'

const activitiesStore = useActivitiesStore()
const { coords, resume } = useGeolocation({ immediate: false })

onMounted(async () => {
  await Promise.all([
    activitiesStore.loadRecentActivities(),
    activitiesStore.loadPopularActivities(),
    activitiesStore.loadRecommendedActivities(),
    activitiesStore.loadFilterOptions(), // ← opciones para el SearchForm
  ])

  resume()
  watchOnce(
    () => coords.value.latitude,
    async (lat) => {
      if (lat && isFinite(lat)) {
        await activitiesStore.loadNearbyActivities(lat, coords.value.longitude!)
      }
    }
  )
})
</script>

<template>
  <div>
    <HomeHero />
    <div class="py-8 space-y-12">
      <HomeActivityCarousel
        :title="$t('carousels.recent')"
        :activities="activitiesStore.recentActivities"
        :loading="activitiesStore.loading.recent"
      />
      <HomeActivityCarousel
        :title="$t('carousels.nearby')"
        :activities="activitiesStore.nearbyActivities"
        :loading="activitiesStore.loading.nearby"
      />
      <HomeActivityCarousel
        :title="$t('carousels.popular')"
        :activities="activitiesStore.popularActivities"
        :loading="activitiesStore.loading.popular"
      />
      <HomeActivityCarousel
        :title="$t('carousels.recommended')"
        :activities="activitiesStore.recommendedActivities"
        :loading="activitiesStore.loading.recommended"
      />
    </div>
    <HomeCTA />
  </div>
</template>