<script setup lang="ts">
export type MediaAspectRatio = '1/1' | '4/3' | '3/2' | '16/9'

interface Props {
  title: string
  to?: string
  imageSrc?: string | null
  imageAlt?: string
  imageSizes?: string
  isImageOptimized?: boolean
  aspectRatio?: MediaAspectRatio
  headingLevel?: 2 | 3 | 4
  isEager?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  to: undefined,
  imageSrc: null,
  imageAlt: undefined,
  imageSizes: '(min-width: 1200px) 25vw, (min-width: 768px) 40vw, 80vw',
  isImageOptimized: true,
  aspectRatio: '4/3',
  headingLevel: 3,
  isEager: false,
})

const headingTag = computed(() => `h${props.headingLevel}`)
const resolvedAlt = computed(() => props.imageAlt ?? props.title)
</script>

<template>
  <article class="ui-media-card" :class="{ 'ui-media-card--linked': !!to }">
    <div class="ui-media-card__media" :style="{ aspectRatio }">
      <NuxtImg
        v-if="imageSrc && isImageOptimized"
        :src="imageSrc"
        :alt="resolvedAlt"
        :sizes="imageSizes"
        :loading="isEager ? 'eager' : 'lazy'"
        class="ui-media-card__image"
      />
      <img
        v-else-if="imageSrc"
        :src="imageSrc"
        :alt="resolvedAlt"
        :loading="isEager ? 'eager' : 'lazy'"
        decoding="async"
        class="ui-media-card__image"
      />
      <div v-else class="ui-media-card__placeholder">
        <UiIcon name="i-hugeicons-image-01" :size="32" />
      </div>
      <div v-if="$slots.badge" class="ui-media-card__badge">
        <slot name="badge" />
      </div>
      <div v-if="$slots.action" class="ui-media-card__action">
        <slot name="action" />
      </div>
    </div>
    <div class="ui-media-card__body">
      <component :is="headingTag" class="ui-media-card__title">
        <NuxtLink v-if="to" :to="to" class="ui-media-card__link">{{ title }}</NuxtLink>
        <template v-else>{{ title }}</template>
      </component>
      <slot />
    </div>
  </article>
</template>

<style scoped>
.ui-media-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-inline-size: 0;
}

.ui-media-card__media {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--mp-border-soft);
  border-radius: var(--mp-r-card);
  background: var(--mp-surface);
}

.ui-media-card__image {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.ui-media-card__placeholder {
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 100%;
  color: var(--mp-text-3);
}

.ui-media-card__badge {
  position: absolute;
  inset-block-start: 10px;
  inset-inline-start: 10px;
  pointer-events: none;
}

.ui-media-card__action {
  position: absolute;
  z-index: 1;
  inset-block-start: 6px;
  inset-inline-end: 6px;
}

.ui-media-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ui-media-card__title {
  margin: 0;
  color: var(--mp-ink);
  font-family: var(--mp-font);
  font-size: var(--mp-fs-card-title);
  font-weight: var(--mp-fw-bold);
  letter-spacing: var(--mp-ls-card-title);
  line-height: 1.25;
}

.ui-media-card__link {
  color: inherit;
  text-decoration: none;
}

.ui-media-card__link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--mp-r-card);
}

.ui-media-card__link:focus-visible {
  outline: none;
}

.ui-media-card__link:focus-visible::after {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}
</style>
