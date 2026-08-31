/**
 * Chequeo síncrono de standalone — usado tanto por el composable reactivo
 * de abajo como por middleware/pwa-layout.global.ts, que necesita el valor
 * ANTES de que un componente monte (no puede esperar a onMounted). Es la
 * ÚNICA fuente de verdad para esa distinción — no gatear nada dentro de
 * composables/stores/rutas de servidor compartidos, solo acá y en el
 * middleware de layout / el v-if de alto nivel en search.vue (Fase 3).
 */
export function isStandaloneDisplay(): boolean {
  if (!import.meta.client) return false
  const displayModeMatch = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  // Fallback de iOS Safari (pre-2023): no soporta la media query
  // display-mode, pero expone navigator.standalone cuando la PWA fue
  // agregada a la pantalla de inicio.
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return displayModeMatch || iosStandalone
}

/**
 * Versión reactiva para componentes: se actualiza sola si el modo de
 * visualización cambia mientras la app está abierta (caso raro, pero
 * matchMedia lo soporta gratis).
 */
export function usePwaMode() {
  const isStandalone = ref(false)

  onMounted(() => {
    isStandalone.value = isStandaloneDisplay()

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)')
    if (!mediaQuery) return
    const onChange = () => {
      isStandalone.value = isStandaloneDisplay()
    }
    mediaQuery.addEventListener('change', onChange)
    onUnmounted(() => mediaQuery.removeEventListener('change', onChange))
  })

  return { isStandalone: readonly(isStandalone) }
}
