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
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          previous_data: Json | null
          request_metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          request_metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          request_metadata?: Json
        }
        Relationships: []
      }
      card_variant_additional_occasions: {
        Row: {
          card_variant_id: string
          occasion_id: string
        }
        Insert: {
          card_variant_id: string
          occasion_id: string
        }
        Update: {
          card_variant_id?: string
          occasion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_variant_additional_occasions_card_variant_id_fkey"
            columns: ["card_variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_card_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_variant_additional_occasions_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "catalog_occasions"
            referencedColumns: ["id"]
          },
        ]
      }
      card_variant_categories: {
        Row: {
          card_variant_id: string
          category_id: string
        }
        Insert: {
          card_variant_id: string
          category_id: string
        }
        Update: {
          card_variant_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_variant_categories_card_variant_id_fkey"
            columns: ["card_variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_card_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_variant_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      card_variant_recipients: {
        Row: {
          card_variant_id: string
          recipient_id: string
        }
        Insert: {
          card_variant_id: string
          recipient_id: string
        }
        Update: {
          card_variant_id?: string
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_variant_recipients_card_variant_id_fkey"
            columns: ["card_variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_card_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_variant_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "catalog_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      card_variant_seasons: {
        Row: {
          card_variant_id: string
          season_id: string
        }
        Insert: {
          card_variant_id: string
          season_id: string
        }
        Update: {
          card_variant_id?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_variant_seasons_card_variant_id_fkey"
            columns: ["card_variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_card_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_variant_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "catalog_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      card_variant_tags: {
        Row: {
          card_variant_id: string
          tag_id: string
        }
        Insert: {
          card_variant_id: string
          tag_id: string
        }
        Update: {
          card_variant_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_variant_tags_card_variant_id_fkey"
            columns: ["card_variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_card_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_variant_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "catalog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      card_variant_themes: {
        Row: {
          card_variant_id: string
          theme_id: string
        }
        Insert: {
          card_variant_id: string
          theme_id: string
        }
        Update: {
          card_variant_id?: string
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_variant_themes_card_variant_id_fkey"
            columns: ["card_variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_card_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_variant_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "catalog_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      card_variant_visual_objects: {
        Row: {
          card_variant_id: string
          visual_object_id: string
        }
        Insert: {
          card_variant_id: string
          visual_object_id: string
        }
        Update: {
          card_variant_id?: string
          visual_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_variant_visual_objects_card_variant_id_fkey"
            columns: ["card_variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_card_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_variant_visual_objects_visual_object_id_fkey"
            columns: ["visual_object_id"]
            isOneToOne: false
            referencedRelation: "catalog_visual_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_age_group_translations: {
        Row: {
          age_group_id: string
          created_at: string
          id: string
          language_code: string
          name: string
          updated_at: string
        }
        Insert: {
          age_group_id: string
          created_at?: string
          id?: string
          language_code: string
          name: string
          updated_at?: string
        }
        Update: {
          age_group_id?: string
          created_at?: string
          id?: string
          language_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_age_group_translations_age_group_id_fkey"
            columns: ["age_group_id"]
            isOneToOne: false
            referencedRelation: "catalog_age_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_age_group_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      catalog_age_groups: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_backgrounds: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          height: number | null
          id: string
          internal_name: string
          internal_notes: string | null
          is_archived: boolean
          is_hidden: boolean
          metadata: Json
          orientation: Database["public"]["Enums"]["orientation"]
          primary_media_asset_id: string | null
          status: Database["public"]["Enums"]["background_status"]
          thumbnail_media_asset_id: string | null
          updated_at: string
          updated_by: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          height?: number | null
          id?: string
          internal_name: string
          internal_notes?: string | null
          is_archived?: boolean
          is_hidden?: boolean
          metadata?: Json
          orientation?: Database["public"]["Enums"]["orientation"]
          primary_media_asset_id?: string | null
          status?: Database["public"]["Enums"]["background_status"]
          thumbnail_media_asset_id?: string | null
          updated_at?: string
          updated_by?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          height?: number | null
          id?: string
          internal_name?: string
          internal_notes?: string | null
          is_archived?: boolean
          is_hidden?: boolean
          metadata?: Json
          orientation?: Database["public"]["Enums"]["orientation"]
          primary_media_asset_id?: string | null
          status?: Database["public"]["Enums"]["background_status"]
          thumbnail_media_asset_id?: string | null
          updated_at?: string
          updated_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_backgrounds_primary_media_asset_id_fkey"
            columns: ["primary_media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_backgrounds_thumbnail_media_asset_id_fkey"
            columns: ["thumbnail_media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_card_translations: {
        Row: {
          alt_text: string | null
          approved_by: string | null
          card_variant_id: string
          created_at: string
          description: string | null
          greeting_text: string | null
          id: string
          language_code: string
          search_keywords: string[]
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          title: string | null
          translated_by: string | null
          translation_status: Database["public"]["Enums"]["translation_status"]
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          approved_by?: string | null
          card_variant_id: string
          created_at?: string
          description?: string | null
          greeting_text?: string | null
          id?: string
          language_code: string
          search_keywords?: string[]
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          title?: string | null
          translated_by?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          approved_by?: string | null
          card_variant_id?: string
          created_at?: string
          description?: string | null
          greeting_text?: string | null
          id?: string
          language_code?: string
          search_keywords?: string[]
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          title?: string | null
          translated_by?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_card_translations_card_variant_id_fkey"
            columns: ["card_variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_card_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_card_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      catalog_card_variants: {
        Row: {
          age_group_id: string | null
          allow_downloading: boolean
          allow_sharing: boolean
          background_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_order: number
          id: string
          internal_name: string
          internal_notes: string | null
          is_archived: boolean
          is_hidden: boolean
          is_new: boolean
          is_popular: boolean
          is_recommended: boolean
          metadata: Json
          mood_id: string | null
          orientation: Database["public"]["Enums"]["orientation"]
          primary_occasion_id: string | null
          publication_date: string | null
          search_keywords: string[]
          status: Database["public"]["Enums"]["variant_status"]
          style_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          age_group_id?: string | null
          allow_downloading?: boolean
          allow_sharing?: boolean
          background_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_order?: number
          id?: string
          internal_name: string
          internal_notes?: string | null
          is_archived?: boolean
          is_hidden?: boolean
          is_new?: boolean
          is_popular?: boolean
          is_recommended?: boolean
          metadata?: Json
          mood_id?: string | null
          orientation?: Database["public"]["Enums"]["orientation"]
          primary_occasion_id?: string | null
          publication_date?: string | null
          search_keywords?: string[]
          status?: Database["public"]["Enums"]["variant_status"]
          style_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          age_group_id?: string | null
          allow_downloading?: boolean
          allow_sharing?: boolean
          background_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_order?: number
          id?: string
          internal_name?: string
          internal_notes?: string | null
          is_archived?: boolean
          is_hidden?: boolean
          is_new?: boolean
          is_popular?: boolean
          is_recommended?: boolean
          metadata?: Json
          mood_id?: string | null
          orientation?: Database["public"]["Enums"]["orientation"]
          primary_occasion_id?: string | null
          publication_date?: string | null
          search_keywords?: string[]
          status?: Database["public"]["Enums"]["variant_status"]
          style_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_card_variants_age_group_id_fkey"
            columns: ["age_group_id"]
            isOneToOne: false
            referencedRelation: "catalog_age_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_card_variants_background_id_fkey"
            columns: ["background_id"]
            isOneToOne: false
            referencedRelation: "catalog_backgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_card_variants_mood_id_fkey"
            columns: ["mood_id"]
            isOneToOne: false
            referencedRelation: "catalog_moods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_card_variants_primary_occasion_id_fkey"
            columns: ["primary_occasion_id"]
            isOneToOne: false
            referencedRelation: "catalog_occasions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_card_variants_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "catalog_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_category_translations: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          language_code: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          language_code: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          language_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_category_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      catalog_mood_translations: {
        Row: {
          created_at: string
          id: string
          language_code: string
          mood_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          mood_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          mood_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_mood_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_mood_translations_mood_id_fkey"
            columns: ["mood_id"]
            isOneToOne: false
            referencedRelation: "catalog_moods"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_moods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_occasion_translations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          language_code: string
          name: string
          occasion_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          language_code: string
          name: string
          occasion_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          language_code?: string
          name?: string
          occasion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_occasion_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_occasion_translations_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "catalog_occasions"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_occasions: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_recipient_translations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          language_code: string
          name: string
          recipient_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          language_code: string
          name: string
          recipient_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          language_code?: string
          name?: string
          recipient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_recipient_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_recipient_translations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "catalog_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_recipients: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_season_translations: {
        Row: {
          created_at: string
          id: string
          language_code: string
          name: string
          season_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          name: string
          season_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          name?: string
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_season_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_season_translations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "catalog_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_seasons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_style_translations: {
        Row: {
          created_at: string
          id: string
          language_code: string
          name: string
          style_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          name: string
          style_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          name?: string
          style_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_style_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_style_translations_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "catalog_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_styles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_tag_translations: {
        Row: {
          created_at: string
          id: string
          language_code: string
          name: string
          tag_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          name: string
          tag_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          name?: string
          tag_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_tag_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_tag_translations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "catalog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_tags: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_text_designs: {
        Row: {
          alignment: string
          background_color: string | null
          background_opacity: number
          card_variant_id: string
          created_at: string
          desktop_overrides: Json
          font_family: string
          font_size: number
          font_weight: number
          id: string
          language_code: string | null
          letter_spacing: number
          line_height: number
          max_lines: number
          mobile_overrides: Json
          rotation: number
          tablet_overrides: Json
          text_color: string
          text_height: number | null
          text_outline: boolean
          text_shadow: boolean
          text_width: number
          text_x: number
          text_y: number
          updated_at: string
          vertical_alignment: string
        }
        Insert: {
          alignment?: string
          background_color?: string | null
          background_opacity?: number
          card_variant_id: string
          created_at?: string
          desktop_overrides?: Json
          font_family?: string
          font_size?: number
          font_weight?: number
          id?: string
          language_code?: string | null
          letter_spacing?: number
          line_height?: number
          max_lines?: number
          mobile_overrides?: Json
          rotation?: number
          tablet_overrides?: Json
          text_color?: string
          text_height?: number | null
          text_outline?: boolean
          text_shadow?: boolean
          text_width?: number
          text_x?: number
          text_y?: number
          updated_at?: string
          vertical_alignment?: string
        }
        Update: {
          alignment?: string
          background_color?: string | null
          background_opacity?: number
          card_variant_id?: string
          created_at?: string
          desktop_overrides?: Json
          font_family?: string
          font_size?: number
          font_weight?: number
          id?: string
          language_code?: string | null
          letter_spacing?: number
          line_height?: number
          max_lines?: number
          mobile_overrides?: Json
          rotation?: number
          tablet_overrides?: Json
          text_color?: string
          text_height?: number | null
          text_outline?: boolean
          text_shadow?: boolean
          text_width?: number
          text_x?: number
          text_y?: number
          updated_at?: string
          vertical_alignment?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_text_designs_card_variant_id_fkey"
            columns: ["card_variant_id"]
            isOneToOne: false
            referencedRelation: "catalog_card_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_text_designs_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      catalog_theme_translations: {
        Row: {
          created_at: string
          id: string
          language_code: string
          name: string
          theme_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          name: string
          theme_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          name?: string
          theme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_theme_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_theme_translations_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "catalog_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_themes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_visual_object_translations: {
        Row: {
          created_at: string
          id: string
          language_code: string
          name: string
          updated_at: string
          visual_object_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          name: string
          updated_at?: string
          visual_object_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          name?: string
          updated_at?: string
          visual_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_visual_object_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "catalog_visual_object_translations_visual_object_id_fkey"
            columns: ["visual_object_id"]
            isOneToOne: false
            referencedRelation: "catalog_visual_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_visual_objects: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          confirmed_at: string
          consent_type: string
          consent_version: string
          created_at: string
          deletion_requested_at: string | null
          id: string
          metadata: Json
          order_id: string | null
          participant_id: string | null
          user_id: string
        }
        Insert: {
          confirmed_at?: string
          consent_type: string
          consent_version: string
          created_at?: string
          deletion_requested_at?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          participant_id?: string | null
          user_id: string
        }
        Update: {
          confirmed_at?: string
          consent_type?: string
          consent_version?: string
          created_at?: string
          deletion_requested_at?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          participant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "order_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json
          order_id: string | null
          payment_id: string | null
          txn_type: Database["public"]["Enums"]["credit_txn_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          payment_id?: string | null
          txn_type: Database["public"]["Enums"]["credit_txn_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          payment_id?: string | null
          txn_type?: Database["public"]["Enums"]["credit_txn_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_purchased: number
          lifetime_spent: number
          reserved: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_purchased?: number
          lifetime_spent?: number
          reserved?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_purchased?: number
          lifetime_spent?: number
          reserved?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generation_attempts: {
        Row: {
          attempt_number: number
          completed_at: string | null
          cost: number | null
          created_at: string
          error_code: string | null
          error_message: string | null
          generation_job_id: string
          id: string
          metadata: Json
          output_asset_ids: string[]
          provider: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["generation_job_status"]
        }
        Insert: {
          attempt_number: number
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          generation_job_id: string
          id?: string
          metadata?: Json
          output_asset_ids?: string[]
          provider?: string | null
          started_at?: string | null
          status: Database["public"]["Enums"]["generation_job_status"]
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          generation_job_id?: string
          id?: string
          metadata?: Json
          output_asset_ids?: string[]
          provider?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "generation_attempts_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          actual_provider_cost: number | null
          attempt_number: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          estimated_provider_cost: number | null
          id: string
          input_parameters: Json
          job_type: string
          order_id: string | null
          priority: number
          provider: string | null
          provider_model: string | null
          provider_request_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["generation_job_status"]
          updated_at: string
        }
        Insert: {
          actual_provider_cost?: number | null
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          estimated_provider_cost?: number | null
          id?: string
          input_parameters?: Json
          job_type: string
          order_id?: string | null
          priority?: number
          provider?: string | null
          provider_model?: string | null
          provider_request_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_job_status"]
          updated_at?: string
        }
        Update: {
          actual_provider_cost?: number | null
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          estimated_provider_cost?: number | null
          id?: string
          input_parameters?: Json
          job_type?: string
          order_id?: string | null
          priority?: number
          provider?: string | null
          provider_model?: string | null
          provider_request_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          native_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          native_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          native_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          checksum: string | null
          created_at: string
          deleted_at: string | null
          duration_seconds: number | null
          file_size: number | null
          height: number | null
          id: string
          metadata: Json
          mime_type: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          order_id: string | null
          original_filename: string | null
          owner_user_id: string | null
          processing_status: Database["public"]["Enums"]["asset_processing_status"]
          purpose: string | null
          storage_bucket: string
          storage_path: string
          updated_at: string
          visibility: Database["public"]["Enums"]["asset_visibility"]
          width: number | null
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          order_id?: string | null
          original_filename?: string | null
          owner_user_id?: string | null
          processing_status?: Database["public"]["Enums"]["asset_processing_status"]
          purpose?: string | null
          storage_bucket: string
          storage_path: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["asset_visibility"]
          width?: number | null
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          order_id?: string | null
          original_filename?: string | null
          owner_user_id?: string | null
          processing_status?: Database["public"]["Enums"]["asset_processing_status"]
          purpose?: string | null
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["asset_visibility"]
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          notification_type: string
          payload: Json
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          notification_type: string
          payload?: Json
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          notification_type?: string
          payload?: Json
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          notification_job_id: string | null
          provider_reference: string | null
          status: Database["public"]["Enums"]["notification_status"]
          user_id: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          notification_job_id?: string | null
          provider_reference?: string | null
          status: Database["public"]["Enums"]["notification_status"]
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          notification_job_id?: string | null
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_notification_job_id_fkey"
            columns: ["notification_job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          preferences: Json
          push_enabled: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          preferences?: Json
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          preferences?: Json
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_participants: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_minor: boolean
          linked_media_asset_id: string | null
          notes: string | null
          order_id: string
          participant_role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_minor?: boolean
          linked_media_asset_id?: string | null
          notes?: string | null
          order_id: string
          participant_role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_minor?: boolean
          linked_media_asset_id?: string | null
          notes?: string | null
          order_id?: string
          participant_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_participants_linked_media_asset_id_fkey"
            columns: ["linked_media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_participants_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          configuration: Json
          created_at: string
          credits_charged: number
          credits_reserved: number
          currency: string | null
          customer_prompt: string | null
          customer_text: string | null
          delivery_method: string | null
          duration_seconds: number | null
          estimated_completion_at: string | null
          id: string
          monetary_amount: number | null
          order_number: string
          priority_level: number
          product_type: string
          queue_position: number | null
          recipient_data: Json
          requested_language: string | null
          scheduled_delivery_at: string | null
          source_language: string | null
          status: Database["public"]["Enums"]["order_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          configuration?: Json
          created_at?: string
          credits_charged?: number
          credits_reserved?: number
          currency?: string | null
          customer_prompt?: string | null
          customer_text?: string | null
          delivery_method?: string | null
          duration_seconds?: number | null
          estimated_completion_at?: string | null
          id?: string
          monetary_amount?: number | null
          order_number?: string
          priority_level?: number
          product_type: string
          queue_position?: number | null
          recipient_data?: Json
          requested_language?: string | null
          scheduled_delivery_at?: string | null
          source_language?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          configuration?: Json
          created_at?: string
          credits_charged?: number
          credits_reserved?: number
          currency?: string | null
          customer_prompt?: string | null
          customer_text?: string | null
          delivery_method?: string | null
          duration_seconds?: number | null
          estimated_completion_at?: string | null
          id?: string
          monetary_amount?: number | null
          order_number?: string
          priority_level?: number
          product_type?: string
          queue_position?: number | null
          recipient_data?: Json
          requested_language?: string | null
          scheduled_delivery_at?: string | null
          source_language?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_requested_language_fkey"
            columns: ["requested_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "orders_source_language_fkey"
            columns: ["source_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string | null
          provider: string
          provider_reference: string | null
          raw_payload: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          order_id?: string | null
          provider: string
          provider_reference?: string | null
          raw_payload?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          provider?: string
          provider_reference?: string | null
          raw_payload?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          display_name: string | null
          id: string
          preferred_language: string
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          display_name?: string | null
          id: string
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_deliveries: {
        Row: {
          attempted_count: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          destination: string
          id: string
          last_attempt_at: string | null
          metadata: Json
          order_id: string | null
          scheduled_for: string
          status: Database["public"]["Enums"]["notification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attempted_count?: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          destination: string
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          order_id?: string | null
          scheduled_for: string
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attempted_count?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          destination?: string
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          order_id?: string | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_credit_grants: {
        Row: {
          expires_at: string | null
          granted_amount: number
          granted_at: string
          id: string
          metadata: Json
          subscription_id: string
          wallet_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_amount: number
          granted_at?: string
          id?: string
          metadata?: Json
          subscription_id: string
          wallet_id: string
        }
        Update: {
          expires_at?: string | null
          granted_amount?: number
          granted_at?: string
          id?: string
          metadata?: Json
          subscription_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_credit_grants_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_credit_grants_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          plan_code: string
          provider: string | null
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_code: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_code?: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
      voice_profiles: {
        Row: {
          consent_confirmed_at: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          provider_reference: string | null
          retention_until: string | null
          source_asset_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_confirmed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id?: string
          provider_reference?: string | null
          retention_until?: string | null
          source_asset_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_confirmed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          provider_reference?: string | null
          retention_until?: string | null
          source_asset_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_editor_or_above: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_status: "active" | "suspended" | "deleted"
      app_role: "customer" | "editor" | "admin" | "super_admin"
      asset_processing_status: "pending" | "processing" | "ready" | "failed"
      asset_type:
        | "image"
        | "animated_image"
        | "video"
        | "audio"
        | "song"
        | "voiceover"
        | "cartoon"
        | "voice_sample"
        | "document"
        | "other"
      asset_visibility: "public" | "private" | "restricted"
      background_status: "draft" | "active" | "hidden" | "archived"
      credit_txn_type:
        | "purchase"
        | "subscription_grant"
        | "order_reservation"
        | "order_charge"
        | "refund"
        | "cashback"
        | "promotional_bonus"
        | "manual_adjustment"
        | "expiration"
      generation_job_status:
        | "pending"
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
        | "retrying"
      moderation_status: "pending" | "approved" | "rejected"
      notification_channel: "email" | "sms" | "push" | "in_app"
      notification_status:
        | "pending"
        | "sent"
        | "delivered"
        | "failed"
        | "cancelled"
      order_status:
        | "draft"
        | "awaiting_payment"
        | "paid"
        | "queued"
        | "processing"
        | "review"
        | "completed"
        | "failed"
        | "cancelled"
        | "refunded"
      orientation: "vertical" | "square" | "horizontal"
      translation_status:
        | "missing"
        | "draft"
        | "machine_translated"
        | "needs_review"
        | "approved"
        | "published"
      variant_status: "draft" | "review" | "published" | "hidden" | "archived"
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
      account_status: ["active", "suspended", "deleted"],
      app_role: ["customer", "editor", "admin", "super_admin"],
      asset_processing_status: ["pending", "processing", "ready", "failed"],
      asset_type: [
        "image",
        "animated_image",
        "video",
        "audio",
        "song",
        "voiceover",
        "cartoon",
        "voice_sample",
        "document",
        "other",
      ],
      asset_visibility: ["public", "private", "restricted"],
      background_status: ["draft", "active", "hidden", "archived"],
      credit_txn_type: [
        "purchase",
        "subscription_grant",
        "order_reservation",
        "order_charge",
        "refund",
        "cashback",
        "promotional_bonus",
        "manual_adjustment",
        "expiration",
      ],
      generation_job_status: [
        "pending",
        "queued",
        "running",
        "completed",
        "failed",
        "cancelled",
        "retrying",
      ],
      moderation_status: ["pending", "approved", "rejected"],
      notification_channel: ["email", "sms", "push", "in_app"],
      notification_status: [
        "pending",
        "sent",
        "delivered",
        "failed",
        "cancelled",
      ],
      order_status: [
        "draft",
        "awaiting_payment",
        "paid",
        "queued",
        "processing",
        "review",
        "completed",
        "failed",
        "cancelled",
        "refunded",
      ],
      orientation: ["vertical", "square", "horizontal"],
      translation_status: [
        "missing",
        "draft",
        "machine_translated",
        "needs_review",
        "approved",
        "published",
      ],
      variant_status: ["draft", "review", "published", "hidden", "archived"],
    },
  },
} as const
