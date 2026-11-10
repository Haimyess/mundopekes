<script setup lang="ts">
export interface GalleryImage {
  src: string
  alt: string
  isOptimized?: boolean
}

interface Props {
  images: readonly GalleryImage[]
  label: string
  sizes?: string
}

const props = withDefaults(defineProps<Props>(), {
  sizes: '(min-width: 1200px) 720px, 100vw',
})

const FIRST_INDEX = 0

const hasSeveral = computed(() => props.images.length > 1)
const items = computed(() => [...props.images])
const loadingFor = (index: number) => (index === FIRST_INDEX ? 'eager' : 'lazy')
</script>

<template>
  <div class="ui-gallery">
    <UCarousel
      v-if="images.length"
      v-slot="{ item, index }"
      :aria-label="label"
      :items="items"
      :arrows="hasSeveral"
      :dots="hasSeveral"
      :ui="{
        root: 'ui-gallery__carousel',
        viewport: 'ui-gallery__viewport',
        item: 'ui-gallery__slide',
        controls: 'ui-gallery__controls',
        arrows: 'ui-gallery__arrows',
        prev: 'ui-gallery__prev',
        next: 'ui-gallery__next',
        dots: 'ui-gallery__dots',
        dot: 'ui-gallery__dot',
      }"
    >
      <NuxtImg
        v-if="item.isOptimized !== false"
        :src="item.src"
        :alt="item.alt"
        :sizes="sizes"
        :loading="loadingFor(index)"
        class="ui-gallery__image"
      />
      <img
        v-else
        :src="item.src"
        :alt="item.alt"
        :loading="loadingFor(index)"
        decoding="async"
        class="ui-gallery__image"
      />
    </UCarousel>
    <div v-else class="ui-gallery__placeholder" role="img" :aria-label="label">
      <UiIcon name="i-hugeicons-image-01" :size="40" />
    </div>
  </div>
</template>

<style scoped>
.ui-gallery {
  position: relative;
  overflow: hidden;
  border-radius: var(--mp-r-photo);
  background: var(--mp-skeleton);
}

.ui-gallery__image,
.ui-gallery__placeholder {
  display: block;
  inline-size: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.ui-gallery__placeholder {
  display: grid;
  place-items: center;
  color: var(--mp-text-3);
}

:deep(.ui-gallery__controls) {
  position: absolute;
  inset-block-end: 12px;
  inset-inline: 0;
  display: flex;
  justify-content: center;
}

:deep(.ui-gallery__dots) {
  display: flex;
  inline-size: max-content;
  margin-inline: auto;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--mp-r-pill);
  background: rgb(0 0 0 / 35%);
}

:deep(.ui-gallery__dot) {
  inline-size: 8px;
  block-size: 8px;
  border-radius: var(--mp-r-pill);
  background: rgb(255 255 255 / 55%);
}

:deep(.ui-gallery__dot[data-state='active']),
:deep(.ui-gallery__dot[aria-selected='true']) {
  background: var(--mp-surface);
}

:deep(.ui-gallery__prev),
:deep(.ui-gallery__next) {
  position: absolute;
  inset-block-start: 50%;
  transform: translateY(-50%);
  background: var(--mp-surface);
}

:deep(.ui-gallery__prev) {
  inset-inline-start: 12px;
}

:deep(.ui-gallery__next) {
  inset-inline-end: 12px;
}

@media (min-width: 1200px) {
  .ui-gallery__image,
  .ui-gallery__placeholder {
    aspect-ratio: 16 / 10;
  }
}
</style>
