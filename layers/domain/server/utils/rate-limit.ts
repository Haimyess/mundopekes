import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

// TODO: add a Supabase cron job to delete rows older than 1 hour:
// DELETE FROM api_rate_limits WHERE created_at < now() - interval '1 hour'

// NOTE: the SELECT count + INSERT below are two separate queries, not atomic.
// Under concurrent traffic a small burst above the limit can slip through.
// This is an intentional MVP tradeoff — the goal is cost disuasion, not a
// hard billing cap. If traffic grows, migrate to an atomic SQL function:
//   INSERT INTO api_rate_limits ... ON CONFLICT DO UPDATE SET count = count + 1
//   RETURNING count  (checked in a single round-trip)
export async function checkRateLimit(
  event: H3Event,
  endpoint: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): Promise<void> {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  // Cast to any: api_rate_limits is not in database.types yet (migration pending).
  // Remove cast once the migration is applied and types are regenerated.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = serverSupabaseServiceRole(event) as any

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

  let count = 0
  try {
    const { count: c } = await supabase
      .from('api_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart)
    count = c ?? 0
  } catch (err) {
    await logWarn(event, 'security', 'Rate limit check failed, failing open', {
      ip,
      endpoint,
      error: String(err),
    })
    return
  }

  if (count >= limit) {
    await logWarn(event, 'security', 'Rate limit exceeded', { ip, endpoint, limit, windowSeconds })
    throw createError({
      statusCode: 429,
      statusMessage: 'Demasiadas solicitudes. Intentá más tarde.',
    })
  }

  await supabase.from('api_rate_limits').insert({ ip, endpoint })
}
