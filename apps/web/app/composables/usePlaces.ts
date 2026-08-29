/**
 * usePlaces
 * Composable para fetch de la entidad Place por sí sola (Place Page pública).
 * Complementa useActivities.ts — activities siempre viene con su place
 * embebido vía join, pero la Place Page necesita el place como raíz.
 */
import type { Place } from '~/types'

export const PLACE_SELECT = `
  id,
  name_i18n,
  description_i18n,
  lat,
  lng,
  images,
  status,
  metadata,
  google_place_id,
  city:cities ( id, name, region )
` as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalizePlace = (raw: any): Place => ({
  id: raw.id,
  name_i18n: raw.name_i18n ?? {},
  description_i18n: raw.description_i18n ?? null,
  lat: raw.lat ?? null,
  lng: raw.lng ?? null,
  images: raw.images ?? [],
  status: raw.status ?? 'active',
  city: raw.city ?? null,
  metadata: raw.metadata ?? {},
  google_place_id: raw.google_place_id ?? raw.metadata?.google_place_id ?? null,
})

export const usePlaces = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = useSupabaseClient() as any

  const getPlaceById = async (id: string): Promise<Place | null> => {
    const { data, error } = await client
      .from('places')
      .select(PLACE_SELECT)
      .eq('id', id)
      .eq('status', 'active')
      .single()

    if (error) {
      console.error('Error fetching place:', error)
      return null
    }

    return data ? normalizePlace(data) : null
  }

  return { getPlaceById }
}
