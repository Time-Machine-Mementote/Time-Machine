export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      memories: {
        Row: {
          id: string
          author_id: string
          text: string
          created_at: string
          t_start: string | null
          t_end: string | null
          lat: number
          lng: number
          radius_m: number
          place_name: string | null
          audio_url: string | null
          privacy: 'private' | 'friends' | 'public'
          tags: string[] | null
          parent_memory_id: string | null
          source: string
          model_version: string | null
          summary: string | null
          extracted_places: any | null
          extracted_times: any | null
          extracted_people: string[] | null
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          text: string
          created_at?: string
          t_start?: string | null
          t_end?: string | null
          lat: number
          lng: number
          radius_m?: number
          place_name?: string | null
          audio_url?: string | null
          privacy?: 'private' | 'friends' | 'public'
          tags?: string[] | null
          parent_memory_id?: string | null
          source?: string
          model_version?: string | null
          summary?: string | null
          extracted_places?: any | null
          extracted_times?: any | null
          extracted_people?: string[] | null
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          text?: string
          created_at?: string
          t_start?: string | null
          t_end?: string | null
          lat?: number
          lng?: number
          radius_m?: number
          place_name?: string | null
          audio_url?: string | null
          privacy?: 'private' | 'friends' | 'public'
          tags?: string[] | null
          parent_memory_id?: string | null
          source?: string
          model_version?: string | null
          summary?: string | null
          extracted_places?: any | null
          extracted_times?: any | null
          extracted_people?: string[] | null
          updated_at?: string
        }
      }
      memory_links: {
        Row: {
          id: string
          from_id: string
          to_id: string
          relation: 'original' | 'recall' | 'retell' | 'inspired_by'
          created_at: string
        }
        Insert: {
          id?: string
          from_id: string
          to_id: string
          relation: 'original' | 'recall' | 'retell' | 'inspired_by'
          created_at?: string
        }
        Update: {
          id?: string
          from_id?: string
          to_id?: string
          relation?: 'original' | 'recall' | 'retell' | 'inspired_by'
          created_at?: string
        }
      }
      plays: {
        Row: {
          id: string
          user_id: string
          memory_id: string
          heard_at: string
          lat: number | null
          lng: number | null
          device_info: any | null
        }
        Insert: {
          id?: string
          user_id: string
          memory_id: string
          heard_at?: string
          lat?: number | null
          lng?: number | null
          device_info?: any | null
        }
        Update: {
          id?: string
          user_id?: string
          memory_id?: string
          heard_at?: string
          lat?: number | null
          lng?: number | null
          device_info?: any | null
        }
      }
      places: {
        Row: {
          id: string
          name: string
          lat: number
          lng: number
          confidence: number | null
          place_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          lat: number
          lng: number
          confidence?: number | null
          place_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          lat?: number
          lng?: number
          confidence?: number | null
          place_type?: string | null
          created_at?: string
        }
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: 'pending' | 'accepted' | 'blocked'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: 'pending' | 'accepted' | 'blocked'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: 'pending' | 'accepted' | 'blocked'
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          entry_type: 'text' | 'voice' | 'media'
          mood: string | null
          tags: string[] | null
          media_files: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          entry_type?: 'text' | 'voice' | 'media'
          mood?: string | null
          tags?: string[] | null
          media_files?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          entry_type?: 'text' | 'voice' | 'media'
          mood?: string | null
          tags?: string[] | null
          media_files?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      generated_memories: {
        Row: {
          id: string
          entry_id: string
          user_id: string
          story: string | null
          audio_url: string | null
          video_url: string | null
          image_url: string | null
          status: 'pending' | 'generated' | 'failed'
          generation_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          user_id: string
          story?: string | null
          audio_url?: string | null
          video_url?: string | null
          image_url?: string | null
          status?: 'pending' | 'generated' | 'failed'
          generation_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          user_id?: string
          story?: string | null
          audio_url?: string | null
          video_url?: string | null
          image_url?: string | null
          status?: 'pending' | 'generated' | 'failed'
          generation_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      entry_type: 'text' | 'voice' | 'media'
      memory_status: 'pending' | 'generated' | 'failed'
      memory_privacy: 'private' | 'friends' | 'public'
      memory_source: 'manual' | 'ai_generated' | 'imported'
      memory_relation: 'original' | 'recall' | 'retell' | 'inspired_by'
      friendship_status: 'pending' | 'accepted' | 'blocked'
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
      entry_type: ['text', 'voice', 'media'] as const,
      memory_status: ['pending', 'generated', 'failed'] as const,
      memory_privacy: ['private', 'friends', 'public'] as const,
      memory_source: ['manual', 'ai_generated', 'imported'] as const,
      memory_relation: ['original', 'recall', 'retell', 'inspired_by'] as const,
      friendship_status: ['pending', 'accepted', 'blocked'] as const,
    },
  },
} as const
