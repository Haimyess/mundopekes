import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Opciones para el dropdown secundario que aparece en la tabla de eventos
// recientes cuando se elige un tipo de evento puntual (ej. "Búsqueda" ->
// filtrar por término o categoría). Reutiliza las mismas funciones RPC de
// top-N que ya alimentan la página, con un rango bien amplio (desde 2020) y
// un límite alto — no necesita ser exacto, es solo para poblar un selector.
const WIDE_FROM = new Date('2020-01-01').toISOString()

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)
  const query = getQuery(event)
  const eventType = typeof query.eventType === 'string' ? query.eventType : undefined
  const to = new Date().toISOString()

  if (eventType === 'search') {
    const [terms, categories] = await Promise.all([
      supabase.rpc('analytics_top_search_terms', {
        p_from: WIDE_FROM,
        p_to: to,
        p_limit: 50,
        p_zero_results: false,
      }),
      supabase.rpc('analytics_top_categories', { p_from: WIDE_FROM, p_to: to, p_limit: 50 }),
    ])
    return {
      terms: (terms.data ?? []).map((t) => ({ value: t.term, label: t.term, count: t.count })),
      categories: (categories.data ?? []).map((c) => ({
        value: c.category_slug,
        label: c.category_slug,
        count: c.count,
      })),
    }
  }

  if (eventType === 'activity_view' || eventType === 'directions_click') {
    const activities = await supabase.rpc('analytics_top_activities', {
      p_from: WIDE_FROM,
      p_to: to,
      p_limit: 50,
    })
    return {
      activities: (activities.data ?? []).map((a) => ({
        value: a.activity_id,
        label: a.title,
        count: a.views,
      })),
    }
  }

  if (eventType === 'place_view') {
    const places = await supabase.rpc('analytics_top_places', {
      p_from: WIDE_FROM,
      p_to: to,
      p_limit: 50,
    })
    return {
      places: (places.data ?? []).map((p) => ({
        value: p.place_id,
        label: p.title,
        count: p.views,
      })),
    }
  }

  return {}
})
