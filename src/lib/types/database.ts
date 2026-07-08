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
      approved_feedstocks: {
        Row: {
          active: boolean
          carbon_fraction: number
          category: Database["public"]["Enums"]["feedstock_category"]
          created_at: string
          forestry_certification: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          proof_method: string | null
        }
        Insert: {
          active?: boolean
          carbon_fraction?: number
          category: Database["public"]["Enums"]["feedstock_category"]
          created_at?: string
          forestry_certification?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          proof_method?: string | null
        }
        Update: {
          active?: boolean
          carbon_fraction?: number
          category?: Database["public"]["Enums"]["feedstock_category"]
          created_at?: string
          forestry_certification?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          proof_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_feedstocks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          project_id: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          project_id?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          project_id?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      buffer_pool_ledger: {
        Row: {
          balance_after: number
          contribution_tco2e: number
          created_at: string
          id: string
          issuance_id: string | null
          project_id: string | null
          reason: string
        }
        Insert: {
          balance_after: number
          contribution_tco2e: number
          created_at?: string
          id?: string
          issuance_id?: string | null
          project_id?: string | null
          reason?: string
        }
        Update: {
          balance_after?: number
          contribution_tco2e?: number
          created_at?: string
          id?: string
          issuance_id?: string | null
          project_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "buffer_pool_ledger_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "rcc_issuances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buffer_pool_ledger_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      composite_samples: {
        Row: {
          collected_at: string
          created_at: string
          id: string
          kiln_run_id: string | null
          mass_kg: number
          production_batch_id: string
          site_id: string | null
          stage: string
        }
        Insert: {
          collected_at?: string
          created_at?: string
          id?: string
          kiln_run_id?: string | null
          mass_kg: number
          production_batch_id: string
          site_id?: string | null
          stage?: string
        }
        Update: {
          collected_at?: string
          created_at?: string
          id?: string
          kiln_run_id?: string | null
          mass_kg?: number
          production_batch_id?: string
          site_id?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "composite_samples_kiln_run_id_fkey"
            columns: ["kiln_run_id"]
            isOneToOne: false
            referencedRelation: "kiln_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composite_samples_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composite_samples_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          actor_id: string | null
          created_at: string
          credit_id: string | null
          from_holder: string | null
          id: string
          issuance_id: string | null
          notes: string | null
          project_id: string | null
          tco2e: number
          to_holder: string | null
          txn_type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          credit_id?: string | null
          from_holder?: string | null
          id?: string
          issuance_id?: string | null
          notes?: string | null
          project_id?: string | null
          tco2e?: number
          to_holder?: string | null
          txn_type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          credit_id?: string | null
          from_holder?: string | null
          id?: string
          issuance_id?: string | null
          notes?: string | null
          project_id?: string | null
          tco2e?: number
          to_holder?: string | null
          txn_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "rcc_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "rcc_issuances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      end_use_records: {
        Row: {
          application_method: string
          applied_at: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          production_batch_id: string | null
          project_id: string
          proof_paths: Json
          quantity_kg: number
          recipient_contact: string | null
          recipient_name: string | null
          recorded_by: string | null
        }
        Insert: {
          application_method: string
          applied_at?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          production_batch_id?: string | null
          project_id: string
          proof_paths?: Json
          quantity_kg: number
          recipient_contact?: string | null
          recipient_name?: string | null
          recorded_by?: string | null
        }
        Update: {
          application_method?: string
          applied_at?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          production_batch_id?: string | null
          project_id?: string
          proof_paths?: Json
          quantity_kg?: number
          recipient_contact?: string | null
          recipient_name?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "end_use_records_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "end_use_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "end_use_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedstock_batches: {
        Row: {
          approved_feedstock_id: string | null
          category: Database["public"]["Enums"]["feedstock_category"]
          created_at: string
          dry_weight_kg: number | null
          id: string
          moisture_pct: number
          project_id: string
          received_at: string
          recorded_by: string | null
          site_id: string | null
          source: string
          source_area_description: string | null
          weight_kg: number
        }
        Insert: {
          approved_feedstock_id?: string | null
          category: Database["public"]["Enums"]["feedstock_category"]
          created_at?: string
          dry_weight_kg?: number | null
          id?: string
          moisture_pct?: number
          project_id: string
          received_at?: string
          recorded_by?: string | null
          site_id?: string | null
          source: string
          source_area_description?: string | null
          weight_kg: number
        }
        Update: {
          approved_feedstock_id?: string | null
          category?: Database["public"]["Enums"]["feedstock_category"]
          created_at?: string
          dry_weight_kg?: number | null
          id?: string
          moisture_pct?: number
          project_id?: string
          received_at?: string
          recorded_by?: string | null
          site_id?: string | null
          source?: string
          source_area_description?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedstock_batches_approved_feedstock_id_fkey"
            columns: ["approved_feedstock_id"]
            isOneToOne: false
            referencedRelation: "approved_feedstocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedstock_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedstock_batches_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedstock_batches_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ghg_quantifications: {
        Row: {
          baseline_removal_tco2e: number
          biochar_fresh_t: number
          breakdown: Json
          computed_at: string
          computed_by: string | null
          created_at: string
          credit_type: Database["public"]["Enums"]["credit_type"]
          dry_t: number
          durability_years: number
          eligible: boolean
          functional_unit: string
          gross_removal_tco2e: number
          hc_org_ratio: number
          id: string
          lab_test_id: string | null
          moisture_fraction: number
          net_before_discount_tco2e: number
          net_co2_removed_tco2e: number
          organic_carbon_fraction: number
          permanence_fraction: number
          production_batch_id: string
          project_emissions_tco2e: number
          soil_temp_c: number
          transport_emissions_tco2e: number
          uncertainty_discount: number
          uncertainty_tier: string
        }
        Insert: {
          baseline_removal_tco2e?: number
          biochar_fresh_t: number
          breakdown?: Json
          computed_at?: string
          computed_by?: string | null
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"]
          dry_t: number
          durability_years?: number
          eligible?: boolean
          functional_unit?: string
          gross_removal_tco2e: number
          hc_org_ratio: number
          id?: string
          lab_test_id?: string | null
          moisture_fraction: number
          net_before_discount_tco2e: number
          net_co2_removed_tco2e: number
          organic_carbon_fraction: number
          permanence_fraction: number
          production_batch_id: string
          project_emissions_tco2e?: number
          soil_temp_c: number
          transport_emissions_tco2e?: number
          uncertainty_discount?: number
          uncertainty_tier?: string
        }
        Update: {
          baseline_removal_tco2e?: number
          biochar_fresh_t?: number
          breakdown?: Json
          computed_at?: string
          computed_by?: string | null
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"]
          dry_t?: number
          durability_years?: number
          eligible?: boolean
          functional_unit?: string
          gross_removal_tco2e?: number
          hc_org_ratio?: number
          id?: string
          lab_test_id?: string | null
          moisture_fraction?: number
          net_before_discount_tco2e?: number
          net_co2_removed_tco2e?: number
          organic_carbon_fraction?: number
          permanence_fraction?: number
          production_batch_id?: string
          project_emissions_tco2e?: number
          soil_temp_c?: number
          transport_emissions_tco2e?: number
          uncertainty_discount?: number
          uncertainty_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghg_quantifications_computed_by_fkey"
            columns: ["computed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghg_quantifications_lab_test_id_fkey"
            columns: ["lab_test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghg_quantifications_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      kiln_runs: {
        Row: {
          anomaly_flag: boolean
          biochar_dry_kg: number | null
          biochar_moisture_pct: number | null
          biochar_wet_kg: number | null
          client_ref: string | null
          code: string | null
          composite_sample_kg: number | null
          created_at: string
          ended_at: string | null
          feedstock_batch_id: string | null
          id: string
          kiln_id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          operator_id: string | null
          peak_temp_c: number | null
          production_batch_id: string | null
          project_id: string
          quench_method: string | null
          quenched_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          site_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["run_status"]
          submitted_at: string | null
          temperature_curve: Json
          updated_at: string
        }
        Insert: {
          anomaly_flag?: boolean
          biochar_dry_kg?: number | null
          biochar_moisture_pct?: number | null
          biochar_wet_kg?: number | null
          client_ref?: string | null
          code?: string | null
          composite_sample_kg?: number | null
          created_at?: string
          ended_at?: string | null
          feedstock_batch_id?: string | null
          id?: string
          kiln_id: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          operator_id?: string | null
          peak_temp_c?: number | null
          production_batch_id?: string | null
          project_id: string
          quench_method?: string | null
          quenched_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          site_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          submitted_at?: string | null
          temperature_curve?: Json
          updated_at?: string
        }
        Update: {
          anomaly_flag?: boolean
          biochar_dry_kg?: number | null
          biochar_moisture_pct?: number | null
          biochar_wet_kg?: number | null
          client_ref?: string | null
          code?: string | null
          composite_sample_kg?: number | null
          created_at?: string
          ended_at?: string | null
          feedstock_batch_id?: string | null
          id?: string
          kiln_id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          operator_id?: string | null
          peak_temp_c?: number | null
          production_batch_id?: string | null
          project_id?: string
          quench_method?: string | null
          quenched_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          site_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          submitted_at?: string | null
          temperature_curve?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiln_runs_feedstock_batch_id_fkey"
            columns: ["feedstock_batch_id"]
            isOneToOne: false
            referencedRelation: "feedstock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiln_runs_kiln_id_fkey"
            columns: ["kiln_id"]
            isOneToOne: false
            referencedRelation: "kilns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiln_runs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiln_runs_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiln_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiln_runs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiln_runs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      kilns: {
        Row: {
          capacity_kg: number | null
          code: string
          created_at: string
          id: string
          kiln_type: Database["public"]["Enums"]["kiln_type"]
          name: string
          project_id: string
          site_id: string
          sop_reference: string | null
          specifications: Json
          status: Database["public"]["Enums"]["kiln_status"]
        }
        Insert: {
          capacity_kg?: number | null
          code: string
          created_at?: string
          id?: string
          kiln_type?: Database["public"]["Enums"]["kiln_type"]
          name: string
          project_id: string
          site_id: string
          sop_reference?: string | null
          specifications?: Json
          status?: Database["public"]["Enums"]["kiln_status"]
        }
        Update: {
          capacity_kg?: number | null
          code?: string
          created_at?: string
          id?: string
          kiln_type?: Database["public"]["Enums"]["kiln_type"]
          name?: string
          project_id?: string
          site_id?: string
          sop_reference?: string | null
          specifications?: Json
          status?: Database["public"]["Enums"]["kiln_status"]
        }
        Relationships: [
          {
            foreignKeyName: "kilns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kilns_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          accreditation: string | null
          ash_content_pct: number | null
          created_at: string
          hydrogen_carbon_molar_ratio: number
          id: string
          inertinite_pct: number | null
          lab_name: string
          moisture_pct: number | null
          organic_carbon_pct: number
          ph: number | null
          pollutants_ok: boolean | null
          production_batch_id: string
          random_reflectance_pct: number | null
          recorded_by: string | null
          report_path: string | null
          sample_id: string | null
          stability_notes: string | null
          tested_at: string | null
        }
        Insert: {
          accreditation?: string | null
          ash_content_pct?: number | null
          created_at?: string
          hydrogen_carbon_molar_ratio: number
          id?: string
          inertinite_pct?: number | null
          lab_name: string
          moisture_pct?: number | null
          organic_carbon_pct: number
          ph?: number | null
          pollutants_ok?: boolean | null
          production_batch_id: string
          random_reflectance_pct?: number | null
          recorded_by?: string | null
          report_path?: string | null
          sample_id?: string | null
          stability_notes?: string | null
          tested_at?: string | null
        }
        Update: {
          accreditation?: string | null
          ash_content_pct?: number | null
          created_at?: string
          hydrogen_carbon_molar_ratio?: number
          id?: string
          inertinite_pct?: number | null
          lab_name?: string
          moisture_pct?: number | null
          organic_carbon_pct?: number
          ph?: number | null
          pollutants_ok?: boolean | null
          production_batch_id?: string
          random_reflectance_pct?: number | null
          recorded_by?: string | null
          report_path?: string | null
          sample_id?: string | null
          stability_notes?: string | null
          tested_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_tests_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_tests_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          project_id: string | null
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          project_id?: string | null
          read?: boolean
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          project_id?: string | null
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          closed_at: string | null
          code: string
          created_at: string
          feedstock_category:
            | Database["public"]["Enums"]["feedstock_category"]
            | null
          id: string
          kiln_type: Database["public"]["Enums"]["kiln_type"]
          notes: string | null
          opened_at: string
          project_id: string
          run_count: number
          status: Database["public"]["Enums"]["batch_status"]
          temperature_profile: string | null
          total_biochar_dry_kg: number
        }
        Insert: {
          closed_at?: string | null
          code: string
          created_at?: string
          feedstock_category?:
            | Database["public"]["Enums"]["feedstock_category"]
            | null
          id?: string
          kiln_type: Database["public"]["Enums"]["kiln_type"]
          notes?: string | null
          opened_at?: string
          project_id: string
          run_count?: number
          status?: Database["public"]["Enums"]["batch_status"]
          temperature_profile?: string | null
          total_biochar_dry_kg?: number
        }
        Update: {
          closed_at?: string | null
          code?: string
          created_at?: string
          feedstock_category?:
            | Database["public"]["Enums"]["feedstock_category"]
            | null
          id?: string
          kiln_type?: Database["public"]["Enums"]["kiln_type"]
          notes?: string | null
          opened_at?: string
          project_id?: string
          run_count?: number
          status?: Database["public"]["Enums"]["batch_status"]
          temperature_profile?: string | null
          total_biochar_dry_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          global_role: Database["public"]["Enums"]["global_role"]
          id: string
          organization: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          global_role?: Database["public"]["Enums"]["global_role"]
          id: string
          organization?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          global_role?: Database["public"]["Enums"]["global_role"]
          id?: string
          organization?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          buffer_pool_pct: number
          code: string
          country_code: string
          created_at: string
          crediting_period_end: string | null
          crediting_period_start: string | null
          description: string | null
          developer_id: string | null
          durability_pathway: Database["public"]["Enums"]["durability_pathway"]
          id: string
          methodology: string
          monitoring_period_months: number
          name: string
          pdd_reference: string | null
          region: string | null
          soil_temp_c: number
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          buffer_pool_pct?: number
          code: string
          country_code?: string
          created_at?: string
          crediting_period_end?: string | null
          crediting_period_start?: string | null
          description?: string | null
          developer_id?: string | null
          durability_pathway?: Database["public"]["Enums"]["durability_pathway"]
          id?: string
          methodology?: string
          monitoring_period_months?: number
          name: string
          pdd_reference?: string | null
          region?: string | null
          soil_temp_c?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          buffer_pool_pct?: number
          code?: string
          country_code?: string
          created_at?: string
          crediting_period_end?: string | null
          crediting_period_start?: string | null
          description?: string | null
          developer_id?: string | null
          durability_pathway?: Database["public"]["Enums"]["durability_pathway"]
          id?: string
          methodology?: string
          monitoring_period_months?: number
          name?: string
          pdd_reference?: string | null
          region?: string | null
          soil_temp_c?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rcc_credits: {
        Row: {
          created_at: string
          credit_type: Database["public"]["Enums"]["credit_type"]
          current_holder: string | null
          geography: string
          id: string
          issuance_id: string
          project_id: string
          retired_at: string | null
          retired_reason: string | null
          serial_number: string
          status: Database["public"]["Enums"]["credit_status"]
          vintage: number
        }
        Insert: {
          created_at?: string
          credit_type: Database["public"]["Enums"]["credit_type"]
          current_holder?: string | null
          geography: string
          id?: string
          issuance_id: string
          project_id: string
          retired_at?: string | null
          retired_reason?: string | null
          serial_number: string
          status?: Database["public"]["Enums"]["credit_status"]
          vintage: number
        }
        Update: {
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"]
          current_holder?: string | null
          geography?: string
          id?: string
          issuance_id?: string
          project_id?: string
          retired_at?: string | null
          retired_reason?: string | null
          serial_number?: string
          status?: Database["public"]["Enums"]["credit_status"]
          vintage?: number
        }
        Relationships: [
          {
            foreignKeyName: "rcc_credits_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "rcc_issuances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcc_credits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rcc_issuances: {
        Row: {
          approved_by: string | null
          buffer_tco2e: number
          created_at: string
          credit_type: Database["public"]["Enums"]["credit_type"]
          geography: string
          ghg_quantification_id: string | null
          gross_tco2e: number
          id: string
          initiated_by: string | null
          issued_at: string | null
          net_issued_tco2e: number
          production_batch_id: string | null
          project_id: string
          serial_prefix: string | null
          status: Database["public"]["Enums"]["issuance_status"]
          verification_id: string | null
          vintage: number
        }
        Insert: {
          approved_by?: string | null
          buffer_tco2e?: number
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"]
          geography: string
          ghg_quantification_id?: string | null
          gross_tco2e: number
          id?: string
          initiated_by?: string | null
          issued_at?: string | null
          net_issued_tco2e: number
          production_batch_id?: string | null
          project_id: string
          serial_prefix?: string | null
          status?: Database["public"]["Enums"]["issuance_status"]
          verification_id?: string | null
          vintage: number
        }
        Update: {
          approved_by?: string | null
          buffer_tco2e?: number
          created_at?: string
          credit_type?: Database["public"]["Enums"]["credit_type"]
          geography?: string
          ghg_quantification_id?: string | null
          gross_tco2e?: number
          id?: string
          initiated_by?: string | null
          issued_at?: string | null
          net_issued_tco2e?: number
          production_batch_id?: string | null
          project_id?: string
          serial_prefix?: string | null
          status?: Database["public"]["Enums"]["issuance_status"]
          verification_id?: string | null
          vintage?: number
        }
        Relationships: [
          {
            foreignKeyName: "rcc_issuances_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcc_issuances_ghg_quantification_id_fkey"
            columns: ["ghg_quantification_id"]
            isOneToOne: false
            referencedRelation: "ghg_quantifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcc_issuances_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcc_issuances_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcc_issuances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcc_issuances_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      rcc_serial_counters: {
        Row: {
          credit_type: Database["public"]["Enums"]["credit_type"]
          last_seq: number
          project_id: string
          vintage: number
        }
        Insert: {
          credit_type: Database["public"]["Enums"]["credit_type"]
          last_seq?: number
          project_id: string
          vintage: number
        }
        Update: {
          credit_type?: Database["public"]["Enums"]["credit_type"]
          last_seq?: number
          project_id?: string
          vintage?: number
        }
        Relationships: [
          {
            foreignKeyName: "rcc_serial_counters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      run_photos: {
        Row: {
          created_at: string
          id: string
          kiln_run_id: string
          latitude: number | null
          longitude: number | null
          photo_type: Database["public"]["Enums"]["photo_type"]
          storage_path: string
          taken_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kiln_run_id: string
          latitude?: number | null
          longitude?: number | null
          photo_type: Database["public"]["Enums"]["photo_type"]
          storage_path: string
          taken_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kiln_run_id?: string
          latitude?: number | null
          longitude?: number | null
          photo_type?: Database["public"]["Enums"]["photo_type"]
          storage_path?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_photos_kiln_run_id_fkey"
            columns: ["kiln_run_id"]
            isOneToOne: false
            referencedRelation: "kiln_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_assignments: {
        Row: {
          created_at: string
          id: string
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_assignments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_audits: {
        Row: {
          created_at: string
          findings: string | null
          id: string
          photos: Json
          project_id: string
          site_id: string
          supervisor_id: string | null
          visit_date: string
        }
        Insert: {
          created_at?: string
          findings?: string | null
          id?: string
          photos?: Json
          project_id: string
          site_id: string
          supervisor_id?: string | null
          visit_date?: string
        }
        Update: {
          created_at?: string
          findings?: string | null
          id?: string
          photos?: Json
          project_id?: string
          site_id?: string
          supervisor_id?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_audits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_audits_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          previous_cropping: string | null
          project_id: string
          region: string | null
          status: Database["public"]["Enums"]["site_status"]
          supply_envelope: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          previous_cropping?: string | null
          project_id: string
          region?: string | null
          status?: Database["public"]["Enums"]["site_status"]
          supply_envelope?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          previous_cropping?: string | null
          project_id?: string
          region?: string | null
          status?: Database["public"]["Enums"]["site_status"]
          supply_envelope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_findings: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          related_entity: string | null
          severity: Database["public"]["Enums"]["finding_severity"]
          status: Database["public"]["Enums"]["finding_status"]
          verification_id: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          related_entity?: string | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          status?: Database["public"]["Enums"]["finding_status"]
          verification_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          related_entity?: string | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          status?: Database["public"]["Enums"]["finding_status"]
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_findings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_findings_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          audit_type: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          id: string
          monitoring_period_end: string | null
          monitoring_period_start: string | null
          production_batch_id: string | null
          project_id: string
          report_path: string | null
          status: Database["public"]["Enums"]["verification_status"]
          summary: string | null
          verifier_id: string | null
        }
        Insert: {
          audit_type?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          id?: string
          monitoring_period_end?: string | null
          monitoring_period_start?: string | null
          production_batch_id?: string | null
          project_id: string
          report_path?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          summary?: string | null
          verifier_id?: string | null
        }
        Update: {
          audit_type?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          id?: string
          monitoring_period_end?: string | null
          monitoring_period_start?: string | null
          production_batch_id?: string | null
          project_id?: string
          report_path?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          summary?: string | null
          verifier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_verifier_id_fkey"
            columns: ["verifier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      batch_usage: {
        Args: { p_batch: string }
        Returns: {
          age_months: number
          months_pct: number
          over_limit: boolean
          tonnes: number
          tonnes_pct: number
        }[]
      }
      can_review: { Args: { p_project: string }; Returns: boolean }
      fn_issue_credits: { Args: { p_issuance: string }; Returns: number }
      fn_retire_credit: {
        Args: { p_beneficiary: string; p_credit: string; p_reason: string }
        Returns: undefined
      }
      fn_verify_batch: { Args: { p_verification: string }; Returns: undefined }
      has_project_role: {
        Args: {
          p_project: string
          p_roles: Database["public"]["Enums"]["project_role"][]
        }
        Returns: boolean
      }
      is_project_member: { Args: { p_project: string }; Returns: boolean }
      is_registry_admin: { Args: never; Returns: boolean }
      is_site_assigned: { Args: { p_site: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      recompute_batch: { Args: { p_batch: string }; Returns: undefined }
    }
    Enums: {
      audit_action: "insert" | "update" | "delete" | "approve" | "reject"
      batch_status: "open" | "closed" | "testing" | "verified"
      credit_status:
        | "issued"
        | "verified"
        | "retired"
        | "cancelled"
        | "buffer"
        | "transferred"
      credit_type: "removal" | "avoidance"
      durability_pathway: "years_100" | "years_1000"
      feedstock_category:
        | "forest_secondary"
        | "forest_managed"
        | "tree_removal"
        | "ag_residue_valued"
        | "ag_residue_no_value"
        | "other_waste"
        | "invasive_species"
      finding_severity: "low" | "medium" | "high" | "critical"
      finding_status: "open" | "resolved"
      global_role: "super_admin" | "registry_admin" | "member"
      issuance_status: "draft" | "initiated" | "approved" | "issued"
      kiln_status: "active" | "maintenance" | "retired"
      kiln_type:
        | "flame_curtain_cone"
        | "flame_curtain_trench"
        | "flame_curtain_shielded"
      notification_type:
        | "review_request"
        | "batch_limit"
        | "verification_status"
        | "issuance"
        | "end_use"
        | "info"
      photo_type: "pyrolysis" | "flame_curtain" | "quench" | "other"
      project_role:
        | "project_developer"
        | "kiln_supervisor"
        | "kiln_operator"
        | "verifier"
      project_status: "draft" | "active" | "closed"
      run_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "changes_requested"
      site_status: "active" | "inactive"
      verification_status: "assigned" | "in_review" | "approved" | "rejected"
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
      audit_action: ["insert", "update", "delete", "approve", "reject"],
      batch_status: ["open", "closed", "testing", "verified"],
      credit_status: [
        "issued",
        "verified",
        "retired",
        "cancelled",
        "buffer",
        "transferred",
      ],
      credit_type: ["removal", "avoidance"],
      durability_pathway: ["years_100", "years_1000"],
      feedstock_category: [
        "forest_secondary",
        "forest_managed",
        "tree_removal",
        "ag_residue_valued",
        "ag_residue_no_value",
        "other_waste",
        "invasive_species",
      ],
      finding_severity: ["low", "medium", "high", "critical"],
      finding_status: ["open", "resolved"],
      global_role: ["super_admin", "registry_admin", "member"],
      issuance_status: ["draft", "initiated", "approved", "issued"],
      kiln_status: ["active", "maintenance", "retired"],
      kiln_type: [
        "flame_curtain_cone",
        "flame_curtain_trench",
        "flame_curtain_shielded",
      ],
      notification_type: [
        "review_request",
        "batch_limit",
        "verification_status",
        "issuance",
        "end_use",
        "info",
      ],
      photo_type: ["pyrolysis", "flame_curtain", "quench", "other"],
      project_role: [
        "project_developer",
        "kiln_supervisor",
        "kiln_operator",
        "verifier",
      ],
      project_status: ["draft", "active", "closed"],
      run_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "changes_requested",
      ],
      site_status: ["active", "inactive"],
      verification_status: ["assigned", "in_review", "approved", "rejected"],
    },
  },
} as const
