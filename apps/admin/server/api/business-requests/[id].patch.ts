import { serverSupabaseServiceRole } from '#supabase/server'
import { businessRequestStatusUpdateSchema, entityIdSchema } from '@mundopekes/schemas'
import type { Database } from '@mundopekes/types'

export default defineEventHandler(async (event) => {
  const id = entityIdSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = businessRequestStatusUpdateSchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: body.error.issues[0]?.message ?? 'Invalid request body',
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await supabase
    .from('business_requests')
    .update({
      status: body.data.status,
      ...(body.data.notes === undefined ? {} : { notes: body.data.notes || null }),
    })
    .eq('id', id.data)
    .select()
    .maybeSingle()

  if (error) {
    await logError(event, 'business-requests/update', 'Failed to update business request', {
      id: id.data,
      error: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: 'Could not update the request' })
  }
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  await logInfo(event, 'business-requests/update', 'Business request reviewed', {
    id: id.data,
    status: body.data.status,
  })
  return data
})
