// Runs on every request to this app's Nitro server, so it's scoped to
// /api/** only — otherwise it would also intercept SSR page requests
// (including /login itself, which must stay reachable unauthenticated).
// Replaces the ~42 identical `await requireAdminUser(event)` calls that used
// to open every server/api handler (see C3 in the pre-launch security audit) —
// one omission there was a real unauthenticated data leak, so centralizing
// this here removes that whole class of bug instead of relying on every new
// endpoint remembering to add the check.
//
// Some Nuxt modules register their own routes under /api/** too (e.g.
// @nuxt/icon serves icon data from /api/_nuxt_icon/**) — those aren't part
// of this app's own API surface and must stay reachable pre-login, or every
// icon on the login page 401s. Exclude any /api/_*/** path (the underscore
// prefix is the existing convention Nitro/Nuxt modules use for internal
// routes) instead of only this one case, so the next module that does the
// same thing doesn't silently break the same way.
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/') || event.path.startsWith('/api/_')) return

  await requireAdminUser(event)
})
