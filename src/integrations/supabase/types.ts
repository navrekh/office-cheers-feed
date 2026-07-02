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
          approved_at: string | null
          approved_by: string | null
          city: string
          contact_info: string
          created_at: string
          id: string
          pub_name: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          city: string
          contact_info: string
          created_at?: string
          id?: string
          pub_name: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string
          contact_info?: string
          created_at?: string
          id?: string
          pub_name?: string
        }
        Relationships: []
      }
      anonymous_confessions: {
        Row: {
          body: string
          created_at: string
          handle: string
          hub: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          handle: string
          hub: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          handle?: string
          hub?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_requests: {
        Row: {
          amount_inr: number
          created_at: string
          id: string
          note: string | null
          pub_name: string | null
          status: string
          transaction_timestamp: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr?: number
          created_at?: string
          id?: string
          note?: string | null
          pub_name?: string | null
          status?: string
          transaction_timestamp?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          id?: string
          note?: string | null
          pub_name?: string | null
          status?: string
          transaction_timestamp?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bypass_referrals: {
        Row: {
          candidate_profile: string
          created_at: string
          id: string
          referred: boolean
          referred_at: string | null
          referrer_hash: string | null
        }
        Insert: {
          candidate_profile: string
          created_at?: string
          id?: string
          referred?: boolean
          referred_at?: string | null
          referrer_hash?: string | null
        }
        Update: {
          candidate_profile?: string
          created_at?: string
          id?: string
          referred?: boolean
          referred_at?: string | null
          referrer_hash?: string | null
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          activity: string
          city: string | null
          created_at: string
          expires_at: string
          id: string
          latitude: number
          longitude: number
          pub_id: string | null
          session_id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          activity: string
          city?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          latitude: number
          longitude: number
          pub_id?: string | null
          session_id: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          activity?: string
          city?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          latitude?: number
          longitude?: number
          pub_id?: string | null
          session_id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_pub_id_fkey"
            columns: ["pub_id"]
            isOneToOne: false
            referencedRelation: "merchant_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      city_campaign_votes: {
        Row: {
          city: string
          created_at: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      city_campaigns: {
        Row: {
          city: string
          created_at: string
          launched: boolean
          target: number
          updated_at: string
          vote_count: number
        }
        Insert: {
          city: string
          created_at?: string
          launched?: boolean
          target?: number
          updated_at?: string
          vote_count?: number
        }
        Update: {
          city?: string
          created_at?: string
          launched?: boolean
          target?: number
          updated_at?: string
          vote_count?: number
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
          latitude: number | null
          longitude: number | null
          post_id: string
          user_id: string | null
        }
        Insert: {
          author_alias?: string | null
          author_name?: string
          body_text: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          post_id: string
          user_id?: string | null
        }
        Update: {
          author_alias?: string | null
          author_name?: string
          body_text?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
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
      grind_posts: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          image_url: string | null
          tags: string[]
        }
        Insert: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          tags?: string[]
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          tags?: string[]
        }
        Relationships: []
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
          activated_at: string
          city: string
          commuting_count: number
          created_at: string
          crowd_density: number
          deal_text: string
          expires_at: string
          heading_there_count: number
          id: string
          is_active: boolean
          neighborhood: string | null
          noise_level: number
          pub_name: string
          updated_at: string
          urgency_level: number
          verified_at_venue_count: number
          vibe_sample_count: number
          vibe_type: number
        }
        Insert: {
          activated_at?: string
          city: string
          commuting_count?: number
          created_at?: string
          crowd_density?: number
          deal_text: string
          expires_at?: string
          heading_there_count?: number
          id?: string
          is_active?: boolean
          neighborhood?: string | null
          noise_level?: number
          pub_name: string
          updated_at?: string
          urgency_level?: number
          verified_at_venue_count?: number
          vibe_sample_count?: number
          vibe_type?: number
        }
        Update: {
          activated_at?: string
          city?: string
          commuting_count?: number
          created_at?: string
          crowd_density?: number
          deal_text?: string
          expires_at?: string
          heading_there_count?: number
          id?: string
          is_active?: boolean
          neighborhood?: string | null
          noise_level?: number
          pub_name?: string
          updated_at?: string
          urgency_level?: number
          verified_at_venue_count?: number
          vibe_sample_count?: number
          vibe_type?: number
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          choice: string
          created_at: string
          hub: string
          id: string
          user_id: string
          vote_day: string
        }
        Insert: {
          choice: string
          created_at?: string
          hub: string
          id?: string
          user_id: string
          vote_day?: string
        }
        Update: {
          choice?: string
          created_at?: string
          hub?: string
          id?: string
          user_id?: string
          vote_day?: string
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
          comment_count: number
          created_at: string
          id: string
          is_author_view: boolean
          is_hidden: boolean
          is_in_tribunal: boolean
          latitude: number | null
          longitude: number | null
          media_type: string | null
          misconduct_votes: number
          post_type: string
          tags: string[]
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
          comment_count?: number
          created_at?: string
          id?: string
          is_author_view?: boolean
          is_hidden?: boolean
          is_in_tribunal?: boolean
          latitude?: number | null
          longitude?: number | null
          media_type?: string | null
          misconduct_votes?: number
          post_type?: string
          tags?: string[]
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
          comment_count?: number
          created_at?: string
          id?: string
          is_author_view?: boolean
          is_hidden?: boolean
          is_in_tribunal?: boolean
          latitude?: number | null
          longitude?: number | null
          media_type?: string | null
          misconduct_votes?: number
          post_type?: string
          tags?: string[]
          user_id?: string | null
          valid_votes?: number
        }
        Relationships: []
      }
      profile_testimonials: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          owner_id: string
          pinned: boolean
          status: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          owner_id: string
          pinned?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          owner_id?: string
          pinned?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          declared_company: string | null
          display_name: string | null
          facebook_url: string | null
          flash_deal_text: string | null
          github_url: string | null
          handle: string | null
          id: string
          instagram_url: string | null
          latitude: number | null
          linkedin_url: string | null
          longitude: number | null
          map_query_address: string | null
          merchant_website: string | null
          pub_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          tech_park_zone: string | null
          twitter_url: string | null
          updated_at: string
          upi_vpa: string | null
          verified_hub_city: string | null
          website_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          declared_company?: string | null
          display_name?: string | null
          facebook_url?: string | null
          flash_deal_text?: string | null
          github_url?: string | null
          handle?: string | null
          id: string
          instagram_url?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          longitude?: number | null
          map_query_address?: string | null
          merchant_website?: string | null
          pub_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tech_park_zone?: string | null
          twitter_url?: string | null
          updated_at?: string
          upi_vpa?: string | null
          verified_hub_city?: string | null
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          declared_company?: string | null
          display_name?: string | null
          facebook_url?: string | null
          flash_deal_text?: string | null
          github_url?: string | null
          handle?: string | null
          id?: string
          instagram_url?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          longitude?: number | null
          map_query_address?: string | null
          merchant_website?: string | null
          pub_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tech_park_zone?: string | null
          twitter_url?: string | null
          updated_at?: string
          upi_vpa?: string | null
          verified_hub_city?: string | null
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rallies: {
        Row: {
          created_at: string
          creator_emoji: string
          creator_handle: string
          creator_id: string
          eta_minutes: number
          expires_at: string
          hub: string
          id: string
          note: string | null
          source_message_id: string | null
          venue: string
        }
        Insert: {
          created_at?: string
          creator_emoji?: string
          creator_handle: string
          creator_id: string
          eta_minutes?: number
          expires_at?: string
          hub: string
          id?: string
          note?: string | null
          source_message_id?: string | null
          venue: string
        }
        Update: {
          created_at?: string
          creator_emoji?: string
          creator_handle?: string
          creator_id?: string
          eta_minutes?: number
          expires_at?: string
          hub?: string
          id?: string
          note?: string | null
          source_message_id?: string | null
          venue?: string
        }
        Relationships: []
      }
      rally_rsvps: {
        Row: {
          created_at: string
          emoji: string
          handle: string
          id: string
          rally_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          handle: string
          id?: string
          rally_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          handle?: string
          id?: string
          rally_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rally_rsvps_rally_id_fkey"
            columns: ["rally_id"]
            isOneToOne: false
            referencedRelation: "rallies"
            referencedColumns: ["id"]
          },
        ]
      }
      shame_metrics: {
        Row: {
          ats_score: number
          company: string
          complaint_count: number
          ghost_days: number
          id: string
          rejection_velocity: number
          updated_at: string
        }
        Insert: {
          ats_score?: number
          company: string
          complaint_count?: number
          ghost_days?: number
          id?: string
          rejection_velocity?: number
          updated_at?: string
        }
        Update: {
          ats_score?: number
          company?: string
          complaint_count?: number
          ghost_days?: number
          id?: string
          rejection_velocity?: number
          updated_at?: string
        }
        Relationships: []
      }
      shoutbox_messages: {
        Row: {
          body: string
          created_at: string
          emoji: string
          handle: string
          hub: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          emoji?: string
          handle: string
          hub: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          emoji?: string
          handle?: string
          hub?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_anonymous_confessions: {
        Row: {
          body: string | null
          created_at: string | null
          handle: string | null
          hub: string | null
          id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          handle?: string | null
          hub?: string | null
          id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          handle?: string | null
          hub?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_lead: {
        Args: { p_deal_text?: string; p_lead_id: string; p_urgency?: number }
        Returns: string
      }
      admin_set_deal_active: {
        Args: { p_active: boolean; p_deal_id: string }
        Returns: boolean
      }
      admin_set_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      cast_poll_vote: {
        Args: { p_choice: string; p_hub: string }
        Returns: {
          chill: number
          danger: number
          thread: number
          total: number
        }[]
      }
      check_in_at_deal: {
        Args: { p_deal_id: string; p_lat: number; p_lng: number }
        Returns: {
          commuting_count: number
          distance_km: number
          status: string
          verified_at_venue_count: number
        }[]
      }
      claim_first_admin: { Args: never; Returns: boolean }
      claim_merchant_role: { Args: { p_pub_name?: string }; Returns: boolean }
      delete_post_by_ticket: { Args: { ticket: string }; Returns: boolean }
      file_shame_complaint: {
        Args: { p_company: string; p_severity: number }
        Returns: {
          ats_score: number
          company: string
          complaint_count: number
          ghost_days: number
          id: string
          rejection_velocity: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "shame_metrics"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_city_status: {
        Args: { p_city: string }
        Returns: {
          active_merchants: number
          launched: boolean
          target: number
          vote_count: number
        }[]
      }
      get_poll_counts: {
        Args: { p_hub: string }
        Returns: {
          chill: number
          danger: number
          thread: number
          total: number
        }[]
      }
      get_profile_testimonials: {
        Args: { p_handle: string }
        Returns: {
          body: string
          created_at: string
          id: string
          pinned: boolean
        }[]
      }
      get_public_profile: {
        Args: { p_handle: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          facebook_url: string
          github_url: string
          handle: string
          id: string
          instagram_url: string
          linkedin_url: string
          pub_name: string
          role: Database["public"]["Enums"]["app_role"]
          twitter_url: string
          website_url: string
        }[]
      }
      get_recent_visits: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          id: string
          via: string
          visitor_handle: string
        }[]
      }
      get_user_tip_address: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cheers: { Args: { post_id: string }; Returns: number }
      increment_heading_there: { Args: { p_deal_id: string }; Returns: number }
      mark_bypass_referred: {
        Args: { p_id: string }
        Returns: {
          candidate_profile: string
          created_at: string
          id: string
          referred: boolean
          referred_at: string | null
          referrer_hash: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "bypass_referrals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      report_post: { Args: { p_post_id: string }; Returns: undefined }
      submit_testimonial: {
        Args: { p_body: string; p_handle: string }
        Returns: string
      }
      submit_venue_vibe: {
        Args: {
          p_crowd: number
          p_deal_id: string
          p_noise: number
          p_vibe: number
        }
        Returns: {
          crowd_density: number
          noise_level: number
          vibe_sample_count: number
          vibe_type: number
        }[]
      }
      tribunal_vote: {
        Args: { p_post_id: string; p_vote: string }
        Returns: {
          is_hidden: boolean
          misconduct_votes: number
          valid_votes: number
        }[]
      }
      vote_for_city: {
        Args: { p_city: string; p_session_id?: string }
        Returns: {
          already_voted: boolean
          launched: boolean
          target: number
          vote_count: number
        }[]
      }
    }
    Enums: {
      app_role: "employee" | "merchant" | "admin"
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
      app_role: ["employee", "merchant", "admin"],
    },
  },
} as const
