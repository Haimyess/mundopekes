/**
 * Composable para búsqueda de actividades con debounce
 */

import type { Activity } from '~/types'
import { useDebounceFn, useLocalStorage } from '@vueuse/core'

export const useActivitySearch = () => {
  const { fetchFilteredActivities } = useActivityFilters()
  
  const searchTerm = ref('')
  const results = ref<Activity[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Historial de búsqueda (guardado en localStorage)
  const searchHistory = useLocalStorage<string[]>('search-history', [])

  /**
   * Función de búsqueda
   */
  const performSearch = async (term: string) => {
    if (!term || term.length < 2) {
      results.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const activities = await fetchFilteredActivities({ search: term })
      results.value = activities

      // Agregar al historial (max 10)
      if (!searchHistory.value.includes(term)) {
        searchHistory.value = [term, ...searchHistory.value].slice(0, 10)
      }
    } catch (e: any) {
      error.value = e.message
      console.error('Search error:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Búsqueda con debounce (espera 300ms después de que el usuario deja de escribir)
   */
  const debouncedSearch = useDebounceFn(performSearch, 300)

  /**
   * Watch para ejecutar búsqueda automática
   */
  watch(searchTerm, (newTerm) => {
    if (newTerm) {
      debouncedSearch(newTerm)
    } else {
      results.value = []
    }
  })

  /**
   * Limpiar búsqueda
   */
  const clearSearch = () => {
    searchTerm.value = ''
    results.value = []
    error.value = null
  }

  /**
   * Limpiar historial
   */
  const clearHistory = () => {
    searchHistory.value = []
  }

  return {
    searchTerm,
    results: readonly(results),
    loading: readonly(loading),
    error: readonly(error),
    searchHistory: readonly(searchHistory),
    performSearch,
    clearSearch,
    clearHistory
  }
}