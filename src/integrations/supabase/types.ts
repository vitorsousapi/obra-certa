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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      etapa_anexos: {
        Row: {
          created_at: string
          etapa_id: string
          id: string
          nome: string
          storage_path: string
          tamanho: number
          tipo: string
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          etapa_id: string
          id?: string
          nome: string
          storage_path: string
          tamanho: number
          tipo: string
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          etapa_id?: string
          id?: string
          nome?: string
          storage_path?: string
          tamanho?: number
          tipo?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapa_anexos_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapa_anexos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      etapa_assinaturas: {
        Row: {
          assinatura_data: string | null
          assinatura_imagem_url: string | null
          assinatura_ip: string | null
          assinatura_nome: string | null
          created_at: string
          etapa_id: string
          id: string
          link_enviado_em: string | null
          token: string
        }
        Insert: {
          assinatura_data?: string | null
          assinatura_imagem_url?: string | null
          assinatura_ip?: string | null
          assinatura_nome?: string | null
          created_at?: string
          etapa_id: string
          id?: string
          link_enviado_em?: string | null
          token?: string
        }
        Update: {
          assinatura_data?: string | null
          assinatura_imagem_url?: string | null
          assinatura_ip?: string | null
          assinatura_nome?: string | null
          created_at?: string
          etapa_id?: string
          id?: string
          link_enviado_em?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_etapa"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      etapa_responsaveis: {
        Row: {
          created_at: string
          etapa_id: string
          id: string
          responsavel_id: string
        }
        Insert: {
          created_at?: string
          etapa_id: string
          id?: string
          responsavel_id: string
        }
        Update: {
          created_at?: string
          etapa_id?: string
          id?: string
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapa_responsaveis_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapa_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          obra_id: string
          observacoes: string | null
          ordem: number
          prazo: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["etapa_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          obra_id: string
          observacoes?: string | null
          ordem?: number
          prazo?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["etapa_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          obra_id?: string
          observacoes?: string | null
          ordem?: number
          prazo?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["etapa_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          assinatura_data: string | null
          assinatura_imagem_url: string | null
          assinatura_ip: string | null
          assinatura_liberada: boolean | null
          assinatura_nome: string | null
          assinatura_token: string | null
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          created_by: string
          data_conclusao: string | null
          data_inicio: string
          data_prevista: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["obra_status"]
          updated_at: string
        }
        Insert: {
          assinatura_data?: string | null
          assinatura_imagem_url?: string | null
          assinatura_ip?: string | null
          assinatura_liberada?: boolean | null
          assinatura_nome?: string | null
          assinatura_token?: string | null
          cliente_email: string
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          created_by: string
          data_conclusao?: string | null
          data_inicio?: string
          data_prevista: string
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Update: {
          assinatura_data?: string | null
          assinatura_imagem_url?: string | null
          assinatura_ip?: string | null
          assinatura_liberada?: boolean | null
          assinatura_nome?: string | null
          assinatura_token?: string | null
          cliente_email?: string
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          created_by?: string
          data_conclusao?: string | null
          data_inicio?: string
          data_prevista?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      whatsapp_config: {
        Row: {
          api_key: string
          api_url: string
          connected: boolean | null
          created_at: string
          id: string
          instance_name: string
          qr_code: string | null
          updated_at: string
        }
        Insert: {
          api_key: string
          api_url: string
          connected?: boolean | null
          created_at?: string
          id?: string
          instance_name: string
          qr_code?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_url?: string
          connected?: boolean | null
          created_at?: string
          id?: string
          instance_name?: string
          qr_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "colaborador"
      etapa_status:
        | "pendente"
        | "em_andamento"
        | "submetida"
        | "aprovada"
        | "rejeitada"
      obra_status:
        | "nao_iniciada"
        | "em_andamento"
        | "aguardando_aprovacao"
        | "concluida"
        | "cancelada"
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
      app_role: ["admin", "colaborador"],
      etapa_status: [
        "pendente",
        "em_andamento",
        "submetida",
        "aprovada",
        "rejeitada",
      ],
      obra_status: [
        "nao_iniciada",
        "em_andamento",
        "aguardando_aprovacao",
        "concluida",
        "cancelada",
      ],
    },
  },
} as const
