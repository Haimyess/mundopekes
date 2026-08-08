// Runs on every request to this app's Nitro server, so it's scoped to
// /api/** only — otherwise it would also intercept SSR page requests
// (including /login itself, which must stay reachable unauthenticated).
// Replaces the ~42 identical `await requireAdminUser(event)` calls that used
// to open every server/api handler (see C3 in the pre-launch security audit) —
// one omission there was a real unauthenticated data leak, so centralizing
// this here removes that whole class of bug instead of relying on every new
// endpoint remembering to add the check.
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return

  await requireAdminUser(event)
})
