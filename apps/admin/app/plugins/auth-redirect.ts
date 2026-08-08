// app/plugins/auth-redirect.ts
// auth.global.ts checks the session client-side via getSession() (fast, reads
// local storage) instead of getUser() (always revalidates against Supabase
// Auth) — so it won't catch a session whose access token already expired
// locally (e.g. the tab was backgrounded past Supabase's autoRefreshToken
// window). The server-side check (requireAdminUser, in every /api/** request
// via server/middleware/require-admin.ts) still correctly rejects a stale
// token with 401 — this plugin is what turns that 401 into "send the user to
// /login" instead of leaving the page stuck on a failed fetch.
export default defineNuxtPlugin(() => {
  globalThis.$fetch = $fetch.create({
    onResponseError({ response }) {
      if (response.status === 401 && !window.location.pathname.startsWith('/login')) {
        navigateTo('/login')
      }
    },
  })
})
