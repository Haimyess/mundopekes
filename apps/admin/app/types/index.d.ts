export interface Place {
  id: string
  name: string
  description: string | null
  city_id: number | null
  lat: number | null
  lng: number | null
  images: string[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  city?: { id: number; name: string; region: string }
  activities?: { count: number }[]
}

export interface Activity {
  id: string
  place_id: string
  category_id: string | null
  title: string
  description: string | null
  price: number | null
  is_free: boolean
  stroller_friendly: boolean
  open_weekends: boolean
  schedule: string | null
  images: string[]
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  place?: { id: string; name: string; city: { name: string } }
  category?: { id: string; name: string; slug: string }
}

export interface Category {
  id: string
  name: string
  slug: string
  order: number
  parent_id: string | null
  created_at: string
}