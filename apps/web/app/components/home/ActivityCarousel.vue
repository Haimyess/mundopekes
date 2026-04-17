<script setup lang="ts">
import type { Activity } from '~/types'

interface Props {
  title: string
  activities: Activity[]
  loading?: boolean
}

defineProps<Props>()

const { isMobile } = useResponsive()

const scrollContainer = ref<HTMLElement | null>(null)

const scrollLeft = () => {
  scrollContainer.value?.scrollBy({ left: -300, behavior: 'smooth' })
}

const scrollRight = () => {
  scrollContainer.value?.scrollBy({ left: 300, behavior: 'smooth' })
}
</script>

<template>
  <section class="carousel">

    <!-- Header -->
    <div class="carousel__header">
      <h2 class="carousel__title">{{ title }}</h2>

      <!-- Flechas desktop -->
      <div v-if="!isMobile && activities.length > 4" class="carousel__nav">
        <UiButton
          variant="ghost"
          icon="i-heroicons-chevron-left"
          aria-label="Anterior"
          @click="scrollLeft"
        />
        <UiButton
          variant="ghost"
          icon="i-heroicons-chevron-right"
          aria-label="Siguiente"
          @click="scrollRight"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="carousel__skeleton">
      <div v-for="n in 4" :key="n" class="carousel__skeleton-item" />
    </div>

    <!-- Activities -->
    <div
      v-else-if="activities.length > 0"
      ref="scrollContainer"
      class="carousel__scroll"
    >
      <div class="carousel__track">
        <SharedActivityCard
          v-for="activity in activities"
          :key="activity.id"
          :activity="activity"
          :variant="isMobile ? 'detailed' : 'compact'"
        />
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="carousel__empty">
      <UiIcon name="i-heroicons-face-frown" size="xl" class="carousel__empty-icon" />
      <p class="carousel__empty-text">{{ $t('common.no_results') }}</p>
    </div>

  </section>
</template>

<style scoped>
/* ── Section ─────────────────────────────────────────────────── */
.carousel {
  padding: var(--space-8) 0;
}

/* ── Header ──────────────────────────────────────────────────── */
.carousel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.carousel__title {
  font-family: var(--font-family-display);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.carousel__nav {
  display: flex;
  gap: var(--space-2);
}

/* ── Skeleton ────────────────────────────────────────────────── */
.carousel__skeleton {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}

.carousel__skeleton-item {
  height: 20rem;
  background-color: var(--color-neutral-200);
  border-radius: var(--border-radius-lg);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

/* ── Scroll container ────────────────────────────────────────── */
.carousel__scroll {
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.carousel__scroll::-webkit-scrollbar {
  display: none;
}

.carousel__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  gap: var(--space-6);
}

/* ── Empty state ─────────────────────────────────────────────── */
.carousel__empty {
  text-align: center;
  padding: var(--space-12) 0;
}

.carousel__empty-icon {
  color: var(--color-neutral-400);
  margin: 0 auto var(--space-4);
}

.carousel__empty-text {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-base);
}

/* ── Scroll container ────────────────────────────────────────── */
.carousel__scroll {
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.carousel__scroll::-webkit-scrollbar {
  display: none;
}

/* ── Track ───────────────────────────────────────────────────── */
.carousel__track {
  display: grid;
  grid-auto-flow: column;
  gap: var(--space-0);
  grid-auto-columns: calc(100% / 1.5);
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (min-width: 768px) {
  .carousel__title {
    font-size: var(--font-size-3xl);
  }

  .carousel__skeleton {
    grid-template-columns: repeat(2, 1fr);
  }

  .carousel__track {
    grid-auto-columns: calc(100% / 2.5);
  }
}

@media (min-width: 1024px) {
  .carousel__skeleton {
    grid-template-columns: repeat(4, 1fr);
  }

  .carousel__track {
    grid-auto-columns: calc(25% - var(--space-3));
  }
}
</style>