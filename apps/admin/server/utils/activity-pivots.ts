// Sincroniza las tablas pivote de una actividad (activity_age_ranges, activity_seasons)
// a partir de los arrays que envía el formulario del admin. Usado por POST y PUT de
// actividades. `best_season` guarda VALUES (p.ej. 'spring'); se mapean a season_id.
import type { SupabaseClient } from '@supabase/supabase-js'

export async function syncActivityPivots(
  supabase: SupabaseClient,
  activityId: string,
  ageRangeIds: number[] | undefined,
  bestSeasonValues: string[] | undefined
): Promise<void> {
  // ── Age ranges ──────────────────────────────────────────────
  if (Array.isArray(ageRangeIds)) {
    await supabase.from('activity_age_ranges').delete().eq('activity_id', activityId)
    if (ageRangeIds.length > 0) {
      await supabase
        .from('activity_age_ranges')
        .insert(ageRangeIds.map((age_range_id) => ({ activity_id: activityId, age_range_id })))
    }
  }

  // ── Seasons (value → season_id) ─────────────────────────────
  if (Array.isArray(bestSeasonValues)) {
    await supabase.from('activity_seasons').delete().eq('activity_id', activityId)
    const values = bestSeasonValues.filter((v) => v && v !== 'all')
    if (values.length > 0) {
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id, value')
        .in('value', values)
      if (seasonData?.length) {
        await supabase.from('activity_seasons').insert(
          seasonData.map((s: { id: number; value: string }) => ({
            activity_id: activityId,
            season_id: s.id,
          }))
        )
      }
    }
  }
}
