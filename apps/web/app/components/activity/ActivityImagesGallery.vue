<script setup lang="ts">
/**
 * ActivityImageGallery
 * - Mobile: carrusel con swipe (VueUse useSwipe) + indicadores línea
 * - Desktop: imagen principal + thumbnails clickeables
 * - Fallback: SharedNoImage si images[] está vacío
 */

interface Props {
  images: string[]
  altText: string
}

const props = defineProps<Props>()

const { isMobile } = useResponsive()

// Índice activo
const activeIndex = ref(0)

const hasImages = computed(() => props.images.length > 0)
const totalImages = computed(() => props.images.length)

// ─── Swipe (mobile) ──────────────────────────────────────────
const carouselEl = ref<HTMLElement | null>(null)

const { isSwiping, direction } = useSwipe(carouselEl, {
  threshold: 50,
  onSwipeEnd() {
    if (direction.value === 'left') goNext()
    if (direction.value === 'right') goPrev()
  },
})

const goNext = () => {
  activeIndex.value = (activeIndex.value + 1) % totalImages.value
}

const goPrev = () => {
  activeIndex.value = (activeIndex.value - 1 + totalImages.value) % totalImages.value
}

const goTo = (index: number) => {
  activeIndex.value = index
}

// ─── Keyboard navigation ─────────────────────────────────────
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e: KeyboardEvent) => {
  if (!hasImages.value) return
  if (e.key === 'ArrowRight') goNext()
  if (e.key === 'ArrowLeft') goPrev()
}
</script>

<template>
  <div class="w-full">
    <!-- ─── FALLBACK: sin imágenes ─────────────────────────── -->
    <div v-if="!hasImages" class="w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
      <SharedNoImage class="w-full h-full" />
    </div>

    <!-- ─── MOBILE: carrusel con swipe ────────────────────── -->
    <template v-else-if="isMobile">
      <div class="relative">
        <!-- Carrusel -->
        <div
          ref="carouselEl"
          class="gallery-mobile-carousel select-none"
          :class="{ 'cursor-grabbing': isSwiping }"
        >
          <div
            class="flex h-full transition-transform duration-300 ease-out will-change-transform"
            :style="{ transform: `translateX(-${activeIndex * 100}%)` }"
          >
            <div
              v-for="(img, index) in images"
              :key="index"
              class="min-w-full h-full flex-shrink-0"
            >
              <img
                :src="img"
                :alt="`${altText} ${index + 1}`"
                class="w-full h-full object-cover"
                :loading="index === 0 ? 'eager' : 'lazy'"
                decoding="async"
              />
            </div>
          </div>
        </div>

        <!-- Indicadores de línea -->
        <div v-if="totalImages > 1" class="flex gap-1.5 justify-center mt-3 px-2">
          <button
            v-for="(_, index) in images"
            :key="index"
            class="h-1 rounded-full transition-all duration-300 focus:outline-none"
            :class="[index === activeIndex ? 'bg-primary-500 flex-[2]' : 'bg-gray-300 flex-1']"
            :aria-label="`Go to image ${index + 1}`"
            @click="goTo(index)"
          />
        </div>
      </div>
    </template>

    <!-- ─── DESKTOP: imagen principal + thumbnails ──────────── -->
    <template v-else>
      <div class="flex flex-col gap-3">
        <!-- Imagen principal -->
        <div class="w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
          <img
            :src="images[activeIndex]"
            :alt="`${altText} ${activeIndex + 1}`"
            class="w-full h-full object-cover transition-opacity duration-200"
            loading="eager"
            decoding="async"
          />
        </div>

        <!-- Thumbnails (solo si hay más de 1) -->
        <div v-if="totalImages > 1" class="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="(img, index) in images"
            :key="index"
            class="flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all duration-150 focus:outline-none"
            :class="[
              index === activeIndex
                ? 'border-primary-500 opacity-100'
                : 'border-transparent opacity-60 hover:opacity-90',
            ]"
            :aria-label="`View image ${index + 1}`"
            @click="goTo(index)"
          >
            <NuxtImg
              :src="img"
              :alt="`${altText} thumbnail ${index + 1}`"
              class="w-full h-full object-cover"
              loading="lazy"
              sizes="80px"
            />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.gallery-mobile-carousel {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 0.75rem;
  position: relative;
  background: var(--color-neutral-100, #f5f5f5);
}

/* El flex-track ocupa exactamente el alto del carrusel */
.gallery-mobile-carousel > div {
  height: 100%;
}

/* Cada slide llena el espacio y centra la imagen */
.gallery-mobile-carousel img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
}
</style>
