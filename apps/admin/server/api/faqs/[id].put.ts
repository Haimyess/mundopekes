// server/api/faqs/[id].put.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database, TablesUpdate } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const body = await readBody(event)
  const supabase = await serverSupabaseClient<Database>(event)

  const update: TablesUpdate<'faqs'> = {}
  if (body.question !== undefined) update.question = body.question
  if (body.answer !== undefined) update.answer = body.answer
  if (body.faq_category_id !== undefined) update.faq_category_id = body.faq_category_id
  if (body.status !== undefined) update.status = body.status
  if (body.order !== undefined) update.order = body.order

  const { data, error } = await supabase
    .from('faqs')
    .update(update)
    .eq('id', id)
    .select('*, faq_category:faq_categories(id, name, slug)')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
