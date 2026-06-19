<script setup lang="ts">
import { useGeolocation } from '@vueuse/core'

const activitiesStore = useActivitiesStore()
const {
  coords,
  resume,
  error: geoError,
  isSupported: geoSupported,
} = useGeolocation({ immediate: false })
const geoBlocked = ref(false)

onMounted(async () => {
  await Promise.all([
    activitiesStore.loadRecentActivities(),
    activitiesStore.loadPopularActivities(),
    activitiesStore.loadRecommendedActivities(),
    activitiesStore.loadFilterOptions(),
  ])

  console.log('📍 Geolocation supported:', geoSupported.value)
  console.log('📍 Calling resume()...')
  resume()
  console.log('📍 resume() called. Waiting for coords...')

  watchOnce(
    () => coords.value.latitude,
    async (lat) => {
      const lng = coords.value.longitude
      console.log('📍 coords changed → lat:', lat, 'lng:', lng)
      if (lat && Number.isFinite(lat) && Number.isFinite(lng)) {
        await activitiesStore.loadNearbyActivities(lat, lng)
      }
    }
  )

  watchOnce(
    () => geoError.value,
    (err) => {
      console.warn('📍 Geo error:', err?.message, '| code:', err?.code)
      if (err) geoBlocked.value = true
    }
  )
})
</script>

<template>
  <div>
    <HomeHero />
    <div class="py-4 space-y-10">
      <HomeActivityCarousel
        :title="$t('carousels.recent')"
        :activities="activitiesStore.recentActivities"
        :loading="activitiesStore.loading.recent"
      />
      <HomeActivityCarousel
        :title="$t('carousels.nearby')"
        :activities="activitiesStore.nearbyActivities"
        :loading="activitiesStore.loading.nearby"
        :empty-message="geoBlocked ? $t('carousels.nearby_blocked') : undefined"
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
    <!-- AGREGAR CUANDO TENGAMOS FLUJO Y ESTADISTICAS Y QUERAMOS COMENZAR CON LAS SUSCRIPCIONES -->
    <!-- <HomeProviderCTA /> -->
  </div>
</template>
