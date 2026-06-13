<script setup lang="ts">
/**
 * pages/activity/[id].vue
 * Página de detalle de una actividad
 * - SSR con useAsyncData
 * - SEO con useSeoMeta
 * - 404 si no existe
 * - Layout: mobile stack | desktop dos columnas (60/40)
 */

const route = useRoute()
const { t, locale } = useI18n()
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

// ─── Place details (client-side, no bloquea SSR) ─────────────
const placeId = computed(
  () => (activity.value?.place?.metadata?.google_place_id as string | undefined) ?? null
)

const { data: placeDetails } = await useAsyncData(
  () => `place-details-${placeId.value}`,
  () =>
    placeId.value
      ? $fetch<{
          phone: string | null
          website: string | null
          google_url: string | null
          opening_hours: { weekday_text: string[] } | null
          wheelchair_accessible: boolean | null
          photos: string[]
        }>(`/api/places/details?place_id=${placeId.value}&lang=${locale.value}`)
      : null,
  { server: false, watch: [placeId] }
)

// ─── Hero images: Google Photos > place.images > activity.images ─
const heroImages = computed(
  () =>
    (placeDetails.value?.photos?.length ? placeDetails.value.photos : null) ??
    activity.value?.place?.images ??
    activity.value?.images ??
    []
)

// ─── Description: activity first, fallback to place ─────────────
const description = computed(() => {
  const a = activity.value
  if (!a) return null
  if (a.description_i18n && Object.keys(a.description_i18n).length) return tc(a.description_i18n)
  if (a.place?.description_i18n && Object.keys(a.place.description_i18n).length) {
    return tc(a.place.description_i18n)
  }
  return null
})

// ─── SEO ──────────────────────────────────────────────────────
useSeoMeta({
  title: () => (activity.value ? `${tc(activity.value.title_i18n)} · MundoPekes` : 'MundoPekes'),
  description: () => description.value ?? '',
  ogTitle: () => (activity.value ? tc(activity.value.title_i18n) : ''),
  ogDescription: () => description.value ?? '',
  ogImage: () => heroImages.value[0] ?? '',
})
</script>

<template>
  <div>
    <!-- ─── Loading ─────────────────────────────────────────── -->
    <div v-if="status === 'pending'" class="activity-page activity-page--loading">
      <div class="activity-page__grid">
        <div class="activity-page__skeleton activity-page__skeleton--hero" />
        <div class="activity-page__skeleton-stack">
          <div class="activity-page__skeleton activity-page__skeleton--title" />
          <div class="activity-page__skeleton activity-page__skeleton--line" />
          <div class="activity-page__skeleton activity-page__skeleton--line" />
        </div>
      </div>
    </div>

    <!-- ─── Contenido ──────────────────────────────────────── -->
    <div v-else-if="activity" class="activity-page">
      <!-- Back button -->
      <div class="activity-page__back">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          class="icon--directional"
          @click="$router.back()"
        >
          {{ t('common.back') }}
        </UButton>
      </div>

      <!-- Two-column grid -->
      <div class="activity-page__grid">
        <!-- LEFT: gallery + header + description + meta -->
        <div class="activity-page__main">
          <ActivityImagesGallery :images="heroImages" :alt-text="tc(activity.title_i18n)" />

          <ActivityInfoHeader :activity="activity" />

          <ActivityInfoDescription v-if="description" :description="description" />

          <ActivityMeta
            :age-ranges="activity.age_ranges ?? []"
            :seasons="activity.seasons ?? []"
            :is-free="activity.is_free"
            :price="activity.price"
            :stroller-friendly="activity.stroller_friendly"
            :open-weekends="activity.open_weekends"
          />
        </div>

        <!-- RIGHT: info card + photos + schedule + location -->
        <div class="activity-page__sidebar">
          <ActivityInfoCard
            v-if="placeDetails"
            :phone="placeDetails.phone"
            :website="placeDetails.website"
            :google-url="placeDetails.google_url"
            :opening-hours="placeDetails.opening_hours"
            :wheelchair-accessible="placeDetails.wheelchair_accessible"
          />

          <ActivityPhotoGrid :photos="placeDetails?.photos ?? []" />

          <ActivityInfoSchedule v-if="activity.schedule" :schedule="activity.schedule" />

          <ActivityInfoLocation v-if="activity.place" :place="activity.place" />
        </div>
      </div>

      <ActivityReportActivityButton
        :activity-id="activity.id"
        :activity-title="tc(activity.title_i18n)"
      />
    </div>
  </div>
</template>

<style scoped>
.activity-page {
  max-width: var(--container-xl, 80rem);
  margin-inline: auto;
  padding-inline: var(--space-4);
  padding-block: var(--space-6);
}

.activity-page__back {
  margin-block-end: var(--space-5);
}

.activity-page__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-8);
}

@media (min-width: 1024px) {
  .activity-page__grid {
    grid-template-columns: 3fr 2fr;
    align-items: start;
  }
}

.activity-page__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.activity-page__sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

@media (min-width: 1024px) {
  .activity-page__sidebar {
    position: sticky;
    top: var(--space-6);
  }
}

/* ── Loading skeletons ─────────────────────────────────────── */
.activity-page__skeleton {
  background: var(--color-neutral-200);
  border-radius: var(--radius-lg, 0.75rem);
  animation: activity-pulse 1.5s ease-in-out infinite;
}

@keyframes activity-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.activity-page__skeleton--hero {
  aspect-ratio: 16 / 9;
  width: 100%;
}
.activity-page__skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.activity-page__skeleton--title {
  height: 2rem;
  width: 75%;
}
.activity-page__skeleton--line {
  height: 1rem;
  width: 60%;
}
</style>
