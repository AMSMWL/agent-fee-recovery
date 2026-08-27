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
    PostgrestVersion: "14.17"
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
          prior_waiver: boolean
          prior_waiver_date: string | null
          prior_waiver_details: string | null
          processed_at: string | null
          processed_by: string | null
          processed_note: string | null
          property_address: string | null
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
          prior_waiver?: boolean
          prior_waiver_date?: string | null
          prior_waiver_details?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processed_note?: string | null
          property_address?: string | null
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
          prior_waiver?: boolean
          prior_waiver_date?: string | null
          prior_waiver_details?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processed_note?: string | null
          property_address?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          submission_date?: string | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      refund_status: ["pending", "approved", "processed"],
      transaction_type: ["personal_home_purchase", "personal_home_sale"],
    },
  },
} as const
