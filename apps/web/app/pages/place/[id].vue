<script setup lang="ts">
/**
 * pages/place/[id].vue
 * Place Page — hub público de un lugar: información general + práctica
 * (teléfono/web/horario vía Google Details, igual que antes vivía en
 * activity/[id].vue) + el grid de todas las experiencias/actividades
 * disponibles en ese lugar ("¿Qué se puede hacer acá?").
 */

const route = useRoute()
const { t, locale } = useI18n()
const { tc } = useI18nContent()
const { getPlaceById } = usePlaces()
const { getActivitiesByPlaceId } = useActivities()

const id = computed(() => route.params.id as string)

// ─── Fetch: place + sus actividades ────────────────────────────
// Non-blocking on purpose: apps/web runs ssr:false, so an `await` here would
// stall Vue Router and stop the skeleton below from ever painting on a
// client-side navigation. Not-found is handled reactively once resolved.
const { data: place, status } = useAsyncData(`place-${id.value}`, () => getPlaceById(id.value))

watch(status, (s) => {
  if (s === 'success' && !place.value) {
    showError(createError({ statusCode: 404, statusMessage: 'Place not found', fatal: true }))
  }
})

const { data: activitiesData } = useAsyncData(`place-activities-${id.value}`, () =>
  getActivitiesByPlaceId(id.value)
)
const activities = computed(() => activitiesData.value ?? [])

// ─── Datos prácticos vía Google Details (movido acá desde la Experience Page) ──
const googlePlaceId = computed(() => place.value?.google_place_id ?? null)

const { data: placeDetails } = useAsyncData(
  () => `place-google-details-${googlePlaceId.value}`,
  () =>
    googlePlaceId.value
      ? $fetch<{
          phone: string | null
          website: string | null
          google_url: string | null
          opening_hours: { weekday_text: string[]; open_now: boolean | null } | null
          wheelchair_accessible: boolean | null
          photos: string[]
        }>(`/api/places/details?place_id=${googlePlaceId.value}&lang=${locale.value}`)
      : null,
  { server: false, watch: [googlePlaceId] }
)

// ─── Horarios ─────────────────────────────────────────────────
// weekday_text viene de Google ya traducido al locale actual, formato
// "<Día>: <horario>". Google siempre lo devuelve en orden lunes→domingo,
// independientemente del locale — por eso el mapeo a isToday rota
// Date.getDay() (domingo=0) al índice lunes-primero.
const scheduleRows = computed(() => {
  const lines = placeDetails.value?.opening_hours?.weekday_text
  if (!lines?.length) return null
  const todayMondayFirst = (new Date().getDay() + 6) % 7
  return lines.map((line, i) => {
    const sep = line.indexOf(': ')
    const label = sep === -1 ? line : line.slice(0, sep)
    const hours = sep === -1 ? '' : line.slice(sep + 2)
    return {
      key: i,
      label,
      // Heurística agnóstica de idioma: un horario real siempre trae dígitos
      // (p.ej. "9:00 AM – 6:00 PM"); "Closed"/"Cerrado"/"סגור" no. Evita
      // hardcodear la palabra "cerrado" traducida por Google en cada locale.
      hours,
      open: /\d/.test(hours),
      isToday: i === todayMondayFirst,
    }
  })
})

// ─── Textos ───────────────────────────────────────────────────
const placeName = computed(() => (place.value ? tc(place.value.name_i18n) : ''))
const description = computed(() => {
  const p = place.value
  if (!p?.description_i18n) return null
  return Object.keys(p.description_i18n).length ? tc(p.description_i18n) : null
})
const cityName = computed(() => place.value?.city?.name ?? null)

const images = computed(() => (place.value?.images ?? []).filter(Boolean))

// ─── Navegación ───────────────────────────────────────────────
const lat = computed(() => place.value?.lat)
const lng = computed(() => place.value?.lng)

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
  title: () => (place.value ? `${placeName.value} · MundoPekes` : 'MundoPekes'),
  description: () => description.value ?? '',
  ogImage: () => images.value[0] ?? '',
})
</script>

<template>
  <div>
    <div v-if="status === 'pending'" class="place-skeleton">
      <div class="place-skeleton__gallery" />
      <div class="place-skeleton__body">
        <div class="place-skeleton__line place-skeleton__line--title" />
        <div class="place-skeleton__line place-skeleton__line--sub" />
        <div class="place-skeleton__row" />
        <div class="place-skeleton__row" />
        <div class="place-skeleton__row" />
      </div>
    </div>

    <div v-else-if="place" class="place-page">
      <div class="place-top-row">
        <button class="place-back-btn" @click="$router.back()">
          <UIcon name="i-heroicons-arrow-left" class="place-back-btn__icon icon--directional" />
          {{ t('common.back') }}
        </button>
      </div>

      <div class="place-layout">
        <div class="place-col place-col--gallery">
          <ActivityImagesGallery :images="images" :alt-text="placeName" />
        </div>

        <div class="place-col place-col--info">
          <div class="place-section place-section--header">
            <h1 class="place-header__title">{{ placeName }}</h1>
            <div v-if="cityName" class="place-header__location">
              <UIcon name="i-heroicons-map-pin" class="place-header__location-icon" />
              <span>{{ cityName }}</span>
            </div>
          </div>

          <!-- ── Sobre este lugar ─────────────────────────── -->
          <div v-if="description" class="place-section">
            <span class="place-section__heading">{{ t('place.about') }}</span>
            <ActivityInfoDescription :description="description" />
          </div>

          <!-- ── Qué se puede hacer acá ───────────────────── -->
          <div class="place-section">
            <span class="place-section__heading">{{ t('place.what_to_do') }}</span>
            <div v-if="activities.length" class="place-activities-list">
              <PlaceActivityRow
                v-for="activity in activities"
                :key="activity.id"
                :activity="activity"
              />
            </div>
            <p v-else class="place-no-activities">{{ t('place.no_activities') }}</p>
          </div>

          <!-- ── Información práctica (Google Details) ────── -->
          <div
            v-if="mapsUrl || wazeUrl || placeDetails?.phone || placeDetails?.website"
            class="place-section"
          >
            <span class="place-section__heading">{{ t('place.practical_info') }}</span>
            <div class="place-tools__nav-row">
              <a
                v-if="mapsUrl"
                :href="mapsUrl"
                target="_blank"
                rel="noopener"
                class="place-tools__btn place-tools__btn--maps"
              >
                <UIcon name="i-heroicons-map-pin" class="place-tools__btn-icon" />
                Google Maps
              </a>
              <a
                v-if="wazeUrl"
                :href="wazeUrl"
                target="_blank"
                rel="noopener"
                class="place-tools__btn place-tools__btn--waze"
              >
                <UIcon name="i-heroicons-arrow-turn-up-right" class="place-tools__btn-icon" />
                Waze
              </a>
            </div>
            <a
              v-if="placeDetails?.phone"
              :href="`tel:${placeDetails.phone}`"
              class="place-tools__btn place-tools__btn--phone"
            >
              <UIcon name="i-heroicons-phone" class="place-tools__btn-icon" />
              {{ placeDetails.phone }}
            </a>
            <div v-if="placeDetails?.website" class="place-info-row">
              <UIcon name="i-heroicons-globe-alt" class="place-info-row__icon" />
              <a :href="placeDetails.website" target="_blank" rel="noopener">
                {{ stripDomain(placeDetails.website) }}
              </a>
            </div>
            <div v-if="placeDetails?.wheelchair_accessible" class="place-info-row">
              <UIcon name="i-heroicons-user" class="place-info-row__icon" />
              <span>{{ t('activity.wheelchair') }}</span>
            </div>
          </div>

          <!-- ── Horarios ──────────────────────────────────── -->
          <div v-if="scheduleRows" class="place-section">
            <span class="place-section__heading">{{ t('activity.hours') }}</span>
            <SharedScheduleTable
              :rows="scheduleRows"
              :open-now="placeDetails?.opening_hours?.open_now ?? null"
            />
          </div>

          <!-- ── Mapa ──────────────────────────────────────── -->
          <div class="place-section">
            <span class="place-section__heading">{{ t('activity.location') }}</span>
            <ActivityInfoLocation :place="place" hide-actions />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.place-page {
  max-width: 900px;
  margin-inline: auto;
  padding-top: var(--space-4);
}

.place-top-row {
  padding: var(--space-2) var(--space-3);
}

.place-back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.place-back-btn__icon {
  width: 1rem;
  height: 1rem;
}

.place-layout {
  display: flex;
  flex-direction: column;
}

.place-col--gallery {
  width: 100%;
  padding-top: var(--space-2);
}

.place-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3);
  border-top: 1px solid var(--color-neutral-200, #e5e5e5);
}

.place-section--header {
  border-top: none;
  padding-top: var(--space-3);
}

.place-section__heading {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.place-header__title {
  font-size: 1.875rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: 1.2;
  margin: 0 0 var(--space-2);
}

.place-header__location {
  display: flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.place-header__location-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: var(--color-secondary-600, #16a34a);
}

.place-activities-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.place-no-activities {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.place-tools__nav-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.place-tools__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2-5, 0.625rem) var(--space-3);
  border-radius: var(--border-radius-lg, 0.75rem);
  text-decoration: none;
  border: 1.5px solid var(--color-neutral-200, #e5e5e5);
  min-height: 2.5rem;
}

.place-tools__btn--maps {
  background: var(--color-secondary-600, #16a34a);
  color: #fff;
  border-color: transparent;
}

.place-tools__btn--waze,
.place-tools__btn--phone {
  background: #fff;
  color: var(--color-text-primary);
}

.place-tools__btn--phone {
  width: 100%;
}

.place-tools__btn-icon {
  width: 1rem;
  height: 1rem;
}

.place-info-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.place-info-row a {
  color: var(--color-secondary-600, #16a34a);
}

.place-info-row__icon {
  width: 1rem;
  height: 1rem;
  color: var(--color-secondary-600, #16a34a);
}

.place-skeleton {
  max-width: 900px;
  margin-inline: auto;
}

.place-skeleton__gallery {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--color-neutral-200);
  animation: place-pulse 1.5s ease-in-out infinite;
}

.place-skeleton__body {
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.place-skeleton__line {
  background: var(--color-neutral-200);
  border-radius: 0.5rem;
  height: 1.5rem;
  animation: place-pulse 1.5s ease-in-out infinite;
}

.place-skeleton__line--title {
  width: 60%;
}

.place-skeleton__line--sub {
  width: 40%;
}

/* Filas con la forma de PlaceActivityRow (apps/web/app/components/place/PlaceActivityRow.vue) */
.place-skeleton__row {
  height: 6rem;
  border-radius: var(--border-radius-lg, 0.75rem);
  background: var(--color-neutral-200);
  animation: place-pulse 1.5s ease-in-out infinite;
}

@keyframes place-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@media (min-width: 768px) {
  .place-page {
    max-width: 1100px;
  }

  .place-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
    align-items: start;
  }

  .place-col--gallery {
    position: sticky;
    top: var(--space-5);
  }

  .place-col--info {
    border-inline-start: 1px solid var(--color-neutral-200, #e5e5e5);
    padding-inline-start: var(--space-2);
  }

  /* Skeleton: misma grilla galería izq + info der que .place-layout */
  .place-skeleton {
    max-width: 1100px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
    align-items: start;
    padding: var(--space-6) var(--space-5) 0;
  }

  .place-skeleton__gallery {
    position: sticky;
    top: var(--space-5);
    border-radius: var(--border-radius-xl, 1rem);
  }

  .place-skeleton__body {
    padding: var(--space-4) 0 0 var(--space-2);
    border-inline-start: 1px solid var(--color-neutral-200, #e5e5e5);
  }
}
</style>
