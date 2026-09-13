// Cacheado a nivel de módulo: evita releer/reescribir localStorage en cada
// call site (hay varios: el plugin de tracking, useContactForm, search.vue,
// las páginas de detalle...) y, sobre todo, evita depender de onMounted.
// onMounted() es un no-op silencioso fuera de un componente activo — el
// plugin tracking.client.ts llama a useTracking()/useSessionId() en el top
// level de defineNuxtPlugin(), que NO es un component instance, así que el
// onMounted que había acá nunca corría: session_id.value quedaba en '' para
// siempre y el POST a /api/track fallaba con 400 (session_id vacío no pasa
// el z.string().min(1) del server) en cada page_view disparado por
// router.afterEach — es decir, en cada navegación client-side.
let cachedSessionId: string | null = null

export const useSessionId = () => {
  const sessionId = ref('')

  if (import.meta.client) {
    if (!cachedSessionId) {
      const key = 'mp_session_id'
      let id = localStorage.getItem(key)
      if (!id) {
        id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
        localStorage.setItem(key, id)
      }
      cachedSessionId = id
    }
    sessionId.value = cachedSessionId
  }

  return sessionId
}
