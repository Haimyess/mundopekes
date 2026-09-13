export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          category_id: string | null
          created_at: string | null
          description_i18n: Json
          i18n_status: Json
          id: string
          images: string[] | null
          is_free: boolean | null
          metadata: Json | null
          open_weekends: boolean | null
          place_id: string
          price: number | null
          schedule: string | null
          status: string | null
          stroller_friendly: boolean | null
          title_i18n: Json
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description_i18n?: Json
          i18n_status?: Json
          id?: string
          images?: string[] | null
          is_free?: boolean | null
          metadata?: Json | null
          open_weekends?: boolean | null
          place_id: string
          price?: number | null
          schedule?: string | null
          status?: string | null
          stroller_friendly?: boolean | null
          title_i18n?: Json
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description_i18n?: Json
          i18n_status?: Json
          id?: string
          images?: string[] | null
          is_free?: boolean | null
          metadata?: Json | null
          open_weekends?: boolean | null
          place_id?: string
          price?: number | null
          schedule?: string | null
          status?: string | null
          stroller_friendly?: boolean | null
          title_i18n?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: [
          {
            foreignKeyName: "activity_age_ranges_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_age_ranges_age_range_id_fkey"
            columns: ["age_range_id"]
            isOneToOne: false
            referencedRelation: "age_ranges"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          locale: string | null
          payload: Json
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          locale?: string | null
          payload?: Json
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          locale?: string | null
          payload?: Json
          session_id?: string | null
        }
        Relationships: []
      }
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
        Relationships: [
          {
            foreignKeyName: "activity_seasons_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      age_ranges: {
        Row: {
          id: number
          label_key: string
          max_months: number
          min_months: number
          sort_order: number
        }
        Insert: {
          id?: number
          label_key: string
          max_months: number
          min_months: number
          sort_order?: number
        }
        Update: {
          id?: number
          label_key?: string
          max_months?: number
          min_months?: number
          sort_order?: number
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip?: string
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          app: string
          context: string
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
        }
        Insert: {
          app?: string
          context: string
          created_at?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
        }
        Update: {
          app?: string
          context?: string
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name_i18n: Json
          nav_level: number
          order: number
          parent_id: string | null
          section: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name_i18n?: Json
          nav_level?: number
          order?: number
          parent_id?: string | null
          section?: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name_i18n?: Json
          nav_level?: number
          order?: number
          parent_id?: string | null
          section?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
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
      contact_requests: {
        Row: {
          activity_id: string | null
          activity_title: string | null
          created_at: string | null
          email: string
          id: string
          intent: string
          locale: string | null
          message: string
          metadata: Json | null
          name: string
          status: string
        }
        Insert: {
          activity_id?: string | null
          activity_title?: string | null
          created_at?: string | null
          email: string
          id?: string
          intent: string
          locale?: string | null
          message: string
          metadata?: Json | null
          name: string
          status?: string
        }
        Update: {
          activity_id?: string | null
          activity_title?: string | null
          created_at?: string | null
          email?: string
          id?: string
          intent?: string
          locale?: string | null
          message?: string
          metadata?: Json | null
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_categories: {
        Row: {
          created_at: string | null
          id: string
          name_i18n: Json
          order: number
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_i18n?: Json
          order?: number
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name_i18n?: Json
          order?: number
          slug?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer_i18n: Json
          created_at: string | null
          faq_category_id: string | null
          id: string
          order: number
          question_i18n: Json
          status: string
          updated_at: string | null
        }
        Insert: {
          answer_i18n?: Json
          created_at?: string | null
          faq_category_id?: string | null
          id?: string
          order?: number
          question_i18n?: Json
          status?: string
          updated_at?: string | null
        }
        Update: {
          answer_i18n?: Json
          created_at?: string | null
          faq_category_id?: string | null
          id?: string
          order?: number
          question_i18n?: Json
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_faq_category_id_fkey"
            columns: ["faq_category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          city_id: number | null
          created_at: string | null
          description_i18n: Json
          google_place_id: string | null
          i18n_status: Json
          id: string
          images: string[] | null
          lat: number | null
          lng: number | null
          metadata: Json | null
          name_i18n: Json
          name_normalized: string | null
          provider_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          city_id?: number | null
          created_at?: string | null
          description_i18n?: Json
          google_place_id?: string | null
          i18n_status?: Json
          id?: string
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          name_i18n?: Json
          name_normalized?: string | null
          provider_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          city_id?: number | null
          created_at?: string | null
          description_i18n?: Json
          google_place_id?: string | null
          i18n_status?: Json
          id?: string
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          name_i18n?: Json
          name_normalized?: string | null
          provider_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          activity_types: string[]
          address: string | null
          city_id: number | null
          created_at: string | null
          description: string
          email: string
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          phone: string | null
          price_range: Json
          schedule: Json
          status: Database["public"]["Enums"]["provider_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          activity_types?: string[]
          address?: string | null
          city_id?: number | null
          created_at?: string | null
          description: string
          email: string
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          price_range?: Json
          schedule?: Json
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          activity_types?: string[]
          address?: string | null
          city_id?: number | null
          created_at?: string | null
          description?: string
          email?: string
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          price_range?: Json
          schedule?: Json
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          id: number
          label_key: string
          sort_order: number
          value: string
        }
        Insert: {
          id?: number
          label_key: string
          sort_order?: number
          value: string
        }
        Update: {
          id?: number
          label_key?: string
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          age_range: Json
          best_season: string[]
          category_id: string | null
          created_at: string | null
          description_i18n: Json
          flagged_possible_duplicate: boolean
          i18n_status: Json
          id: string
          images: string[] | null
          is_free: boolean | null
          is_primary: boolean
          location: Json | null
          metadata: Json | null
          name_i18n: Json
          open_weekends: boolean | null
          place_id: string | null
          possible_duplicate_activity_id: string | null
          possible_duplicate_of: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          schedule: string | null
          status: string | null
          stroller_friendly: boolean | null
          suggestion_group_id: string | null
          suggestion_type: string
          type: string[]
        }
        Insert: {
          age_range: Json
          best_season: string[]
          category_id?: string | null
          created_at?: string | null
          description_i18n?: Json
          flagged_possible_duplicate?: boolean
          i18n_status?: Json
          id?: string
          images?: string[] | null
          is_free?: boolean | null
          is_primary?: boolean
          location?: Json | null
          metadata?: Json | null
          name_i18n?: Json
          open_weekends?: boolean | null
          place_id?: string | null
          possible_duplicate_activity_id?: string | null
          possible_duplicate_of?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          schedule?: string | null
          status?: string | null
          stroller_friendly?: boolean | null
          suggestion_group_id?: string | null
          suggestion_type?: string
          type: string[]
        }
        Update: {
          age_range?: Json
          best_season?: string[]
          category_id?: string | null
          created_at?: string | null
          description_i18n?: Json
          flagged_possible_duplicate?: boolean
          i18n_status?: Json
          id?: string
          images?: string[] | null
          is_free?: boolean | null
          is_primary?: boolean
          location?: Json | null
          metadata?: Json | null
          name_i18n?: Json
          open_weekends?: boolean | null
          place_id?: string | null
          possible_duplicate_activity_id?: string | null
          possible_duplicate_of?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          schedule?: string | null
          status?: string | null
          stroller_friendly?: boolean | null
          suggestion_group_id?: string | null
          suggestion_type?: string
          type?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_possible_duplicate_activity_id_fkey"
            columns: ["possible_duplicate_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_possible_duplicate_of_fkey"
            columns: ["possible_duplicate_of"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_business_report: {
        Args: {
          p_activity_ids: string[]
          p_from: string
          p_place_ids: string[]
          p_to: string
        }
        Returns: {
          contacts: number
          directions: number
          searching_sessions: number
          unique_sessions: number
          views: number
        }[]
      }
      analytics_business_timeseries: {
        Args: {
          p_activity_ids: string[]
          p_from: string
          p_place_ids: string[]
          p_to: string
        }
        Returns: {
          count: number
          day: string
        }[]
      }
      analytics_distinct_sessions: {
        Args: { p_from: string; p_to: string }
        Returns: number
      }
      analytics_events_by_type: {
        Args: { p_from: string; p_to: string }
        Returns: {
          count: number
          event_type: string
        }[]
      }
      analytics_market_context: {
        Args: {
          p_category_slugs: string[]
          p_city: string
          p_from: string
          p_to: string
        }
        Returns: {
          category_searches: number
          city_searches: number
        }[]
      }
      analytics_search_stats: {
        Args: { p_from: string; p_to: string }
        Returns: {
          total_searches: number
          zero_result_searches: number
        }[]
      }
      analytics_timeseries: {
        Args: { p_event_type?: string; p_from: string; p_to: string }
        Returns: {
          count: number
          day: string
        }[]
      }
      analytics_top_activities: {
        Args: { p_from: string; p_limit?: number; p_to: string }
        Returns: {
          activity_id: string
          contacts: number
          conversion_rate: number
          directions: number
          title: string
          views: number
        }[]
      }
      analytics_top_age_ranges: {
        Args: { p_from: string; p_limit?: number; p_to: string }
        Returns: {
          age_range_id: string
          count: number
        }[]
      }
      analytics_top_categories: {
        Args: { p_from: string; p_limit?: number; p_to: string }
        Returns: {
          category_slug: string
          count: number
        }[]
      }
      analytics_top_cities: {
        Args: { p_from: string; p_limit?: number; p_to: string }
        Returns: {
          city_name: string
          count: number
        }[]
      }
      analytics_top_places: {
        Args: { p_from: string; p_limit?: number; p_to: string }
        Returns: {
          directions: number
          place_id: string
          title: string
          views: number
        }[]
      }
      analytics_top_search_terms: {
        Args: {
          p_from: string
          p_limit?: number
          p_to: string
          p_zero_results?: boolean
        }
        Returns: {
          count: number
          term: string
        }[]
      }
      categories_next_order: { Args: { parent?: string }; Returns: number }
      get_i18n_text: { Args: { data: Json; locale: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      provider_status: "pending" | "active" | "suspended" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      provider_status: ["pending", "active", "suspended", "rejected"],
    },
  },
} as const
