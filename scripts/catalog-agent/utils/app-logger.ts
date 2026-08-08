import type { SupabaseClient } from '@supabase/supabase-js'

// Writes to the same `app_logs` table the admin panel's log viewer reads
// (apps/admin/app/pages/system-logs.vue) — the agent previously only logged
// to its own console/CI output, so an ingested suggestion never showed up
// there. Failures here are non-fatal: losing a log row shouldn't stop the run.
export async function logSuggestionReceived(
  supabase: SupabaseClient,
  params: { suggestionId: string; name: string; city: string; category: string }
): Promise<void> {
  try {
    await supabase.from('app_logs').insert({
      level: 'info',
      context: 'catalog-agent',
      message: `Sugerencia recibida del agente de catálogo: ${params.name}`,
      metadata: {
        suggestion_id: params.suggestionId,
        city: params.city,
        category: params.category,
      },
      app: 'web',
    })
  } catch {
    // best-effort — never block the ingestion run over a logging failure
  }
}
