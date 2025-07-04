export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      email_processing_tasks: {
        Row: {
          attachments_count: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email_from: string | null
          email_message_id: string | null
          email_received_at: string | null
          email_subject: string | null
          error_details: Json | null
          error_message: string | null
          failed_count: number | null
          id: string
          invoices_created: number | null
          last_activity_at: string | null
          max_retries: number
          metadata: Json
          next_retry_at: string | null
          processed_count: number | null
          processing_time_seconds: number | null
          result_data: Json | null
          retry_count: number
          started_at: string | null
          status: string
          task_data: Json
          task_id: string | null
          task_type: string
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          attachments_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_from?: string | null
          email_message_id?: string | null
          email_received_at?: string | null
          email_subject?: string | null
          error_details?: Json | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          invoices_created?: number | null
          last_activity_at?: string | null
          max_retries?: number
          metadata?: Json
          next_retry_at?: string | null
          processed_count?: number | null
          processing_time_seconds?: number | null
          result_data?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          task_data?: Json
          task_id?: string | null
          task_type?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          attachments_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_from?: string | null
          email_message_id?: string | null
          email_received_at?: string | null
          email_subject?: string | null
          error_details?: Json | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          invoices_created?: number | null
          last_activity_at?: string | null
          max_retries?: number
          metadata?: Json
          next_retry_at?: string | null
          processed_count?: number | null
          processing_time_seconds?: number | null
          result_data?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          task_data?: Json
          task_id?: string | null
          task_type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_email_tasks_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          buyer_name: string | null
          buyer_tax_id: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          email_task_id: string | null
          extracted_data: Json
          file_hash: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string
          invoice_code: string | null
          invoice_date: string
          invoice_number: string
          invoice_type: string | null
          is_verified: boolean
          last_activity_at: string | null
          metadata: Json
          processing_status: string | null
          seller_name: string | null
          seller_tax_id: string | null
          source: string
          source_metadata: Json | null
          started_at: string | null
          status: string
          tags: string[] | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          version: number
        }
        Insert: {
          amount?: number
          buyer_name?: string | null
          buyer_tax_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          email_task_id?: string | null
          extracted_data?: Json
          file_hash?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          invoice_code?: string | null
          invoice_date: string
          invoice_number: string
          invoice_type?: string | null
          is_verified?: boolean
          last_activity_at?: string | null
          metadata?: Json
          processing_status?: string | null
          seller_name?: string | null
          seller_tax_id?: string | null
          source?: string
          source_metadata?: Json | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          amount?: number
          buyer_name?: string | null
          buyer_tax_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          email_task_id?: string | null
          extracted_data?: Json
          file_hash?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          invoice_code?: string | null
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string | null
          is_verified?: boolean
          last_activity_at?: string | null
          metadata?: Json
          processing_status?: string | null
          seller_name?: string | null
          seller_tax_id?: string | null
          source?: string
          source_metadata?: Json | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_email_task"
            columns: ["email_task_id"]
            isOneToOne: false
            referencedRelation: "email_processing_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_name: string | null
          email_config: Json
          id: string
          is_active: boolean
          is_premium: boolean
          last_invoice_date: string | null
          metadata: Json
          preferences: Json
          premium_expires_at: string | null
          total_invoices: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email_config?: Json
          id?: string
          is_active?: boolean
          is_premium?: boolean
          last_invoice_date?: string | null
          metadata?: Json
          preferences?: Json
          premium_expires_at?: string | null
          total_invoices?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email_config?: Json
          id?: string
          is_active?: boolean
          is_premium?: boolean
          last_invoice_date?: string | null
          metadata?: Json
          preferences?: Json
          premium_expires_at?: string | null
          total_invoices?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      invoice_summary: {
        Row: {
          completed_count: number | null
          failed_count: number | null
          invoice_count: number | null
          month: string | null
          total_amount: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
