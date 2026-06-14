<script setup lang="ts">
/**
 * pages/activity/[id].vue
 * Mobile: columna única.
 * Desktop: galería sticky izquierda + info scrollable derecha (estilo Airbnb).
 * Imágenes: solo activity.images.
 */

const route = useRoute()
const { t, locale } = useI18n()
const { tc } = useI18nContent()
const { getActivityById } = useActivities()

const id = computed(() => route.params.id as string)

// ─── Fetch ────────────────────────────────────────────────────
const { data: activity, status } = await useAsyncData(`activity-${id.value}`, () =>
  getActivityById(id.value)
)

if (!activity.value) {
  throw createError({ statusCode: 404, statusMessage: 'Activity not found', fatal: true })
}

// ─── Place details (solo datos, no imágenes) ──────────────────
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

// ─── Imágenes: SOLO activity.images ──────────────────────────
const dbImages = computed(() => (activity.value?.images ?? []).filter(Boolean))

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
const locationText = computed(() => [placeName.value, cityName.value].filter(Boolean).join(' · '))

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

// ─── Horarios: hoy desde Google Places ───────────────────────
// Google Places weekday_text: Mon=0 … Sun=6
const todayGPText = computed(() => {
  const lines = placeDetails.value?.opening_hours?.weekday_text
  if (!lines?.length) return null
  const day = new Date().getDay() // 0=Sun
  const idx = day === 0 ? 6 : day - 1
  return lines[idx] ?? null
})

// ─── Secciones colapsables ────────────────────────────────────
const open = reactive({
  tools: true,
  hours: true,
  description: true,
  features: true,
  extra: true,
  map: true,
})
function toggle(key: keyof typeof open) {
  open[key] = !open[key]
}

// ─── Share modal ──────────────────────────────────────────────
const shareOpen = ref(false)
const shareUrl = computed(() => (import.meta.client ? window.location.href : ''))
const shareTitle = computed(() => (activity.value ? tc(activity.value.title_i18n) : ''))

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

// ─── Features check ───────────────────────────────────────────
const hasFeatures = computed(
  () =>
    activity.value?.age_ranges?.length ||
    activity.value?.seasons?.length ||
    activity.value?.is_free ||
    activity.value?.price !== null ||
    activity.value?.stroller_friendly ||
    activity.value?.open_weekends
)
</script>

<template>
  <div>
    <!-- ─── Loading ─────────────────────────────────────── -->
    <div v-if="status === 'pending'" class="act-skeleton">
      <div class="act-skeleton__gallery" />
      <div class="act-skeleton__body">
        <div class="act-skeleton__line act-skeleton__line--title" />
        <div class="act-skeleton__line act-skeleton__line--sub" />
        <div class="act-skeleton__line act-skeleton__line--sub" />
      </div>
    </div>

    <!-- ─── Contenido ─────────────────────────────────── -->
    <div v-else-if="activity" class="act-page">
      <!-- Top row (mobile only — encima de la galería) -->
      <div class="act-top-row act-top-row--mobile">
        <button class="act-back-btn" @click="$router.back()">
          <UIcon name="i-heroicons-arrow-left" class="act-back-btn__icon icon--directional" />
          {{ t('common.back') }}
        </button>
        <button class="act-share-btn" @click="shareOpen = true">
          <UIcon name="i-heroicons-share" class="act-share-btn__icon" />
          {{ t('common.share') }}
        </button>
      </div>

      <!-- Layout: gallery izq + info der en desktop -->
      <div class="act-layout">
        <!-- ══ Columna galería (sticky en desktop) ══ -->
        <div class="act-col act-col--gallery">
          <div class="act-gallery">
            <ActivityImagesGallery :images="dbImages" :alt-text="tc(activity.title_i18n)" />
          </div>
        </div>

        <!-- ══ Columna información ══ -->
        <div class="act-col act-col--info">
          <!-- Top row (desktop only — dentro de la columna info) -->
          <div class="act-top-row act-top-row--desktop">
            <button class="act-back-btn" @click="$router.back()">
              <UIcon name="i-heroicons-arrow-left" class="act-back-btn__icon icon--directional" />
              {{ t('common.back') }}
            </button>
            <button class="act-share-btn" @click="shareOpen = true">
              <UIcon name="i-heroicons-share" class="act-share-btn__icon" />
              {{ t('common.share') }}
            </button>
          </div>

          <!-- ── Header: categoría + título + dirección ──── -->
          <div class="act-section act-section--header">
            <!-- Chip categoría sin icono, solo texto -->
            <div v-if="activity.category" class="act-pill act-pill--category">
              {{ tc(activity.category.name_i18n) }}
            </div>

            <h1 class="act-header__title">{{ tc(activity.title_i18n) }}</h1>

            <div v-if="locationText" class="act-header__location">
              <UIcon name="i-heroicons-map-pin" class="act-header__location-icon" />
              <span>{{ locationText }}</span>
            </div>
          </div>

          <!-- ── SECCIÓN: Herramientas ───────────────────── -->
          <div v-if="mapsUrl || wazeUrl || placeDetails?.phone" class="act-section">
            <button class="act-section__trigger" @click="toggle('tools')">
              <span class="act-section__heading">{{ t('activity.how_to_get') }}</span>
              <UIcon
                name="i-heroicons-chevron-down"
                class="act-section__chevron"
                :class="{ 'act-section__chevron--open': open.tools }"
              />
            </button>

            <div v-show="open.tools" class="act-section__body">
              <!-- Fila: Google Maps + Waze -->
              <div class="act-tools__nav-row">
                <a
                  v-if="mapsUrl"
                  :href="mapsUrl"
                  target="_blank"
                  rel="noopener"
                  class="act-tools__btn act-tools__btn--maps"
                >
                  <UIcon name="i-heroicons-map-pin" class="act-tools__btn-icon" />
                  Google Maps
                </a>
                <a
                  v-if="wazeUrl"
                  :href="wazeUrl"
                  target="_blank"
                  rel="noopener"
                  class="act-tools__btn act-tools__btn--waze"
                >
                  <UIcon name="i-heroicons-arrow-turn-up-right" class="act-tools__btn-icon" />
                  Waze
                </a>
              </div>

              <!-- Teléfono: mismo estilo que nav, full width -->
              <a
                v-if="placeDetails?.phone"
                :href="`tel:${placeDetails.phone}`"
                class="act-tools__btn act-tools__btn--phone"
              >
                <UIcon name="i-heroicons-phone" class="act-tools__btn-icon" />
                {{ placeDetails.phone }}
              </a>
            </div>
          </div>

          <!-- ── SECCIÓN: Horarios (Google Places) ─────── -->
          <div v-if="placeDetails?.opening_hours?.weekday_text?.length" class="act-section">
            <button class="act-section__trigger" @click="toggle('hours')">
              <div class="act-section__heading-block">
                <span class="act-section__heading">{{ t('activity.hours') }}</span>
                <span v-if="todayGPText" class="act-section__sub">{{ todayGPText }}</span>
              </div>
              <UIcon
                name="i-heroicons-chevron-down"
                class="act-section__chevron"
                :class="{ 'act-section__chevron--open': open.hours }"
              />
            </button>
            <div v-show="open.hours" class="act-section__body">
              <ul class="act-hours__list">
                <li
                  v-for="line in placeDetails.opening_hours.weekday_text"
                  :key="line"
                  class="act-hours__item"
                >
                  {{ line }}
                </li>
              </ul>
            </div>
          </div>

          <!-- ── SECCIÓN: Horarios DB ──────────────────── -->
          <div v-else-if="activity.schedule" class="act-section">
            <button class="act-section__trigger" @click="toggle('hours')">
              <span class="act-section__heading">{{ t('activity.hours') }}</span>
              <UIcon
                name="i-heroicons-chevron-down"
                class="act-section__chevron"
                :class="{ 'act-section__chevron--open': open.hours }"
              />
            </button>
            <div v-show="open.hours" class="act-section__body">
              <ActivityInfoSchedule :schedule="activity.schedule" />
            </div>
          </div>

          <!-- ── SECCIÓN: Descripción ──────────────────── -->
          <div v-if="description" class="act-section">
            <button class="act-section__trigger" @click="toggle('description')">
              <span class="act-section__heading">{{ t('activity.description') }}</span>
              <UIcon
                name="i-heroicons-chevron-down"
                class="act-section__chevron"
                :class="{ 'act-section__chevron--open': open.description }"
              />
            </button>
            <div v-show="open.description" class="act-section__body">
              <ActivityInfoDescription :description="description" />
            </div>
          </div>

          <!-- ── SECCIÓN: Características ─────────────── -->
          <div v-if="hasFeatures" class="act-section">
            <button class="act-section__trigger" @click="toggle('features')">
              <span class="act-section__heading">{{ t('activity.features') }}</span>
              <UIcon
                name="i-heroicons-chevron-down"
                class="act-section__chevron"
                :class="{ 'act-section__chevron--open': open.features }"
              />
            </button>
            <div v-show="open.features" class="act-section__body">
              <ActivityMeta
                :age-ranges="activity.age_ranges ?? []"
                :seasons="activity.seasons ?? []"
                :is-free="activity.is_free"
                :price="activity.price"
                :stroller-friendly="activity.stroller_friendly"
                :open-weekends="activity.open_weekends"
              />
            </div>
          </div>

          <!-- ── SECCIÓN: Más info (web, wheelchair) ────── -->
          <div
            v-if="placeDetails?.website || placeDetails?.wheelchair_accessible"
            class="act-section"
          >
            <button class="act-section__trigger" @click="toggle('extra')">
              <span class="act-section__heading">{{ t('activity.more_info') }}</span>
              <UIcon
                name="i-heroicons-chevron-down"
                class="act-section__chevron"
                :class="{ 'act-section__chevron--open': open.extra }"
              />
            </button>
            <div v-show="open.extra" class="act-section__body act-info-rows">
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
          </div>

          <!-- ── SECCIÓN: Mapa ─────────────────────────── -->
          <div v-if="activity.place" class="act-section">
            <button class="act-section__trigger" @click="toggle('map')">
              <span class="act-section__heading">{{ t('activity.location') }}</span>
              <UIcon
                name="i-heroicons-chevron-down"
                class="act-section__chevron"
                :class="{ 'act-section__chevron--open': open.map }"
              />
            </button>
            <div v-show="open.map" class="act-section__body">
              <ActivityInfoLocation :place="activity.place" hide-actions />
            </div>
          </div>

          <!-- ── Reporte ────────────────────────────────── -->
          <div class="act-section act-section--report">
            <ActivityReportActivityButton
              :activity-id="activity.id"
              :activity-title="tc(activity.title_i18n)"
            />
          </div>
        </div>
        <!-- /act-col--info -->
      </div>
      <!-- /act-layout -->
    </div>
    <!-- /act-page -->

    <!-- ── Share modal ────────────────────────────────────── -->
    <ActivityShareModal v-model:open="shareOpen" :title="shareTitle" :url="shareUrl" />
  </div>
</template>

<style scoped>
/* ── Variables ────────────────────────────────────────────────── */
.act-page {
  --green: var(--color-secondary-600, #16a34a);
  --green-300: var(--color-secondary-300, #86efac);
  --green-700: var(--color-secondary-700, #15803d);
  --divider: var(--color-neutral-100, #f5f5f5);
  --text: var(--color-text-primary, #171717);
  --text-muted: var(--color-text-secondary, #525252);
  --px: var(--space-3, 0.75rem);
  --navbar-h: 64px;
}

/* ── Shell mobile: columna única ──────────────────────────────── */
.act-page {
  max-width: 600px;
  margin-inline: auto;
  background: #fff;
  min-height: 100vh;
}

/* ── Top row: back + share ────────────────────────────────────── */
.act-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--px);
}

/* Mobile: encima de la galería */
.act-top-row--desktop {
  display: none;
}

.act-back-btn {
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

/* Solo el icono se voltea en RTL, no el texto */
.act-back-btn__icon {
  width: 1rem;
  height: 1rem;
}

.act-share-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--green);
  background: none;
  border: 1.5px solid var(--green-300);
  border-radius: 9999px;
  padding: var(--space-1-5, 0.375rem) var(--space-3);
  cursor: pointer;
  transition: background 0.15s;
}

.act-share-btn:hover {
  background: var(--color-secondary-50, #f0fdf4);
}

.act-share-btn__icon {
  width: 0.875rem;
  height: 0.875rem;
}

/* ── Layout ───────────────────────────────────────────────────── */
.act-layout {
  display: flex;
  flex-direction: column;
}

/* En mobile la galería es parte del flujo normal */
.act-col--gallery {
  width: 100%;
}

.act-gallery {
  width: 100%;
}

/* Override aspect ratio del carrusel: 4:3 en mobile */
.act-gallery :deep(.aspect-video) {
  aspect-ratio: 4 / 3;
}

/* ── Secciones ─────────────────────────────────────────────────── */
.act-section {
  padding: var(--space-4) var(--px);
  border-top: 1px solid var(--divider);
}

.act-section--header {
  border-top: none;
  padding-top: var(--space-3);
}

.act-section--report {
  padding-block: var(--space-3);
}

/* Trigger colapsable */
.act-section__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: start;
  gap: var(--space-2);
}

/* Heading con barra verde inline-start */
.act-section__heading {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-align: start;
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

.act-section__heading-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: start;
}

.act-section__sub {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  padding-inline-start: calc(3px + var(--space-2));
  font-weight: var(--font-weight-normal);
}

.act-section__chevron {
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform 0.2s;
}

.act-section__chevron--open {
  transform: rotate(180deg);
}

.act-section__body {
  padding-top: var(--space-3);
}

/* ── Header ───────────────────────────────────────────────────── */
/* Chip categoría: solo texto, sin icono */
.act-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  padding: var(--space-1-5, 0.375rem) var(--space-3);
  border-radius: 9999px;
  border: 1.5px solid var(--green-300);
  background: transparent;
  color: var(--green-700);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  white-space: nowrap;
}

.act-pill--category {
  margin-block-end: var(--space-2);
}

.act-header__title {
  font-size: 1.875rem;
  font-weight: var(--font-weight-bold);
  color: var(--text);
  line-height: 1.2;
  margin: 0 0 var(--space-2);
  text-align: start;
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

/* ── Tools ────────────────────────────────────────────────────── */
.act-tools__nav-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin-block-end: var(--space-2);
}

/* Base del botón de herramienta */
.act-tools__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2-5, 0.625rem) var(--space-3);
  border-radius: var(--border-radius-lg, 0.75rem);
  text-decoration: none;
  border: 1.5px solid transparent;
  transition: opacity 0.15s;
  min-height: 2.5rem;
}

.act-tools__btn:hover {
  opacity: 0.85;
}

.act-tools__btn--maps {
  background: var(--green);
  color: #fff;
}

.act-tools__btn--waze {
  background: #fff;
  color: var(--text);
  border-color: var(--color-neutral-200, #e5e5e5);
}

/* Teléfono: ancho completo, mismo estilo que waze */
.act-tools__btn--phone {
  width: 100%;
  background: #fff;
  color: var(--text);
  border-color: var(--color-neutral-200, #e5e5e5);
}

.act-tools__btn-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

/* ── Horarios ────────────────────────────────────────────────── */
.act-hours__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.act-hours__item {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

/* ── Info rows ───────────────────────────────────────────────── */
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

.act-skeleton__gallery {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--color-neutral-200);
  animation: act-pulse 1.5s ease-in-out infinite;
}

.act-skeleton__body {
  padding: var(--space-4) var(--px);
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

/* ══════════════════════════════════════════════════════════════
   DESKTOP: galería sticky izquierda + info scrollable derecha
   ══════════════════════════════════════════════════════════════ */
@media (min-width: 768px) {
  /* Página ocupa todo el ancho del container */
  .act-page {
    max-width: none;
    display: block;
  }

  /* Ocultar el top-row mobile, mostrar el desktop */
  .act-top-row--mobile {
    display: none;
  }

  .act-top-row--desktop {
    display: flex;
    padding: var(--space-4) var(--space-5);
  }

  /* Grid: galería izq (1fr) + gap + info der (1fr) */
  .act-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
    align-items: start;
  }

  /*
   * Galería: sticky al scroll.
   * Sin height forzado — la imagen mantiene su aspect ratio (4:3).
   * Cuando el usuario scrollea la info, la galería se queda visible.
   */
  .act-col--gallery {
    position: sticky;
    top: calc(var(--navbar-h) + var(--space-4));
  }

  /* Imagen mantiene 4:3 natural, con border-radius y sombra leve */
  .act-gallery :deep(.aspect-video) {
    aspect-ratio: 4 / 3;
    border-radius: var(--border-radius-xl, 1rem);
    overflow: hidden;
  }

  /* Columna info: separador y padding generoso */
  .act-col--info {
    border-inline-start: 1px solid var(--divider);
    padding-inline-start: var(--space-2);
  }

  .act-section {
    padding-inline: var(--space-5);
  }

  .act-section--header {
    padding-top: var(--space-4);
  }

  /* Título más grande en desktop */
  .act-header__title {
    font-size: 2.25rem;
  }
}
</style>
