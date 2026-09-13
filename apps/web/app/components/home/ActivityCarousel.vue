<script setup lang="ts">
import type { Activity } from '~/types'

interface Props {
  title: string
  activities: Activity[]
  loading?: boolean
  emptyMessage?: string
}

const props = defineProps<Props>()

const { isMobile } = useResponsive()

const scrollContainer = ref<HTMLElement | null>(null)

const scrollLeft = () => {
  scrollContainer.value?.scrollBy({ left: -300, behavior: 'smooth' })
}

const scrollRight = () => {
  scrollContainer.value?.scrollBy({ left: 300, behavior: 'smooth' })
}

const isDragging = ref(false)
const hasDragged = ref(false)
const dragStartX = ref(0)
const scrollAtDragStart = ref(0)

const onMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  hasDragged.value = false
  dragStartX.value = e.pageX
  scrollAtDragStart.value = scrollContainer.value?.scrollLeft ?? 0
}

// Escuchar en document para no perder el drag si el mouse sale del carrusel
useEventListener(document, 'mousemove', (e: MouseEvent) => {
  if (!isDragging.value || !scrollContainer.value) return
  e.preventDefault()
  const delta = e.pageX - dragStartX.value
  if (Math.abs(delta) > 5) hasDragged.value = true
  scrollContainer.value.scrollLeft = scrollAtDragStart.value - delta
})

useEventListener(document, 'mouseup', () => {
  isDragging.value = false
})

const onClickCapture = (e: MouseEvent) => {
  if (hasDragged.value) e.stopPropagation()
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

    <!-- Loading — mismo track horizontal que el contenido real (abajo),
         no una grilla vertical, para que el skeleton no "salte" de layout
         apenas llegan los datos. -->
    <div v-if="loading" class="carousel__scroll">
      <div class="carousel__track">
        <div v-for="n in 4" :key="n" class="carousel__skeleton-item" />
      </div>
    </div>

    <!-- Activities -->
    <div
      v-else-if="activities.length > 0"
      ref="scrollContainer"
      class="carousel__scroll"
      :class="{ 'is-dragging': isDragging }"
      @mousedown="onMouseDown"
      @click.capture="onClickCapture"
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
      <p class="carousel__empty-text">{{ props.emptyMessage ?? $t('common.no_results') }}</p>
    </div>
  </section>
</template>

<style scoped>
/* ── Section ─────────────────────────────────────────────────── */
/* .carousel {
  padding: var(--space-8) 0;
} */

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
/* Silueta aproximada de SharedActivityCard (imagen 16:9 + body) — mismo
   ancho de columna que el track real (ver .carousel__track), así el
   skeleton no cambia de layout al llegar los datos. */
.carousel__skeleton-item {
  aspect-ratio: 4 / 3;
  background-color: var(--color-neutral-200);
  border-radius: var(--border-radius-lg);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ── Scroll container ────────────────────────────────────────── */
.carousel__scroll {
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  cursor: grab;
  user-select: none;
}

.carousel__scroll::-webkit-scrollbar {
  display: none;
}

.carousel__scroll.is-dragging {
  cursor: grabbing;
}

.carousel__track {
  display: grid;
  grid-auto-flow: column;
  gap: var(--space-3);
  grid-auto-columns: calc(100% / 1.5);
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

/* ── Responsive ──────────────────────────────────────────────── */
@media (min-width: 768px) {
  .carousel__title {
    font-size: var(--font-size-3xl);
  }

  .carousel__track {
    gap: var(--space-3);
    grid-auto-columns: calc(100% / 2.5);
  }
}

@media (min-width: 1024px) {
  .carousel__track {
    gap: var(--space-4);
    grid-auto-columns: calc(25% - var(--space-3));
  }
}
</style>
