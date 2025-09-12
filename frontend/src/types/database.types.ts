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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      config_audit_log: {
        Row: {
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          config_id: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
          reason: string | null
        }
        Insert: {
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          config_id?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
        }
        Update: {
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          config_id?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_audit_log_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      config_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      configurations: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          environment: string | null
          id: string
          is_active: boolean | null
          key: string
          schema: Json | null
          updated_at: string | null
          value: Json
          version: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          schema?: Json | null
          updated_at?: string | null
          value: Json
          version?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          schema?: Json | null
          updated_at?: string | null
          value?: Json
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "configurations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "config_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_operations_log: {
        Row: {
          created_at: string | null
          details: string | null
          id: number
          operation_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: number
          operation_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: number
          operation_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_processing_summary: {
        Row: {
          attachment_count: number | null
          attachment_names: string[] | null
          classification_reason: string | null
          created_at: string | null
          email_body_html: string | null
          email_body_preview: string | null
          email_body_text: string | null
          email_category: string | null
          email_date: string | null
          email_subject: string | null
          error_summary: string | null
          execution_path: string | null
          extracted_subject: string | null
          extraction_completeness: string | null
          failed_processing: number | null
          from_email: string | null
          from_name: string | null
          has_attachments: boolean | null
          id: string
          keyword_stats: Json | null
          link_quality: string | null
          mapped_user_id: string | null
          mapping_error: string | null
          mapping_method: string | null
          matched_keywords: string[] | null
          node2_processing_time: number | null
          node2_raw_output: Json | null
          node3_executed: boolean | null
          node3_processing_time: number | null
          node3_raw_output: Json | null
          node3_status: string | null
          node4_executed: boolean | null
          node4_processing_time: number | null
          node4_raw_output: Json | null
          node4_status: string | null
          overall_status: string | null
          pdf_attachments: number | null
          primary_verification_link: string | null
          processing_results: Json | null
          recommendations: string[] | null
          should_process: boolean | null
          source: string | null
          successful_processing: number | null
          target_user_email: string | null
          to_email: string | null
          total_attachments: number | null
          total_processing_time: number | null
          trigger_event_id: string | null
          trigger_raw_data: Json | null
          updated_at: string | null
          user_mapping_status: string | null
          verification_links: Json | null
          workflow_execution_id: string | null
        }
        Insert: {
          attachment_count?: number | null
          attachment_names?: string[] | null
          classification_reason?: string | null
          created_at?: string | null
          email_body_html?: string | null
          email_body_preview?: string | null
          email_body_text?: string | null
          email_category?: string | null
          email_date?: string | null
          email_subject?: string | null
          error_summary?: string | null
          execution_path?: string | null
          extracted_subject?: string | null
          extraction_completeness?: string | null
          failed_processing?: number | null
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          keyword_stats?: Json | null
          link_quality?: string | null
          mapped_user_id?: string | null
          mapping_error?: string | null
          mapping_method?: string | null
          matched_keywords?: string[] | null
          node2_processing_time?: number | null
          node2_raw_output?: Json | null
          node3_executed?: boolean | null
          node3_processing_time?: number | null
          node3_raw_output?: Json | null
          node3_status?: string | null
          node4_executed?: boolean | null
          node4_processing_time?: number | null
          node4_raw_output?: Json | null
          node4_status?: string | null
          overall_status?: string | null
          pdf_attachments?: number | null
          primary_verification_link?: string | null
          processing_results?: Json | null
          recommendations?: string[] | null
          should_process?: boolean | null
          source?: string | null
          successful_processing?: number | null
          target_user_email?: string | null
          to_email?: string | null
          total_attachments?: number | null
          total_processing_time?: number | null
          trigger_event_id?: string | null
          trigger_raw_data?: Json | null
          updated_at?: string | null
          user_mapping_status?: string | null
          verification_links?: Json | null
          workflow_execution_id?: string | null
        }
        Update: {
          attachment_count?: number | null
          attachment_names?: string[] | null
          classification_reason?: string | null
          created_at?: string | null
          email_body_html?: string | null
          email_body_preview?: string | null
          email_body_text?: string | null
          email_category?: string | null
          email_date?: string | null
          email_subject?: string | null
          error_summary?: string | null
          execution_path?: string | null
          extracted_subject?: string | null
          extraction_completeness?: string | null
          failed_processing?: number | null
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          keyword_stats?: Json | null
          link_quality?: string | null
          mapped_user_id?: string | null
          mapping_error?: string | null
          mapping_method?: string | null
          matched_keywords?: string[] | null
          node2_processing_time?: number | null
          node2_raw_output?: Json | null
          node3_executed?: boolean | null
          node3_processing_time?: number | null
          node3_raw_output?: Json | null
          node3_status?: string | null
          node4_executed?: boolean | null
          node4_processing_time?: number | null
          node4_raw_output?: Json | null
          node4_status?: string | null
          overall_status?: string | null
          pdf_attachments?: number | null
          primary_verification_link?: string | null
          processing_results?: Json | null
          recommendations?: string[] | null
          should_process?: boolean | null
          source?: string | null
          successful_processing?: number | null
          target_user_email?: string | null
          to_email?: string | null
          total_attachments?: number | null
          total_processing_time?: number | null
          trigger_event_id?: string | null
          trigger_raw_data?: Json | null
          updated_at?: string | null
          user_mapping_status?: string | null
          verification_links?: Json | null
          workflow_execution_id?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          level: number
          name: string
          parent_code: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          name: string
          parent_code?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          name?: string
          parent_code?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      expense_category_keywords: {
        Row: {
          category_code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          id: string
          is_active: boolean | null
          keyword: string
          keyword_type: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          category_code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          id?: string
          is_active?: boolean | null
          keyword: string
          keyword_type: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          category_code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          id?: string
          is_active?: boolean | null
          keyword?: string
          keyword_type?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_category_code"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          expires_at: string | null
          id: string
          metadata: Json | null
          name: string
          rollout_percentage: number | null
          updated_at: string | null
          user_whitelist: string[] | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          rollout_percentage?: number | null
          updated_at?: string | null
          user_whitelist?: string[] | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          rollout_percentage?: number | null
          updated_at?: string | null
          user_whitelist?: string[] | null
        }
        Relationships: []
      }
      file_hashes: {
        Row: {
          bucket_name: string
          created_at: string
          file_hash: string
          file_name: string
          file_path: string
          file_size: number
          first_uploaded_by: string | null
          id: string
          invoice_id: string | null
          last_accessed_at: string | null
          metadata: Json | null
          mime_type: string
          storage_object_id: string | null
          updated_at: string
          upload_count: number | null
          user_id: string | null
        }
        Insert: {
          bucket_name: string
          created_at?: string
          file_hash: string
          file_name: string
          file_path: string
          file_size: number
          first_uploaded_by?: string | null
          id?: string
          invoice_id?: string | null
          last_accessed_at?: string | null
          metadata?: Json | null
          mime_type: string
          storage_object_id?: string | null
          updated_at?: string
          upload_count?: number | null
          user_id?: string | null
        }
        Update: {
          bucket_name?: string
          created_at?: string
          file_hash?: string
          file_name?: string
          file_path?: string
          file_size?: number
          first_uploaded_by?: string | null
          id?: string
          invoice_id?: string | null
          last_accessed_at?: string | null
          metadata?: Json | null
          mime_type?: string
          storage_object_id?: string | null
          updated_at?: string
          upload_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_hashes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_hashes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "unassigned_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_hashes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_deleted_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_hashes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_classification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_hashes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_hashes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_unclassified_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_region_codes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          level: number
          parent_code: string | null
          province_name: string
          region_code: string
          region_name: string
          region_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          parent_code?: string | null
          province_name: string
          region_code: string
          region_name: string
          region_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          parent_code?: string | null
          province_name?: string
          region_code?: string
          region_name?: string
          region_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_status_configs: {
        Row: {
          bg_class: string | null
          border_class: string | null
          can_transition_to: string[] | null
          color: string | null
          created_at: string | null
          description: string | null
          icon_bg_class: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          status_code: string
          text_class: string | null
          updated_at: string | null
        }
        Insert: {
          bg_class?: string | null
          border_class?: string | null
          can_transition_to?: string[] | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_bg_class?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          status_code: string
          text_class?: string | null
          updated_at?: string | null
        }
        Update: {
          bg_class?: string | null
          border_class?: string | null
          can_transition_to?: string[] | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_bg_class?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          status_code?: string
          text_class?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          invoice_id: string
          metadata: Json | null
          reason: string | null
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          invoice_id: string
          metadata?: Json | null
          reason?: string | null
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          invoice_id?: string
          metadata?: Json | null
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "unassigned_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_deleted_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_classification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_unclassified_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_types: {
        Row: {
          code: string
          created_at: string | null
          field_definitions: Json
          id: string
          is_active: boolean | null
          name: string
          ocr_template: Json | null
          updated_at: string | null
          validation_rules: Json
        }
        Insert: {
          code: string
          created_at?: string | null
          field_definitions: Json
          id?: string
          is_active?: boolean | null
          name: string
          ocr_template?: Json | null
          updated_at?: string | null
          validation_rules: Json
        }
        Update: {
          code?: string
          created_at?: string | null
          field_definitions?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          ocr_template?: Json | null
          updated_at?: string | null
          validation_rules?: Json
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_without_tax: number
          assigned_to_set_at: string | null
          buyer_name: string | null
          buyer_tax_number: string | null
          category: string | null
          completed_at: string | null
          consumption_date: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          document_number: string | null
          email_task_id: string | null
          expense_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code: string | null
          extra_data: Json | null
          extracted_data: Json
          file_hash: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string
          invoice_code: string | null
          invoice_date: string | null
          invoice_number: string
          invoice_type: string | null
          is_verified: boolean
          last_activity_at: string | null
          notes: string | null
          ocr_confidence_score: number | null
          ocr_field_confidences: Json | null
          ocr_overall_confidence: number | null
          ocr_processing_metadata: Json | null
          processing_status: string | null
          province_name: string | null
          region_code: string | null
          region_name: string | null
          reimbursement_date: string | null
          reimbursement_reference: string | null
          reimbursement_set_id: string | null
          remarks: string | null
          seller_name: string | null
          seller_tax_number: string | null
          source: string
          source_metadata: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["unified_status"]
          status_changed_at: string | null
          status_changed_by: string | null
          tags: string[] | null
          tax_amount: number | null
          title: string | null
          total_amount: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          version: number
          voided_reason: string | null
        }
        Insert: {
          amount_without_tax?: number
          assigned_to_set_at?: string | null
          buyer_name?: string | null
          buyer_tax_number?: string | null
          category?: string | null
          completed_at?: string | null
          consumption_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          document_number?: string | null
          email_task_id?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code?: string | null
          extra_data?: Json | null
          extracted_data?: Json
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          invoice_code?: string | null
          invoice_date?: string | null
          invoice_number: string
          invoice_type?: string | null
          is_verified?: boolean
          last_activity_at?: string | null
          notes?: string | null
          ocr_confidence_score?: number | null
          ocr_field_confidences?: Json | null
          ocr_overall_confidence?: number | null
          ocr_processing_metadata?: Json | null
          processing_status?: string | null
          province_name?: string | null
          region_code?: string | null
          region_name?: string | null
          reimbursement_date?: string | null
          reimbursement_reference?: string | null
          reimbursement_set_id?: string | null
          remarks?: string | null
          seller_name?: string | null
          seller_tax_number?: string | null
          source?: string
          source_metadata?: Json | null
          started_at?: string | null
          status: Database["public"]["Enums"]["unified_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          tags?: string[] | null
          tax_amount?: number | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
          voided_reason?: string | null
        }
        Update: {
          amount_without_tax?: number
          assigned_to_set_at?: string | null
          buyer_name?: string | null
          buyer_tax_number?: string | null
          category?: string | null
          completed_at?: string | null
          consumption_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          document_number?: string | null
          email_task_id?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code?: string | null
          extra_data?: Json | null
          extracted_data?: Json
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          invoice_code?: string | null
          invoice_date?: string | null
          invoice_number?: string
          invoice_type?: string | null
          is_verified?: boolean
          last_activity_at?: string | null
          notes?: string | null
          ocr_confidence_score?: number | null
          ocr_field_confidences?: Json | null
          ocr_overall_confidence?: number | null
          ocr_processing_metadata?: Json | null
          processing_status?: string | null
          province_name?: string | null
          region_code?: string | null
          region_name?: string | null
          reimbursement_date?: string | null
          reimbursement_reference?: string | null
          reimbursement_set_id?: string | null
          remarks?: string | null
          seller_name?: string | null
          seller_tax_number?: string | null
          source?: string
          source_metadata?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["unified_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          tags?: string[] | null
          tax_amount?: number | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_category_code"
            columns: ["expense_category_code"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_reimbursement_set_id_fkey"
            columns: ["reimbursement_set_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_set_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reimbursement_set_id_fkey"
            columns: ["reimbursement_set_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_files: {
        Row: {
          created_at: string | null
          email_message_id: string | null
          email_subject: string | null
          email_uid: number | null
          file_hash: string
          file_size: number
          filename: string
          id: string
          source_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          email_uid?: number | null
          file_hash: string
          file_size: number
          filename: string
          id?: string
          source_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          email_uid?: number | null
          file_hash?: string
          file_size?: number
          filename?: string
          id?: string
          source_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          forwarding_setup_completed_at: string | null
          id: string
          is_active: boolean
          is_premium: boolean
          last_invoice_date: string | null
          metadata: Json
          onboarding_completed: boolean | null
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
          forwarding_setup_completed_at?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          last_invoice_date?: string | null
          metadata?: Json
          onboarding_completed?: boolean | null
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
          forwarding_setup_completed_at?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          last_invoice_date?: string | null
          metadata?: Json
          onboarding_completed?: boolean | null
          preferences?: Json
          premium_expires_at?: string | null
          total_invoices?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      reimbursement_set_status_logs: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          reimbursement_set_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          reimbursement_set_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          reimbursement_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursement_set_status_logs_reimbursement_set_id_fkey"
            columns: ["reimbursement_set_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_set_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursement_set_status_logs_reimbursement_set_id_fkey"
            columns: ["reimbursement_set_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      reimbursement_sets: {
        Row: {
          approval_notes: string | null
          approver_id: string | null
          created_at: string | null
          description: string | null
          id: string
          invoice_count: number | null
          reimbursed_at: string | null
          set_name: string
          status: Database["public"]["Enums"]["unified_status"]
          submitted_at: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approval_notes?: string | null
          approver_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_count?: number | null
          reimbursed_at?: string | null
          set_name: string
          status: Database["public"]["Enums"]["unified_status"]
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approval_notes?: string | null
          approver_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_count?: number | null
          reimbursed_at?: string | null
          set_name?: string
          status?: Database["public"]["Enums"]["unified_status"]
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rls_implementation_log: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          implementation_type: string
          object_name: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          implementation_type: string
          object_name: string
          status: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          implementation_type?: string
          object_name?: string
          status?: string
        }
        Relationships: []
      }
      task_queue: {
        Row: {
          completed_at: string | null
          correlation_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_task_id: string | null
          payload: Json
          priority: number | null
          processing_timeout: number | null
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_task_id?: string | null
          payload: Json
          priority?: number | null
          processing_timeout?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_task_id?: string | null
          payload?: Json
          priority?: number | null
          processing_timeout?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_queue_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "task_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_queue_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "v_pending_cleanup_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      train_tickets: {
        Row: {
          arrival_station: string | null
          buyer_credit_code: string | null
          buyer_name: string | null
          created_at: string | null
          departure_station: string | null
          departure_time: string | null
          electronic_ticket_number: string | null
          id: string
          invoice_id: string
          passenger_info: string | null
          passenger_name: string | null
          sale_info: string | null
          seat_number: string | null
          seat_type: string | null
          ticket_code: string | null
          ticket_gate: string | null
          train_number: string | null
          updated_at: string | null
        }
        Insert: {
          arrival_station?: string | null
          buyer_credit_code?: string | null
          buyer_name?: string | null
          created_at?: string | null
          departure_station?: string | null
          departure_time?: string | null
          electronic_ticket_number?: string | null
          id?: string
          invoice_id: string
          passenger_info?: string | null
          passenger_name?: string | null
          sale_info?: string | null
          seat_number?: string | null
          seat_type?: string | null
          ticket_code?: string | null
          ticket_gate?: string | null
          train_number?: string | null
          updated_at?: string | null
        }
        Update: {
          arrival_station?: string | null
          buyer_credit_code?: string | null
          buyer_name?: string | null
          created_at?: string | null
          departure_station?: string | null
          departure_time?: string | null
          electronic_ticket_number?: string | null
          id?: string
          invoice_id?: string
          passenger_info?: string | null
          passenger_name?: string | null
          sale_info?: string | null
          seat_number?: string | null
          seat_type?: string | null
          ticket_code?: string | null
          ticket_gate?: string | null
          train_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_email_mappings: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          email_address: string
          first_seen_summary_id: string | null
          id: string
          invoice_count: number | null
          last_seen_at: string | null
          last_seen_summary_id: string | null
          mapping_source: string | null
          mapping_status: string | null
          updated_at: string | null
          user_id: string | null
          verification_count: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          email_address: string
          first_seen_summary_id?: string | null
          id?: string
          invoice_count?: number | null
          last_seen_at?: string | null
          last_seen_summary_id?: string | null
          mapping_source?: string | null
          mapping_status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_count?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          email_address?: string
          first_seen_summary_id?: string | null
          id?: string
          invoice_count?: number | null
          last_seen_at?: string | null
          last_seen_summary_id?: string | null
          mapping_source?: string | null
          mapping_status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_email_mappings_first_seen_summary_id_fkey"
            columns: ["first_seen_summary_id"]
            isOneToOne: false
            referencedRelation: "email_processing_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_mappings_first_seen_summary_id_fkey"
            columns: ["first_seen_summary_id"]
            isOneToOne: false
            referencedRelation: "v_email_processing_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_mappings_first_seen_summary_id_fkey"
            columns: ["first_seen_summary_id"]
            isOneToOne: false
            referencedRelation: "v_user_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_mappings_last_seen_summary_id_fkey"
            columns: ["last_seen_summary_id"]
            isOneToOne: false
            referencedRelation: "email_processing_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_mappings_last_seen_summary_id_fkey"
            columns: ["last_seen_summary_id"]
            isOneToOne: false
            referencedRelation: "v_email_processing_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_email_mappings_last_seen_summary_id_fkey"
            columns: ["last_seen_summary_id"]
            isOneToOne: false
            referencedRelation: "v_user_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vat_invoices: {
        Row: {
          amount_pre_tax: number | null
          check_code: string | null
          created_at: string | null
          drawer: string | null
          form_type: string | null
          id: string
          invoice_code: string | null
          invoice_details: Json | null
          invoice_id: string
          invoice_type_detail: string | null
          machine_code: string | null
          password_area: string | null
          printed_invoice_code: string | null
          printed_invoice_number: string | null
          purchaser_bank_account_info: string | null
          purchaser_contact_info: string | null
          purchaser_name: string | null
          purchaser_tax_number: string | null
          recipient: string | null
          reviewer: string | null
          seller_bank_account_info: string | null
          seller_contact_info: string | null
          seller_name: string | null
          seller_tax_number: string | null
          special_tag: string | null
          tax_amount: number | null
          total_amount_in_words: string | null
          updated_at: string | null
        }
        Insert: {
          amount_pre_tax?: number | null
          check_code?: string | null
          created_at?: string | null
          drawer?: string | null
          form_type?: string | null
          id?: string
          invoice_code?: string | null
          invoice_details?: Json | null
          invoice_id: string
          invoice_type_detail?: string | null
          machine_code?: string | null
          password_area?: string | null
          printed_invoice_code?: string | null
          printed_invoice_number?: string | null
          purchaser_bank_account_info?: string | null
          purchaser_contact_info?: string | null
          purchaser_name?: string | null
          purchaser_tax_number?: string | null
          recipient?: string | null
          reviewer?: string | null
          seller_bank_account_info?: string | null
          seller_contact_info?: string | null
          seller_name?: string | null
          seller_tax_number?: string | null
          special_tag?: string | null
          tax_amount?: number | null
          total_amount_in_words?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_pre_tax?: number | null
          check_code?: string | null
          created_at?: string | null
          drawer?: string | null
          form_type?: string | null
          id?: string
          invoice_code?: string | null
          invoice_details?: Json | null
          invoice_id?: string
          invoice_type_detail?: string | null
          machine_code?: string | null
          password_area?: string | null
          printed_invoice_code?: string | null
          printed_invoice_number?: string | null
          purchaser_bank_account_info?: string | null
          purchaser_contact_info?: string | null
          purchaser_name?: string | null
          purchaser_tax_number?: string | null
          recipient?: string | null
          reviewer?: string | null
          seller_bank_account_info?: string | null
          seller_contact_info?: string | null
          seller_name?: string | null
          seller_tax_number?: string | null
          special_tag?: string | null
          tax_amount?: number | null
          total_amount_in_words?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      invoice_region_statistics: {
        Row: {
          avg_amount: number | null
          first_invoice_date: string | null
          invoice_count: number | null
          last_invoice_date: string | null
          province_name: string | null
          region_code: string | null
          region_name: string | null
          region_type: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      reimbursement_set_details: {
        Row: {
          approval_notes: string | null
          approver_email: string | null
          approver_id: string | null
          category_count: number | null
          created_at: string | null
          description: string | null
          earliest_invoice_date: string | null
          id: string | null
          invoice_count: number | null
          latest_invoice_date: string | null
          region_count: number | null
          reimbursed_at: string | null
          set_name: string | null
          status: Database["public"]["Enums"]["unified_status"] | null
          submitted_at: string | null
          total_amount: number | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Relationships: []
      }
      unassigned_invoices: {
        Row: {
          amount_without_tax: number | null
          assigned_to_set_at: string | null
          buyer_name: string | null
          buyer_tax_number: string | null
          category: string | null
          completed_at: string | null
          consumption_date: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          document_number: string | null
          email_task_id: string | null
          expense_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code: string | null
          extra_data: Json | null
          extracted_data: Json | null
          file_hash: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string | null
          invoice_code: string | null
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: string | null
          is_verified: boolean | null
          last_activity_at: string | null
          notes: string | null
          ocr_confidence_score: number | null
          ocr_field_confidences: Json | null
          ocr_overall_confidence: number | null
          ocr_processing_metadata: Json | null
          processing_status: string | null
          province_name: string | null
          region_code: string | null
          region_name: string | null
          reimbursement_date: string | null
          reimbursement_reference: string | null
          reimbursement_set_id: string | null
          remarks: string | null
          seller_name: string | null
          seller_tax_number: string | null
          source: string | null
          source_metadata: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["unified_status"] | null
          status_changed_at: string | null
          status_changed_by: string | null
          tags: string[] | null
          tax_amount: number | null
          title: string | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          version: number | null
          voided_reason: string | null
        }
        Insert: {
          amount_without_tax?: number | null
          assigned_to_set_at?: string | null
          buyer_name?: string | null
          buyer_tax_number?: string | null
          category?: string | null
          completed_at?: string | null
          consumption_date?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          document_number?: string | null
          email_task_id?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code?: string | null
          extra_data?: Json | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string | null
          invoice_code?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_verified?: boolean | null
          last_activity_at?: string | null
          notes?: string | null
          ocr_confidence_score?: number | null
          ocr_field_confidences?: Json | null
          ocr_overall_confidence?: number | null
          ocr_processing_metadata?: Json | null
          processing_status?: string | null
          province_name?: string | null
          region_code?: string | null
          region_name?: string | null
          reimbursement_date?: string | null
          reimbursement_reference?: string | null
          reimbursement_set_id?: string | null
          remarks?: string | null
          seller_name?: string | null
          seller_tax_number?: string | null
          source?: string | null
          source_metadata?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["unified_status"] | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          tags?: string[] | null
          tax_amount?: number | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
          voided_reason?: string | null
        }
        Update: {
          amount_without_tax?: number | null
          assigned_to_set_at?: string | null
          buyer_name?: string | null
          buyer_tax_number?: string | null
          category?: string | null
          completed_at?: string | null
          consumption_date?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          document_number?: string | null
          email_task_id?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code?: string | null
          extra_data?: Json | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string | null
          invoice_code?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_verified?: boolean | null
          last_activity_at?: string | null
          notes?: string | null
          ocr_confidence_score?: number | null
          ocr_field_confidences?: Json | null
          ocr_overall_confidence?: number | null
          ocr_processing_metadata?: Json | null
          processing_status?: string | null
          province_name?: string | null
          region_code?: string | null
          region_name?: string | null
          reimbursement_date?: string | null
          reimbursement_reference?: string | null
          reimbursement_set_id?: string | null
          remarks?: string | null
          seller_name?: string | null
          seller_tax_number?: string | null
          source?: string | null
          source_metadata?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["unified_status"] | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          tags?: string[] | null
          tax_amount?: number | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_category_code"
            columns: ["expense_category_code"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_reimbursement_set_id_fkey"
            columns: ["reimbursement_set_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_set_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reimbursement_set_id_fkey"
            columns: ["reimbursement_set_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_category_statistics: {
        Row: {
          active_months: number | null
          amount_percentage: number | null
          avg_amount: number | null
          category: string | null
          category_name: string | null
          count_percentage: number | null
          expense_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code: string | null
          first_consumption: string | null
          invoice_count: number | null
          invoice_type: string | null
          last_consumption: string | null
          max_amount: number | null
          min_amount: number | null
          total_amount: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_category_code"
            columns: ["expense_category_code"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      v_deleted_invoices: {
        Row: {
          amount_without_tax: number | null
          assigned_to_set_at: string | null
          buyer_name: string | null
          buyer_tax_number: string | null
          category: string | null
          completed_at: string | null
          consumption_date: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          document_number: string | null
          email_task_id: string | null
          expense_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code: string | null
          extra_data: Json | null
          extracted_data: Json | null
          file_hash: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string | null
          invoice_code: string | null
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: string | null
          is_verified: boolean | null
          last_activity_at: string | null
          notes: string | null
          ocr_confidence_score: number | null
          ocr_field_confidences: Json | null
          ocr_overall_confidence: number | null
          ocr_processing_metadata: Json | null
          processing_status: string | null
          province_name: string | null
          region_code: string | null
          region_name: string | null
          reimbursement_date: string | null
          reimbursement_reference: string | null
          reimbursement_set_id: string | null
          remarks: string | null
          seller_name: string | null
          seller_tax_number: string | null
          source: string | null
          source_metadata: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["unified_status"] | null
          status_changed_at: string | null
          status_changed_by: string | null
          tags: string[] | null
          tax_amount: number | null
          title: string | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          version: number | null
          voided_reason: string | null
        }
        Insert: {
          amount_without_tax?: number | null
          assigned_to_set_at?: string | null
          buyer_name?: string | null
          buyer_tax_number?: string | null
          category?: string | null
          completed_at?: string | null
          consumption_date?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          document_number?: string | null
          email_task_id?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code?: string | null
          extra_data?: Json | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string | null
          invoice_code?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_verified?: boolean | null
          last_activity_at?: string | null
          notes?: string | null
          ocr_confidence_score?: number | null
          ocr_field_confidences?: Json | null
          ocr_overall_confidence?: number | null
          ocr_processing_metadata?: Json | null
          processing_status?: string | null
          province_name?: string | null
          region_code?: string | null
          region_name?: string | null
          reimbursement_date?: string | null
          reimbursement_reference?: string | null
          reimbursement_set_id?: string | null
          remarks?: string | null
          seller_name?: string | null
          seller_tax_number?: string | null
          source?: string | null
          source_metadata?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["unified_status"] | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          tags?: string[] | null
          tax_amount?: number | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
          voided_reason?: string | null
        }
        Update: {
          amount_without_tax?: number | null
          assigned_to_set_at?: string | null
          buyer_name?: string | null
          buyer_tax_number?: string | null
          category?: string | null
          completed_at?: string | null
          consumption_date?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          document_number?: string | null
          email_task_id?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code?: string | null
          extra_data?: Json | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string | null
          invoice_code?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_verified?: boolean | null
          last_activity_at?: string | null
          notes?: string | null
          ocr_confidence_score?: number | null
          ocr_field_confidences?: Json | null
          ocr_overall_confidence?: number | null
          ocr_processing_metadata?: Json | null
          processing_status?: string | null
          province_name?: string | null
          region_code?: string | null
          region_name?: string | null
          reimbursement_date?: string | null
          reimbursement_reference?: string | null
          reimbursement_set_id?: string | null
          remarks?: string | null
          seller_name?: string | null
          seller_tax_number?: string | null
          source?: string | null
          source_metadata?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["unified_status"] | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          tags?: string[] | null
          tax_amount?: number | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_category_code"
            columns: ["expense_category_code"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_reimbursement_set_id_fkey"
            columns: ["reimbursement_set_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_set_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reimbursement_set_id_fkey"
            columns: ["reimbursement_set_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_email_processing_overview: {
        Row: {
          created_at: string | null
          email_category: string | null
          email_date: string | null
          email_subject: string | null
          execution_path: string | null
          from_email: string | null
          id: string | null
          mapped_user_id: string | null
          overall_status: string | null
          processing_type: string | null
          status_icon: string | null
          target_user_email: string | null
          user_mapping_status: string | null
        }
        Relationships: []
      }
      v_expense_categories_tree: {
        Row: {
          code: string | null
          color: string | null
          created_at: string | null
          description: string | null
          full_path: string | null
          icon: string | null
          id: string | null
          is_active: boolean | null
          level: number | null
          name: string | null
          parent_code: string | null
          path_codes: string | null
          sort_order: number | null
          tree_level: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_expense_category_analysis: {
        Row: {
          active_months: number | null
          amount_percentage: number | null
          avg_amount: number | null
          category_name: string | null
          count_percentage: number | null
          earliest_date: string | null
          invoice_count: number | null
          latest_date: string | null
          max_amount: number | null
          min_amount: number | null
          primary_category_name: string | null
          secondary_category_name: string | null
          total_amount: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_expense_category_keywords: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          description: string | null
          expense_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          id: string | null
          is_active: boolean | null
          keyword: string | null
          keyword_type: string | null
          matched_invoice_count: number | null
          priority: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_expense_category_suggestions: {
        Row: {
          classified_count: number | null
          needs_keyword: boolean | null
          seller_name: string | null
          suggested_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
        }
        Relationships: []
      }
      v_hierarchical_category_stats: {
        Row: {
          primary_amount: number | null
          primary_category: string | null
          primary_count: number | null
          primary_percentage: number | null
          subcategories: Json | null
          user_id: string | null
        }
        Relationships: []
      }
      v_invoice_classification: {
        Row: {
          category_full_path: string | null
          classification_info: Json | null
          confidence_score: number | null
          id: string | null
          invoice_number: string | null
          matched_keyword: string | null
          matched_primary: string | null
          matched_secondary: string | null
          primary_category: string | null
          primary_category_color: string | null
          primary_category_icon: string | null
          primary_category_name: string | null
          secondary_category_color: string | null
          secondary_category_icon: string | null
          secondary_category_name: string | null
          seller_name: string | null
        }
        Relationships: []
      }
      v_invoice_detail: {
        Row: {
          amount_without_tax: number | null
          buyer_name: string | null
          buyer_tax_number: string | null
          category: string | null
          category_color: string | null
          category_icon: string | null
          category_level: string | null
          completed_at: string | null
          consumption_date: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          document_number: string | null
          email_task_id: string | null
          expense_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code: string | null
          extra_data: Json | null
          extracted_data: Json | null
          file_hash: string | null
          file_info: Json | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string | null
          invoice_code: string | null
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: string | null
          is_verified: boolean | null
          issuer_region: Json | null
          last_activity_at: string | null
          notes: string | null
          ocr_confidence_score: number | null
          ocr_field_confidences: Json | null
          ocr_overall_confidence: number | null
          ocr_processing_metadata: Json | null
          primary_category_name: string | null
          processing_status: string | null
          remarks: string | null
          secondary_category_name: string | null
          seller_name: string | null
          seller_tax_number: string | null
          source: string | null
          source_metadata: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["unified_status"] | null
          tags: string[] | null
          tax_amount: number | null
          title: string | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          verification_info: Json | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_category_code"
            columns: ["expense_category_code"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      v_invoice_monthly_analysis: {
        Row: {
          amount_growth_rate: number | null
          avg_amount: number | null
          count_growth_rate: number | null
          invoice_count: number | null
          is_recent: boolean | null
          max_amount: number | null
          min_amount: number | null
          month: string | null
          month_str: string | null
          prev_amount: number | null
          prev_count: number | null
          seller_count: number | null
          total_amount: number | null
          type_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_invoice_type_stats: {
        Row: {
          active_months: number | null
          amount_percentage: number | null
          avg_amount: number | null
          count: number | null
          count_percentage: number | null
          first_consumption_date: string | null
          invoice_type: string | null
          last_consumption_date: string | null
          max_amount: number | null
          min_amount: number | null
          total_amount: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_pending_cleanup_tasks: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string | null
          max_retries: number | null
          retry_count: number | null
          task_type: Database["public"]["Enums"]["task_type"] | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string | null
          max_retries?: number | null
          retry_count?: number | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string | null
          max_retries?: number | null
          retry_count?: number | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
        }
        Relationships: []
      }
      v_rls_status_summary: {
        Row: {
          object_name: unknown | null
          object_type: string | null
          policies: string | null
          rls_status: string | null
        }
        Relationships: []
      }
      v_unclassified_invoices: {
        Row: {
          consumption_date: string | null
          id: string | null
          invoice_number: string | null
          invoice_type: string | null
          item_name: string | null
          seller_name: string | null
          total_amount: number | null
          user_id: string | null
        }
        Insert: {
          consumption_date?: string | null
          id?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          item_name?: never
          seller_name?: string | null
          total_amount?: number | null
          user_id?: string | null
        }
        Update: {
          consumption_date?: string | null
          id?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          item_name?: never
          seller_name?: string | null
          total_amount?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_user_inbox: {
        Row: {
          attachment_count: number | null
          attachment_names: string[] | null
          category_icon: string | null
          created_at: string | null
          email_body_preview: string | null
          email_category: string | null
          email_date: string | null
          email_subject: string | null
          execution_path: string | null
          from_email: string | null
          from_name: string | null
          has_attachments: boolean | null
          has_body_content: boolean | null
          id: string | null
          mapped_user_id: string | null
          overall_status: string | null
          status_icon: string | null
          status_text: string | null
          to_email: string | null
          trigger_event_id: string | null
          user_mapping_status: string | null
        }
        Insert: {
          attachment_count?: number | null
          attachment_names?: string[] | null
          category_icon?: never
          created_at?: string | null
          email_body_preview?: string | null
          email_category?: string | null
          email_date?: string | null
          email_subject?: string | null
          execution_path?: string | null
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          has_body_content?: never
          id?: string | null
          mapped_user_id?: string | null
          overall_status?: string | null
          status_icon?: never
          status_text?: never
          to_email?: string | null
          trigger_event_id?: string | null
          user_mapping_status?: string | null
        }
        Update: {
          attachment_count?: number | null
          attachment_names?: string[] | null
          category_icon?: never
          created_at?: string | null
          email_body_preview?: string | null
          email_category?: string | null
          email_date?: string | null
          email_subject?: string | null
          execution_path?: string | null
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean | null
          has_body_content?: never
          id?: string | null
          mapped_user_id?: string | null
          overall_status?: string | null
          status_icon?: never
          status_text?: never
          to_email?: string | null
          trigger_event_id?: string | null
          user_mapping_status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_expense_keyword: {
        Args: {
          p_description?: string
          p_expense_category: Database["public"]["Enums"]["expense_category_enum"]
          p_keyword: string
          p_keyword_type: string
          p_priority?: number
        }
        Returns: {
          category_code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          id: string
          is_active: boolean | null
          keyword: string
          keyword_type: string
          priority: number | null
          updated_at: string | null
        }
      }
      batch_update_invoices: {
        Args: { p_invoice_ids: string[]; p_updates: Json }
        Returns: {
          amount_without_tax: number
          assigned_to_set_at: string | null
          buyer_name: string | null
          buyer_tax_number: string | null
          category: string | null
          completed_at: string | null
          consumption_date: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          document_number: string | null
          email_task_id: string | null
          expense_category:
            | Database["public"]["Enums"]["expense_category_enum"]
            | null
          expense_category_code: string | null
          extra_data: Json | null
          extracted_data: Json
          file_hash: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string
          invoice_code: string | null
          invoice_date: string | null
          invoice_number: string
          invoice_type: string | null
          is_verified: boolean
          last_activity_at: string | null
          notes: string | null
          ocr_confidence_score: number | null
          ocr_field_confidences: Json | null
          ocr_overall_confidence: number | null
          ocr_processing_metadata: Json | null
          processing_status: string | null
          province_name: string | null
          region_code: string | null
          region_name: string | null
          reimbursement_date: string | null
          reimbursement_reference: string | null
          reimbursement_set_id: string | null
          remarks: string | null
          seller_name: string | null
          seller_tax_number: string | null
          source: string
          source_metadata: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["unified_status"]
          status_changed_at: string | null
          status_changed_by: string | null
          tags: string[] | null
          tax_amount: number | null
          title: string | null
          total_amount: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          version: number
          voided_reason: string | null
        }[]
      }
      cancel_task: {
        Args: { p_reason?: string; p_task_id: string }
        Returns: boolean
      }
      check_duplicate_file: {
        Args: { p_file_hash: string; p_file_size: number; p_user_id: string }
        Returns: {
          file_path: string
          invoice_data: Json
          is_duplicate: boolean
          last_accessed_at: string
          related_invoice_id: string
          storage_object_id: string
          upload_count: number
        }[]
      }
      check_user_onboarding_status: {
        Args: { user_id: string }
        Returns: {
          has_completed_setup: boolean
          has_successful_emails: number
          setup_completed_at: string
        }[]
      }
      cleanup_timeout_tasks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      complete_task: {
        Args: { p_result?: Json; p_task_id: string }
        Returns: boolean
      }
      confirm_user_email_dev: {
        Args: { user_id: string }
        Returns: undefined
      }
      create_reimbursement_set_with_invoices: {
        Args: {
          p_description?: string
          p_invoice_ids?: string[]
          p_set_name: string
        }
        Returns: string
      }
      delete_file_hash: {
        Args: { p_file_hash: string; p_user_id: string }
        Returns: undefined
      }
      delete_user_account: {
        Args: { user_id: string }
        Returns: undefined
      }
      deploy_email_scan_start: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enqueue_task: {
        Args: {
          p_correlation_id?: string
          p_delay_seconds?: number
          p_max_retries?: number
          p_payload: Json
          p_priority?: number
          p_task_type: Database["public"]["Enums"]["task_type"]
          p_user_id?: string
        }
        Returns: string
      }
      extract_consumption_date_smart: {
        Args: { expense_category: string; invoice_data: Json }
        Returns: string
      }
      extract_date_from_text: {
        Args: { text_input: string }
        Returns: string
      }
      extract_region_code_from_invoice_number: {
        Args: { invoice_number: string }
        Returns: string
      }
      fail_task: {
        Args: {
          p_error_message: string
          p_should_retry?: boolean
          p_task_id: string
        }
        Returns: boolean
      }
      fetch_next_task: {
        Args: {
          p_max_processing_time?: number
          p_task_types?: Database["public"]["Enums"]["task_type"][]
        }
        Returns: {
          completed_at: string | null
          correlation_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_task_id: string | null
          payload: Json
          priority: number | null
          processing_timeout: number | null
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at: string | null
          user_id: string | null
        }[]
      }
      find_or_create_user_mapping: {
        Args: { email_addr: string; source_type?: string; summary_id?: string }
        Returns: Json
      }
      fix_email_processing_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          fixed_count: number
          message: string
        }[]
      }
      get_category_path: {
        Args: { category_code: string }
        Returns: string
      }
      get_email_detail: {
        Args: { email_id: string; user_uuid?: string }
        Returns: {
          attachment_count: number
          attachment_names: string[]
          category_icon: string
          classification_reason: string
          created_at: string
          email_body_html: string
          email_body_preview: string
          email_body_text: string
          email_category: string
          email_date: string
          email_subject: string
          error_summary: string
          execution_path: string
          extracted_subject: string
          extraction_completeness: string
          failed_processing: number
          from_email: string
          from_name: string
          has_attachments: boolean
          id: string
          link_quality: string
          mapped_user_id: string
          mapping_error: string
          mapping_method: string
          matched_keywords: string[]
          node3_executed: boolean
          node3_status: string
          node4_executed: boolean
          node4_status: string
          overall_status: string
          pdf_attachments: number
          primary_verification_link: string
          processing_results: Json
          recommendations: string[]
          should_process: boolean
          status_icon: string
          status_text: string
          successful_processing: number
          target_user_email: string
          to_email: string
          total_attachments: number
          total_processing_time: number
          trigger_event_id: string
          updated_at: string
          user_mapping_status: string
          verification_links: Json
          workflow_execution_id: string
        }[]
      }
      get_email_processing_stats: {
        Args: { days_back?: number }
        Returns: Json
      }
      get_field_distinct_values: {
        Args: { p_field_name: string; p_limit?: number; p_table_name?: string }
        Returns: {
          count: number
          field_value: string
        }[]
      }
      get_field_options_issuer_region_name: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
          label: string
          value: string
        }[]
      }
      get_invoice_complete_data: {
        Args: { invoice_uuid: string; locale_code?: string }
        Returns: {
          buyer_name: string
          confidence_score: number
          currency: string
          display_name: string
          extraction_source: string
          field_code: string
          field_type: string
          field_value: string
          group_code: string
          group_name: string
          invoice_date: string
          invoice_id: string
          invoice_number: string
          processing_status: string
          seller_name: string
          source: string
          status: string
          total_amount: number
        }[]
      }
      get_invoice_fields: {
        Args: { invoice_uuid: string; locale_code?: string }
        Returns: {
          confidence_score: number
          data_type: string
          display_name: string
          extraction_source: string
          field_code: string
          field_type: string
          field_value: string
          is_system_generated: boolean
        }[]
      }
      get_invoice_region_from_number: {
        Args: { invoice_number: string }
        Returns: Json
      }
      get_invoice_type_fields: {
        Args: { locale_code?: string; type_id: string }
        Returns: {
          description: string
          display_name: string
          display_order: number
          field_code: string
          field_id: string
          field_type: string
          group_code: string
          group_name: string
          help_text: string
          is_editable: boolean
          is_required: boolean
          is_visible: boolean
          placeholder: string
          ui_config: Json
          validation_rules: Json
        }[]
      }
      get_monthly_reimbursement_stats: {
        Args: { p_months?: number; p_user_id: string }
        Returns: {
          month: string
          reimbursed: number
          reimbursement_rate: number
          submitted: number
        }[]
      }
      get_region_info_from_invoice_number: {
        Args: { invoice_number: string }
        Returns: {
          province_name: string
          region_code: string
          region_name: string
        }[]
      }
      get_reimbursement_set_summary: {
        Args: { p_user_id?: string }
        Returns: {
          invoice_count: number
          set_count: number
          status_name: string
          total_amount: number
        }[]
      }
      get_smart_category_match: {
        Args: { extracted_data?: Json; seller_name: string }
        Returns: {
          confidence_score: number
          matched_keyword: string
          primary_category: string
          secondary_category: string
        }[]
      }
      get_table_columns_enhanced: {
        Args: { schema_name_param?: string; table_name_param: string }
        Returns: Json
      }
      get_task_stats: {
        Args: { p_hours_back?: number; p_user_id?: string }
        Returns: {
          avg_duration_seconds: number
          count: number
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
        }[]
      }
      get_user_emails: {
        Args: {
          category_filter?: string
          limit_count?: number
          offset_count?: number
          search_query?: string
          status_filter?: string
          user_uuid?: string
        }
        Returns: {
          attachment_count: number
          attachment_names: string[]
          category_icon: string
          created_at: string
          email_body_preview: string
          email_category: string
          email_date: string
          email_subject: string
          execution_path: string
          from_email: string
          from_name: string
          has_attachments: boolean
          has_body_content: boolean
          id: string
          overall_status: string
          status_icon: string
          status_text: string
          to_email: string
          total_count: number
          trigger_event_id: string
          user_mapping_status: string
        }[]
      }
      get_user_inbox_stats: {
        Args: { user_uuid?: string }
        Returns: Json
      }
      insert_invoice_smart: {
        Args: {
          p_document_number: string
          p_file_path?: string
          p_invoice_data: Json
          p_invoice_date: string
          p_invoice_type: string
          p_source?: string
          p_title: string
          p_total_amount: number
          p_user_id: string
        }
        Returns: string
      }
      learn_keywords_from_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          frequency: number
          suggested_category: Database["public"]["Enums"]["expense_category_enum"]
          suggested_keyword: string
          suggested_type: string
        }[]
      }
      migrate_invoices_to_new_structure: {
        Args: Record<PropertyKey, never>
        Returns: {
          migrated_count: number
          other_count: number
          train_count: number
          vat_count: number
        }[]
      }
      move_invoices_to_set: {
        Args: { p_invoice_ids: string[]; p_target_set_id: string }
        Returns: boolean
      }
      record_file_hash: {
        Args: {
          p_bucket_name: string
          p_file_hash: string
          p_file_name: string
          p_file_path: string
          p_file_size: number
          p_invoice_id?: string
          p_mime_type: string
          p_storage_object_id: string
          p_user_id: string
        }
        Returns: string
      }
      refresh_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_invoice_aggregates: {
        Args: { force_refresh?: boolean; max_age_minutes?: number }
        Returns: {
          cache_age_minutes: number
          message: string
          refreshed: boolean
        }[]
      }
      refresh_user_stats: {
        Args: { target_user_id?: string }
        Returns: {
          active_email_accounts: number
          monthly_amount: number
          monthly_invoices: number
          monthly_processed: number
          total_amount: number
          total_invoices: number
          user_id: string
        }[]
      }
      search_invoices: {
        Args: {
          p_amount_max?: number
          p_amount_min?: number
          p_consumption_date_from?: string
          p_consumption_date_to?: string
          p_created_at_from?: string
          p_created_at_to?: string
          p_date_from?: string
          p_date_to?: string
          p_invoice_type?: string[]
          p_issuer_region?: string
          p_limit?: number
          p_offset?: number
          p_primary_category?: string
          p_query?: string
          p_remarks?: string
          p_secondary_category?: string
          p_status?: string[]
          p_user_id: string
        }
        Returns: {
          invoice: Json
          relevance: number
        }[]
      }
      search_invoices_dynamic: {
        Args: {
          field_filters?: Json
          limit_count?: number
          locale_code?: string
          offset_count?: number
          search_term?: string
        }
        Returns: {
          buyer_name: string
          currency: string
          invoice_date: string
          invoice_id: string
          invoice_number: string
          matched_fields: string[]
          processing_status: string
          seller_name: string
          source: string
          status: string
          total_amount: number
        }[]
      }
      set_invoice_field_value: {
        Args: {
          confidence_score_param?: number
          created_by_param?: string
          extraction_source_param?: string
          field_code_param: string
          field_value_param: string
          invoice_uuid: string
        }
        Returns: string
      }
      set_invoice_fields_batch: {
        Args: {
          created_by_param?: string
          extraction_source_param?: string
          fields_data: Json
          invoice_uuid: string
        }
        Returns: number
      }
      test_view_rls_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          test_name: string
          test_result: string
        }[]
      }
      update_task_priority: {
        Args: { p_new_priority: number; p_task_id: string }
        Returns: boolean
      }
    }
    Enums: {
      email_address_status:
        | "active"
        | "inactive"
        | "pending"
        | "suspended"
        | "expired"
      email_address_type:
        | "primary"
        | "work"
        | "personal"
        | "temporary"
        | "custom"
      expense_category_enum:
        | "办公"
        | "住宿"
        | "餐饮"
        | "交通"
        | "其他"
        | "高铁"
        | "飞机"
        | "出租车"
        | "酒店"
        | "民宿"
        | "咨询"
        | "印章"
        | "餐饮-餐饮"
        | "餐饮服务"
        | "住宿服务"
      invoice_source_enum: "email" | "upload" | "api" | "manual"
      invoice_status_enum:
        | "active"
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "archived"
      task_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      task_status_enum:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "retrying"
      task_type:
        | "process_email"
        | "ocr_extract"
        | "send_notification"
        | "cleanup_files"
      task_type_enum: "email_invoice" | "batch_import" | "ocr_retry"
      unified_status: "unsubmitted" | "submitted" | "reimbursed"
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
      email_address_status: [
        "active",
        "inactive",
        "pending",
        "suspended",
        "expired",
      ],
      email_address_type: [
        "primary",
        "work",
        "personal",
        "temporary",
        "custom",
      ],
      expense_category_enum: [
        "办公",
        "住宿",
        "餐饮",
        "交通",
        "其他",
        "高铁",
        "飞机",
        "出租车",
        "酒店",
        "民宿",
        "咨询",
        "印章",
        "餐饮-餐饮",
        "餐饮服务",
        "住宿服务",
      ],
      invoice_source_enum: ["email", "upload", "api", "manual"],
      invoice_status_enum: [
        "active",
        "pending",
        "processing",
        "completed",
        "failed",
        "archived",
      ],
      task_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      task_status_enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "retrying",
      ],
      task_type: [
        "process_email",
        "ocr_extract",
        "send_notification",
        "cleanup_files",
      ],
      task_type_enum: ["email_invoice", "batch_import", "ocr_retry"],
      unified_status: ["unsubmitted", "submitted", "reimbursed"],
    },
  },
} as const
