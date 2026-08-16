<script setup lang="ts">
import type { Activity } from '~/types'

interface Props {
  activity: Activity
  variant?: 'compact' | 'detailed'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'compact',
})

const { t } = useI18n()
const { tc } = useI18nContent()

// images: primero las de la actividad, fallback a las del place
const imageUrl = computed(
  () => props.activity?.images?.[0] ?? props.activity?.place?.images?.[0] ?? null
)

const showBadges = computed(() => {
  if (!props.activity) return []

  const badges = []

  if (props.activity.is_free) badges.push(t('activity.free'))

  if (props.activity.stroller_friendly) badges.push(t('activity.stroller_friendly'))

  return badges.slice(0, props.variant === 'compact' ? 2 : 4)
})

// Descripción: visible por defecto en variant detailed, ocultable por el usuario
const showDescription = ref(true)

// location: viene de place → city (join en Supabase)
const cityName = computed(() => props.activity?.place?.city?.name ?? null)

// tipo/categoría: viene del join con categories
const categoryName = computed(() =>
  props.activity?.category ? tc(props.activity.category.name_i18n) : null
)

const hasMeta = computed(() => !!(cityName.value || categoryName.value))
</script>

<template>
  <NuxtLink
    :to="`/activity/${activity.id}`"
    class="activity-card"
    :class="`activity-card--${variant}`"
  >
    <UiCard class="activity-card__card">
      <!-- Imagen -->
      <div class="activity-card__image-wrap">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="tc(activity.title_i18n)"
          class="activity-card__image"
          loading="lazy"
        />
        <SharedNoImage v-else />
      </div>

      <!-- Contenido -->
      <div class="activity-card__body">
        <!-- title (antes: activity.name) -->
        <h3 class="activity-card__title">{{ tc(activity.title_i18n) }}</h3>

        <!-- ciudad + categoría (antes: location.city + type[0]) -->
        <div class="activity-card__meta">
          <template v-if="hasMeta">
            <UiIcon name="i-heroicons-map-pin" size="sm" />
            <span v-if="cityName">{{ cityName }}</span>
            <template v-if="cityName && categoryName">
              <span class="activity-card__dot">•</span>
            </template>
            <span v-if="categoryName">{{ categoryName }}</span>
          </template>
        </div>

        <template v-if="variant === 'detailed' && tc(activity.description_i18n ?? {})">
          <p v-if="showDescription" class="activity-card__description">
            {{ tc(activity.description_i18n ?? {}) }}
          </p>
          <button
            type="button"
            class="activity-card__desc-toggle"
            @click.stop.prevent="showDescription = !showDescription"
          >
            {{ showDescription ? t('activity.hide_description') : t('activity.show_description') }}
          </button>
        </template>

        <div v-if="showBadges.length" class="activity-card__badges">
          <span v-for="badge in showBadges" :key="badge" class="activity-card__badge">
            {{ badge }}
          </span>
        </div>
      </div>
    </UiCard>
  </NuxtLink>
</template>

<style scoped>
/* ── Link wrapper ────────────────────────────────────────────── */
.activity-card {
  display: block;
}

/* ── Card ────────────────────────────────────────────────────── */
.activity-card__card {
  height: 100%;
  transition:
    box-shadow var(--transition-slow),
    transform var(--transition-slow);
}

.activity-card :deep(.rounded-lg) {
  border: none;
  box-shadow: none;
}

.activity-card:hover .activity-card__card {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* ── Imagen ──────────────────────────────────────────────────── */
.activity-card__image-wrap {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  background-color: var(--color-neutral-100);
  flex-shrink: 0;
}

.activity-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.activity-card:hover .activity-card__image {
  transform: scale(1.03);
}

/* ── Body ────────────────────────────────────────────────────── */
.activity-card__body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* ── Título ──────────────────────────────────────────────────── */
.activity-card__title {
  font-family: var(--font-family-display);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

/* ── Meta ────────────────────────────────────────────────────── */
.activity-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-height: 1.25rem;
}

.activity-card__dot {
  color: var(--color-neutral-400);
}

/* ── Descripción ─────────────────────────────────────────────── */
.activity-card__description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.activity-card__desc-toggle {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  margin-top: calc(-1 * var(--space-1));
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent-600);
  cursor: pointer;
}

.activity-card__desc-toggle:hover {
  text-decoration: underline;
}

/* ── Badges — chips minimalistas con el color de acento ───────── */
.activity-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5, 0.375rem);
  margin-top: var(--space-1);
}

.activity-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem var(--space-2-5, 0.625rem);
  border-radius: 9999px;
  background: var(--color-accent-50);
  color: var(--color-accent-700);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
  white-space: nowrap;
}

/* ══ VARIANT COMPACT en mobile: layout horizontal ══════════════ */

/* Apuntamos al body-wrapper interno de UCard (primer div hijo del root) */
.activity-card--compact :deep(.activity-card__card > div:first-child) {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding: 0;
  gap: 0;
}

.activity-card--compact .activity-card__image-wrap {
  width: 7rem;
  aspect-ratio: 1 / 1;
  border-radius: var(--border-radius-lg) 0 0 var(--border-radius-lg);
  flex-shrink: 0;
}

.activity-card--compact .activity-card__body {
  padding: var(--space-3);
  gap: var(--space-1);
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.activity-card--compact .activity-card__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.activity-card--compact .activity-card__meta {
  font-size: var(--font-size-xs);
}

.activity-card--compact .activity-card__badges {
  margin-top: 0;
}

/* En tablet/desktop (≥768px): compact vuelve al layout vertical normal */
@media (min-width: 768px) {
  .activity-card--compact :deep(.activity-card__card > div:first-child) {
    flex-direction: column;
    padding: 0;
  }

  .activity-card--compact .activity-card__image-wrap {
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  }

  .activity-card--compact .activity-card__title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  .activity-card--compact .activity-card__meta {
    font-size: var(--font-size-sm);
  }

  .activity-card--compact .activity-card__body {
    padding: var(--space-4);
    gap: var(--space-2);
  }
}
</style>
