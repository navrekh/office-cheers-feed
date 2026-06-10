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
      advertiser_leads: {
        Row: {
          city: string
          contact_info: string
          created_at: string
          id: string
          pub_name: string
        }
        Insert: {
          city: string
          contact_info: string
          created_at?: string
          id?: string
          pub_name: string
        }
        Update: {
          city?: string
          contact_info?: string
          created_at?: string
          id?: string
          pub_name?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_alias: string | null
          author_name: string
          body_text: string
          created_at: string
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          author_alias?: string | null
          author_name?: string
          body_text: string
          created_at?: string
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          author_alias?: string | null
          author_name?: string
          body_text?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_clicks: {
        Row: {
          city: string | null
          created_at: string
          id: string
          pub_id: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          pub_id: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          pub_id?: string
          user_id?: string
        }
        Relationships: []
      }
      merchant_deals: {
        Row: {
          city: string
          created_at: string
          deal_text: string
          heading_there_count: number
          id: string
          is_active: boolean
          neighborhood: string | null
          pub_name: string
          updated_at: string
          urgency_level: number
        }
        Insert: {
          city: string
          created_at?: string
          deal_text: string
          heading_there_count?: number
          id?: string
          is_active?: boolean
          neighborhood?: string | null
          pub_name: string
          updated_at?: string
          urgency_level?: number
        }
        Update: {
          city?: string
          created_at?: string
          deal_text?: string
          heading_there_count?: number
          id?: string
          is_active?: boolean
          neighborhood?: string | null
          pub_name?: string
          updated_at?: string
          urgency_level?: number
        }
        Relationships: []
      }
      post_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          attached_visual_url: string | null
          author_headline: string
          author_name: string
          body_text: string
          cheers_count: number
          claim_ticket: string
          created_at: string
          id: string
          is_author_view: boolean
          is_hidden: boolean
          is_in_tribunal: boolean
          misconduct_votes: number
          post_type: string
          user_id: string | null
          valid_votes: number
        }
        Insert: {
          attached_visual_url?: string | null
          author_headline?: string
          author_name: string
          body_text: string
          cheers_count?: number
          claim_ticket?: string
          created_at?: string
          id?: string
          is_author_view?: boolean
          is_hidden?: boolean
          is_in_tribunal?: boolean
          misconduct_votes?: number
          post_type?: string
          user_id?: string | null
          valid_votes?: number
        }
        Update: {
          attached_visual_url?: string | null
          author_headline?: string
          author_name?: string
          body_text?: string
          cheers_count?: number
          claim_ticket?: string
          created_at?: string
          id?: string
          is_author_view?: boolean
          is_hidden?: boolean
          is_in_tribunal?: boolean
          misconduct_votes?: number
          post_type?: string
          user_id?: string | null
          valid_votes?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          flash_deal_text: string | null
          id: string
          map_query_address: string | null
          merchant_website: string | null
          pub_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          upi_vpa: string | null
          verified_hub_city: string | null
        }
        Insert: {
          created_at?: string
          flash_deal_text?: string | null
          id: string
          map_query_address?: string | null
          merchant_website?: string | null
          pub_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          upi_vpa?: string | null
          verified_hub_city?: string | null
        }
        Update: {
          created_at?: string
          flash_deal_text?: string | null
          id?: string
          map_query_address?: string | null
          merchant_website?: string | null
          pub_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          upi_vpa?: string | null
          verified_hub_city?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_post_by_ticket: { Args: { ticket: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cheers: { Args: { post_id: string }; Returns: number }
      report_post: { Args: { p_post_id: string }; Returns: undefined }
      tribunal_vote: {
        Args: { p_post_id: string; p_vote: string }
        Returns: {
          is_hidden: boolean
          misconduct_votes: number
          valid_votes: number
        }[]
      }
    }
    Enums: {
      app_role: "employee" | "merchant"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["employee", "merchant"],
    },
  },
} as const
