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
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          programacao_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          programacao_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          programacao_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_programacao_id_fkey"
            columns: ["programacao_id"]
            isOneToOne: false
            referencedRelation: "programacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          notificacoes_ativas: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          notificacoes_ativas?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          notificacoes_ativas?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      programacao_editores: {
        Row: {
          created_at: string
          id: string
          programacao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          programacao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          programacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programacao_editores_programacao_id_fkey"
            columns: ["programacao_id"]
            isOneToOne: false
            referencedRelation: "programacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      programacao_itens: {
        Row: {
          atividade: string
          created_at: string
          duracao_minutos: number
          horario_estimado: string | null
          horario_real: string | null
          id: string
          midia: string | null
          observacao: string | null
          ordem: number
          programacao_id: string
          responsavel: string | null
          updated_at: string
          visivel_publico: boolean
        }
        Insert: {
          atividade: string
          created_at?: string
          duracao_minutos?: number
          horario_estimado?: string | null
          horario_real?: string | null
          id?: string
          midia?: string | null
          observacao?: string | null
          ordem?: number
          programacao_id: string
          responsavel?: string | null
          updated_at?: string
          visivel_publico?: boolean
        }
        Update: {
          atividade?: string
          created_at?: string
          duracao_minutos?: number
          horario_estimado?: string | null
          horario_real?: string | null
          id?: string
          midia?: string | null
          observacao?: string | null
          ordem?: number
          programacao_id?: string
          responsavel?: string | null
          updated_at?: string
          visivel_publico?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "programacao_itens_programacao_id_fkey"
            columns: ["programacao_id"]
            isOneToOne: false
            referencedRelation: "programacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      programacoes: {
        Row: {
          created_at: string
          criado_por: string | null
          data: string
          horario_inicio: string
          id: string
          pregador: string | null
          status: Database["public"]["Enums"]["status_programacao"]
          tema: string | null
          tipo: Database["public"]["Enums"]["tipo_culto"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data: string
          horario_inicio?: string
          id?: string
          pregador?: string | null
          status?: Database["public"]["Enums"]["status_programacao"]
          tema?: string | null
          tipo: Database["public"]["Enums"]["tipo_culto"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data?: string
          horario_inicio?: string
          id?: string
          pregador?: string | null
          status?: Database["public"]["Enums"]["status_programacao"]
          tema?: string | null
          tipo?: Database["public"]["Enums"]["tipo_culto"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      timer_sessions: {
        Row: {
          activity_name: string
          code: string
          created_at: string
          created_by: string
          duration_seconds: number
          id: string
          item_id: string | null
          paused_at: string | null
          programacao_id: string | null
          remaining_seconds: number
          responsible_name: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activity_name?: string
          code: string
          created_at?: string
          created_by: string
          duration_seconds?: number
          id?: string
          item_id?: string | null
          paused_at?: string | null
          programacao_id?: string | null
          remaining_seconds?: number
          responsible_name?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activity_name?: string
          code?: string
          created_at?: string
          created_by?: string
          duration_seconds?: number
          id?: string
          item_id?: string | null
          paused_at?: string | null
          programacao_id?: string | null
          remaining_seconds?: number
          responsible_name?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timer_sessions_programacao_id_fkey"
            columns: ["programacao_id"]
            isOneToOne: false
            referencedRelation: "programacoes"
            referencedColumns: ["id"]
          },
        ]
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
      admin_excluir_usuario: { Args: { _user_id: string }; Returns: undefined }
      bootstrap_user_role: { Args: never; Returns: undefined }
      duplicar_programacao: {
        Args: { _nova_data: string; _prog_id: string }
        Returns: string
      }
      get_timer_session_public: {
        Args: { _code: string }
        Returns: {
          activity_name: string
          code: string
          duration_seconds: number
          id: string
          paused_at: string
          remaining_seconds: number
          responsible_name: string
          started_at: string
          status: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      notificar_programacao: {
        Args: { _prog_id: string; _tipo: string }
        Returns: number
      }
      pode_editar_programacao: {
        Args: { _prog_id: string; _user_id: string }
        Returns: boolean
      }
      reordenar_itens: {
        Args: { _ids: string[]; _prog_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "cerimonialista" | "editor" | "tecnico_projecao"
      status_programacao: "rascunho" | "publicado"
      tipo_culto:
        | "sabado_manha"
        | "culto_ja"
        | "domingo"
        | "quarta_feira"
        | "semana_oracao"
        | "evento_especial"
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
      app_role: ["admin", "cerimonialista", "editor", "tecnico_projecao"],
      status_programacao: ["rascunho", "publicado"],
      tipo_culto: [
        "sabado_manha",
        "culto_ja",
        "domingo",
        "quarta_feira",
        "semana_oracao",
        "evento_especial",
      ],
    },
  },
} as const
