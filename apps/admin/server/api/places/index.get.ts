import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('places')
    .select(
      `
      *,
      city:cities(id, name, region),
      activities(count)
    `
    )
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
