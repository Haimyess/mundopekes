// server/api/categories/index.post.ts
import { serverSupabaseClient } from '#supabase/server'
import type { Database, TablesInsert } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const body = await readBody(event)
  const supabase = await serverSupabaseClient<Database>(event)

  if (!body.name) throw createError({ statusCode: 400, message: 'Nombre requerido' })

  // Auto slug si no viene
  const slug =
    body.slug ||
    body.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

  // Calcular el siguiente order
  const { data: last } = await supabase
    .from('categories')
    .select('order')
    .is('parent_id', body.parent_id ?? null)
    .order('order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (last?.order ?? -1) + 1

  const insert: TablesInsert<'categories'> = {
    name: body.name,
    slug,
    icon: body.icon ?? null,
    parent_id: body.parent_id ?? null,
    order: nextOrder,
  }

  const { data, error } = await supabase.from('categories').insert(insert).select().single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
