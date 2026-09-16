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
      fmls_credits: {
        Row: {
          created_at: string
          credit_amount: number
          entered_by: string | null
          fmls_number: string
          id: string
          invoice_month: string | null
          matched_request_id: string | null
        }
        Insert: {
          created_at?: string
          credit_amount: number
          entered_by?: string | null
          fmls_number: string
          id?: string
          invoice_month?: string | null
          matched_request_id?: string | null
        }
        Update: {
          created_at?: string
          credit_amount?: number
          entered_by?: string | null
          fmls_number?: string
          id?: string
          invoice_month?: string | null
          matched_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fmls_credits_matched_request_id_fkey"
            columns: ["matched_request_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          agent_email: string | null
          agent_fmls_id: string | null
          agent_name: string
          bank_account_reference: string | null
          bank_name: string | null
          broker_email: string | null
          broker_name: string | null
          closing_date: string | null
          created_at: string
          credit_amount: number | null
          credit_entered_at: string | null
          credit_entered_by: string | null
          fee_amount: number | null
          fmls_number: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          prior_waiver: boolean
          prior_waiver_date: string | null
          prior_waiver_details: string | null
          processed_at: string | null
          processed_by: string | null
          processed_note: string | null
          property_address: string | null
          refund_amount: number | null
          status: Database["public"]["Enums"]["refund_status"]
          submission_date: string | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at: string
        }
        Insert: {
          agent_email?: string | null
          agent_fmls_id?: string | null
          agent_name: string
          bank_account_reference?: string | null
          bank_name?: string | null
          broker_email?: string | null
          broker_name?: string | null
          closing_date?: string | null
          created_at?: string
          credit_amount?: number | null
          credit_entered_at?: string | null
          credit_entered_by?: string | null
          fee_amount?: number | null
          fmls_number: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          prior_waiver?: boolean
          prior_waiver_date?: string | null
          prior_waiver_details?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processed_note?: string | null
          property_address?: string | null
          refund_amount?: number | null
          status?: Database["public"]["Enums"]["refund_status"]
          submission_date?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string
        }
        Update: {
          agent_email?: string | null
          agent_fmls_id?: string | null
          agent_name?: string
          bank_account_reference?: string | null
          bank_name?: string | null
          broker_email?: string | null
          broker_name?: string | null
          closing_date?: string | null
          created_at?: string
          credit_amount?: number | null
          credit_entered_at?: string | null
          credit_entered_by?: string | null
          fee_amount?: number | null
          fmls_number?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          prior_waiver?: boolean
          prior_waiver_date?: string | null
          prior_waiver_details?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processed_note?: string | null
          property_address?: string | null
          refund_amount?: number | null
          status?: Database["public"]["Enums"]["refund_status"]
          submission_date?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      submission_throttle: {
        Row: {
          client_key: string
          created_at: string
          id: string
        }
        Insert: {
          client_key: string
          created_at?: string
          id?: string
        }
        Update: {
          client_key?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      list_refund_requests_safe: {
        Args: never
        Returns: {
          agent_name: string
          created_at: string
          credit_amount: number
          credit_entered_at: string
          fmls_number: string
          id: string
          notes: string
          payment_date: string
          prior_waiver: boolean
          prior_waiver_date: string
          prior_waiver_details: string
          processed_at: string
          property_address: string
          refund_amount: number
          status: Database["public"]["Enums"]["refund_status"]
          submission_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }[]
      }
      record_submission_attempt:
        | {
            Args: {
              _client_key: string
              _max_per_window: number
              _window_minutes: number
            }
            Returns: boolean
          }
        | {
            Args: {
              _client_key: string
              _max_global?: number
              _max_per_window: number
              _window_minutes: number
            }
            Returns: boolean
          }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "accounting" | "viewer"
      refund_status: "pending" | "approved" | "processed"
      transaction_type: "personal_home_purchase" | "personal_home_sale"
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
      app_role: ["admin", "accounting", "viewer"],
      refund_status: ["pending", "approved", "processed"],
      transaction_type: ["personal_home_purchase", "personal_home_sale"],
    },
  },
} as const
