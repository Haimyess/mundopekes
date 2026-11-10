<script setup lang="ts">
import type { GalleryImage } from '../../../../../layers/ui/components/ui/Gallery.vue'

interface Props {
  images: readonly string[]
  name: string
}

const props = defineProps<Props>()

const PROXIED_IMAGE_PREFIX = '/api/'

const { t } = useI18n()

const galleryImages = computed<GalleryImage[]>(() =>
  props.images.map((src, index) => ({
    src,
    alt: t('detail.photoAlt', { name: props.name, number: index + 1 }),
    isOptimized: !src.startsWith(PROXIED_IMAGE_PREFIX),
  }))
)
</script>

<template>
  <UiGallery :images="galleryImages" :label="t('detail.gallery', { name })" />
</template>
