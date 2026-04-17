/**
 * Types para Supabase Database
 * Estructura compatible con GenericSchema de supabase-js
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {

      // ── activities ────────────────────────────────────────────
      activities: {
        Row: {
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
          metadata: Json
        }
        Insert: {
          id?: string
          place_id: string
          category_id?: string | null
          title: string
          description?: string | null
          price?: number | null
          is_free?: boolean
          stroller_friendly?: boolean
          open_weekends?: boolean
          schedule?: string | null
          images?: string[]
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          place_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          price?: number | null
          is_free?: boolean
          stroller_friendly?: boolean
          open_weekends?: boolean
          schedule?: string | null
          images?: string[]
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Relationships: []
      }

      // ── places ───────────────────────────────────────────────
      places: {
        Row: {
          id: string
          name: string
          description: string | null
          city_id: number | null
          lat: number | null
          lng: number | null
          images: string[]
          metadata: Json
          created_at: string
          updated_at: string
          provider_id: string | null
          status: 'active' | 'inactive' | 'draft'
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          city_id?: number | null
          lat?: number | null
          lng?: number | null
          images?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
          provider_id?: string | null
          status?: 'active' | 'inactive' | 'draft'
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          city_id?: number | null
          lat?: number | null
          lng?: number | null
          images?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
          provider_id?: string | null
          status?: 'active' | 'inactive' | 'draft'
        }
        Relationships: []
      }

      // ── cities ───────────────────────────────────────────────
      cities: {
        Row: {
          id: number
          name: string
          region: string | null
        }
        Insert: {
          id?: number
          name: string
          region?: string | null
        }
        Update: {
          id?: number
          name?: string
          region?: string | null
        }
        Relationships: []
      }

      // ── categories ───────────────────────────────────────────
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          order: number
          parent_id: string | null
          icon: string | null
          created_at: string
          updated_at: string
            nav_level: number        // ← agregar
    section: string   
        }
        Insert: {
          id?: string
          name: string
          slug: string
          order?: number
          parent_id?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
             nav_level?: number       // ← agregar
    section?: string    
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          order?: number
          parent_id?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
           nav_level?: number       // ← agregar
    section?: string    
        }
        Relationships: []
      }

      // ── age_ranges ───────────────────────────────────────────
      age_ranges: {
        Row: {
          id: number
          label_key: string
          min_months: number
          max_months: number
          sort_order: number
        }
        Insert: {
          id?: number
          label_key: string
          min_months: number
          max_months: number
          sort_order?: number
        }
        Update: {
          id?: number
          label_key?: string
          min_months?: number
          max_months?: number
          sort_order?: number
        }
        Relationships: []
      }

      // ── seasons ──────────────────────────────────────────────
      seasons: {
        Row: {
          id: number
          value: string
          label_key: string
          sort_order: number
        }
        Insert: {
          id?: number
          value: string
          label_key: string
          sort_order?: number
        }
        Update: {
          id?: number
          value?: string
          label_key?: string
          sort_order?: number
        }
        Relationships: []
      }

      // ── activity_age_ranges (pivot) ──────────────────────────
      activity_age_ranges: {
        Row: {
          activity_id: string
          age_range_id: number
        }
        Insert: {
          activity_id: string
          age_range_id: number
        }
        Update: {
          activity_id?: string
          age_range_id?: number
        }
        Relationships: []
      }

      // ── activity_seasons (pivot) ─────────────────────────────
      activity_seasons: {
        Row: {
          activity_id: string
          season_id: number
        }
        Insert: {
          activity_id: string
          season_id: number
        }
        Update: {
          activity_id?: string
          season_id?: number
        }
        Relationships: []
      }

      // ── providers ────────────────────────────────────────────
      providers: {
        Row: {
          id: string
          name: string
          type: 'government' | 'business' | 'individual'
          contact: Json
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'government' | 'business' | 'individual'
          contact?: Json
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'government' | 'business' | 'individual'
          contact?: Json
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }

      // ── suggestions ──────────────────────────────────────────
      suggestions: {
        Row: {
          id: string
          name: string
          description: string | null
          location: Json
          age_range: Json
          type: string[]
          best_season: string[]
          stroller_friendly: boolean
          open_weekends: boolean
          is_free: boolean
          schedule: string | null
          images: string[]
          status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          location: Json
          age_range: Json
          type?: string[]
          best_season?: string[]
          stroller_friendly?: boolean
          open_weekends?: boolean
          is_free?: boolean
          schedule?: string | null
          images?: string[]
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          location?: Json
          age_range?: Json
          type?: string[]
          best_season?: string[]
          stroller_friendly?: boolean
          open_weekends?: boolean
          is_free?: boolean
          schedule?: string | null
          images?: string[]
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Typed helpers for jsonb columns in suggestions
export interface SuggestionLocation {
  address: string
  city: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface SuggestionAgeRange {
  min: number
  max: number
}
