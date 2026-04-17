import { serverSupabaseClient } from '#supabase/server' // ← agregar



export default defineEventHandler(async (event) => {
const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('places')
    .select(`
      *,
      city:cities(id, name, region),
      activities(count)
    `)
    .order('name')

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})