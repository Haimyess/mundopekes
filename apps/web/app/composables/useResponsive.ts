/**
 * Composable para manejo de responsiveness
 * Usa VueUse para detectar tamaños de pantalla
 */

export const useResponsive = () => {
  // VueUse composables
  const { width, height } = useWindowSize()

  // Breakpoints basados en Tailwind
  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  }

  const isMobile = computed(() => width.value < breakpoints.md)
  const isTablet = computed(() => width.value >= breakpoints.md && width.value < breakpoints.lg)
  const isDesktop = computed(() => width.value >= breakpoints.lg)
  const isLargeDesktop = computed(() => width.value >= breakpoints.xl)

  // Orientación
  const isPortrait = computed(() => height.value > width.value)
  const isLandscape = computed(() => width.value > height.value)

  return {
    // Dimensiones
    width,
    height,
    
    // Breakpoints
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    
    // Orientación
    isPortrait,
    isLandscape,
    
    // Helpers
    breakpoints
  }
}