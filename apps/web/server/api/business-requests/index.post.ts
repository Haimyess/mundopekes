export default defineEventHandler(async (event) => {
  await checkRateLimit(event, 'business-requests/create', { limit: 3, windowSeconds: 3600 })
  return createBusinessRequest(event, await readBody(event))
})
