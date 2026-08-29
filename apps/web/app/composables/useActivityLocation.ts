/**
 * Composable para funcionalidades basadas en ubicación
 */

import type { Activity } from '~/types'
import { useGeolocation } from '@vueuse/core'
import { calculateDistance } from '~/utils/helpers'
import { ACTIVITY_SELECT, normalizeActivity } from '~/composables/useActivities'

export const useActivityLocation = () => {
  const client = useSupabaseClient()

  // VueUse geolocation — immediate: false: si arranca solo al montar (antes
  // de que el usuario pida su ubicación), el watchPosition puede quedar en
  // error/resuelto desde el inicio y un click posterior en "Cerca de mí"
  // nunca dispara un cambio nuevo en coords/error (se queda "buscando..."
  // para siempre). Debe arrancar recién cuando se llama a requestLocation().
  const { coords, error: geoError, resume, pause } = useGeolocation({ immediate: false })

  const loading = ref(false)
  const error = computed(() => geoError.value?.message || null)

  /**
   * Obtener actividades cercanas basado en ciudad
   * TODO: Implementar con coordenadas y radio
   */
  const getNearbyActivitiesByCity = async (
    city: string,
    limit: number = 10
  ): Promise<Activity[]> => {
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('status', 'approved')
      .eq('location->>city', city)
      .limit(limit)

    if (error) {
      console.error('Error fetching nearby activities:', error)
      return []
    }

    return data as Activity[]
  }

  /**
   * Obtener actividades cercanas basado en coordenadas
   * Por ahora retorna todas y filtra en memoria
   * TODO: Implementar con PostGIS en Supabase para búsqueda geoespacial
   */
  const getNearbyActivities = async (
    lat: number,
    lng: number,
    radiusKm: number = 10,
    limit: number = 10
  ): Promise<Activity[]> => {
    const { data, error } = await client
      .from('activities')
      .select(ACTIVITY_SELECT)
      .eq('status', 'approved')
      .eq('place.status', 'active')

    if (error) {
      console.error('Error fetching activities for location:', error)
      return []
    }

    const activities = (data ?? []).map(normalizeActivity)

    const withoutCoords = activities.filter((a) => !a.place?.lat || !a.place?.lng)
    if (withoutCoords.length > 0) {
      console.warn(
        `⚠️ ${withoutCoords.length} actividades sin coordenadas (lat/lng) en places — no aparecerán en "Cerca de ti"`
      )
    }

    const withDistance = activities
      .map((activity) => {
        if (!activity.place?.lat || !activity.place?.lng) return null

        const distance = calculateDistance(lat, lng, activity.place.lat, activity.place.lng)

        return { ...activity, distance }
      })
      .filter((item) => item !== null && item.distance <= radiusKm)
      .sort((a, b) => a!.distance - b!.distance)
      .slice(0, limit) as (Activity & { distance: number })[]

    console.log(
      `📍 getNearbyActivities: ${withDistance.length} actividades dentro de ${radiusKm}km`
    )
    return withDistance
  }

  /**
   * Ordenar actividades por distancia a ubicación del usuario
   */
  const sortByDistance = (activities: Activity[]): Activity[] => {
    if (!coords.value.latitude || !coords.value.longitude) {
      return activities
    }

    const withDistance = activities
      .map((activity) => {
        if (!activity.place?.lat || !activity.place?.lng) {
          return { ...activity, distance: Infinity }
        }

        const distance = calculateDistance(
          coords.value.latitude!,
          coords.value.longitude!,
          activity.place.lat,
          activity.place.lng
        )

        return { ...activity, distance }
      })
      .sort((a, b) => a.distance - b.distance)

    return withDistance
  }

  /**
   * Calcular distancia a una actividad específica
   */
  const getDistanceToActivity = (activity: Activity): number | null => {
    if (!coords.value.latitude || !coords.value.longitude) {
      return null
    }

    if (!activity.place?.lat || !activity.place?.lng) {
      return null
    }

    return calculateDistance(
      coords.value.latitude,
      coords.value.longitude,
      activity.place.lat,
      activity.place.lng
    )
  }

  /**
   * Solicitar permisos de geolocalización
   */
  const requestLocation = () => {
    resume()
  }

  return {
    // Coordenadas reactivas del usuario
    latitude: computed(() => coords.value.latitude),
    longitude: computed(() => coords.value.longitude),
    accuracy: computed(() => coords.value.accuracy),

    // Estados
    loading: readonly(loading),
    error,

    // Funciones
    getNearbyActivitiesByCity,
    getNearbyActivities,
    sortByDistance,
    getDistanceToActivity,
    requestLocation,
    pause,
  }
}
