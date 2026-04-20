// types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          name: string
          description: string | null
          place_id: string | null
          category_id: string | null
          city_id: number | null
          images: string[]
          status: 'active' | 'inactive'
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          place_id?: string | null
          category_id?: string | null
          city_id?: number | null
          images?: string[]
          status?: 'active' | 'inactive'
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          place_id?: string | null
          category_id?: string | null
          city_id?: number | null
          images?: string[]
          status?: 'active' | 'inactive'
          metadata?: Json | null
        }
        Relationships: []
      }
      places: {
        Row: {
          id: string
          name: string
          description: string | null
          city_id: number | null
          images: string[]
          status: 'active' | 'inactive'
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          city_id?: number | null
          images?: string[]
          status?: 'active' | 'inactive'
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          city_id?: number | null
          images?: string[]
          status?: 'active' | 'inactive'
          metadata?: Json | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          id: number
          name: string
          region: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          region?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          id: string
          name: string
          description: string | null
          location: { city?: string; region?: string; address?: string } | null
          age_range: Json | null
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
          location?: { city?: string; region?: string; address?: string } | null
          age_range?: Json | null
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
          name?: string
          description?: string | null
          location?: { city?: string; region?: string; address?: string } | null
          age_range?: Json | null
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
        }
        Relationships: []
      }
      faq_categories: {
        Row: {
          id: string
          name: string
          slug: string
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          order?: number
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
          order?: number
        }
        Relationships: []
      }
      faqs: {
        Row: {
          id: string
          question: string
          answer: string
          faq_category_id: string | null
          order: number
          status: 'published' | 'draft'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question: string
          answer: string
          faq_category_id?: string | null
          order?: number
          status?: 'published' | 'draft'
          created_at?: string
          updated_at?: string
        }
        Update: {
          question?: string
          answer?: string
          faq_category_id?: string | null
          order?: number
          status?: 'published' | 'draft'
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          id: string
          level: 'error' | 'warn' | 'info'
          context: string
          message: string
          metadata: Json | null
          app: string | null
          created_at: string
        }
        Insert: {
          id?: string
          level: 'error' | 'warn' | 'info'
          context: string
          message: string
          metadata?: Json | null
          app?: string | null
          created_at?: string
        }
        Update: {
          level?: 'error' | 'warn' | 'info'
          context?: string
          message?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          id: string
          intent: 'outdated_activity' | 'feedback' | 'provider_inquiry' | 'other'
          name: string
          email: string
          message: string
          activity_id: string | null
          activity_title: string | null
          locale: string | null
          status: 'pending' | 'read' | 'resolved'
          created_at: string
        }
        Insert: {
          id?: string
          intent: 'outdated_activity' | 'feedback' | 'provider_inquiry' | 'other'
          name: string
          email: string
          message: string
          activity_id?: string | null
          activity_title?: string | null
          locale?: string | null
          status?: 'pending' | 'read' | 'resolved'
          created_at?: string
        }
        Update: {
          intent?: 'outdated_activity' | 'feedback' | 'provider_inquiry' | 'other'
          name?: string
          email?: string
          message?: string
          activity_id?: string | null
          activity_title?: string | null
          locale?: string | null
          status?: 'pending' | 'read' | 'resolved'
        }
        Relationships: []
      }
      providers: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          website: string | null
          description: string
          activity_types: string[]
          address: string | null
          city_id: string | null
          schedule: Json
          price_range: Json
          status: 'pending' | 'active' | 'suspended' | 'rejected'
          notes: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          website?: string | null
          description: string
          activity_types?: string[]
          address?: string | null
          city_id?: string | null
          schedule?: Json
          price_range?: Json
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          email?: string
          phone?: string | null
          website?: string | null
          description?: string
          activity_types?: string[]
          address?: string | null
          city_id?: string | null
          schedule?: Json
          price_range?: Json
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          notes?: string | null
          metadata?: Json
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Helpers de conveniencia — úsalos en tus composables y server routes
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
