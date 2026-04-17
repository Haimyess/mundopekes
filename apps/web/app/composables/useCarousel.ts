/**
 * Composable para navegación de carruseles
 * Con soporte para swipe en móvil
 */

import { useSwipe } from '@vueuse/core'

export const useCarousel = (itemsCount: number) => {
  const carouselRef = ref<HTMLElement>()
  const currentIndex = ref(0)
  const isAnimating = ref(false)

  // Swipe gestures para móvil
  const { direction, lengthX } = useSwipe(carouselRef, {
    threshold: 50,
    onSwipeEnd() {
      if (lengthX.value > 50) {
        if (direction.value === 'left') {
          next()
        } else if (direction.value === 'right') {
          prev()
        }
      }
    }
  })

  /**
   * Siguiente slide
   */
  const next = () => {
    if (isAnimating.value || itemsCount === 0) return
    
    isAnimating.value = true
    currentIndex.value = (currentIndex.value + 1) % itemsCount
    
    setTimeout(() => {
      isAnimating.value = false
    }, 300)
  }

  /**
   * Slide anterior
   */
  const prev = () => {
    if (isAnimating.value || itemsCount === 0) return
    
    isAnimating.value = true
    currentIndex.value = currentIndex.value === 0 
      ? itemsCount - 1 
      : currentIndex.value - 1
    
    setTimeout(() => {
      isAnimating.value = false
    }, 300)
  }

  /**
   * Ir a un slide específico
   */
  const goTo = (index: number) => {
    if (isAnimating.value || index === currentIndex.value || index >= itemsCount) return
    
    isAnimating.value = true
    currentIndex.value = index
    
    setTimeout(() => {
      isAnimating.value = false
    }, 300)
  }

  /**
   * Autoplay con intervalo
   */
  const startAutoplay = (intervalMs: number = 5000) => {
    const interval = setInterval(() => {
      next()
    }, intervalMs)

    // Retornar función para detener
    return () => clearInterval(interval)
  }

  /**
   * Si puede ir a siguiente
   */
  const canGoNext = computed(() => itemsCount > 0)

  /**
   * Si puede ir a anterior
   */
  const canGoPrev = computed(() => itemsCount > 0)

  return {
    carouselRef,
    currentIndex: readonly(currentIndex),
    isAnimating: readonly(isAnimating),
    canGoNext,
    canGoPrev,
    next,
    prev,
    goTo,
    startAutoplay
  }
}
