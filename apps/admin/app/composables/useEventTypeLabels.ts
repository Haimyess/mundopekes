// Compartido entre user-events.vue y el dashboard Home — ambos necesitan
// traducir event_type a una etiqueta legible.
export const useEventTypeLabels = () => {
  const { t } = useI18n()

  return computed<Record<string, string>>(() => ({
    page_view: t('userEvents.eventTypes.pageView'),
    search: t('userEvents.eventTypes.search'),
    activity_view: t('userEvents.eventTypes.activityView'),
    place_view: t('userEvents.eventTypes.placeView'),
    directions_click: t('userEvents.eventTypes.directionsClick'),
    contact_send: t('userEvents.eventTypes.contactSend'),
    suggestion_submit: t('userEvents.eventTypes.suggestionSubmit'),
    provider_interest: t('userEvents.eventTypes.providerInterest'),
  }))
}
