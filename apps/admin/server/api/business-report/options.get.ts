import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Listas livianas para los selectores de "elegí un lugar" / "elegí un
// proveedor" del reporte de negocio — no pagina, asume un catálogo chico
// (decenas/cientos de filas), igual que useCategories.
export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const [places, providers, activities] = await Promise.all([
    supabase
      .from('places')
      .select('id, name_i18n, city:cities(name), provider_id')
      .eq('status', 'active')
      .order('name_normalized'),
    supabase.from('providers').select('id, name').eq('status', 'active').order('name'),
    supabase
      .from('activities')
      .select('id, title_i18n, place:places(name_i18n, city:cities(name))')
      .eq('status', 'approved'),
  ])

  if (places.error) throw createError({ statusCode: 500, message: places.error.message })
  if (providers.error) throw createError({ statusCode: 500, message: providers.error.message })
  if (activities.error) throw createError({ statusCode: 500, message: activities.error.message })

  return {
    places: places.data ?? [],
    providers: providers.data ?? [],
    activities: activities.data ?? [],
  }
})
