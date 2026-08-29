<script setup lang="ts">
/**
 * pages/activity/[id].vue
 * Mobile: columna única.
 * Desktop: galería sticky izquierda + info scrollable derecha (estilo Airbnb).
 * Imágenes: solo activity.images.
 */

const route = useRoute()
const { t } = useI18n()
const { tc } = useI18nContent()
const { getActivityById, getActivitiesByPlaceId } = useActivities()

const id = computed(() => route.params.id as string)

// ─── Fetch ────────────────────────────────────────────────────
// Non-blocking on purpose: apps/web runs ssr:false, so an `await` here would
// stall Vue Router and stop the skeleton below from ever painting on a
// client-side navigation. Not-found is handled reactively once resolved.
const { data: activity, status } = useAsyncData(`activity-${id.value}`, () =>
  getActivityById(id.value)
)

watch(status, (s) => {
  if (s === 'success' && !activity.value) {
    showError(createError({ statusCode: 404, statusMessage: 'Activity not found', fatal: true }))
  }
})

// ─── Other activities at the same place ────────────────────────
// Practical info (phone/website/hours/wheelchair via live Google Details) now
// lives exclusively on the Place Page — this page only links to it.
const { data: siblingActivitiesData } = useAsyncData(
  () => `activity-siblings-${activity.value?.place_id}`,
  () =>
    activity.value?.place_id
      ? getActivitiesByPlaceId(activity.value.place_id, { excludeId: id.value, limit: 4 })
      : Promise.resolve([]),
  { watch: [() => activity.value?.place_id] }
)
const siblingActivities = computed(() => siblingActivitiesData.value ?? [])

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
const moreActivitiesText = computed(() =>
  placeName.value ? t('activity.more_activities_at', { place: placeName.value }) : null
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

// ─── Horarios ─────────────────────────────────────────────────
// Activity-level schedule only (schedule_structured on the activity itself —
// different experiences at the same place can run on different hours, e.g.
// a class vs. free playground access). The place's general opening hours
// (Google Places weekday_text) now live on the Place Page instead.
// Day names always come from our own i18n, not any external source.
const todayIdx = computed(() => new Date().getDay()) // 0=Dom … 6=Sab

const _SCHED_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const
type _SchedKey = (typeof _SCHED_KEYS)[number]
type _SchedDay = { open: boolean; start: string; end: string }
type _SchedMap = Record<_SchedKey, _SchedDay>

const activityMeta = computed(
  () =>
    activity.value?.metadata as {
      schedule_structured?: _SchedMap | null
      hours_unknown?: boolean
      has_shadow?: boolean
      has_bathrooms?: boolean
    } | null
)

const structuredSchedule = computed(() => {
  const meta = activityMeta.value
  if (!meta || meta.hours_unknown) return null
  return meta.schedule_structured ?? null
})

const parsedStructuredHours = computed(() => {
  if (!structuredSchedule.value) return null
  return _SCHED_KEYS.map((key, idx) => {
    const day = structuredSchedule.value![key]
    return {
      key,
      label: t(`common.day_${key}`),
      open: day.open,
      hours: day.open ? `${day.start} – ${day.end}` : t('activity.closed'),
      isToday: idx === todayIdx.value,
    }
  })
})

const hoursRows = computed(() => parsedStructuredHours.value)

const todayRow = computed(() => hoursRows.value?.find((e) => e.isToday) ?? null)

// ¿Está abierto ahora mismo? — calculado desde schedule_structured; sin ese
// dato no mostramos el badge (null, no false).
const isOpenNow = computed<boolean | null>(() => {
  const sc = structuredSchedule.value
  if (!sc) return null
  const key = _SCHED_KEYS[todayIdx.value]
  if (!key) return null
  const entry = sc[key]
  if (!entry?.open) return false
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = entry.start.split(':').map(Number)
  const [eh, em] = entry.end.split(':').map(Number)
  if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em))
    return null
  return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em
})

const todayGPText = computed(() => {
  if (!todayRow.value) return null
  return `${todayRow.value.label}: ${todayRow.value.hours}`
})

// ─── Secciones colapsables ────────────────────────────────────
const open = reactive({
  tools: true,
  hours: false,
  description: true,
  features: true,
  map: true,
})
function toggle(key: keyof typeof open) {
  open[key] = !open[key]
}

// ─── Share ────────────────────────────────────────────────────
const shareUrl = computed(() => (import.meta.client ? window.location.href : ''))
const shareTitle = computed(() => (activity.value ? tc(activity.value.title_i18n) : ''))

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
        <div class="act-skeleton__card" />
        <div class="act-skeleton__block">
          <div class="act-skeleton__line act-skeleton__line--heading" />
          <div class="act-skeleton__line act-skeleton__line--row" />
          <div class="act-skeleton__line act-skeleton__line--row" />
          <div class="act-skeleton__line act-skeleton__line--row" />
        </div>
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
        <ActivityShareModal :title="shareTitle" :url="shareUrl" />
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
            <ActivityShareModal :title="shareTitle" :url="shareUrl" />
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

          <!-- ── SECCIÓN: Location → link a la Place Page ── -->
          <div v-if="activity.place" class="act-section act-section--location-link">
            <NuxtLink :to="`/place/${activity.place.id}`" class="act-place-link">
              <UIcon name="i-heroicons-building-storefront" class="act-place-link__icon" />
              <span class="act-place-link__text">{{ moreActivitiesText }}</span>
              <UIcon
                name="i-heroicons-chevron-right"
                class="act-place-link__chevron icon--directional"
              />
            </NuxtLink>
          </div>

          <!-- ── SECCIÓN: Herramientas ───────────────────── -->
          <div
            v-if="mapsUrl || wazeUrl"
            class="act-section"
            :class="{ 'act-section--open': open.tools }"
          >
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
            </div>
          </div>

          <!-- ── SECCIÓN: Horarios ─────────────────────── -->
          <!-- Horario específico de esta actividad (schedule_structured) →
               texto libre (schedule). El horario general del lugar vive en
               la Place Page. -->
          <div
            v-if="hoursRows || activity.schedule"
            class="act-section"
            :class="{ 'act-section--open': open.hours }"
          >
            <button class="act-section__trigger" @click="toggle('hours')">
              <div class="act-section__heading-block">
                <div class="act-hours__trigger-top">
                  <span class="act-section__heading">{{ t('activity.hours') }}</span>
                  <!-- Badge abierto/cerrado: solo cuando tenemos info fiable -->
                  <span
                    v-if="hoursRows && isOpenNow !== null"
                    class="act-hours__badge"
                    :class="isOpenNow ? 'act-hours__badge--open' : 'act-hours__badge--closed'"
                  >
                    {{ isOpenNow ? t('activity.open_now') : t('activity.closed_now') }}
                  </span>
                </div>
                <span v-if="todayGPText" class="act-hours__today-text">{{ todayGPText }}</span>
              </div>
              <UIcon
                name="i-heroicons-chevron-down"
                class="act-section__chevron"
                :class="{ 'act-section__chevron--open': open.hours }"
              />
            </button>
            <div v-show="open.hours" class="act-section__body">
              <!-- Tabla unificada: usa hoursRows (Google o structured, mismo formato) -->
              <SharedScheduleTable v-if="hoursRows" :rows="hoursRows" :open-now="isOpenNow" />
              <!-- Último fallback: texto libre (schedule string) -->
              <ActivityInfoSchedule v-else-if="activity.schedule" :schedule="activity.schedule" />
            </div>
          </div>

          <!-- ── SECCIÓN: Descripción ──────────────────── -->
          <div
            v-if="description"
            class="act-section"
            :class="{ 'act-section--open': open.description }"
          >
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
          <div
            v-if="hasFeatures"
            class="act-section"
            :class="{ 'act-section--open': open.features }"
          >
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
                :has-shadow="activityMeta?.has_shadow ?? false"
                :has-bathrooms="activityMeta?.has_bathrooms ?? false"
              />
            </div>
          </div>

          <!-- ── SECCIÓN: Mapa ─────────────────────────── -->
          <div v-if="activity.place" class="act-section" :class="{ 'act-section--open': open.map }">
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

          <!-- ── SECCIÓN: Otras actividades en este lugar ── -->
          <div v-if="siblingActivities.length" class="act-section">
            <span class="act-section__heading">{{ t('activity.other_activities_here') }}</span>
            <div class="act-section__body act-siblings-grid">
              <SharedActivityCard
                v-for="sibling in siblingActivities"
                :key="sibling.id"
                :activity="sibling"
                variant="compact"
              />
            </div>
            <NuxtLink
              v-if="activity.place"
              :to="`/place/${activity.place.id}`"
              class="act-siblings-see-all"
            >
              {{ t('activity.see_place_page') }}
              <UIcon name="i-heroicons-arrow-right" class="icon--directional" />
            </NuxtLink>
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
  </div>
</template>

<style scoped>
/* ── Variables ────────────────────────────────────────────────── */
.act-page {
  --green: var(--color-secondary-600, #16a34a);
  --green-300: var(--color-secondary-300, #86efac);
  --green-700: var(--color-secondary-700, #15803d);
  --divider: var(--color-neutral-200, #e5e5e5);
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
  padding-top: var(--space-4);
}

/* ── Top row: back + share ────────────────────────────────────── */
.act-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--px);
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
  padding-top: var(--space-2);
}

/* ── Secciones ─────────────────────────────────────────────────── */
.act-section {
  position: relative;
  padding: var(--space-4) var(--px);
  padding-inline-start: calc(var(--px) + 11px);
  border-top: 1px solid var(--divider);
}

.act-section::before {
  content: '';
  position: absolute;
  inset-inline-start: var(--px);
  top: var(--space-4);
  width: 3px;
  border-radius: 2px;
  background: var(--green);
  height: 1.25em;
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.act-section--open::before {
  height: calc(100% - var(--space-4) - var(--space-4));
}

.act-section--header {
  border-top: none;
  padding-top: var(--space-3);
  padding-inline-start: var(--px);
}

.act-section--header::before {
  display: none;
}

.act-section--report {
  padding-block: var(--space-3);
  padding-inline-start: var(--px);
}

.act-section--report::before {
  display: none;
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

/* Heading */
.act-section__heading {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-align: start;
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
  padding: 0.2rem var(--space-2-5, 0.625rem);
  border-radius: 9999px;
  border: none;
  background: var(--green-700);
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  white-space: nowrap;
  letter-spacing: 0.02em;
  text-transform: uppercase;
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
  color: var(--color-neutral-600, #525252);
}

.act-header__location-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  color: var(--green);
}

/* ── Location → Place Page link ─────────────────────────────────── */
.act-section--location-link {
  padding-block: var(--space-3);
}

/* Card no es colapsable: no debe mostrar la línea verde del acordeón */
.act-section--location-link::before {
  display: none;
}

.act-place-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--border-radius-lg, 0.75rem);
  background: var(--color-secondary-50, #f0fdf4);
  border: 0.5px solid var(--color-secondary-200, #bbf7d0);
  text-decoration: none;
  transition: background 0.15s;
}

.act-place-link:hover {
  background: var(--color-secondary-100, #dcfce7);
}

.act-place-link__icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--green);
  flex-shrink: 0;
}

.act-place-link__text {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.act-place-link__chevron {
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* ── Otras actividades en este lugar ────────────────────────────── */
.act-siblings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.act-siblings-see-all {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--green);
  text-decoration: none;
}

.act-siblings-see-all:hover {
  text-decoration: underline;
}

.act-siblings-see-all svg,
.act-siblings-see-all :deep(svg) {
  width: 1rem;
  height: 1rem;
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

/* ── Horarios: tabla en SharedScheduleTable (apps/web/app/components/shared/ScheduleTable.vue) ── */

/* ── Trigger top row: heading + badge ───────────────────────── */
.act-hours__trigger-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.act-hours__badge {
  display: inline-flex;
  align-items: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  padding: 2px var(--space-2);
  border-radius: 9999px;
  line-height: 1.4;
  flex-shrink: 0;
}

.act-hours__badge--open {
  background: var(--color-secondary-100, #dcfce7);
  color: var(--color-secondary-700, #15803d);
  border: 1px solid var(--color-secondary-300, #86efac);
}

.act-hours__badge--closed {
  background: var(--color-neutral-100, #f5f5f5);
  color: var(--color-neutral-500, #737373);
  border: 1px solid var(--color-neutral-200, #e5e5e5);
}

/* Texto de hoy más visible que el sub genérico */
.act-hours__today-text {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-weight: var(--font-weight-normal);
  margin-top: 1px;
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

/* Bloque con la forma del card de ubicación (act-place-link) */
.act-skeleton__card {
  height: 3.5rem;
  border-radius: var(--border-radius-lg, 0.75rem);
  background: var(--color-neutral-200);
  animation: act-pulse 1.5s ease-in-out infinite;
}

/* Bloque con la forma de la sección de horarios */
.act-skeleton__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.act-skeleton__line--heading {
  height: 1.25rem;
  width: 35%;
}

.act-skeleton__line--row {
  height: 1rem;
  width: 90%;
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
    padding-top: var(--space-6);
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
   * min-width: 0 en ambas columnas: por defecto un ítem de grid no
   * puede achicarse más allá del ancho mínimo de su contenido (p.ej.
   * los badges de Features en una fila sin wrap). Sin esto, al abrir
   * un acordeón con muchos badges la columna info empuja el grid y
   * la galería se achica/agranda. Con min-width: 0 el contenido que
   * no entra hace su propio scroll interno en vez de estirar la pista.
   */
  .act-col--gallery,
  .act-col--info {
    min-width: 0;
  }

  /*
   * Galería: sticky al scroll.
   * top: var(--space-3) → pequeño respiro entre la imagen y el borde superior
   * cuando el navbar (no-sticky) desaparece al scrollear.
   */
  .act-col--gallery {
    position: sticky;
    top: var(--space-5);
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
    padding-inline-end: var(--space-5);
    padding-inline-start: calc(var(--space-5) + 11px);
  }

  .act-section::before {
    inset-inline-start: var(--space-5);
  }

  .act-section--header {
    padding-top: var(--space-4);
    padding-inline-start: var(--space-5);
  }

  /* Título más grande en desktop */
  .act-header__title {
    font-size: 2.25rem;
  }

  /* Skeleton: misma grilla galería izq + info der que .act-layout */
  .act-skeleton {
    max-width: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
    align-items: start;
    padding: var(--space-6) var(--space-5) 0;
  }

  .act-skeleton__gallery {
    position: sticky;
    top: var(--space-5);
    border-radius: var(--border-radius-xl, 1rem);
  }

  .act-skeleton__body {
    padding: var(--space-4) 0 0 var(--space-2);
    border-inline-start: 1px solid var(--divider);
  }
}
</style>
