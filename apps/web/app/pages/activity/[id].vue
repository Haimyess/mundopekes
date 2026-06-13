<script setup lang="ts">
/**
 * pages/activity/[id].vue
 * Diseño columna única — estilo Coffee Trail
 * Imágenes: activity primero, lugar después, Google al final
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

if (!activity.value) {
  throw createError({ statusCode: 404, statusMessage: 'Activity not found', fatal: true })
}

// ─── Place details (client-side) ─────────────────────────────
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

// ─── Imágenes combinadas ──────────────────────────────────────
// Orden: activity.images → place.images → Google photos
const allImages = computed(() => {
  const a = activity.value?.images ?? []
  const p = activity.value?.place?.images ?? []
  const g = placeDetails.value?.photos ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const img of [...a, ...p, ...g]) {
    if (img && !seen.has(img)) {
      seen.add(img)
      out.push(img)
    }
  }
  return out
})

const activeIdx = ref(0)
const heroImage = computed(() => allImages.value[activeIdx.value] ?? null)
const thumbnails = computed(() => allImages.value)

watch(allImages, () => {
  activeIdx.value = 0
})

// ─── Textos ───────────────────────────────────────────────────
const description = computed(() => {
  const a = activity.value
  if (!a) return null
  if (a.description_i18n && Object.keys(a.description_i18n).length) return tc(a.description_i18n)
  if (a.place?.description_i18n && Object.keys(a.place.description_i18n).length)
    return tc(a.place.description_i18n)
  return null
})

const cityName = computed(() => activity.value?.place?.city?.name ?? null)
const placeName = computed(() =>
  activity.value?.place ? tc(activity.value.place.name_i18n) : null
)

// ─── Navegación ───────────────────────────────────────────────
const lat = computed(() => activity.value?.place?.lat)
const lng = computed(() => activity.value?.place?.lng)
const mapsUrl = computed(() =>
  lat.value && lng.value ? `https://maps.google.com/?q=${lat.value},${lng.value}` : null
)
const wazeUrl = computed(() =>
  lat.value && lng.value
    ? `https://www.waze.com/ul?ll=${lat.value}%2C${lng.value}&navigate=yes&zoom=17`
    : null
)

function stripDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ─── SEO ──────────────────────────────────────────────────────
useSeoMeta({
  title: () => (activity.value ? `${tc(activity.value.title_i18n)} · MundoPekes` : 'MundoPekes'),
  description: () => description.value ?? '',
  ogImage: () => allImages.value[0] ?? '',
})
</script>

<template>
  <div>
    <!-- ─── Loading ───────────────────────────────────────── -->
    <div v-if="status === 'pending'" class="act-skeleton">
      <div class="act-skeleton__hero" />
      <div class="act-skeleton__body">
        <div class="act-skeleton__line act-skeleton__line--title" />
        <div class="act-skeleton__line act-skeleton__line--sub" />
        <div class="act-skeleton__line act-skeleton__line--sub" />
      </div>
    </div>

    <!-- ─── Contenido ────────────────────────────────────── -->
    <div v-else-if="activity" class="act-page">
      <!-- Back -->
      <div class="act-page__back-row">
        <button class="act-page__back-btn icon--directional" @click="$router.back()">
          <UIcon name="i-heroicons-arrow-left" class="act-page__back-icon" />
          {{ t('common.back') }}
        </button>
      </div>

      <!-- ── Galería ────────────────────────────────────── -->
      <div class="act-gallery">
        <!-- Hero image -->
        <div class="act-gallery__hero">
          <img
            v-if="heroImage"
            :src="heroImage"
            :alt="tc(activity.title_i18n)"
            class="act-gallery__hero-img"
          />
          <div v-else class="act-gallery__hero-empty">
            <UIcon name="i-heroicons-photo" class="act-gallery__hero-icon" />
          </div>

          <!-- Counter -->
          <div v-if="thumbnails.length > 1" class="act-gallery__counter">
            {{ activeIdx + 1 }} / {{ thumbnails.length }}
          </div>
        </div>

        <!-- Thumbnail strip (si hay más de 1) -->
        <div v-if="thumbnails.length > 1" class="act-gallery__strip">
          <button
            v-for="(img, i) in thumbnails"
            :key="i"
            class="act-gallery__thumb"
            :class="{ 'act-gallery__thumb--active': i === activeIdx }"
            @click="activeIdx = i"
          >
            <img
              :src="img"
              :alt="`${tc(activity.title_i18n)} ${i + 1}`"
              class="act-gallery__thumb-img"
            />
          </button>
        </div>
      </div>

      <!-- ── Contenido principal ────────────────────────── -->
      <div class="act-content">
        <!-- Header: categoría + título + ubicación -->
        <div class="act-section act-section--flush">
          <div v-if="activity.category" class="act-header__category">
            {{ tc(activity.category.name_i18n) }}
          </div>
          <h1 class="act-header__title">{{ tc(activity.title_i18n) }}</h1>
          <div v-if="cityName || placeName" class="act-header__location">
            <UIcon name="i-heroicons-map-pin" class="act-header__location-icon" />
            <span>
              <template v-if="placeName">{{ placeName }}</template>
              <template v-if="placeName && cityName"> · </template>
              <template v-if="cityName">{{ cityName }}</template>
            </span>
          </div>
        </div>

        <!-- ── Botones de acción ─────────────────────── -->
        <div v-if="mapsUrl || placeDetails?.phone" class="act-section act-actions">
          <a
            v-if="mapsUrl"
            :href="mapsUrl"
            target="_blank"
            rel="noopener"
            class="act-actions__btn act-actions__btn--primary"
          >
            <UIcon name="i-heroicons-map-pin" class="act-actions__btn-icon" />
            Google Maps
          </a>
          <a
            v-if="wazeUrl"
            :href="wazeUrl"
            target="_blank"
            rel="noopener"
            class="act-actions__btn act-actions__btn--outline"
          >
            <UIcon name="i-heroicons-arrow-turn-right-up" class="act-actions__btn-icon" />
            Waze
          </a>
          <a
            v-if="placeDetails?.phone"
            :href="`tel:${placeDetails.phone}`"
            class="act-actions__btn act-actions__btn--outline"
          >
            <UIcon name="i-heroicons-phone" class="act-actions__btn-icon" />
            {{ placeDetails.phone }}
          </a>
        </div>

        <!-- ── Horarios Google Places ────────────────── -->
        <div v-if="placeDetails?.opening_hours?.weekday_text?.length" class="act-section act-hours">
          <details class="act-hours__details">
            <summary class="act-hours__summary">
              <div class="act-hours__summary-left">
                <UIcon name="i-heroicons-clock" class="act-hours__icon" />
                <span class="act-hours__label">{{ t('activity.hours') }}</span>
              </div>
              <UIcon name="i-heroicons-chevron-down" class="act-hours__chevron" />
            </summary>
            <ul class="act-hours__list">
              <li
                v-for="line in placeDetails.opening_hours.weekday_text"
                :key="line"
                class="act-hours__item"
              >
                {{ line }}
              </li>
            </ul>
          </details>
        </div>

        <!-- ── Horario DB (solo si no hay de Google) ─── -->
        <div v-else-if="activity.schedule" class="act-section">
          <ActivityInfoSchedule :schedule="activity.schedule" />
        </div>

        <!-- ── Descripción ───────────────────────────── -->
        <div v-if="description" class="act-section">
          <ActivityInfoDescription :description="description" />
        </div>

        <!-- ── Características / Meta chips ─────────── -->
        <div
          v-if="
            activity.age_ranges?.length ||
            activity.seasons?.length ||
            activity.is_free ||
            activity.stroller_friendly ||
            activity.open_weekends ||
            activity.price
          "
          class="act-section"
        >
          <h2 class="act-section__title">{{ t('activity.features') }}</h2>
          <ActivityMeta
            :age-ranges="activity.age_ranges ?? []"
            :seasons="activity.seasons ?? []"
            :is-free="activity.is_free"
            :price="activity.price"
            :stroller-friendly="activity.stroller_friendly"
            :open-weekends="activity.open_weekends"
          />
        </div>

        <!-- ── Website / Accesibilidad ───────────────── -->
        <div
          v-if="placeDetails?.website || placeDetails?.wheelchair_accessible"
          class="act-section act-info-rows"
        >
          <a
            v-if="placeDetails?.website"
            :href="placeDetails.website"
            target="_blank"
            rel="noopener"
            class="act-info-row"
          >
            <UIcon name="i-heroicons-globe-alt" class="act-info-row__icon" />
            <span>{{ stripDomain(placeDetails.website) }}</span>
          </a>
          <div v-if="placeDetails?.wheelchair_accessible" class="act-info-row">
            <UIcon name="i-heroicons-user" class="act-info-row__icon" />
            <span>{{ t('activity.wheelchair') }}</span>
          </div>
        </div>

        <!-- ── Mapa ──────────────────────────────────── -->
        <div v-if="activity.place" class="act-section">
          <ActivityInfoLocation :place="activity.place" />
        </div>

        <!-- ── Reporte ───────────────────────────────── -->
        <div class="act-section">
          <ActivityReportActivityButton
            :activity-id="activity.id"
            :activity-title="tc(activity.title_i18n)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Variables locales ───────────────────────────────────────── */
.act-page {
  --green: var(--color-secondary-600, #16a34a);
  --green-light: var(--color-secondary-50, #f0fdf4);
  --green-border: var(--color-secondary-200, #bbf7d0);
  --divider: var(--color-neutral-100, #f5f5f5);
  --text: var(--color-text-primary, #171717);
  --text-muted: var(--color-text-secondary, #525252);
  --radius: 0.75rem;
}

/* ── Page shell ──────────────────────────────────────────────── */
.act-page {
  max-width: 600px;
  margin-inline: auto;
  background: #fff;
  min-height: 100vh;
}

/* ── Back button ─────────────────────────────────────────────── */
.act-page__back-row {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--divider);
}

.act-page__back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-muted);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.act-page__back-icon {
  width: 1rem;
  height: 1rem;
}

/* ── Galería ─────────────────────────────────────────────────── */
.act-gallery {
}

.act-gallery__hero {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--color-neutral-100);
  overflow: hidden;
}

.act-gallery__hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.act-gallery__hero-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-100);
}

.act-gallery__hero-icon {
  width: 3rem;
  height: 3rem;
  color: var(--color-neutral-300);
}

.act-gallery__counter {
  position: absolute;
  bottom: var(--space-3);
  inset-inline-end: var(--space-3);
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 999px;
}

.act-gallery__strip {
  display: flex;
  gap: var(--space-1-5, 0.375rem);
  padding: var(--space-2) var(--space-4);
  overflow-x: auto;
  scrollbar-width: none;
  background: #fff;
}

.act-gallery__strip::-webkit-scrollbar {
  display: none;
}

.act-gallery__thumb {
  flex-shrink: 0;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  transition: border-color 0.15s;
}

.act-gallery__thumb--active {
  border-color: var(--green);
}

.act-gallery__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ── Content area ────────────────────────────────────────────── */
.act-content {
  display: flex;
  flex-direction: column;
}

.act-section {
  padding: var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--divider);
}

.act-section--flush {
  padding-bottom: var(--space-4);
}

.act-section__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-muted);
  margin: 0 0 var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Header: category + title + location ─────────────────────── */
.act-header__category {
  display: inline-block;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--green);
  border: 1px solid var(--green-border);
  border-radius: 999px;
  padding: 2px 10px;
  margin-block-end: var(--space-2);
}

.act-header__title {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  color: var(--text);
  line-height: 1.25;
  margin: 0 0 var(--space-2);
}

.act-header__location {
  display: flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.act-header__location-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  color: var(--green);
}

/* ── Action buttons ──────────────────────────────────────────── */
.act-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.act-actions__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2-5, 0.625rem) var(--space-4);
  border-radius: var(--radius);
  text-decoration: none;
  flex: 1;
  justify-content: center;
  min-width: 120px;
  transition: opacity 0.15s;
}

.act-actions__btn:hover {
  opacity: 0.85;
}

.act-actions__btn--primary {
  background: var(--green);
  color: #fff;
  border: none;
}

.act-actions__btn--outline {
  background: #fff;
  color: var(--text);
  border: 1px solid var(--color-neutral-200);
}

.act-actions__btn-icon {
  width: 1rem;
  height: 1rem;
}

/* ── Horarios Google Places ──────────────────────────────────── */
.act-hours__details {
  cursor: pointer;
}

.act-hours__details[open] .act-hours__chevron {
  transform: rotate(180deg);
}

.act-hours__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  list-style: none;
  gap: var(--space-3);
}

.act-hours__summary::-webkit-details-marker {
  display: none;
}

.act-hours__summary-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.act-hours__icon {
  width: 1rem;
  height: 1rem;
  color: var(--green);
  flex-shrink: 0;
}

.act-hours__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}

.act-hours__chevron {
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.act-hours__list {
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.act-hours__item {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  padding-inline-start: var(--space-6);
}

/* ── Info rows (website, wheelchair) ─────────────────────────── */
.act-info-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.act-info-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  text-decoration: none;
}

.act-info-row[href] {
  color: var(--green);
}
.act-info-row[href]:hover {
  text-decoration: underline;
}

.act-info-row__icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: var(--green);
}

/* ── Loading skeleton ────────────────────────────────────────── */
.act-skeleton {
  max-width: 600px;
  margin-inline: auto;
}

.act-skeleton__hero {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--color-neutral-200);
  animation: act-pulse 1.5s ease-in-out infinite;
}

.act-skeleton__body {
  padding: var(--space-5) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.act-skeleton__line {
  background: var(--color-neutral-200);
  border-radius: 0.5rem;
  animation: act-pulse 1.5s ease-in-out infinite;
}

.act-skeleton__line--title {
  height: 1.75rem;
  width: 70%;
}
.act-skeleton__line--sub {
  height: 1rem;
  width: 50%;
}

@keyframes act-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
</style>
