/**
 * Store de Activities con Pinia
 * Maneja el estado global de actividades y carruseles
 */

import { defineStore } from 'pinia'
import type { Activity, FilterOptions } from '~/types'
import { ACTIVITY_SELECT, normalizeActivity } from '~/composables/useActivities'

export const useActivitiesStore = defineStore('activities', () => {
  // ========== STATE ==========

  // Carruseles del home
  const recentActivities = ref<Activity[]>([])
  const nearbyActivities = ref<Activity[]>([])
  const popularActivities = ref<Activity[]>([])
  const recommendedActivities = ref<Activity[]>([])

  // Actividad actual (para página de detalle)
  const currentActivity = ref<Activity | null>(null)

  // Estados de carga
  const loading = ref({
    recent: false,
    nearby: false,
    popular: false,
    recommended: false,
    current: false,
  })

  // Errores
  const error = ref<string | null>(null)

  // ========== GETTERS ==========

  /**
   * Verificar si los carruseles están cargados
   */
  const areCarouselsLoaded = computed(() => {
    return recentActivities.value.length > 0 || popularActivities.value.length > 0
  })

  /**
   * Verificar si algún carrusel está cargando
   */
  const isAnyCarouselLoading = computed(() => {
    return (
      loading.value.recent ||
      loading.value.nearby ||
      loading.value.popular ||
      loading.value.recommended
    )
  })

  /**
   * Total de actividades en cache (sin duplicados)
   */
  const totalActivitiesInCache = computed(() => {
    const unique = new Set([
      ...recentActivities.value.map((a) => a.id),
      ...nearbyActivities.value.map((a) => a.id),
      ...popularActivities.value.map((a) => a.id),
      ...recommendedActivities.value.map((a) => a.id),
    ])
    return unique.size
  })

  // ========== ACTIONS ==========

  /**
   * Cargar actividades recientes
   * 📌 Trae las últimas actividades agregadas a Supabase
   * ✅ Incluye cache: no re-fetch si ya están cargadas
   */
  const loadRecentActivities = async (limit: number = 10) => {
    // Si ya están cargadas, no re-fetch
    if (recentActivities.value.length > 0) {
      console.log('✅ Recent activities already loaded')
      return
    }

    loading.value.recent = true
    error.value = null

    try {
      const { getRecentActivities } = useActivities()
      const activities = await getRecentActivities(limit)
      recentActivities.value = activities
      console.log('✅ Loaded recent activities:', activities.length)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('❌ Error loading recent activities:', e)
    } finally {
      loading.value.recent = false
    }
  }

  /**
   * Cargar actividades cercanas por coordenadas GPS
   * 📌 Usa distancia en km desde la ubicación del usuario
   */
  const loadNearbyActivities = async (
    lat: number,
    lng: number,
    radiusKm: number = 10,
    limit: number = 10
  ) => {
    loading.value.nearby = true
    error.value = null

    try {
      const { getNearbyActivities } = useActivityLocation()
      const activities = await getNearbyActivities(lat, lng, radiusKm, limit)
      nearbyActivities.value = activities
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('❌ Error loading nearby activities:', e)
    } finally {
      loading.value.nearby = false
    }
  }

  /**
   * Cargar actividades populares
   * 📌 Por ahora retorna aleatorias
   * 🔮 TODO: Implementar con analytics de vistas/clicks
   * ✅ Incluye cache: no re-fetch si ya están cargadas
   */
  const loadPopularActivities = async (limit: number = 10) => {
    // Si ya están cargadas, no re-fetch
    if (popularActivities.value.length > 0) {
      console.log('✅ Popular activities already loaded')
      return
    }

    loading.value.popular = true
    error.value = null

    try {
      const { getPopularActivities } = useActivities()
      const activities = await getPopularActivities(limit)
      popularActivities.value = activities
      console.log('✅ Loaded popular activities:', activities.length)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('❌ Error loading popular activities:', e)
    } finally {
      loading.value.popular = false
    }
  }

  /**
   * Cargar actividades recomendadas
   * 📌 Filtra por edad del niño (en meses)
   * 💡 Si no se pasa edad, retorna variadas
   * 🔮 TODO: Implementar con IA/ML para personalización
   * ✅ Incluye cache: no re-fetch si ya están cargadas
   */
  const loadRecommendedActivities = async (ageMonths?: number, limit: number = 10) => {
    // Si ya están cargadas, no re-fetch
    if (recommendedActivities.value.length > 0) {
      console.log('✅ Recommended activities already loaded')
      return
    }

    loading.value.recommended = true
    error.value = null

    try {
      const { getRecommendedActivities } = useActivities()
      const activities = await getRecommendedActivities(ageMonths, limit)
      recommendedActivities.value = activities
      console.log('✅ Loaded recommended activities:', activities.length)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('❌ Error loading recommended activities:', e)
    } finally {
      loading.value.recommended = false
    }
  }

  /**
   * Cargar todos los carruseles del home de una vez
   * 📌 Usa Promise.allSettled para que si uno falla, los demás continúen
   * 💡 City y ageMonths son opcionales
   * 🎯 Ideal para llamar en onMounted del Homepage
   */
  const loadAllCarousels = async (coords?: { lat: number; lng: number }, ageMonths?: number) => {
    console.log('🔄 Loading all carousels...')

    const promises = [
      loadRecentActivities(),
      loadPopularActivities(),
      loadRecommendedActivities(ageMonths),
    ]

    // Solo cargar nearby si se proporcionan coordenadas
    if (coords) {
      promises.push(loadNearbyActivities(coords.lat, coords.lng))
    }

    const results = await Promise.allSettled(promises)

    // Log de resultados
    results.forEach((result, index) => {
      const carouselNames = ['Recent', 'Popular', 'Recommended', 'Nearby']
      if (result.status === 'rejected') {
        console.error(`❌ ${carouselNames[index]} failed:`, result.reason)
      }
    })

    console.log('✅ All carousels loaded')
  }

  /**
   * Cargar actividad por ID
   * 📌 Primero busca en cache de carruseles
   * 📌 Si no está, hace fetch a Supabase
   * 💾 La guarda como currentActivity
   * 🎯 Ideal para página de detalle /activity/[id]
   */
  const loadActivityById = async (id: string) => {
    // Primero buscar en cache
    const cached = findActivityInCache(id)
    if (cached) {
      console.log('✅ Activity found in cache:', id)
      currentActivity.value = cached
      return cached
    }

    // Si no está en cache, fetch
    loading.value.current = true
    error.value = null

    try {
      const { getActivityById } = useActivities()
      const activity = await getActivityById(id)

      if (activity) {
        currentActivity.value = activity
        console.log('✅ Loaded activity:', id)
        return activity
      } else {
        error.value = 'Actividad no encontrada'
        return null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('❌ Error loading activity:', e)
      return null
    } finally {
      loading.value.current = false
    }
  }

  /**
   * Buscar actividad en cache (todos los carruseles)
   * 📌 Busca en: recientes, nearby, populares, recomendadas
   * 💡 Útil para evitar fetches innecesarios
   * 🚀 Optimización de performance
   */
  const findActivityInCache = (id: string): Activity | null => {
    const allActivities = [
      ...recentActivities.value,
      ...nearbyActivities.value,
      ...popularActivities.value,
      ...recommendedActivities.value,
    ]

    return allActivities.find((activity) => activity.id === id) || null
  }

  /**
   * Setear actividad actual manualmente
   * 📌 Útil si ya tienes la actividad en memoria
   * 💡 Evita fetch innecesario
   */
  const setCurrentActivity = (activity: Activity) => {
    currentActivity.value = activity
  }

  /**
   * Limpiar actividad actual
   * 📌 Útil al salir de la página de detalle
   * 🧹 Libera memoria
   */
  const clearCurrentActivity = () => {
    currentActivity.value = null
  }

  /**
   * Refrescar carruseles (forzar re-fetch)
   * 📌 Limpia cache y vuelve a cargar
   * 🔄 Útil para botón "Refrescar" o pull-to-refresh
   */
  const refreshCarousels = async (coords?: { lat: number; lng: number }, ageMonths?: number) => {
    // Limpiar cache
    recentActivities.value = []
    popularActivities.value = []
    recommendedActivities.value = []
    nearbyActivities.value = []

    // Re-cargar
    await loadAllCarousels(coords, ageMonths)
  }

  /**
   * Limpiar todo el store
   * 📌 Resetea TODA la data del store
   * 🧹 Útil al hacer logout o cambiar de contexto
   */
  const clearStore = () => {
    recentActivities.value = []
    nearbyActivities.value = []
    popularActivities.value = []
    recommendedActivities.value = []
    currentActivity.value = null
    error.value = null

    loading.value = {
      recent: false,
      nearby: false,
      popular: false,
      recommended: false,
      current: false,
    }
  }

  // ── Opciones de filtros ───────────────────────────────────────
  const filterOptions = ref<FilterOptions>({
    cities: [],
    ageRanges: [],
    seasons: [],
    categories: [],
  })

  const filterOptionsLoaded = ref(false)
  const loadingFilterOptions = ref(false)

  const loadFilterOptions = async () => {
    // Cache: no re-fetch si ya están cargadas
    if (filterOptionsLoaded.value) return

    loadingFilterOptions.value = true

    try {
      const client = useSupabaseClient()

      const [citiesRes, ageRes, seasonsRes] = await Promise.all([
        client.from('cities').select('*').order('name'),
        client.from('age_ranges').select('*').order('sort_order'),
        client.from('seasons').select('*').order('sort_order'),
      ])

      if (citiesRes.data) filterOptions.value.cities = citiesRes.data
      if (ageRes.data) filterOptions.value.ageRanges = ageRes.data
      if (seasonsRes.data) filterOptions.value.seasons = seasonsRes.data

      filterOptionsLoaded.value = true
    } catch (e) {
      error.value = e.message
      console.error('❌ Error loading filter options:', e)
    } finally {
      loadingFilterOptions.value = false
    }
  }

  // ── Todas las actividades (para conteos de filtros en drawer) ─────
  // Se cargan lazy: solo cuando el usuario abre el drawer por primera vez
  const allActivities = ref<Activity[]>([])
  const allActivitiesLoaded = ref(false)
  const loadingAllActivities = ref(false)

  const loadAllActivities = async () => {
    // Cache: no re-fetch si ya están cargadas
    if (allActivitiesLoaded.value) return

    loadingAllActivities.value = true

    try {
      const client = useSupabaseClient()
      const { data, error: err } = await client
        .from('activities')
        .select(ACTIVITY_SELECT)
        .eq('status', 'approved')
        .eq('place.status', 'active')

      if (err) throw err

      allActivities.value = (data ?? []).map(normalizeActivity)
      allActivitiesLoaded.value = true
      console.log('✅ Loaded all activities for filter counts:', allActivities.value.length)
    } catch (e) {
      error.value = e.message
      console.error('❌ Error loading all activities:', e)
    } finally {
      loadingAllActivities.value = false
    }
  }
  // ========== RETURN ==========

  return {
    // State (SIN readonly para evitar errores de tipos)
    recentActivities,
    nearbyActivities,
    popularActivities,
    recommendedActivities,
    currentActivity,
    loading,
    error,

    // Getters
    areCarouselsLoaded,
    isAnyCarouselLoading,
    totalActivitiesInCache,

    // Actions
    loadRecentActivities,
    loadNearbyActivities,
    loadPopularActivities,
    loadRecommendedActivities,
    loadAllCarousels,
    loadActivityById,
    findActivityInCache,
    setCurrentActivity,
    clearCurrentActivity,
    refreshCarousels,
    clearStore,
    filterOptions,
    filterOptionsLoaded,
    loadingFilterOptions,
    loadFilterOptions,

    allActivities,
    allActivitiesLoaded,
    loadingAllActivities,
    loadAllActivities,
  }
})
