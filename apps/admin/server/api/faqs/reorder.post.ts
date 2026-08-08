// server/api/faqs/reorder.post.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { items: { id: string; order: number }[] }
  if (!body.items?.length) throw createError({ statusCode: 400, message: 'Items requeridos' })

  const supabase = await serverSupabaseClient<Database>(event)
  await Promise.all(
    body.items.map(({ id, order }) => supabase.from('faqs').update({ order }).eq('id', id))
  )
  return { success: true }
})
