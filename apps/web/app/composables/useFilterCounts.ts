import type {
  Activity,
  ActivityFilters,
  ActivityAgeRangeRow,
  ActivitySeasonRow,
} from '~/types'

export const useFilterCounts = (
  baseActivities: Ref<Activity[]>,
  localFilters: Ref<ActivityFilters>
) => {
  // ── Filtrado en cliente ───────────────────────────────────────────
  const applyFilters = (activities: Activity[], filters: ActivityFilters): Activity[] => {
    return activities.filter(activity => {

      if (filters.city) {
        const cities = filters.city.split(',')
        const cityName = activity.place?.city?.name
        if (!cityName || !cities.includes(cityName)) return false
      }

      if (filters.age_min !== undefined && filters.age_max !== undefined) {
        const ranges = activity.activity_age_ranges ?? []
        const matches = ranges.some((row: ActivityAgeRangeRow) =>
          row.age_range.min_months <= filters.age_max! &&
          row.age_range.max_months >= filters.age_min!
        )
        if (!matches) return false
      }

      if (filters.season) {
        const seasons = activity.activity_seasons ?? []
        const matches = seasons.some((row: ActivitySeasonRow) =>
          row.season.value === filters.season
        )
        if (!matches) return false
      }

      if (filters.is_free && !activity.is_free)                    return false
      if (filters.stroller_friendly && !activity.stroller_friendly) return false
      if (filters.open_weekends && !activity.open_weekends)         return false

      return true
    })
  }

  // ── Base filtrada por search ──────────────────────────────────────
  // Los conteos siempre se calculan sobre actividades que ya coinciden
  // con el texto buscado — igual que el comportamiento del drawer mobile
  const searchFiltered = computed(() => {
    if (!localFilters.value.search) return baseActivities.value
    const q = localFilters.value.search.toLowerCase()
    return baseActivities.value.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.place?.name?.toLowerCase().includes(q)
    )
  })

  // ── Preview: cuántos resultados con los filtros locales actuales ──
  const previewCount = computed(() =>
    applyFilters(searchFiltered.value, localFilters.value).length
  )

  // ── Conteo por opción — excluye su propia categoría ──────────────
  const countForAge = (opt: { min: number; max: number }): number => {
    const f: ActivityFilters = { ...localFilters.value }
    delete f.age_id
    delete f.age_min
    delete f.age_max
    return applyFilters(searchFiltered.value, {
      ...f, age_min: opt.min, age_max: opt.max
    }).length
  }

  const countForCity = (cityName: string): number => {
    const f: ActivityFilters = { ...localFilters.value }
    delete f.city
    const current = localFilters.value.city ? localFilters.value.city.split(',') : []
    const cities  = current.includes(cityName) ? current : [...current, cityName]
    return applyFilters(searchFiltered.value, {
      ...f, city: cities.join(',')
    }).length
  }

  const countForSeason = (seasonValue: string): number => {
    const f: ActivityFilters = { ...localFilters.value }
    delete f.season
    return applyFilters(searchFiltered.value, {
      ...f, season: seasonValue as ActivityFilters['season']
    }).length
  }

  const countForExtra = (key: 'is_free' | 'stroller_friendly' | 'open_weekends'): number =>
    applyFilters(searchFiltered.value, {
      ...localFilters.value, [key]: true
    }).length

  // ── Helpers disabled ──────────────────────────────────────────────
  const isAgeDisabled = (
    opt: { min: number; max: number },
    selectedAgeId?: number,
    optId?: number
  ): boolean => countForAge(opt) === 0 && selectedAgeId !== optId

  const isCityDisabled = (cityName: string, selectedCities: string[]): boolean =>
    countForCity(cityName) === 0 && !selectedCities.includes(cityName)

  const isSeasonDisabled = (seasonValue: string, selectedSeason?: string): boolean =>
    countForSeason(seasonValue) === 0 && selectedSeason !== seasonValue

  const isExtraDisabled = (
    key: 'is_free' | 'stroller_friendly' | 'open_weekends',
    currentValue: boolean
  ): boolean => !currentValue && countForExtra(key) === 0

  return {
    applyFilters,
    previewCount,
    countForAge,
    countForCity,
    countForSeason,
    countForExtra,
    isAgeDisabled,
    isCityDisabled,
    isSeasonDisabled,
    isExtraDisabled,
  }
}