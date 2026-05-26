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
      findings: {
        Row: {
          bad_code: string | null
          category: string | null
          confidence: number | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          line_end: number | null
          line_start: number | null
          review_id: string
          severity: string
          suggested_fix: string | null
          title: string
        }
        Insert: {
          bad_code?: string | null
          category?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          line_end?: number | null
          line_start?: number | null
          review_id: string
          severity: string
          suggested_fix?: string | null
          title: string
        }
        Update: {
          bad_code?: string | null
          category?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          line_end?: number | null
          line_start?: number | null
          review_id?: string
          severity?: string
          suggested_fix?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      github_installations: {
        Row: {
          account_login: string
          account_type: string | null
          created_at: string
          id: string
          installation_id: number
          repository_selection: string | null
          user_id: string
        }
        Insert: {
          account_login: string
          account_type?: string | null
          created_at?: string
          id?: string
          installation_id: number
          repository_selection?: string | null
          user_id: string
        }
        Update: {
          account_login?: string
          account_type?: string | null
          created_at?: string
          id?: string
          installation_id?: number
          repository_selection?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          github_access_token: string | null
          github_username: string | null
          id: string
          is_admin: boolean
          plan: string
          reviews_used_this_month: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          github_access_token?: string | null
          github_username?: string | null
          id: string
          is_admin?: boolean
          plan?: string
          reviews_used_this_month?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          github_access_token?: string | null
          github_username?: string | null
          id?: string
          is_admin?: boolean
          plan?: string
          reviews_used_this_month?: number
          updated_at?: string
        }
        Relationships: []
      }
      review_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          installation_id: number | null
          payload: Json | null
          pr_url: string
          review_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          installation_id?: number | null
          payload?: Json | null
          pr_url: string
          review_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          installation_id?: number | null
          payload?: Json | null
          pr_url?: string
          review_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          additions: number | null
          branch_from: string | null
          branch_to: string | null
          created_at: string
          deletions: number | null
          error_message: string | null
          files_changed: number | null
          health_score: number | null
          id: string
          is_public: boolean
          pr_author: string | null
          pr_number: number | null
          pr_title: string | null
          pr_url: string
          repo_name: string | null
          repo_owner: string | null
          share_token: string | null
          status: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additions?: number | null
          branch_from?: string | null
          branch_to?: string | null
          created_at?: string
          deletions?: number | null
          error_message?: string | null
          files_changed?: number | null
          health_score?: number | null
          id?: string
          is_public?: boolean
          pr_author?: string | null
          pr_number?: number | null
          pr_title?: string | null
          pr_url: string
          repo_name?: string | null
          repo_owner?: string | null
          share_token?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additions?: number | null
          branch_from?: string | null
          branch_to?: string | null
          created_at?: string
          deletions?: number | null
          error_message?: string | null
          files_changed?: number | null
          health_score?: number | null
          id?: string
          is_public?: boolean
          pr_author?: string | null
          pr_number?: number | null
          pr_title?: string | null
          pr_url?: string
          repo_name?: string | null
          repo_owner?: string | null
          share_token?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          accepted_at: string | null
          email: string | null
          id: string
          invited_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          email?: string | null
          id?: string
          invited_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          email?: string | null
          id?: string
          invited_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
