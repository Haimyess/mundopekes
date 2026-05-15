<script setup lang="ts">
/**
 * pages/activity/[id].vue
 * Página de detalle de una actividad
 * - SSR con useAsyncData
 * - SEO con useSeoMeta
 * - 404 si no existe
 * - Layout: mobile stack | desktop dos columnas
 */

import ActivityImagesGallery from '~/components/activity/ActivityImagesGallery.vue'

const route = useRoute()
const { t } = useI18n()
const { tc } = useI18nContent()
const { getActivityById } = useActivities()

const id = computed(() => route.params.id as string)

// ─── Fetch SSR ────────────────────────────────────────────────
const { data: activity, status } = await useAsyncData(`activity-${id.value}`, () =>
  getActivityById(id.value)
)

// 404 si no encontró la actividad
if (!activity.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Activity not found',
    fatal: true,
  })
}

// ─── SEO ──────────────────────────────────────────────────────
useSeoMeta({
  title: () => (activity.value ? `${tc(activity.value.title_i18n)} · MundoPekes` : 'MundoPekes'),
  description: () => (activity.value?.description_i18n ? tc(activity.value.description_i18n) : ''),
  ogTitle: () => (activity.value ? tc(activity.value.title_i18n) : ''),
  ogDescription: () =>
    activity.value?.description_i18n ? tc(activity.value.description_i18n) : '',
  ogImage: () => activity.value?.images?.[0] ?? '',
})
</script>

<template>
  <div>
    <!-- ─── Loading ─────────────────────────────────────────── -->
    <div v-if="status === 'pending'" class="max-w-6xl mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="aspect-video bg-gray-200 rounded-xl animate-pulse" />
        <div class="space-y-4">
          <div class="h-8 bg-gray-200 rounded animate-pulse w-3/4" />
          <div class="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          <div class="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
      </div>
    </div>

    <!-- ─── Contenido ──────────────────────────────────────── -->
    <div v-else-if="activity" class="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <!-- Botón volver -->
      <div class="mb-5">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          @click="$router.back()"
        >
          {{ t('common.back') }}
        </UButton>
      </div>

      <!-- Layout: mobile stack / desktop dos columnas -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:items-start">
        <!-- Columna izquierda: galería -->
        <!-- En mobile queda arriba, en desktop queda sticky -->
        <div class="lg:sticky lg:top-6">
          <ActivityImagesGallery
            :images="activity.images ?? []"
            :alt-text="tc(activity.title_i18n)"
          />
        </div>

        <!-- Columna derecha: info -->
        <div>
          <ActivityInfo :activity="activity" />
        </div>
      </div>

      <ActivityReportActivityButton
        :activity-id="activity.id"
        :activity-title="tc(activity.title_i18n)"
      />
    </div>
  </div>
</template>
