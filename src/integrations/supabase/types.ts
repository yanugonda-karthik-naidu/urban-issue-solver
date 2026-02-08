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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          assigned_areas: string[] | null
          assigned_districts: string[] | null
          created_at: string | null
          department_id: string | null
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          assigned_areas?: string[] | null
          assigned_districts?: string[] | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          assigned_areas?: string[] | null
          assigned_districts?: string[] | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          justification: string | null
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      category_department_mapping: {
        Row: {
          category: string
          created_at: string
          department_id: string
          id: string
        }
        Insert: {
          category: string
          created_at?: string
          department_id: string
          id?: string
        }
        Update: {
          category?: string
          created_at?: string
          department_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_department_mapping_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: Database["public"]["Enums"]["department_type"]
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sla_hours: number
        }
        Insert: {
          code: Database["public"]["Enums"]["department_type"]
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sla_hours?: number
        }
        Update: {
          code?: Database["public"]["Enums"]["department_type"]
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sla_hours?: number
        }
        Relationships: []
      }
      escalation_history: {
        Row: {
          created_at: string
          escalated_by: string | null
          from_level: number
          id: string
          issue_id: string
          reason: string
          to_level: number
        }
        Insert: {
          created_at?: string
          escalated_by?: string | null
          from_level: number
          id?: string
          issue_id: string
          reason: string
          to_level: number
        }
        Update: {
          created_at?: string
          escalated_by?: string | null
          from_level?: number
          id?: string
          issue_id?: string
          reason?: string
          to_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "escalation_history_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_legal_mappings: {
        Row: {
          auto_mapped: boolean
          id: string
          issue_id: string
          legal_rule_id: string
          mapped_at: string
          mapped_by: string | null
        }
        Insert: {
          auto_mapped?: boolean
          id?: string
          issue_id: string
          legal_rule_id: string
          mapped_at?: string
          mapped_by?: string | null
        }
        Update: {
          auto_mapped?: boolean
          id?: string
          issue_id?: string
          legal_rule_id?: string
          mapped_at?: string
          mapped_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_legal_mappings_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_legal_mappings_legal_rule_id_fkey"
            columns: ["legal_rule_id"]
            isOneToOne: false
            referencedRelation: "legal_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          admin_remarks: string | null
          ai_severity_level: string | null
          ai_severity_reasoning: string | null
          ai_severity_score: number | null
          area: string | null
          assigned_worker_id: string | null
          category: string
          compliance_status: string | null
          created_at: string | null
          department_id: string | null
          description: string
          district: string | null
          escalated: boolean | null
          escalated_at: string | null
          escalation_level: number | null
          id: string
          image_validation_confidence: number | null
          image_validation_reasoning: string | null
          image_validation_status: string | null
          is_anonymous: boolean
          latitude: number | null
          legal_compliance_deadline: string | null
          location_sensitivity_zone: string | null
          longitude: number | null
          nearby_reports_count: number | null
          photo_url: string | null
          priority_score: number | null
          resolved_at: string | null
          sla_deadline: string | null
          state: string | null
          status: string | null
          title: string
          trust_score_at_creation: number | null
          updated_at: string | null
          user_id: string
          verification_level_at_creation:
            | Database["public"]["Enums"]["user_verification_level"]
            | null
        }
        Insert: {
          admin_remarks?: string | null
          ai_severity_level?: string | null
          ai_severity_reasoning?: string | null
          ai_severity_score?: number | null
          area?: string | null
          assigned_worker_id?: string | null
          category: string
          compliance_status?: string | null
          created_at?: string | null
          department_id?: string | null
          description: string
          district?: string | null
          escalated?: boolean | null
          escalated_at?: string | null
          escalation_level?: number | null
          id?: string
          image_validation_confidence?: number | null
          image_validation_reasoning?: string | null
          image_validation_status?: string | null
          is_anonymous?: boolean
          latitude?: number | null
          legal_compliance_deadline?: string | null
          location_sensitivity_zone?: string | null
          longitude?: number | null
          nearby_reports_count?: number | null
          photo_url?: string | null
          priority_score?: number | null
          resolved_at?: string | null
          sla_deadline?: string | null
          state?: string | null
          status?: string | null
          title: string
          trust_score_at_creation?: number | null
          updated_at?: string | null
          user_id: string
          verification_level_at_creation?:
            | Database["public"]["Enums"]["user_verification_level"]
            | null
        }
        Update: {
          admin_remarks?: string | null
          ai_severity_level?: string | null
          ai_severity_reasoning?: string | null
          ai_severity_score?: number | null
          area?: string | null
          assigned_worker_id?: string | null
          category?: string
          compliance_status?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string
          district?: string | null
          escalated?: boolean | null
          escalated_at?: string | null
          escalation_level?: number | null
          id?: string
          image_validation_confidence?: number | null
          image_validation_reasoning?: string | null
          image_validation_status?: string | null
          is_anonymous?: boolean
          latitude?: number | null
          legal_compliance_deadline?: string | null
          location_sensitivity_zone?: string | null
          longitude?: number | null
          nearby_reports_count?: number | null
          photo_url?: string | null
          priority_score?: number | null
          resolved_at?: string | null
          sla_deadline?: string | null
          state?: string | null
          status?: string | null
          title?: string
          trust_score_at_creation?: number | null
          updated_at?: string | null
          user_id?: string
          verification_level_at_creation?:
            | Database["public"]["Enums"]["user_verification_level"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_rules: {
        Row: {
          act_name: string
          category: string
          city: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          responsible_authority: string
          section_clause: string | null
          sla_days: number | null
          state: string | null
          updated_at: string
          version: number
        }
        Insert: {
          act_name: string
          category: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          responsible_authority: string
          section_clause?: string | null
          sla_days?: number | null
          state?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          act_name?: string
          category?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          responsible_authority?: string
          section_clause?: string | null
          sla_days?: number | null
          state?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          issue_id: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          area: string | null
          avatar_url: string | null
          created_at: string | null
          district: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          created_at?: string | null
          district?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          created_at?: string | null
          district?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_verification: {
        Row: {
          consent_given: boolean
          consent_given_at: string | null
          created_at: string
          id: string
          rejected_reports_count: number
          revoked_at: string | null
          trust_score: number
          updated_at: string
          user_id: string
          valid_reports_count: number
          verification_level: Database["public"]["Enums"]["user_verification_level"]
          verification_metadata: Json | null
          verification_method: Database["public"]["Enums"]["verification_method"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          consent_given?: boolean
          consent_given_at?: string | null
          created_at?: string
          id?: string
          rejected_reports_count?: number
          revoked_at?: string | null
          trust_score?: number
          updated_at?: string
          user_id: string
          valid_reports_count?: number
          verification_level?: Database["public"]["Enums"]["user_verification_level"]
          verification_metadata?: Json | null
          verification_method?: Database["public"]["Enums"]["verification_method"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_given_at?: string | null
          created_at?: string
          id?: string
          rejected_reports_count?: number
          revoked_at?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string
          valid_reports_count?: number
          verification_level?: Database["public"]["Enums"]["user_verification_level"]
          verification_metadata?: Json | null
          verification_method?: Database["public"]["Enums"]["verification_method"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      workers: {
        Row: {
          assigned_area: string | null
          assigned_district: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          assigned_area?: string | null
          assigned_district?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          assigned_area?: string | null
          assigned_district?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_can_access_issue: {
        Args: { check_issue_id: string; check_user_id: string }
        Returns: boolean
      }
      calculate_issue_priority: {
        Args: { p_issue_id: string }
        Returns: number
      }
      calculate_trust_score: { Args: { p_user_id: string }; Returns: number }
      count_nearby_reports: {
        Args: {
          p_area: string
          p_category: string
          p_district: string
          p_issue_id: string
        }
        Returns: number
      }
      create_audit_log: {
        Args: {
          p_action_type: string
          p_entity_id: string
          p_entity_type: string
          p_justification?: string
          p_new_value?: Json
          p_old_value?: Json
        }
        Returns: string
      }
      get_admin_department: { Args: { check_user_id: string }; Returns: string }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_super_admin: { Args: { check_user_id: string }; Returns: boolean }
    }
    Enums: {
      admin_role: "super_admin" | "department_admin"
      department_type:
        | "roads"
        | "sanitation"
        | "electricity"
        | "water"
        | "traffic"
        | "municipality"
        | "other"
      user_verification_level: "unverified" | "verified" | "anonymous"
      verification_method:
        | "none"
        | "digilocker"
        | "voter_id"
        | "municipal_id"
        | "admin_verified"
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
      admin_role: ["super_admin", "department_admin"],
      department_type: [
        "roads",
        "sanitation",
        "electricity",
        "water",
        "traffic",
        "municipality",
        "other",
      ],
      user_verification_level: ["unverified", "verified", "anonymous"],
      verification_method: [
        "none",
        "digilocker",
        "voter_id",
        "municipal_id",
        "admin_verified",
      ],
    },
  },
} as const
