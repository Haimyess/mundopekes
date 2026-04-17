// server/api/categories/reorder.post.ts
// Recibe un array de { id, order } y actualiza todos en batch
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { items: { id: string; order: number }[] }

  if (!body.items?.length) {
    throw createError({ statusCode: 400, message: 'Items requeridos' })
  }

  const supabase = await serverSupabaseClient<Database>(event)

  // Actualizar cada item con su nuevo order
  const updates = body.items.map(({ id, order }) =>
    supabase
      .from('categories')
      .update({ order })
      .eq('id', id)
  )

  await Promise.all(updates)
  return { success: true }
})