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
      booking_rules: {
        Row: {
          allow_back_to_back: boolean
          max_active_bookings: number
          max_advance_days: number
          min_cancel_hours: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_back_to_back?: boolean
          max_active_bookings?: number
          max_advance_days?: number
          min_cancel_hours?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_back_to_back?: boolean
          max_active_bookings?: number
          max_advance_days?: number
          min_cancel_hours?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          court_id: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          partner_user_id: string | null
          period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          court_id: string
          created_at?: string
          ends_at: string
          id?: string
          notes?: string | null
          partner_user_id?: string | null
          period?: unknown
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          court_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          notes?: string | null
          partner_user_id?: string | null
          period?: unknown
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          is_active: boolean
          is_indoor: boolean
          name: string
          opens_at: string
          slot_minutes: number
          sort_order: number
          surface: Database["public"]["Enums"]["court_surface"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_indoor?: boolean
          name: string
          opens_at?: string
          slot_minutes?: number
          sort_order?: number
          surface?: Database["public"]["Enums"]["court_surface"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_indoor?: boolean
          name?: string
          opens_at?: string
          slot_minutes?: number
          sort_order?: number
          surface?: Database["public"]["Enums"]["court_surface"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ladder_challenges: {
        Row: {
          booking_id: string | null
          cancel_reason: string | null
          challenged_position: number
          challenged_user_id: string
          challenger_position: number
          challenger_user_id: string
          court_id: string | null
          created_at: string
          expires_at: string
          id: string
          ladder_id: string
          loser_user_id: string | null
          played_at: string | null
          proposed_at: string
          reject_reason: string | null
          responded_at: string | null
          result_confirmed_at: string | null
          result_proposed_at: string | null
          result_proposed_by: string | null
          retired: boolean
          scheduled_at: string | null
          score: Json | null
          status: Database["public"]["Enums"]["ladder_challenge_status"]
          tenant_id: string
          updated_at: string
          walkover: boolean
          winner_user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          cancel_reason?: string | null
          challenged_position: number
          challenged_user_id: string
          challenger_position: number
          challenger_user_id: string
          court_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ladder_id: string
          loser_user_id?: string | null
          played_at?: string | null
          proposed_at?: string
          reject_reason?: string | null
          responded_at?: string | null
          result_confirmed_at?: string | null
          result_proposed_at?: string | null
          result_proposed_by?: string | null
          retired?: boolean
          scheduled_at?: string | null
          score?: Json | null
          status?: Database["public"]["Enums"]["ladder_challenge_status"]
          tenant_id: string
          updated_at?: string
          walkover?: boolean
          winner_user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          cancel_reason?: string | null
          challenged_position?: number
          challenged_user_id?: string
          challenger_position?: number
          challenger_user_id?: string
          court_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ladder_id?: string
          loser_user_id?: string | null
          played_at?: string | null
          proposed_at?: string
          reject_reason?: string | null
          responded_at?: string | null
          result_confirmed_at?: string | null
          result_proposed_at?: string | null
          result_proposed_by?: string | null
          retired?: boolean
          scheduled_at?: string | null
          score?: Json | null
          status?: Database["public"]["Enums"]["ladder_challenge_status"]
          tenant_id?: string
          updated_at?: string
          walkover?: boolean
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ladder_challenges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_challenges_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_challenges_ladder_id_fkey"
            columns: ["ladder_id"]
            isOneToOne: false
            referencedRelation: "ladders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_challenges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ladder_history: {
        Row: {
          challenge_id: string | null
          id: string
          ladder_id: string
          notes: string | null
          position_after: number | null
          position_before: number | null
          reason: Database["public"]["Enums"]["ladder_history_reason"]
          recorded_at: string
          recorded_by: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          id?: string
          ladder_id: string
          notes?: string | null
          position_after?: number | null
          position_before?: number | null
          reason: Database["public"]["Enums"]["ladder_history_reason"]
          recorded_at?: string
          recorded_by?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          id?: string
          ladder_id?: string
          notes?: string | null
          position_after?: number | null
          position_before?: number | null
          reason?: Database["public"]["Enums"]["ladder_history_reason"]
          recorded_at?: string
          recorded_by?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ladder_history_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "ladder_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_history_ladder_id_fkey"
            columns: ["ladder_id"]
            isOneToOne: false
            referencedRelation: "ladders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ladder_positions: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          ladder_id: string
          last_challenged_at: string | null
          last_played_at: string | null
          losses: number
          position: number
          status: Database["public"]["Enums"]["ladder_position_status"]
          tenant_id: string
          updated_at: string
          user_id: string
          walkovers_against: number
          walkovers_for: number
          wins: number
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          ladder_id: string
          last_challenged_at?: string | null
          last_played_at?: string | null
          losses?: number
          position: number
          status?: Database["public"]["Enums"]["ladder_position_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
          walkovers_against?: number
          walkovers_for?: number
          wins?: number
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          ladder_id?: string
          last_challenged_at?: string | null
          last_played_at?: string | null
          losses?: number
          position?: number
          status?: Database["public"]["Enums"]["ladder_position_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
          walkovers_against?: number
          walkovers_for?: number
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "ladder_positions_ladder_id_fkey"
            columns: ["ladder_id"]
            isOneToOne: false
            referencedRelation: "ladders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ladders: {
        Row: {
          challenge_window_days: number
          cooldown_days: number
          created_at: string
          created_by: string | null
          description: string | null
          discipline: Database["public"]["Enums"]["tournament_discipline"]
          gender: Database["public"]["Enums"]["category_gender"]
          id: string
          inactivity_days: number
          inactivity_drop_positions: number
          is_active: boolean
          loser_drops_position: boolean
          max_position_jump: number
          name: string
          response_window_hours: number
          result_validation_mode: Database["public"]["Enums"]["result_validation_mode"]
          season_ends_at: string | null
          season_starts_at: string | null
          surface: Database["public"]["Enums"]["court_surface"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          challenge_window_days?: number
          cooldown_days?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: Database["public"]["Enums"]["tournament_discipline"]
          gender?: Database["public"]["Enums"]["category_gender"]
          id?: string
          inactivity_days?: number
          inactivity_drop_positions?: number
          is_active?: boolean
          loser_drops_position?: boolean
          max_position_jump?: number
          name: string
          response_window_hours?: number
          result_validation_mode?: Database["public"]["Enums"]["result_validation_mode"]
          season_ends_at?: string | null
          season_starts_at?: string | null
          surface?: Database["public"]["Enums"]["court_surface"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          challenge_window_days?: number
          cooldown_days?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline?: Database["public"]["Enums"]["tournament_discipline"]
          gender?: Database["public"]["Enums"]["category_gender"]
          id?: string
          inactivity_days?: number
          inactivity_drop_positions?: number
          is_active?: boolean
          loser_drops_position?: boolean
          max_position_jump?: number
          name?: string
          response_window_hours?: number
          result_validation_mode?: Database["public"]["Enums"]["result_validation_mode"]
          season_ends_at?: string | null
          season_starts_at?: string | null
          surface?: Database["public"]["Enums"]["court_surface"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ladders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      member_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          invited_by: string | null
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          rut: string | null
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          first_name: string
          id?: string
          invited_by?: string | null
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          rut?: string | null
          tenant_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          invited_by?: string | null
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          rut?: string | null
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      player_ratings: {
        Row: {
          competitive_matches: number
          created_at: string
          id: string
          initial_level: number | null
          last_change_delta: number
          last_match_at: string | null
          level: number
          matches_played: number
          onboarding_completed_at: string | null
          reliability: number
          sport: Database["public"]["Enums"]["rating_sport"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          competitive_matches?: number
          created_at?: string
          id?: string
          initial_level?: number | null
          last_change_delta?: number
          last_match_at?: string | null
          level?: number
          matches_played?: number
          onboarding_completed_at?: string | null
          reliability?: number
          sport?: Database["public"]["Enums"]["rating_sport"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          competitive_matches?: number
          created_at?: string
          id?: string
          initial_level?: number | null
          last_change_delta?: number
          last_match_at?: string | null
          level?: number
          matches_played?: number
          onboarding_completed_at?: string | null
          reliability?: number
          sport?: Database["public"]["Enums"]["rating_sport"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          club_ranking: number | null
          created_at: string
          dues_status: Database["public"]["Enums"]["dues_status"]
          email: string
          first_name: string
          id: string
          last_name: string
          member_since: string
          ntrp_level: number | null
          phone: string | null
          rut: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          club_ranking?: number | null
          created_at?: string
          dues_status?: Database["public"]["Enums"]["dues_status"]
          email: string
          first_name: string
          id?: string
          last_name: string
          member_since?: string
          ntrp_level?: number | null
          phone?: string | null
          rut?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          club_ranking?: number | null
          created_at?: string
          dues_status?: Database["public"]["Enums"]["dues_status"]
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          member_since?: string
          ntrp_level?: number | null
          phone?: string | null
          rut?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_history: {
        Row: {
          delta: number
          id: string
          level_after: number
          level_before: number
          notes: string | null
          recorded_at: string
          recorded_by: string | null
          reliability_after: number
          reliability_before: number
          source: Database["public"]["Enums"]["rating_change_source"]
          source_ref_id: string | null
          sport: Database["public"]["Enums"]["rating_sport"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          delta: number
          id?: string
          level_after: number
          level_before: number
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          reliability_after: number
          reliability_before: number
          source: Database["public"]["Enums"]["rating_change_source"]
          source_ref_id?: string | null
          sport: Database["public"]["Enums"]["rating_sport"]
          tenant_id: string
          user_id: string
        }
        Update: {
          delta?: number
          id?: string
          level_after?: number
          level_before?: number
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          reliability_after?: number
          reliability_before?: number
          source?: Database["public"]["Enums"]["rating_change_source"]
          source_ref_id?: string | null
          sport?: Database["public"]["Enums"]["rating_sport"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_rating_config: {
        Row: {
          category_a_min: number
          category_b_max: number
          category_c_max: number
          created_at: string
          k_factor_high_reliability: number
          k_factor_low_reliability: number
          k_factor_mid_reliability: number
          min_reliability_for_category: number
          reliability_decay_after_days: number
          reliability_decay_per_period: number
          reliability_gain_per_match: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category_a_min?: number
          category_b_max?: number
          category_c_max?: number
          created_at?: string
          k_factor_high_reliability?: number
          k_factor_low_reliability?: number
          k_factor_mid_reliability?: number
          min_reliability_for_category?: number
          reliability_decay_after_days?: number
          reliability_decay_per_period?: number
          reliability_gain_per_match?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category_a_min?: number
          category_b_max?: number
          category_c_max?: number
          created_at?: string
          k_factor_high_reliability?: number
          k_factor_low_reliability?: number
          k_factor_mid_reliability?: number
          min_reliability_for_category?: number
          reliability_decay_after_days?: number
          reliability_decay_per_period?: number
          reliability_gain_per_match?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_rating_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_primary: string
          brand_primary_deep: string
          brand_primary_glow: string
          created_at: string
          domain: string | null
          id: string
          logo_url: string | null
          name: string
          short_name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          brand_primary?: string
          brand_primary_deep?: string
          brand_primary_glow?: string
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          short_name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          brand_primary?: string
          brand_primary_deep?: string
          brand_primary_glow?: string
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          short_name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_categories: {
        Row: {
          bracket_generated_at: string | null
          category_label: string
          created_at: string
          discipline: Database["public"]["Enums"]["tournament_discipline"]
          gender: Database["public"]["Enums"]["category_gender"]
          id: string
          max_participants: number
          name: string
          seeding_method: Database["public"]["Enums"]["seeding_method"]
          sort_order: number
          status: Database["public"]["Enums"]["tournament_status"]
          surface: Database["public"]["Enums"]["court_surface"]
          tenant_id: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          bracket_generated_at?: string | null
          category_label?: string
          created_at?: string
          discipline?: Database["public"]["Enums"]["tournament_discipline"]
          gender?: Database["public"]["Enums"]["category_gender"]
          id?: string
          max_participants?: number
          name: string
          seeding_method?: Database["public"]["Enums"]["seeding_method"]
          sort_order?: number
          status?: Database["public"]["Enums"]["tournament_status"]
          surface?: Database["public"]["Enums"]["court_surface"]
          tenant_id: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          bracket_generated_at?: string | null
          category_label?: string
          created_at?: string
          discipline?: Database["public"]["Enums"]["tournament_discipline"]
          gender?: Database["public"]["Enums"]["category_gender"]
          id?: string
          max_participants?: number
          name?: string
          seeding_method?: Database["public"]["Enums"]["seeding_method"]
          sort_order?: number
          status?: Database["public"]["Enums"]["tournament_status"]
          surface?: Database["public"]["Enums"]["court_surface"]
          tenant_id?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_categories_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_match_reschedule_requests: {
        Row: {
          created_at: string
          id: string
          match_id: string
          proposed_by: string
          proposed_court_id: string | null
          proposed_starts_at: string
          reject_reason: string | null
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["reschedule_request_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          proposed_by: string
          proposed_court_id?: string | null
          proposed_starts_at: string
          reject_reason?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["reschedule_request_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          proposed_by?: string
          proposed_court_id?: string | null
          proposed_starts_at?: string
          reject_reason?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["reschedule_request_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_match_reschedule_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_reschedule_requests_proposed_court_id_fkey"
            columns: ["proposed_court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_reschedule_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_match_results: {
        Row: {
          created_at: string
          id: string
          match_id: string
          proposed_by: string
          reject_reason: string | null
          responded_at: string | null
          responded_by: string | null
          retired: boolean
          score: Json | null
          status: Database["public"]["Enums"]["match_result_proposal_status"]
          tenant_id: string
          updated_at: string
          walkover: boolean
          winner_registration_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          proposed_by: string
          reject_reason?: string | null
          responded_at?: string | null
          responded_by?: string | null
          retired?: boolean
          score?: Json | null
          status?: Database["public"]["Enums"]["match_result_proposal_status"]
          tenant_id: string
          updated_at?: string
          walkover?: boolean
          winner_registration_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          proposed_by?: string
          reject_reason?: string | null
          responded_at?: string | null
          responded_by?: string | null
          retired?: boolean
          score?: Json | null
          status?: Database["public"]["Enums"]["match_result_proposal_status"]
          tenant_id?: string
          updated_at?: string
          walkover?: boolean
          winner_registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_results_winner_registration_id_fkey"
            columns: ["winner_registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          booking_id: string | null
          bracket_position: number
          category_id: string
          court_id: string | null
          created_at: string
          id: string
          next_match_id: string | null
          next_match_slot: string | null
          played_at: string | null
          registration_a_id: string | null
          registration_b_id: string | null
          retired: boolean
          round: number
          scheduled_at: string | null
          score: Json | null
          status: Database["public"]["Enums"]["match_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          walkover: boolean
          winner_registration_id: string | null
        }
        Insert: {
          booking_id?: string | null
          bracket_position: number
          category_id: string
          court_id?: string | null
          created_at?: string
          id?: string
          next_match_id?: string | null
          next_match_slot?: string | null
          played_at?: string | null
          registration_a_id?: string | null
          registration_b_id?: string | null
          retired?: boolean
          round: number
          scheduled_at?: string | null
          score?: Json | null
          status?: Database["public"]["Enums"]["match_status"]
          tenant_id: string
          tournament_id: string
          updated_at?: string
          walkover?: boolean
          winner_registration_id?: string | null
        }
        Update: {
          booking_id?: string | null
          bracket_position?: number
          category_id?: string
          court_id?: string | null
          created_at?: string
          id?: string
          next_match_id?: string | null
          next_match_slot?: string | null
          played_at?: string | null
          registration_a_id?: string | null
          registration_b_id?: string | null
          retired?: boolean
          round?: number
          scheduled_at?: string | null
          score?: Json | null
          status?: Database["public"]["Enums"]["match_status"]
          tenant_id?: string
          tournament_id?: string
          updated_at?: string
          walkover?: boolean
          winner_registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_registration_a_id_fkey"
            columns: ["registration_a_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_registration_b_id_fkey"
            columns: ["registration_b_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_registration_id_fkey"
            columns: ["winner_registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          category_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          player1_user_id: string
          player2_user_id: string | null
          registered_at: string
          seed: number | null
          status: Database["public"]["Enums"]["registration_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          category_id: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          player1_user_id: string
          player2_user_id?: string | null
          registered_at?: string
          seed?: number | null
          status?: Database["public"]["Enums"]["registration_status"]
          tenant_id: string
          tournament_id: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          category_id?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          player1_user_id?: string
          player2_user_id?: string | null
          registered_at?: string
          seed?: number | null
          status?: Database["public"]["Enums"]["registration_status"]
          tenant_id?: string
          tournament_id?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          entry_fee_clp: number
          id: string
          name: string
          registration_closes_at: string
          registration_opens_at: string
          reschedule_enabled: boolean
          reschedule_min_notice_hours: number
          reschedule_window_hours: number
          result_validation_mode: Database["public"]["Enums"]["result_validation_mode"]
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["tournament_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          entry_fee_clp?: number
          id?: string
          name: string
          registration_closes_at: string
          registration_opens_at: string
          reschedule_enabled?: boolean
          reschedule_min_notice_hours?: number
          reschedule_window_hours?: number
          result_validation_mode?: Database["public"]["Enums"]["result_validation_mode"]
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["tournament_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          entry_fee_clp?: number
          id?: string
          name?: string
          registration_closes_at?: string
          registration_opens_at?: string
          reschedule_enabled?: boolean
          reschedule_min_notice_hours?: number
          reschedule_window_hours?: number
          result_validation_mode?: Database["public"]["Enums"]["result_validation_mode"]
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _apply_ladder_result: {
        Args: { _challenge_id: string }
        Returns: undefined
      }
      _apply_match_result: {
        Args: {
          _match_id: string
          _retired: boolean
          _score: Json
          _walkover: boolean
          _winner_registration_id: string
        }
        Returns: {
          booking_id: string | null
          bracket_position: number
          category_id: string
          court_id: string | null
          created_at: string
          id: string
          next_match_id: string | null
          next_match_slot: string | null
          played_at: string | null
          registration_a_id: string | null
          registration_b_id: string | null
          retired: boolean
          round: number
          scheduled_at: string | null
          score: Json | null
          status: Database["public"]["Enums"]["match_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          walkover: boolean
          winner_registration_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _apply_rating_for_match: {
        Args: {
          _loser_users: string[]
          _notes?: string
          _source: Database["public"]["Enums"]["rating_change_source"]
          _source_ref_id: string
          _sport: Database["public"]["Enums"]["rating_sport"]
          _winner_users: string[]
        }
        Returns: undefined
      }
      accept_doubles_invitation: {
        Args: { _registration_id: string }
        Returns: {
          category_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          player1_user_id: string
          player2_user_id: string | null
          registered_at: string
          seed: number | null
          status: Database["public"]["Enums"]["registration_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_booking: {
        Args: { _booking_id: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          court_id: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          partner_user_id: string | null
          period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_rating_onboarding: {
        Args: {
          _initial_level: number
          _initial_reliability?: number
          _sport: Database["public"]["Enums"]["rating_sport"]
        }
        Returns: {
          competitive_matches: number
          created_at: string
          id: string
          initial_level: number | null
          last_change_delta: number
          last_match_at: string | null
          level: number
          matches_played: number
          onboarding_completed_at: string | null
          reliability: number
          sport: Database["public"]["Enums"]["rating_sport"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_ratings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_ladder_result: { Args: { _challenge_id: string }; Returns: Json }
      confirm_match_result: {
        Args: { _proposal_id: string }
        Returns: {
          booking_id: string | null
          bracket_position: number
          category_id: string
          court_id: string | null
          created_at: string
          id: string
          next_match_id: string | null
          next_match_slot: string | null
          played_at: string | null
          registration_a_id: string | null
          registration_b_id: string | null
          retired: boolean
          round: number
          scheduled_at: string | null
          score: Json | null
          status: Database["public"]["Enums"]["match_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          walkover: boolean
          winner_registration_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_booking: {
        Args: {
          _court_id: string
          _notes?: string
          _partner_user_id: string
          _starts_at: string
        }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          court_id: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          partner_user_id: string | null
          period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_ladder_challenge: {
        Args: { _challenged_user_id: string; _ladder_id: string }
        Returns: {
          booking_id: string | null
          cancel_reason: string | null
          challenged_position: number
          challenged_user_id: string
          challenger_position: number
          challenger_user_id: string
          court_id: string | null
          created_at: string
          expires_at: string
          id: string
          ladder_id: string
          loser_user_id: string | null
          played_at: string | null
          proposed_at: string
          reject_reason: string | null
          responded_at: string | null
          result_confirmed_at: string | null
          result_proposed_at: string | null
          result_proposed_by: string | null
          retired: boolean
          scheduled_at: string | null
          score: Json | null
          status: Database["public"]["Enums"]["ladder_challenge_status"]
          tenant_id: string
          updated_at: string
          walkover: boolean
          winner_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ladder_challenges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_bracket: {
        Args: { _category_id: string; _seed_order?: string[] }
        Returns: number
      }
      get_club_ranking: {
        Args: { _sport: Database["public"]["Enums"]["rating_sport"] }
        Returns: {
          avatar_url: string
          category: string
          first_name: string
          last_match_at: string
          last_name: string
          level: number
          matches_played: number
          prev_rank_position: number
          rank_position: number
          reliability: number
          streak: number
          user_id: string
        }[]
      }
      get_my_primary_rating: {
        Args: never
        Returns: {
          competitive_matches: number
          created_at: string
          id: string
          initial_level: number | null
          last_change_delta: number
          last_match_at: string | null
          level: number
          matches_played: number
          onboarding_completed_at: string | null
          reliability: number
          sport: Database["public"]["Enums"]["rating_sport"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_ratings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_rating_with_category: {
        Args: never
        Returns: {
          category: string
          rating: Database["public"]["Tables"]["player_ratings"]["Row"]
        }[]
      }
      get_player_category: {
        Args: { _level: number; _tenant_id: string }
        Returns: string
      }
      get_player_streak: {
        Args: {
          _sport: Database["public"]["Enums"]["rating_sport"]
          _user_id: string
        }
        Returns: number
      }
      has_completed_rating_onboarding: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      home_pending_actions: {
        Args: never
        Returns: {
          doubles_invitations: number
          ladder_challenges_received: number
          ladder_results_to_confirm: number
          reschedule_requests: number
          total: number
          tournament_results_to_confirm: number
        }[]
      }
      is_club_admin_of: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_ladder_challenge_party: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
      is_match_player: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      join_ladder: {
        Args: { _ladder_id: string }
        Returns: {
          created_at: string
          id: string
          joined_at: string
          ladder_id: string
          last_challenged_at: string | null
          last_played_at: string | null
          losses: number
          position: number
          status: Database["public"]["Enums"]["ladder_position_status"]
          tenant_id: string
          updated_at: string
          user_id: string
          walkovers_against: number
          walkovers_for: number
          wins: number
        }
        SetofOptions: {
          from: "*"
          to: "ladder_positions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ladder_pending_counts: {
        Args: never
        Returns: {
          challenges_received: number
          expiring_soon: number
          results_to_confirm: number
          scheduled_matches: number
          total: number
        }[]
      }
      leave_ladder: { Args: { _ladder_id: string }; Returns: boolean }
      lower_my_rating: {
        Args: {
          _new_level: number
          _reason?: string
          _sport: Database["public"]["Enums"]["rating_sport"]
        }
        Returns: {
          competitive_matches: number
          created_at: string
          id: string
          initial_level: number | null
          last_change_delta: number
          last_match_at: string | null
          level: number
          matches_played: number
          onboarding_completed_at: string | null
          reliability: number
          sport: Database["public"]["Enums"]["rating_sport"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_ratings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_upcoming_bookings: {
        Args: { _limit?: number }
        Returns: {
          court_id: string
          court_name: string
          court_surface: Database["public"]["Enums"]["court_surface"]
          ends_at: string
          i_am_owner: boolean
          id: string
          other_first_name: string
          other_last_name: string
          partner_user_id: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string
        }[]
      }
      notifications_feed: {
        Args: never
        Returns: {
          created_at: string
          description: string
          kind: string
          link: string
          ref_id: string
          title: string
        }[]
      }
      opponent_registration: {
        Args: { _match_id: string; _user_id: string }
        Returns: string
      }
      process_ladder_expirations_run: { Args: never; Returns: Json }
      process_ladder_inactivity_run: { Args: never; Returns: Json }
      recalculate_rating_after_match: {
        Args: {
          _notes?: string
          _opponent_level: number
          _source: Database["public"]["Enums"]["rating_change_source"]
          _source_ref_id?: string
          _sport: Database["public"]["Enums"]["rating_sport"]
          _user_id: string
          _won: boolean
        }
        Returns: {
          competitive_matches: number
          created_at: string
          id: string
          initial_level: number | null
          last_change_delta: number
          last_match_at: string | null
          level: number
          matches_played: number
          onboarding_completed_at: string | null
          reliability: number
          sport: Database["public"]["Enums"]["rating_sport"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_ratings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_to_category: {
        Args: { _category_id: string; _player2_user_id?: string }
        Returns: {
          category_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          player1_user_id: string
          player2_user_id: string | null
          registered_at: string
          seed: number | null
          status: Database["public"]["Enums"]["registration_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_doubles_invitation: {
        Args: { _registration_id: string }
        Returns: {
          category_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          player1_user_id: string
          player2_user_id: string | null
          registered_at: string
          seed: number | null
          status: Database["public"]["Enums"]["registration_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_ladder_result: {
        Args: { _challenge_id: string; _reason?: string }
        Returns: Json
      }
      reject_match_result: {
        Args: { _proposal_id: string; _reason?: string }
        Returns: {
          created_at: string
          id: string
          match_id: string
          proposed_by: string
          reject_reason: string | null
          responded_at: string | null
          responded_by: string | null
          retired: boolean
          score: Json | null
          status: Database["public"]["Enums"]["match_result_proposal_status"]
          tenant_id: string
          updated_at: string
          walkover: boolean
          winner_registration_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tournament_match_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_match_reschedule: {
        Args: {
          _match_id: string
          _proposed_court_id: string
          _proposed_starts_at: string
        }
        Returns: {
          created_at: string
          id: string
          match_id: string
          proposed_by: string
          proposed_court_id: string | null
          proposed_starts_at: string
          reject_reason: string | null
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["reschedule_request_status"]
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tournament_match_reschedule_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_ladder_challenge: {
        Args: { _accept: boolean; _challenge_id: string; _reason?: string }
        Returns: {
          booking_id: string | null
          cancel_reason: string | null
          challenged_position: number
          challenged_user_id: string
          challenger_position: number
          challenger_user_id: string
          court_id: string | null
          created_at: string
          expires_at: string
          id: string
          ladder_id: string
          loser_user_id: string | null
          played_at: string | null
          proposed_at: string
          reject_reason: string | null
          responded_at: string | null
          result_confirmed_at: string | null
          result_proposed_at: string | null
          result_proposed_by: string | null
          retired: boolean
          scheduled_at: string | null
          score: Json | null
          status: Database["public"]["Enums"]["ladder_challenge_status"]
          tenant_id: string
          updated_at: string
          walkover: boolean
          winner_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ladder_challenges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_match_reschedule: {
        Args: { _accept: boolean; _reason?: string; _request_id: string }
        Returns: {
          created_at: string
          id: string
          match_id: string
          proposed_by: string
          proposed_court_id: string | null
          proposed_starts_at: string
          reject_reason: string | null
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["reschedule_request_status"]
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tournament_match_reschedule_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      schedule_ladder_match: {
        Args: { _challenge_id: string; _court_id: string; _starts_at: string }
        Returns: {
          booking_id: string | null
          cancel_reason: string | null
          challenged_position: number
          challenged_user_id: string
          challenger_position: number
          challenger_user_id: string
          court_id: string | null
          created_at: string
          expires_at: string
          id: string
          ladder_id: string
          loser_user_id: string | null
          played_at: string | null
          proposed_at: string
          reject_reason: string | null
          responded_at: string | null
          result_confirmed_at: string | null
          result_proposed_at: string | null
          result_proposed_by: string | null
          retired: boolean
          scheduled_at: string | null
          score: Json | null
          status: Database["public"]["Enums"]["ladder_challenge_status"]
          tenant_id: string
          updated_at: string
          walkover: boolean
          winner_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ladder_challenges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      schedule_match: {
        Args: { _court_id: string; _match_id: string; _starts_at: string }
        Returns: {
          booking_id: string | null
          bracket_position: number
          category_id: string
          court_id: string | null
          created_at: string
          id: string
          next_match_id: string | null
          next_match_slot: string | null
          played_at: string | null
          registration_a_id: string | null
          registration_b_id: string | null
          retired: boolean
          round: number
          scheduled_at: string | null
          score: Json | null
          status: Database["public"]["Enums"]["match_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          walkover: boolean
          winner_registration_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_ladder_result: {
        Args: {
          _challenge_id: string
          _retired?: boolean
          _score?: Json
          _walkover?: boolean
          _winner_user_id: string
        }
        Returns: Json
      }
      submit_match_result: {
        Args: {
          _match_id: string
          _retired?: boolean
          _score?: Json
          _walkover?: boolean
          _winner_registration_id: string
        }
        Returns: Json
      }
      tournament_pending_counts: {
        Args: never
        Returns: {
          admin_pending_registrations: number
          doubles_invitations: number
          reschedule_requests: number
          result_proposals: number
          total: number
        }[]
      }
      unschedule_match: {
        Args: { _match_id: string }
        Returns: {
          booking_id: string | null
          bracket_position: number
          category_id: string
          court_id: string | null
          created_at: string
          id: string
          next_match_id: string | null
          next_match_slot: string | null
          played_at: string | null
          registration_a_id: string | null
          registration_b_id: string | null
          retired: boolean
          round: number
          scheduled_at: string | null
          score: Json | null
          status: Database["public"]["Enums"]["match_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          walkover: boolean
          winner_registration_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_tenant_id: { Args: { _user_id: string }; Returns: string }
      withdraw_from_category: {
        Args: { _registration_id: string }
        Returns: {
          category_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          player1_user_id: string
          player2_user_id: string | null
          registered_at: string
          seed: number | null
          status: Database["public"]["Enums"]["registration_status"]
          tenant_id: string
          tournament_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "super_admin" | "club_admin" | "staff" | "member"
      booking_status: "confirmada" | "cancelada"
      category_gender: "varones" | "damas" | "mixto"
      court_surface: "arcilla" | "dura" | "cesped" | "sintetico"
      dues_status: "al_dia" | "pendiente" | "moroso" | "suspendido"
      ladder_challenge_status:
        | "propuesto"
        | "aceptado"
        | "rechazado"
        | "programado"
        | "jugado"
        | "expirado"
        | "cancelado"
      ladder_history_reason:
        | "ingreso"
        | "retiro"
        | "desafio_ganado"
        | "desafio_perdido"
        | "walkover"
        | "inactividad"
        | "ajuste_admin"
      ladder_position_status: "activo" | "inactivo" | "congelado"
      match_result_proposal_status: "propuesto" | "confirmado" | "rechazado"
      match_status:
        | "pendiente"
        | "programado"
        | "jugado"
        | "walkover"
        | "cancelado"
      rating_change_source:
        | "onboarding"
        | "open_match"
        | "ladder_challenge"
        | "tournament_match"
        | "admin_adjustment"
        | "user_manual_lower"
        | "ten_match_challenge"
      rating_sport: "tenis_singles" | "tenis_dobles" | "padel" | "pickleball"
      registration_status:
        | "pendiente_pareja"
        | "pendiente_admin"
        | "confirmada"
        | "rechazada"
        | "retirada"
      reschedule_request_status:
        | "pendiente"
        | "aceptada"
        | "rechazada"
        | "cancelada"
        | "expirada"
      result_validation_mode:
        | "solo_admin"
        | "jugadores_con_confirmacion"
        | "jugadores_con_aprobacion_admin"
      seeding_method: "manual" | "ntrp" | "ranking_club"
      tournament_discipline: "tenis_singles" | "tenis_dobles"
      tournament_format: "eliminacion_simple"
      tournament_status:
        | "borrador"
        | "inscripciones_abiertas"
        | "inscripciones_cerradas"
        | "en_curso"
        | "finalizado"
        | "cancelado"
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
      app_role: ["super_admin", "club_admin", "staff", "member"],
      booking_status: ["confirmada", "cancelada"],
      category_gender: ["varones", "damas", "mixto"],
      court_surface: ["arcilla", "dura", "cesped", "sintetico"],
      dues_status: ["al_dia", "pendiente", "moroso", "suspendido"],
      ladder_challenge_status: [
        "propuesto",
        "aceptado",
        "rechazado",
        "programado",
        "jugado",
        "expirado",
        "cancelado",
      ],
      ladder_history_reason: [
        "ingreso",
        "retiro",
        "desafio_ganado",
        "desafio_perdido",
        "walkover",
        "inactividad",
        "ajuste_admin",
      ],
      ladder_position_status: ["activo", "inactivo", "congelado"],
      match_result_proposal_status: ["propuesto", "confirmado", "rechazado"],
      match_status: [
        "pendiente",
        "programado",
        "jugado",
        "walkover",
        "cancelado",
      ],
      rating_change_source: [
        "onboarding",
        "open_match",
        "ladder_challenge",
        "tournament_match",
        "admin_adjustment",
        "user_manual_lower",
        "ten_match_challenge",
      ],
      rating_sport: ["tenis_singles", "tenis_dobles", "padel", "pickleball"],
      registration_status: [
        "pendiente_pareja",
        "pendiente_admin",
        "confirmada",
        "rechazada",
        "retirada",
      ],
      reschedule_request_status: [
        "pendiente",
        "aceptada",
        "rechazada",
        "cancelada",
        "expirada",
      ],
      result_validation_mode: [
        "solo_admin",
        "jugadores_con_confirmacion",
        "jugadores_con_aprobacion_admin",
      ],
      seeding_method: ["manual", "ntrp", "ranking_club"],
      tournament_discipline: ["tenis_singles", "tenis_dobles"],
      tournament_format: ["eliminacion_simple"],
      tournament_status: [
        "borrador",
        "inscripciones_abiertas",
        "inscripciones_cerradas",
        "en_curso",
        "finalizado",
        "cancelado",
      ],
    },
  },
} as const
