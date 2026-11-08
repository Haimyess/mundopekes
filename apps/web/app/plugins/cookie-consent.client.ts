export default defineNuxtPlugin(() => {
  const { isAnalyticsAllowed, enableAnalytics } = useCookieConsent()
  if (isAnalyticsAllowed.value) enableAnalytics()
})
