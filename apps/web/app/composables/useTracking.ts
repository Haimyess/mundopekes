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
    }).catch((err) => {
      // Tracking nunca debe romper la UX, pero un catch mudo hace invisibles
      // fallos reales — sin esto, un evento que nunca llega a la DB es
      // indistinguible de uno que nunca se disparó.
      if (import.meta.dev) console.warn(`[tracking] ${event_type} failed:`, err)
    })
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

  function trackPlaceView(place: { id: string; title: string; city: string }) {
    if (!import.meta.client) return
    gtag('event', 'view_item')
    post('place_view', { place_id: place.id, title: place.title, city: place.city })
  }

  function trackDirectionsClick(
    targetType: 'activity' | 'place',
    targetId: string,
    method: 'maps' | 'waze'
  ) {
    if (!import.meta.client) return
    gtag('event', 'directions_click', { method })
    post('directions_click', { target_type: targetType, target_id: targetId, method })
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
    trackPlaceView,
    trackDirectionsClick,
    trackContactSend,
    trackSuggestionSubmit,
    trackProviderInterest,
  }
}
