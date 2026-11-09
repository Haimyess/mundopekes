export const RESPONSIVE_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export const MOBILE_FIRST_WIDTH = 375
export const MOBILE_FIRST_HEIGHT = 812

export function useResponsive() {
  const isMounted = useMounted()
  const windowSize = useWindowSize()

  const width = computed(() => (isMounted.value ? windowSize.width.value : MOBILE_FIRST_WIDTH))
  const height = computed(() => (isMounted.value ? windowSize.height.value : MOBILE_FIRST_HEIGHT))

  const isMobile = computed(() => width.value < RESPONSIVE_BREAKPOINTS.md)
  const isTablet = computed(
    () => width.value >= RESPONSIVE_BREAKPOINTS.md && width.value < RESPONSIVE_BREAKPOINTS.lg
  )
  const isDesktop = computed(() => width.value >= RESPONSIVE_BREAKPOINTS.lg)
  const isLargeDesktop = computed(() => width.value >= RESPONSIVE_BREAKPOINTS.xl)
  const isPortrait = computed(() => height.value > width.value)
  const isLandscape = computed(() => width.value > height.value)

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isPortrait,
    isLandscape,
    breakpoints: RESPONSIVE_BREAKPOINTS,
  }
}
