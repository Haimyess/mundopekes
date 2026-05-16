import { useGtag } from '#imports'
import { useSessionId } from './useSessionId'

export const useTracking = () => {
  const { gtag } = useGtag()
  const sessionId = useSessionId()
  const locale = (useNuxtApp().$i18n as { locale: Ref<string> }).locale

  function post(event_type: string, payload: object) {
    $fetch('/api/track', {
      method: 'POST',
      body: { event_type, session_id: sessionId.value, locale: locale.value, payload },
    }).catch(() => {})
  }

  function trackPageView(path: string, title?: string) {
    if (!import.meta.client) return
    gtag('event', 'page_view', { page_path: path })
    post('page_view', { path, title })
  }

  function trackSearch(filters: {
    query?: string
    category?: string
    city?: string
    ageRange?: string
    resultsCount?: number
  }) {
    if (!import.meta.client) return
    gtag('event', 'search', { search_term: filters.query })
    post('search', {
      query: filters.query,
      category: filters.category,
      city: filters.city,
      age_range: filters.ageRange,
      results_count: filters.resultsCount,
    })
  }

  function trackActivityView(activity: {
    id: string
    title: string
    category: string
    city: string
  }) {
    if (!import.meta.client) return
    gtag('event', 'view_item')
    post('activity_view', {
      activity_id: activity.id,
      title: activity.title,
      category: activity.category,
      city: activity.city,
    })
  }

  function trackContactSend(intent: string, activityId?: string) {
    if (!import.meta.client) return
    gtag('event', 'contact_form_send', { intent })
    post('contact_send', { intent, activity_id: activityId ?? null })
  }

  function trackSuggestionSubmit() {
    if (!import.meta.client) return
    gtag('event', 'suggestion_submit')
    post('suggestion_submit', {})
  }

  function trackProviderInterest() {
    if (!import.meta.client) return
    gtag('event', 'provider_interest')
    post('provider_interest', {})
  }

  return {
    trackPageView,
    trackSearch,
    trackActivityView,
    trackContactSend,
    trackSuggestionSubmit,
    trackProviderInterest,
  }
}
