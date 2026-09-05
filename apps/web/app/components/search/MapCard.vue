<script setup lang="ts">
/**
 * Card del carousel flotante del mapa full-bleed (PWA Explore, Fase 3).
 * Bespoke en vez de reutilizar SharedActivityCard: ese componente trae su
 * propio hover/shadow (pensado para grillas normales) que no se podía
 * apagar de forma confiable desde afuera vía CSS override — acá se
 * controla el 100% del estilo, sin pelear cascada con nada compartido.
 * Reutiliza sí useActivityBadges (misma fuente que ActivityCard) para el
 * badge de "Gratis", y calculateDistance (mismo helper que "Cerca de mí"
 * en search.vue) para el badge de distancia — ninguno de los dos
 * duplica lógica, solo cambia dónde se muestran: como chips flotando
 * sobre la imagen (igual que el precio en la referencia de diseño), no
 * debajo del título.
 */
import { calculateDistance } from '~/utils/helpers'
import type { Activity } from '~/types'

interface Props {
  activity: Activity
  /** "Cerca de mí" (search.vue) — si está presente, se muestra la
   * distancia como badge sobre la imagen. */
  userCoords?: { lat: number; lng: number } | null
}

const props = withDefaults(defineProps<Props>(), { userCoords: null })

const { t } = useI18n()
const { tc } = useI18nContent()

const imageUrl = computed(
  () => props.activity?.images?.[0] ?? props.activity?.place?.images?.[0] ?? null
)

// Solo "Gratis" — el resto de los badges de ActivityCard (cochecito,
// fines de semana, etc.) suman ruido en una card tan chica.
const isFree = computed(() => useActivityBadges(props.activity).includes('is_free'))

const distanceLabel = computed(() => {
  if (!props.userCoords) return null
  const lat = props.activity?.place?.lat
  const lng = props.activity?.place?.lng
  if (lat == null || lng == null) return null
  const km = calculateDistance(props.userCoords.lat, props.userCoords.lng, Number(lat), Number(lng))
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`
})

const cityName = computed(() => props.activity?.place?.city?.name ?? null)
</script>

<template>
  <NuxtLink :to="`/activity/${activity.id}`" class="map-card">
    <div class="map-card__image-wrap">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="tc(activity.title_i18n)"
        class="map-card__image"
        loading="lazy"
      />
      <SharedNoImage v-else />

      <span v-if="isFree" class="map-card__badge map-card__badge--free">
        {{ t('activity.free') }}
      </span>
      <span v-if="distanceLabel" class="map-card__badge map-card__badge--distance">
        {{ distanceLabel }}
      </span>
    </div>

    <div class="map-card__body">
      <h3 class="map-card__title">{{ tc(activity.title_i18n) }}</h3>
      <p v-if="cityName" class="map-card__address">
        <UIcon name="i-heroicons-map-pin" class="map-card__address-icon" />
        {{ cityName }}
      </p>
    </div>
  </NuxtLink>
</template>

<style scoped>
/* Sin hover, sin shadow, sin border — nada que pelear con nada compartido. */
.map-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  background: var(--color-bg-primary);
}

/* Altura fija (no aspect-ratio): cuando la card focused crece en ancho
   (ver .search-map__carousel-item--focused en MapView.vue) no queremos
   que la imagen crezca en alto también — eso movería la card hacia
   arriba/abajo. Con altura fija, crecer en ancho solo muestra un poco
   más de imagen a los costados (object-fit: cover ya lo maneja), la card
   se mueve únicamente hacia los lados. */
.map-card__image-wrap {
  position: relative;
  width: 100%;
  height: 5.9rem;
  background: var(--color-neutral-100);
}

.map-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.map-card__badge {
  position: absolute;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-accent-700);
  font-size: 0.625rem;
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.map-card__badge--free {
  inset-inline-start: 6px;
  bottom: 6px;
}

.map-card__badge--distance {
  inset-inline-end: 6px;
  top: 6px;
  color: var(--color-text-secondary);
}

/* Fondo blanco propio (antes transparente, el título/dirección quedaban
   flotando directo sobre el mapa) + min-height fijo: garantiza que todas
   las cards del carousel midan lo mismo aunque a alguna le falte la
   dirección. */
.map-card__body {
  padding: 6px 8px 8px;
  min-height: 2.75rem;
  background: var(--color-bg-primary);
}

.map-card__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.map-card__address {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 2px 0 0;
  font-size: 0.6875rem;
  color: var(--color-text-tertiary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.map-card__address-icon {
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
}
</style>
