import type { ActivityFilters, Activity, SeasonValue } from '~/types'
import {
  ACTIVITY_LIST_SELECT_BASE,
  AGE_RANGES_EMBED,
  AGE_RANGES_EMBED_INNER,
  SEASONS_EMBED,
  SEASONS_EMBED_INNER,
  normalizeActivity,
} from '~/composables/useActivities'
import { sanitizeSearchQuery } from '~/utils/sanitize'

export const useActivityFilters = () => {
  const client = useSupabaseClient()
  const { t } = useI18n()
  const store = useActivitiesStore()

  // ── Opciones reactivas del store ──────────────────────────────────
  const cityOptions = computed(() =>
    store.filterOptions.cities.map((c) => ({
      label: c.name,
      value: c.name,
    }))
  )

  // Usa ID como value (único), excluye age.all y duplicados viejos
  const ageOptions = computed(() =>
    store.filterOptions.ageRanges
      .filter(
        (a) => a.label_key.startsWith('age.') && a.label_key !== 'age.all' // excluir "todas las edades"
      )
      .map((a) => ({
        label: t(`search.${a.label_key.replace('.', '_')}`), // age.babies → search.age_babies
        value: a.id, // ← ID único como value
        min: a.min_months,
        max: a.max_months,
      }))
  )

  const seasonOptions = computed(() =>
    store.filterOptions.seasons
      .filter((s) => s.value !== 'all') // excluir "all" si existe
      .map((s) => ({
        label: t(s.label_key),
        value: s.value as SeasonValue,
      }))
  )

  // ── URL → ActivityFilters ─────────────────────────────────────────
  const buildFiltersFromQuery = (query: Record<string, unknown>): ActivityFilters => {
    const f: ActivityFilters = {}

    if (typeof query.q === 'string' && query.q) f.search = sanitizeSearchQuery(query.q)

    if (typeof query.city === 'string' && query.city) f.city = query.city

    if (typeof query.season === 'string' && query.season) f.season = query.season as SeasonValue

    if (query.free === 'true') f.is_free = true

    if (query.stroller_friendly === 'true') f.stroller_friendly = true

    if (query.open_weekends === 'true') f.open_weekends = true

    if (typeof query.category === 'string' && query.category) f.category = query.category

    // age en URL es el ID del age_range
    if (typeof query.age === 'string') {
      const option = store.filterOptions.ageRanges.find(
        (o) => o.id === Number(query.age) // ← buscar por ID
      )
      if (option) {
        f.age_id = option.id
        f.age_min = option.min_months
        f.age_max = option.max_months
      }
    }

    return f
  }

  // ── ActivityFilters → URL query params ────────────────────────────
  const buildQueryFromFilters = (
    filters: ActivityFilters,
    preserveQ?: string
  ): Record<string, string> => {
    const query: Record<string, string> = {}

    if (preserveQ) query.q = preserveQ
    if (filters.search) query.q = filters.search
    if (filters.city) query.city = filters.city
    if (filters.season) query.season = filters.season
    if (filters.is_free) query.free = 'true'
    if (filters.stroller_friendly) query.stroller_friendly = 'true'
    if (filters.open_weekends) query.open_weekends = 'true'

    // Guardar el ID en la URL, no min_months
    if (filters.age_id !== undefined) query.age = String(filters.age_id)
    if (filters.category) query.category = filters.category

    return query
  }

  // ── Remover filtro individual de la URL ───────────────────────────
  const removeFilterFromQuery = (
    currentQuery: Record<string, unknown>,
    key: keyof ActivityFilters,
    cityValue?: string
  ): Record<string, string> => {
    const query = Object.fromEntries(
      Object.entries(currentQuery).filter(([, v]) => typeof v === 'string')
    ) as Record<string, string>

    switch (key) {
      case 'age_id':
      case 'age_min':
      case 'age_max':
        delete query.age
        break
      case 'season':
        delete query.season
        break

      case 'category':
        delete query.category
        break
      case 'is_free':
        delete query.free
        break
      case 'stroller_friendly':
        delete query.stroller_friendly
        break
      case 'open_weekends':
        delete query.open_weekends
        break
      case 'search':
        delete query.q
        break
      case 'city':
        if (cityValue && query.city) {
          const remaining = query.city.split(',').filter((c) => c !== cityValue)
          if (remaining.length) query.city = remaining.join(',')
          else delete query.city
        } else {
          delete query.city
        }
        break
    }

    return query
  }

  // ── Contar filtros activos (excluye search) ───────────────────────
  const countActiveFilters = (filters: ActivityFilters): number => {
    let count = 0
    if (filters.age_id !== undefined) count++
    if (filters.city) count++
    if (filters.season) count++
    if (filters.is_free) count++
    if (filters.stroller_friendly) count++
    if (filters.open_weekends) count++
    if (filters.category) count++
    return count
  }

  // ── Chips de filtros activos ──────────────────────────────────────
  const getFilterChips = (
    filters: ActivityFilters,
    categoryOpts?: { label: string; value: string }[]
  ) => {
    const chips: Array<{
      key: keyof ActivityFilters
      label: string
      cityValue?: string
    }> = []

    if (filters.search) {
      chips.push({ key: 'search', label: `"${filters.search}"` })
    }

    if (filters.category) {
      const opt = categoryOpts?.find((c) => c.value === filters.category)
      chips.push({
        key: 'category',
        label: opt?.label ?? filters.category,
      })
    }

    if (filters.age_id !== undefined) {
      const opt = store.filterOptions.ageRanges.find((o) => o.id === filters.age_id)
      if (opt)
        chips.push({
          key: 'age_id',
          label: t(`search.${opt.label_key.replace('.', '_')}`), // ← misma corrección
        })
    }

    if (filters.city) {
      filters.city.split(',').forEach((city) => {
        chips.push({ key: 'city', label: city, cityValue: city })
      })
    }

    if (filters.season) {
      const opt = store.filterOptions.seasons.find((s) => s.value === filters.season)
      if (opt) chips.push({ key: 'season', label: t(opt.label_key) })
    }

    if (filters.is_free) chips.push({ key: 'is_free', label: t('search.free') })
    if (filters.stroller_friendly)
      chips.push({ key: 'stroller_friendly', label: t('activity.stroller_friendly') })
    if (filters.open_weekends)
      chips.push({ key: 'open_weekends', label: t('activity.open_weekends') })

    return chips
  }

  // Resuelve place_ids a partir de city names (2 queries secuenciales:
  // la segunda depende del resultado de la primera).
  const resolveCityPlaceIds = async (
    cityFilter: string | undefined
  ): Promise<{ placeIds?: string[]; notFound: boolean }> => {
    if (!cityFilter) return { notFound: false }

    const cityNames = cityFilter.split(',').filter(Boolean)

    const { data: cityData, error: cityError } = await client
      .from('cities')
      .select('id')
      .in('name', cityNames)
      .returns<{ id: number }[]>()

    if (cityError || !cityData?.length) return { notFound: true }

    const cityIds = cityData.map((c) => c.id)

    const { data: placesData, error: placesError } = await client
      .from('places')
      .select('id')
      .in('city_id', cityIds)
      .returns<{ id: string }[]>()

    if (placesError || !placesData?.length) return { notFound: true }

    return { placeIds: placesData.map((p) => p.id), notFound: false }
  }

  // Resuelve category_id + hijos (2 queries secuenciales: la segunda
  // depende del id del padre).
  const resolveCategoryIds = async (
    categorySlug: string | undefined
  ): Promise<string[] | undefined> => {
    if (!categorySlug) return undefined

    const { data: parent } = await client
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()

    if (!parent) return undefined

    const { data: children } = await client
      .from('categories')
      .select('id')
      .eq('parent_id', (parent as { id: string }).id)

    return [parent.id, ...(children ?? []).map((c: { id: string }) => c.id)]
  }

  // Resuelve place_ids cuyo nombre matchea el texto buscado — permite que
  // buscar por el nombre de un lugar también muestre sus actividades (antes
  // solo matcheaba título de actividad, dejando "sin resultados" aunque el
  // lugar sí existiera y tuviera actividades).
  const resolveSearchPlaceIds = async (search: string | undefined): Promise<string[]> => {
    if (!search) return []

    const q = sanitizeSearchQuery(search)

    const { data: matchingPlaces } = await client
      .from('places')
      .select('id')
      .eq('status', 'active')
      .or(
        `name_i18n->>es.ilike.%${q}%,name_i18n->>he.ilike.%${q}%,name_i18n->>en.ilike.%${q}%,name_i18n->>ru.ilike.%${q}%`
      )
      .returns<{ id: string }[]>()

    return (matchingPlaces ?? []).map((p) => p.id)
  }

  // Arma la query filtrada (city/category/search/booleans/edad/season) sin
  // ejecutarla — la comparten la versión paginada (grilla, vista Lista) y
  // la no paginada (vista Mapa, que necesita el set completo para los
  // pines) para no duplicar esta lógica entre ambas.
  const buildFilteredQuery = async (filters: ActivityFilters, { withCount = false } = {}) => {
    // City, category y search-por-lugar son independientes entre sí —
    // se resuelven en paralelo en vez de uno tras otro.
    const [cityResolution, categoryIds, matchingPlaceIds] = await Promise.all([
      resolveCityPlaceIds(filters.city),
      resolveCategoryIds(filters.category),
      resolveSearchPlaceIds(filters.search),
    ])

    if (cityResolution.notFound) return null
    const placeIds = cityResolution.placeIds

    // age_ranges/seasons se piden con !inner SOLO cuando el filtro
    // correspondiente está activo — así el filtro de edad/season lo
    // resuelve la DB (WHERE), en vez de traer todo y descartar en JS.
    const hasAgeFilter = filters.age_min !== undefined && filters.age_max !== undefined
    const hasSeasonFilter = !!filters.season

    const select = `${ACTIVITY_LIST_SELECT_BASE},
      ${hasAgeFilter ? AGE_RANGES_EMBED_INNER : AGE_RANGES_EMBED},
      ${hasSeasonFilter ? SEASONS_EMBED_INNER : SEASONS_EMBED}
    `

    let query = client
      .from('activities')
      .select(select, withCount ? { count: 'exact' } : undefined)
      .eq('status', 'approved')
      .eq('place.status', 'active')

    if (placeIds?.length) {
      query = query.in('place_id', placeIds)
    }

    if (categoryIds?.length) {
      query = query.in('category_id', categoryIds)
    }

    if (filters.search) {
      const q = sanitizeSearchQuery(filters.search)
      const titleOr = `title_i18n->>es.ilike.%${q}%,title_i18n->>he.ilike.%${q}%,title_i18n->>en.ilike.%${q}%,title_i18n->>ru.ilike.%${q}%`
      const placeOr = matchingPlaceIds.length ? `,place_id.in.(${matchingPlaceIds.join(',')})` : ''

      query = query.or(`${titleOr}${placeOr}`)
    }

    if (filters.is_free !== undefined) {
      query = query.eq('is_free', filters.is_free)
    }

    if (filters.stroller_friendly) {
      query = query.eq('stroller_friendly', true)
    }

    if (filters.open_weekends) {
      query = query.eq('open_weekends', true)
    }

    if (hasAgeFilter) {
      // Overlap de rangos: el age_range del pivot debe solaparse con
      // [age_min, age_max] — misma condición que antes se aplicaba en JS.
      query = query
        .lte('age_ranges.age_range.min_months', filters.age_max as number)
        .gte('age_ranges.age_range.max_months', filters.age_min as number)
    }

    if (hasSeasonFilter) {
      query = query.eq('seasons.season.value', filters.season as string)
    }

    return query.order('created_at', { ascending: false })
  }

  // ── Fetch principal (sin paginar) — usado por la vista Mapa, que
  // necesita el set completo de resultados para posicionar los pines ──
  const fetchFilteredActivities = async (filters: ActivityFilters): Promise<Activity[]> => {
    const query = await buildFilteredQuery(filters)
    if (!query) return []

    const { data, error } = await query

    if (error) {
      console.error('Error fetching filtered activities:', error)
      return []
    }

    return (data ?? []).map(normalizeActivity)
  }

  // ── Fetch paginado — usado por la grilla en vista Lista ──
  const fetchFilteredActivitiesPaginated = async (
    filters: ActivityFilters,
    page = 1,
    pageSize = 20
  ): Promise<{ data: Activity[]; total: number }> => {
    const query = await buildFilteredQuery(filters, { withCount: true })
    if (!query) return { data: [], total: 0 }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error fetching paginated activities:', error)
      return { data: [], total: 0 }
    }

    return { data: (data ?? []).map(normalizeActivity), total: count ?? 0 }
  }

  return {
    cityOptions,
    ageOptions,
    seasonOptions,
    buildFiltersFromQuery,
    buildQueryFromFilters,
    removeFilterFromQuery,
    getFilterChips,
    countActiveFilters,
    fetchFilteredActivities,
    fetchFilteredActivitiesPaginated,
  }
}
