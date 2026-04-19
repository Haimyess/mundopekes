import type { ContactIntent } from '~/types/contact'

export type { ContactIntent }

export function useAnalytics() {
  const { gtag } = useGtag()

  function trackSearch(filters: {
    query?: string
    category?: string
    city?: string
    ageRange?: string
  }) {
    if (!import.meta.client) return
    gtag('event', 'search', {
      search_term: filters.query,
      category: filters.category,
      city: filters.city,
      age_range: filters.ageRange,
    })
  }

  function trackActivityView(activity: {
    id: string
    title: string
    category: string
    city: string
  }) {
    if (!import.meta.client) return
    gtag('event', 'view_item', {
      item_id: activity.id,
      item_name: activity.title,
      item_category: activity.category,
      item_city: activity.city,
    })
  }

  function trackSuggestionSubmit() {
    if (!import.meta.client) return
    gtag('event', 'suggestion_submit')
  }

  function trackContactFormSend(intent: ContactIntent) {
    if (!import.meta.client) return
    gtag('event', 'contact_form_send', { intent })
  }

  function trackProviderInterest() {
    if (!import.meta.client) return
    gtag('event', 'provider_interest')
  }

  return {
    trackSearch,
    trackActivityView,
    trackSuggestionSubmit,
    trackContactFormSend,
    trackProviderInterest,
  }
}
