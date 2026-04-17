// server/api/suggestions/[id].put.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database, TablesUpdate } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const supabase = await serverSupabaseClient<Database>(event)

  // Construir el update solo con los campos que vienen en el body
  const update: TablesUpdate<'suggestions'> = {}

  if (body.status !== undefined) update.status = body.status
  if (body.rejection_reason !== undefined) update.rejection_reason = body.rejection_reason
  if (body.name !== undefined) update.name = body.name
  if (body.description !== undefined) update.description = body.description
  if (body.location !== undefined) update.location = body.location
  if (body.age_range !== undefined) update.age_range = body.age_range
  if (body.type !== undefined) update.type = body.type
  if (body.best_season !== undefined) update.best_season = body.best_season
  if (body.stroller_friendly !== undefined) update.stroller_friendly = body.stroller_friendly
  if (body.open_weekends !== undefined) update.open_weekends = body.open_weekends
  if (body.is_free !== undefined) update.is_free = body.is_free
  if (body.schedule !== undefined) update.schedule = body.schedule

  const { data, error } = await supabase
    .from('suggestions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
// // server/api/suggestions/[id].put.ts
// import { serverSupabaseClient } from '#supabase/server'
// import type { Database, Tables, TablesUpdate } from '~/types/database.types'

// export default defineEventHandler(async (event) => {
//   const id = getRouterParam(event, 'id')
//   if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

//   const body = await readBody<TablesUpdate<'suggestions'>>(event)
//   const supabase = await serverSupabaseClient<Database>(event)

//   const { data, error } = await supabase
//     .from('suggestions')
//     .update({
//       status: body.status,
//       rejection_reason: body.rejection_reason ?? null,
//     })
//     .eq('id', id)
//     .select('*')
//     .single() as { data: Tables<'suggestions'> | null; error: unknown }

//   if (error) throw createError({ statusCode: 500, message: String(error) })
//   if (!data) throw createError({ statusCode: 404, message: 'Sugerencia no encontrada' })

//   return data
// })