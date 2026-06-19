// Returns reference data (subcategories, seasons, age ranges) needed by the edit form.
// Uses service role to bypass RLS.
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const config = useRuntimeConfig(event)
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )

  const [catRes, seasonRes, ageRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name_i18n, slug')
      .eq('nav_level', 2)
      .eq('section', 'what_to_do')
      .order('order'),
    supabase.from('seasons').select('value, label_key').order('sort_order'),
    supabase.from('age_ranges').select('id, label_key').order('sort_order'),
  ])

  return {
    subcategories: (catRes.data ?? []) as Array<{
      id: string
      name_i18n: Record<string, string>
      slug: string
    }>,
    seasons: (seasonRes.data ?? []) as Array<{ value: string; label_key: string }>,
    ageRanges: (ageRes.data ?? []) as Array<{ id: number; label_key: string }>,
  }
})
