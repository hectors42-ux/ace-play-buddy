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
        Args: { _court_id: string; _notes?: string; _starts_at: string }
        Returns: {
          cancelled_at: string | null
          cancelled_by: string | null
          court_id: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
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
      generate_bracket: {
        Args: { _category_id: string; _seed_order?: string[] }
        Returns: number
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
      is_club_admin_of: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_match_player: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      opponent_registration: {
        Args: { _match_id: string; _user_id: string }
        Returns: string
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
      match_result_proposal_status: "propuesto" | "confirmado" | "rechazado"
      match_status:
        | "pendiente"
        | "programado"
        | "jugado"
        | "walkover"
        | "cancelado"
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
      match_result_proposal_status: ["propuesto", "confirmado", "rechazado"],
      match_status: [
        "pendiente",
        "programado",
        "jugado",
        "walkover",
        "cancelado",
      ],
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
