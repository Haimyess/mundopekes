// server/api/categories/[id].put.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database, TablesUpdate } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const supabase = await serverSupabaseClient<Database>(event)

  const update: TablesUpdate<'categories'> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.slug !== undefined) update.slug = body.slug
  if (body.icon !== undefined) update.icon = body.icon
  if (body.order !== undefined) update.order = body.order
  if (body.parent_id !== undefined) update.parent_id = body.parent_id

  const { data, error } = await supabase
    .from('categories')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
