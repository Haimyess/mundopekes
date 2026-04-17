/**
 * Composable para funcionalidades basadas en ubicación
 */

import type { Activity } from '~/types'
import { useGeolocation } from '@vueuse/core'
import { calculateDistance } from '~/utils/helpers'

export const useActivityLocation = () => {
  const client = useSupabaseClient()
  
  // VueUse geolocation
  const { coords, error: geoError, resume, pause } = useGeolocation()

  const loading = ref(false)
  const error = computed(() => geoError.value?.message || null)

  /**
   * Obtener actividades cercanas basado en ciudad
   * TODO: Implementar con coordenadas y radio
   */
  const getNearbyActivitiesByCity = async (city: string, limit: number = 10): Promise<Activity[]> => {
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
    // Fetch todas las actividades con coordenadas
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('status', 'approved')
      .not('location->coordinates', 'is', null)

    if (error) {
      console.error('Error fetching activities for location:', error)
      return []
    }

    const activities = data as Activity[]

    // Calcular distancia y filtrar
    const withDistance = activities
      .map(activity => {
        if (!activity.location.coordinates) return null

        const distance = calculateDistance(
          lat,
          lng,
          activity.location.coordinates.lat,
          activity.location.coordinates.lng
        )

        return {
          ...activity,
          distance
        }
      })
      .filter(item => item !== null && item.distance <= radiusKm)
      .sort((a, b) => a!.distance - b!.distance)
      .slice(0, limit) as (Activity & { distance: number })[]

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
      .map(activity => {
        if (!activity.location.coordinates) {
          return { ...activity, distance: Infinity }
        }

        const distance = calculateDistance(
          coords.value.latitude!,
          coords.value.longitude!,
          activity.location.coordinates.lat,
          activity.location.coordinates.lng
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

    if (!activity.location.coordinates) {
      return null
    }

    return calculateDistance(
      coords.value.latitude,
      coords.value.longitude,
      activity.location.coordinates.lat,
      activity.location.coordinates.lng
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
    pause
  }
}