<script setup lang="ts">
import type { Activity } from '~/types'

interface Props {
  activity: Activity
  variant?: 'compact' | 'detailed'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'compact'
})

const { t } = useI18n()

// images: primero las de la actividad, fallback a las del place
const imageUrl = computed(() =>
  props.activity?.images?.[0] ?? props.activity?.place?.images?.[0] ?? null
)

const showBadges = computed(() => {
  if (!props.activity) return []

  const badges = []

  if (props.activity.is_free)
    badges.push({ label: t('activity.free'), variant: 'success' as const })

  if (props.activity.stroller_friendly)
    badges.push({ label: t('activity.stroller_friendly'), variant: 'info' as const })

  return badges.slice(0, props.variant === 'compact' ? 2 : 4)
})

// location: viene de place → city (join en Supabase)
const cityName = computed(() => props.activity?.place?.city?.name ?? null)

// tipo/categoría: viene del join con categories
const categoryName = computed(() => props.activity?.category?.name ?? null)

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
          :alt="activity.title"
          class="activity-card__image"
          loading="lazy"
        />
        <SharedNoImage v-else />
      </div>

      <!-- Contenido -->
      <div class="activity-card__body">

        <!-- title (antes: activity.name) -->
        <h3 class="activity-card__title">{{ activity.title }}</h3>

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

        <p
          v-if="variant === 'detailed' && activity.description"
          class="activity-card__description"
        >
          {{ activity.description }}
        </p>

        <div class="activity-card__badges">
          <UiBadge
            v-for="(badge, index) in showBadges"
            :key="index"
            :variant="badge.variant"
            size="sm"
          >
            {{ badge.label }}
          </UiBadge>
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
  transition: box-shadow var(--transition-slow), transform var(--transition-slow);
}

.activity-card :deep(.rounded-lg) {
  border: none;
  box-shadow: none;
}

.activity-card:hover .activity-card__card {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
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
  transform: scale(1.05);
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

/* ── Badges ──────────────────────────────────────────────────── */
.activity-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

/* ══ VARIANT COMPACT en mobile: layout horizontal ══════════════ */
.activity-card--compact .activity-card__card {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.activity-card--compact .activity-card__image-wrap {
  width: 7rem;
  aspect-ratio: 1 / 1;
  border-radius: var(--border-radius-lg) 0 0 var(--border-radius-lg);
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

/* En desktop, compact vuelve al layout vertical normal */
@media (min-width: 768px) {
  .activity-card--compact .activity-card__card {
    flex-direction: column;
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