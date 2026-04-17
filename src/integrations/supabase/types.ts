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
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_tenant_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "super_admin" | "club_admin" | "staff" | "member"
      booking_status: "confirmada" | "cancelada"
      court_surface: "arcilla" | "dura" | "cesped" | "sintetico"
      dues_status: "al_dia" | "pendiente" | "moroso" | "suspendido"
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
      court_surface: ["arcilla", "dura", "cesped", "sintetico"],
      dues_status: ["al_dia", "pendiente", "moroso", "suspendido"],
    },
  },
} as const
