// composables/useGeocode.ts
// Convierte una dirección de texto a lat/lng via el server route /api/geocode
// Usar tanto en el formulario de sugerencias como en el admin al crear places

export interface GeocodeResult {
  lat: number
  lng: number
  display_name: string
}

export const useGeocode = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Geocodifica una dirección y devuelve lat/lng.
   * Lanza error si no se encuentra.
   *
   * @example
   * const { geocode } = useGeocode()
   * const coords = await geocode('Parque HaYarkon, Tel Aviv')
   * // → { lat: 32.0853, lng: 34.7818, display_name: '...' }
   */
  const geocode = async (address: string): Promise<GeocodeResult | null> => {
    if (!address?.trim()) return null

    isLoading.value = true
    error.value = null

    try {
      const result = await $fetch<GeocodeResult>('/api/geocode', {
        params: { address },
      })
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Geocoding failed'
      error.value = message
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    geocode,
    isLoading,
    error,
  }
}
