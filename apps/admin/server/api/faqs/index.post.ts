// server/api/faqs/index.post.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database, TablesInsert } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const body = await readBody(event)
  const supabase = await serverSupabaseClient<Database>(event)

  if (!body.question) throw createError({ statusCode: 400, message: 'Pregunta requerida' })
  if (!body.answer) throw createError({ statusCode: 400, message: 'Respuesta requerida' })

  const { data: last } = await supabase
    .from('faqs')
    .select('order')
    .order('order', { ascending: false })
    .limit(1)
    .single()

  const insert: TablesInsert<'faqs'> = {
    question: body.question,
    answer: body.answer,
    faq_category_id: body.faq_category_id ?? null,
    status: body.status ?? 'draft',
    order: (last?.order ?? -1) + 1,
  }

  const { data, error } = await supabase
    .from('faqs')
    .insert(insert)
    .select('*, faq_category:faq_categories(id, name, slug)')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
