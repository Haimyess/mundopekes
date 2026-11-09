<script setup lang="ts">
export type SkeletonVariant = 'text' | 'block' | 'circle'

interface Props {
  variant?: SkeletonVariant
  width?: string
  height?: string
  lines?: number
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'block',
  width: '100%',
  height: undefined,
  lines: 1,
})

const LAST_LINE_WIDTH = '60%'
const DEFAULT_HEIGHTS: Record<SkeletonVariant, string> = {
  text: '0.875em',
  block: '120px',
  circle: '40px',
}

const resolvedHeight = computed(() => props.height ?? DEFAULT_HEIGHTS[props.variant])
const lineWidths = computed(() =>
  Array.from({ length: Math.max(props.lines, 1) }, (_, index) =>
    props.lines > 1 && index === props.lines - 1 ? LAST_LINE_WIDTH : props.width
  )
)
</script>

<template>
  <span v-if="variant === 'text'" class="ui-skeleton-lines" aria-hidden="true">
    <span
      v-for="(lineWidth, index) in lineWidths"
      :key="index"
      class="ui-skeleton ui-skeleton--text"
      :style="{ inlineSize: lineWidth, blockSize: resolvedHeight }"
    />
  </span>
  <span
    v-else
    class="ui-skeleton"
    :class="`ui-skeleton--${variant}`"
    :style="{
      inlineSize: variant === 'circle' ? resolvedHeight : width,
      blockSize: resolvedHeight,
    }"
    aria-hidden="true"
  />
</template>

<style scoped>
.ui-skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ui-skeleton {
  display: block;
  background: var(--mp-skeleton);
  border-radius: var(--mp-r-photo);
  animation: ui-skeleton-pulse 1.4s ease-in-out infinite;
}

.ui-skeleton--text {
  border-radius: 6px;
}

.ui-skeleton--circle {
  border-radius: var(--mp-r-pill);
}

@keyframes ui-skeleton-pulse {
  50% {
    opacity: 0.55;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-skeleton {
    animation: none;
  }
}
</style>
