<script setup lang="ts" generic="T">
interface Props {
  items: T[]
  label: string
  previousLabel: string
  nextLabel: string
  itemKey: (item: T, index: number) => string | number
  itemWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  itemWidth: '80%',
})

defineSlots<{ item(props: { item: T; index: number }): unknown }>()

const SCROLL_RATIO = 0.9
const EDGE_TOLERANCE = 1

const track = ref<HTMLElement | null>(null)
const canScrollPrevious = ref(false)
const canScrollNext = ref(props.items.length > 1)

const updateScrollState = () => {
  const element = track.value
  if (!element) return
  const offset = Math.abs(element.scrollLeft)
  canScrollPrevious.value = offset > EDGE_TOLERANCE
  canScrollNext.value = offset + element.clientWidth < element.scrollWidth - EDGE_TOLERANCE
}

const scrollByPage = (step: 1 | -1) => {
  const element = track.value
  if (!element) return
  const isRtl = element.closest('[dir]')?.getAttribute('dir') === 'rtl'
  const distance = element.clientWidth * SCROLL_RATIO * step * (isRtl ? -1 : 1)
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  element.scrollBy({ left: distance, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
}

const handlePrevious = () => scrollByPage(-1)
const handleNext = () => scrollByPage(1)

useResizeObserver(track, updateScrollState)
onMounted(updateScrollState)
watch(
  () => props.items.length,
  () => nextTick(updateScrollState)
)
</script>

<template>
  <section
    class="ui-carousel"
    :aria-label="label"
    :style="{ '--ui-carousel-item-width': itemWidth }"
  >
    <div class="ui-carousel__controls">
      <button
        type="button"
        class="ui-carousel__control"
        :aria-label="previousLabel"
        :disabled="!canScrollPrevious"
        @click="handlePrevious"
      >
        <UiIcon name="i-hugeicons-arrow-left-01" :size="20" mirror-in-rtl />
      </button>
      <button
        type="button"
        class="ui-carousel__control"
        :aria-label="nextLabel"
        :disabled="!canScrollNext"
        @click="handleNext"
      >
        <UiIcon name="i-hugeicons-arrow-right-01" :size="20" mirror-in-rtl />
      </button>
    </div>
    <ul ref="track" class="ui-carousel__track" @scroll.passive="updateScrollState">
      <li v-for="(item, index) in items" :key="itemKey(item, index)" class="ui-carousel__item">
        <slot name="item" :item="item" :index="index" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ui-carousel {
  position: relative;
}

.ui-carousel__controls {
  display: none;
}

.ui-carousel__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--ui-carousel-item-width);
  gap: 12px;
  margin: 0;
  padding-block: 0;
  padding-inline: var(--mp-gutter);
  list-style: none;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline mandatory;
  scroll-padding-inline: var(--mp-gutter);
  scrollbar-width: none;
}

.ui-carousel__track::-webkit-scrollbar {
  display: none;
}

.ui-carousel__item {
  min-inline-size: 0;
  scroll-snap-align: start;
}

.ui-carousel__control {
  display: grid;
  place-items: center;
  inline-size: var(--mp-tap);
  block-size: var(--mp-tap);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  cursor: pointer;
}

.ui-carousel__control:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.ui-carousel__control:disabled {
  cursor: default;
  opacity: 0.35;
}

@media (min-width: 768px) {
  .ui-carousel__controls {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-block-end: 12px;
    padding-inline: var(--mp-gutter);
  }
}
</style>
