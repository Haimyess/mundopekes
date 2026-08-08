export interface InsertedPlaceDetail {
  name_he: string
  name_es: string
  city: string
  category: string
  is_free: boolean
  is_free_confidence: 'high' | 'medium' | 'low'
  website: string | null
  status: string
  created_at: string
}

export interface RunReport {
  runDate: string
  queriesRun: number
  placesFound: number
  alreadyExisted: number
  inserted: number
  skippedPaid: number
  errors: number
  insertedPlaces: Array<{ name_he: string; city: string; category: string; is_free: boolean }>
}
