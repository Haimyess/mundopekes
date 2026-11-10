import type { SearchPin } from '#shared/types/search'
import type { MapPin } from '~/components/map/Canvas.vue'

export function useMapPins() {
  const { t, locale } = useI18n()
  const { tc } = useI18nContent()

  function pinLabel(pin: SearchPin): string {
    if (pin.isFree || pin.price === 0) return t('results.free')
    if (pin.price !== null) return formatPrice(pin.price, locale.value)
    return t(`results.kind.${pin.kind}`)
  }

  function toMapPins(pins: readonly SearchPin[]): MapPin[] {
    return pins.map((pin) => ({
      id: pin.id,
      lat: pin.location.lat,
      lng: pin.location.lng,
      label: pinLabel(pin),
      title: tc(pin.title),
    }))
  }

  return { toMapPins }
}
