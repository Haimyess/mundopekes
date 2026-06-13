<script setup lang="ts">
/**
 * pages/activity/[id].vue
 * Columna única estilo Coffee Trail.
 * Imágenes: solo las guardadas en DB (activity.images + place.images).
 * Live Google Places → solo datos (horarios, tel, web, wheelchair).
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

// ─── Place details (client-side, solo datos no imágenes) ──────
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

// ─── Imágenes: SOLO las de la DB ──────────────────────────────
// activity.images primero, place.images después
// NO se incluyen las fotos live de Google Places API
const dbImages = computed(() => {
  const a = activity.value?.images ?? []
  const p = activity.value?.place?.images ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const img of [...a, ...p]) {
    if (img && !seen.has(img)) {
      seen.add(img)
      out.push(img)
    }
  }
  return out
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

const locationText = computed(() => {
  const parts = [placeName.value, cityName.value].filter(Boolean)
  return parts.join(' · ')
})

// ─── Navegación ───────────────────────────────────────────────
const lat = computed(() => activity.value?.place?.lat)
const lng = computed(() => activity.value?.place?.lng)

const mapsUrl = computed(() =>
  lat.value && lng.value
    ? `https://maps.google.com/?q=${lat.value},${lng.value}`
    : (placeDetails.value?.google_url ?? null)
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
  ogImage: () => dbImages.value[0] ?? '',
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
      <!-- ── Back ─────────────────────────────────────────── -->
      <div class="act-page__back-row">
        <button class="act-page__back-btn icon--directional" @click="$router.back()">
          <UIcon name="i-heroicons-arrow-left" class="act-page__back-icon" />
          {{ t('common.back') }}
        </button>
      </div>

      <!-- ── Galería (carrusel original con líneas verdes) ─── -->
      <ActivityImagesGallery :images="dbImages" :alt-text="tc(activity.title_i18n)" />

      <!-- ── SECCIÓN: Título + categoría + dirección ────────── -->
      <div class="act-section act-section--header">
        <h1 class="act-header__title">{{ tc(activity.title_i18n) }}</h1>
        <div v-if="activity.category" class="act-header__category">
          {{ tc(activity.category.name_i18n) }}
        </div>
        <div v-if="locationText" class="act-header__location">
          <UIcon name="i-heroicons-map-pin" class="act-header__location-icon" />
          <span>{{ locationText }}</span>
        </div>
      </div>

      <!-- ── SECCIÓN: Herramientas (Maps + Waze + Teléfono) ─── -->
      <div v-if="mapsUrl || wazeUrl || placeDetails?.phone" class="act-section act-tools">
        <a v-if="mapsUrl" :href="mapsUrl" target="_blank" rel="noopener" class="act-tools__btn">
          <!-- Google Maps icon (SVG inline) -->
          <svg class="act-tools__btn-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            />
          </svg>
          Google Maps
        </a>
        <a
          v-if="wazeUrl"
          :href="wazeUrl"
          target="_blank"
          rel="noopener"
          class="act-tools__btn act-tools__btn--outline"
        >
          <!-- Waze icon (SVG inline) -->
          <svg class="act-tools__btn-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M20.54 6.63C19.29 4.6 17.35 3.07 15.04 2.38 9.8.81 4.31 3.9 2.74 9.14c-.55 1.83-.46 3.71.17 5.38L2 20l5.57-.89c.97.51 2.04.85 3.16.99l.27.03c5.47.52 10.32-3.5 10.84-8.97.15-1.6-.09-3.17-.3-4.53zM8 13.5c-.83 0-1.5-.67-1.5-1.5S7.17 10.5 8 10.5s1.5.67 1.5 1.5S8.83 13.5 8 13.5zm4 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4-2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5S16.83 13.5 16 13.5z"
            />
          </svg>
          Waze
        </a>
        <a
          v-if="placeDetails?.phone"
          :href="`tel:${placeDetails.phone}`"
          class="act-tools__btn act-tools__btn--outline"
        >
          <UIcon name="i-heroicons-phone" class="act-tools__btn-icon" />
          {{ placeDetails.phone }}
        </a>
      </div>

      <!-- ── SECCIÓN: Horarios (Google Places) ──────────────── -->
      <div v-if="placeDetails?.opening_hours?.weekday_text?.length" class="act-section">
        <h2 class="act-section__heading">{{ t('activity.hours') }}</h2>
        <details class="act-hours__details">
          <summary class="act-hours__summary">
            <div class="act-hours__summary-left">
              <UIcon name="i-heroicons-clock" class="act-hours__icon" />
              <span class="act-hours__label">{{ t('activity.all_hours') }}</span>
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

      <!-- ── SECCIÓN: Horarios DB (solo sin Google Places) ──── -->
      <div v-else-if="activity.schedule" class="act-section">
        <h2 class="act-section__heading">{{ t('activity.hours') }}</h2>
        <ActivityInfoSchedule :schedule="activity.schedule" />
      </div>

      <!-- ── SECCIÓN: Descripción ───────────────────────────── -->
      <div v-if="description" class="act-section">
        <h2 class="act-section__heading">{{ t('activity.description') }}</h2>
        <ActivityInfoDescription :description="description" />
      </div>

      <!-- ── SECCIÓN: Características ──────────────────────── -->
      <div
        v-if="
          activity.age_ranges?.length ||
          activity.seasons?.length ||
          activity.is_free ||
          activity.price !== null ||
          activity.stroller_friendly ||
          activity.open_weekends
        "
        class="act-section"
      >
        <h2 class="act-section__heading">{{ t('activity.features') }}</h2>
        <ActivityMeta
          :age-ranges="activity.age_ranges ?? []"
          :seasons="activity.seasons ?? []"
          :is-free="activity.is_free"
          :price="activity.price"
          :stroller-friendly="activity.stroller_friendly"
          :open-weekends="activity.open_weekends"
        />
      </div>

      <!-- ── SECCIÓN: Info adicional (website, wheelchair) ──── -->
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

      <!-- ── SECCIÓN: Mapa (sin botones, están arriba) ─────── -->
      <div v-if="activity.place" class="act-section">
        <h2 class="act-section__heading">{{ t('activity.location') }}</h2>
        <ActivityInfoLocation :place="activity.place" hide-actions />
      </div>

      <!-- ── Reporte ───────────────────────────────────────── -->
      <div class="act-section act-section--report">
        <ActivityReportActivityButton
          :activity-id="activity.id"
          :activity-title="tc(activity.title_i18n)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Variables ───────────────────────────────────────────────── */
.act-page {
  --green: var(--color-secondary-600, #16a34a);
  --green-light: var(--color-secondary-100, #dcfce7);
  --green-border: var(--color-secondary-200, #bbf7d0);
  --divider: var(--color-neutral-100, #f5f5f5);
  --text: var(--color-text-primary, #171717);
  --text-muted: var(--color-text-secondary, #525252);
}

/* ── Shell ───────────────────────────────────────────────────── */
.act-page {
  max-width: 600px;
  margin-inline: auto;
  background: #fff;
  min-height: 100vh;
}

/* ── Back ────────────────────────────────────────────────────── */
.act-page__back-row {
  padding: var(--space-3) var(--space-4);
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

/* ── Secciones ───────────────────────────────────────────────── */
.act-section {
  padding: var(--space-5) var(--space-4);
  border-top: 1px solid var(--divider);
  /* RTL: text-align follows dir attribute automatically */
}

.act-section--header {
  border-top: none;
}

.act-section--report {
  padding-block: var(--space-3);
}

/* Heading de sección con barra verde a la izquierda (inline-start) */
.act-section__heading {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin: 0 0 var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.act-section__heading::before {
  content: '';
  display: block;
  width: 3px;
  height: 1.1em;
  background: var(--green);
  border-radius: 2px;
  flex-shrink: 0;
}

/* ── Header: título + categoría + dirección ──────────────────── */
.act-header__title {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  color: var(--text);
  line-height: 1.25;
  margin: 0 0 var(--space-2);
  text-align: start;
}

.act-header__category {
  display: inline-block;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--green);
  background: var(--green-light);
  border: 1px solid var(--green-border);
  border-radius: 999px;
  padding: 2px 10px;
  margin-block-end: var(--space-2);
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

/* ── Tools: Maps + Waze + Teléfono ──────────────────────────── */
.act-tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.act-tools__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2-5, 0.625rem) var(--space-4);
  border-radius: var(--radius, 0.75rem);
  text-decoration: none;
  flex: 1;
  justify-content: center;
  min-width: 100px;
  background: var(--green);
  color: #fff;
  border: none;
  transition: opacity 0.15s;
}

.act-tools__btn:hover {
  opacity: 0.85;
}

.act-tools__btn--outline {
  background: #fff;
  color: var(--text);
  border: 1px solid var(--color-neutral-200);
}

.act-tools__btn-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
}

/* ── Horarios ────────────────────────────────────────────────── */
.act-hours__details[open] .act-hours__chevron {
  transform: rotate(180deg);
}

.act-hours__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  list-style: none;
  cursor: pointer;
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
  font-weight: var(--font-weight-medium);
  color: var(--text-muted);
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
  padding-inline-start: var(--space-6, 1.5rem);
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

/* ── Skeleton ────────────────────────────────────────────────── */
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
