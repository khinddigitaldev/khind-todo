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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          bytes: number
          created_at: string
          created_by: string
          id: number
          inspection_id: number
          item_id: number | null
          storage_path: string
        }
        Insert: {
          bytes: number
          created_at?: string
          created_by?: string
          id?: never
          inspection_id: number
          item_id?: number | null
          storage_path: string
        }
        Update: {
          bytes?: number
          created_at?: string
          created_by?: string
          id?: never
          inspection_id?: number
          item_id?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          at: string
          changes: Json
          id: number
          inspection_id: number | null
          row_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          at?: string
          changes: Json
          id?: never
          inspection_id?: number | null
          row_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          at?: string
          changes?: Json
          id?: never
          inspection_id?: number | null
          row_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      backups: {
        Row: {
          at: string
          id: number
          note: string | null
          row_count: number
          run_by: string
        }
        Insert: {
          at?: string
          id?: never
          note?: string | null
          row_count: number
          run_by?: string
        }
        Update: {
          at?: string
          id?: never
          note?: string | null
          row_count?: number
          run_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "backups_run_by_fkey"
            columns: ["run_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_counters: {
        Row: {
          kind: string
          last: number
          year: number
        }
        Insert: {
          kind: string
          last?: number
          year: number
        }
        Update: {
          kind?: string
          last?: number
          year?: number
        }
        Relationships: []
      }
      inspection_checks: {
        Row: {
          comment: string | null
          inspection_id: number
          item_id: number
          result: Database["public"]["Enums"]["check_result"]
        }
        Insert: {
          comment?: string | null
          inspection_id: number
          item_id: number
          result: Database["public"]["Enums"]["check_result"]
        }
        Update: {
          comment?: string | null
          inspection_id?: number
          item_id?: number
          result?: Database["public"]["Enums"]["check_result"]
        }
        Relationships: [
          {
            foreignKeyName: "inspection_checks_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_checks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_defects: {
        Row: {
          ac: number | null
          defect_class: Database["public"]["Enums"]["defect_class"]
          description: string | null
          found: number | null
          inspection_id: number
          re: number | null
        }
        Insert: {
          ac?: number | null
          defect_class: Database["public"]["Enums"]["defect_class"]
          description?: string | null
          found?: number | null
          inspection_id: number
          re?: number | null
        }
        Update: {
          ac?: number | null
          defect_class?: Database["public"]["Enums"]["defect_class"]
          description?: string | null
          found?: number | null
          inspection_id?: number
          re?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_defects_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_measurements: {
        Row: {
          characteristic_id: number
          inspection_id: number
          readings: number[]
          result: string | null
        }
        Insert: {
          characteristic_id: number
          inspection_id: number
          readings?: number[]
          result?: string | null
        }
        Update: {
          characteristic_id?: number
          inspection_id?: number
          readings?: number[]
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_measurements_characteristic_id_fkey"
            columns: ["characteristic_id"]
            isOneToOne: false
            referencedRelation: "template_characteristics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_measurements_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          concession_reason: string | null
          created_at: string
          disposition: Database["public"]["Enums"]["disposition"] | null
          do_no: string | null
          id: number
          inspector_id: string
          instrument: string | null
          lot_no: string | null
          number: string
          part_id: number
          po_no: string | null
          qty_received: number
          received_at: string
          reopen_reason: string | null
          return_comment: string | null
          sample_override_reason: string | null
          sample_size: number
          section_notes: Json
          site: string
          stage: Database["public"]["Enums"]["sampling_stage"]
          status: Database["public"]["Enums"]["inspection_status"]
          submitted_at: string | null
          supplier_id: number
          template_version_id: number
          updated_at: string
          verdict: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          concession_reason?: string | null
          created_at?: string
          disposition?: Database["public"]["Enums"]["disposition"] | null
          do_no?: string | null
          id?: never
          inspector_id: string
          instrument?: string | null
          lot_no?: string | null
          number: string
          part_id: number
          po_no?: string | null
          qty_received: number
          received_at?: string
          reopen_reason?: string | null
          return_comment?: string | null
          sample_override_reason?: string | null
          sample_size: number
          section_notes?: Json
          site?: string
          stage?: Database["public"]["Enums"]["sampling_stage"]
          status?: Database["public"]["Enums"]["inspection_status"]
          submitted_at?: string | null
          supplier_id: number
          template_version_id: number
          updated_at?: string
          verdict?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          concession_reason?: string | null
          created_at?: string
          disposition?: Database["public"]["Enums"]["disposition"] | null
          do_no?: string | null
          id?: never
          inspector_id?: string
          instrument?: string | null
          lot_no?: string | null
          number?: string
          part_id?: number
          po_no?: string | null
          qty_received?: number
          received_at?: string
          reopen_reason?: string | null
          return_comment?: string | null
          sample_override_reason?: string | null
          sample_size?: number
          section_notes?: Json
          site?: string
          stage?: Database["public"]["Enums"]["sampling_stage"]
          status?: Database["public"]["Enums"]["inspection_status"]
          submitted_at?: string | null
          supplier_id?: number
          template_version_id?: number
          updated_at?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ncrs: {
        Row: {
          closed_at: string | null
          created_at: string
          disposition: Database["public"]["Enums"]["disposition"]
          id: number
          inspection_id: number
          number: string
          qty_affected: number
          rma_no: string | null
          scar_no: string | null
          status: Database["public"]["Enums"]["ncr_status"]
          summary: string
          supplier_response: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          disposition: Database["public"]["Enums"]["disposition"]
          id?: never
          inspection_id: number
          number: string
          qty_affected: number
          rma_no?: string | null
          scar_no?: string | null
          status?: Database["public"]["Enums"]["ncr_status"]
          summary: string
          supplier_response?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          disposition?: Database["public"]["Enums"]["disposition"]
          id?: never
          inspection_id?: number
          number?: string
          qty_affected?: number
          rma_no?: string | null
          scar_no?: string | null
          status?: Database["public"]["Enums"]["ncr_status"]
          summary?: string
          supplier_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncrs_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: true
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          drawing_no: string | null
          drawing_rev: string | null
          id: number
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          name: string
          part_no: string
          regulated: boolean
          template_id: number | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          drawing_no?: string | null
          drawing_rev?: string | null
          id?: never
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          name: string
          part_no: string
          regulated?: boolean
          template_id?: number | null
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          drawing_no?: string | null
          drawing_rev?: string | null
          id?: never
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          name?: string
          part_no?: string
          regulated?: boolean
          template_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      sampling_acceptance: {
        Row: {
          ac: number
          defect_class: Database["public"]["Enums"]["defect_class"]
          plan_source: string
          re: number | null
        }
        Insert: {
          ac?: number
          defect_class: Database["public"]["Enums"]["defect_class"]
          plan_source?: string
          re?: number | null
        }
        Update: {
          ac?: number
          defect_class?: Database["public"]["Enums"]["defect_class"]
          plan_source?: string
          re?: number | null
        }
        Relationships: []
      }
      sampling_bands: {
        Row: {
          active: boolean
          id: number
          lot_max: number | null
          lot_min: number
          plan_source: string
          sample_normal: number | null
          sample_tightened: number | null
        }
        Insert: {
          active?: boolean
          id?: never
          lot_max?: number | null
          lot_min: number
          plan_source?: string
          sample_normal?: number | null
          sample_tightened?: number | null
        }
        Update: {
          active?: boolean
          id?: never
          lot_max?: number | null
          lot_min?: number
          plan_source?: string
          sample_normal?: number | null
          sample_tightened?: number | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          code: string
          created_at: string
          email: string | null
          id: number
          name: string
          status: Database["public"]["Enums"]["supplier_status"]
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          email?: string | null
          id?: never
          name: string
          status?: Database["public"]["Enums"]["supplier_status"]
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          email?: string | null
          id?: never
          name?: string
          status?: Database["public"]["Enums"]["supplier_status"]
        }
        Relationships: []
      }
      template_characteristics: {
        Row: {
          defect_class: Database["public"]["Enums"]["defect_class"]
          id: number
          max_value: number | null
          min_value: number | null
          name: string
          nominal: number | null
          position: number
          unit: string
          version_id: number
        }
        Insert: {
          defect_class?: Database["public"]["Enums"]["defect_class"]
          id?: never
          max_value?: number | null
          min_value?: number | null
          name: string
          nominal?: number | null
          position: number
          unit?: string
          version_id: number
        }
        Update: {
          defect_class?: Database["public"]["Enums"]["defect_class"]
          id?: never
          max_value?: number | null
          min_value?: number | null
          name?: string
          nominal?: number | null
          position?: number
          unit?: string
          version_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_characteristics_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_items: {
        Row: {
          id: number
          position: number
          section: string
          text: string
          version_id: number
        }
        Insert: {
          id?: never
          position: number
          section: string
          text: string
          version_id: number
        }
        Update: {
          id?: never
          position?: number
          section?: string
          text?: string
          version_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          template_id: number
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          template_id: number
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          template_id?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          active: boolean
          created_at: string
          id: number
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: never
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_inspection: { Args: { p_id: number }; Returns: boolean }
      has_role: {
        Args: { roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      my_role: { Args: never; Returns: Database["public"]["Enums"]["app_role"] }
      next_number: { Args: { p_kind: string }; Returns: string }
      sample_size_for: {
        Args: {
          p_lot: number
          p_stage: Database["public"]["Enums"]["sampling_stage"]
          p_type?: Database["public"]["Enums"]["inspection_type"]
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "inspector" | "qa" | "purchasing" | "management" | "admin"
      check_result: "ok" | "ng" | "na"
      defect_class: "critical" | "major" | "minor"
      disposition: "accept" | "concession" | "sort" | "reject"
      inspection_status: "draft" | "submitted" | "returned" | "approved"
      inspection_type: "sampling" | "full" | "none"
      ncr_status: "open" | "waiting_supplier" | "closed"
      sampling_stage: "normal" | "tightened"
      supplier_status: "approved" | "probation" | "blocked"
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
      app_role: ["inspector", "qa", "purchasing", "management", "admin"],
      check_result: ["ok", "ng", "na"],
      defect_class: ["critical", "major", "minor"],
      disposition: ["accept", "concession", "sort", "reject"],
      inspection_status: ["draft", "submitted", "returned", "approved"],
      inspection_type: ["sampling", "full", "none"],
      ncr_status: ["open", "waiting_supplier", "closed"],
      sampling_stage: ["normal", "tightened"],
      supplier_status: ["approved", "probation", "blocked"],
    },
  },
} as const
