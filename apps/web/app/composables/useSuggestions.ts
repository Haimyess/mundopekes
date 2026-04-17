// composables/useSuggestions.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json, SuggestionLocation, SuggestionAgeRange } from '~/types/database.types'
import type { CreateSuggestionInput, SuggestionResponse, Suggestion } from '~/types'

export const useSuggestions = () => {
  const supabase = useSupabaseClient() as SupabaseClient<Database>
  const { geocode } = useGeocode()
  const submitting = ref(false)

  const submit = async (input: CreateSuggestionInput): Promise<SuggestionResponse> => {
    submitting.value = true

    try {
      const addressQuery = [input.location.address, input.location.city]
        .filter(Boolean)
        .join(', ')

      let location: SuggestionLocation = {
        address: input.location.address,
        city: input.location.city,
      }

      if (addressQuery) {
        const coords = await geocode(addressQuery)
        if (coords) {
          location = { ...location, coordinates: { lat: coords.lat, lng: coords.lng } }
        }
      }

      const { data, error } = await supabase
        .from('suggestions')
        .insert({
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          location: location as unknown as Json,
          age_range: input.age_range as unknown as Json,
          type: input.type,
          best_season: input.best_season,
          stroller_friendly: input.stroller_friendly,
          open_weekends: input.open_weekends,
          is_free: input.is_free,
          schedule: input.schedule?.trim() ?? null,
          images: input.images ?? [],
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      const row = data as Database['public']['Tables']['suggestions']['Row']

      return {
        success: true,
        data: {
          id: row.id,
          name: row.name,
          description: row.description,
          location: row.location as unknown as SuggestionLocation,
          age_range: row.age_range as unknown as SuggestionAgeRange,
          type: row.type,
          best_season: row.best_season,
          stroller_friendly: row.stroller_friendly,
          open_weekends: row.open_weekends,
          is_free: row.is_free,
          schedule: row.schedule,
          images: row.images,
          status: row.status,
          rejection_reason: row.rejection_reason,
          reviewed_at: row.reviewed_at,
          created_at: row.created_at,
        } satisfies Suggestion,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message }
    } finally {
      submitting.value = false
    }
  }

  return { submit, submitting }
}
