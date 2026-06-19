import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

// TODO: add a Supabase cron job to delete rows older than 1 hour:
// DELETE FROM api_rate_limits WHERE created_at < now() - interval '1 hour'

export async function checkRateLimit(
  event: H3Event,
  endpoint: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): Promise<void> {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const supabase = serverSupabaseServiceRole(event)

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

  const { count } = await supabase
    .from('api_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)

  if ((count ?? 0) >= limit) {
    await logWarn(event, 'security', 'Rate limit exceeded', { ip, endpoint, limit, windowSeconds })
    throw createError({
      statusCode: 429,
      statusMessage: 'Demasiadas solicitudes. Intentá más tarde.',
    })
  }

  await supabase.from('api_rate_limits').insert({ ip, endpoint })
}
