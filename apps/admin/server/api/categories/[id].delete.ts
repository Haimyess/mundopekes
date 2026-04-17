// server/api/categories/[id].delete.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const supabase = await serverSupabaseClient<Database>(event)
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})