/**
 * Único punto de la app que cambia el layout según el modo PWA. Deja el
 * layout propio de cada página (definePageMeta) intacto en desktop/mobile
 * web — isStandaloneDisplay() es false para el 100% del tráfico actual
 * (nadie tiene esto instalado todavía), así que este middleware es un
 * no-op en producción hasta que exista una instalación real.
 * No se testea acá directamente (setPageLayout requiere contexto completo
 * de Nuxt, no mockeable con la infra de tests actual — ver
 * memory project_test_infra) — la lógica de decisión real que sí se
 * testea es isStandaloneDisplay() (usePwaMode.test.ts). Verificado a mano
 * vía Chrome DevTools "Emulate CSS media feature: display-mode".
 */
export default defineNuxtRouteMiddleware(() => {
  if (!import.meta.client) return
  if (isStandaloneDisplay()) {
    setPageLayout('pwa')
  }
})
