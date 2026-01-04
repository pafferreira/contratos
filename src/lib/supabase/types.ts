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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      C_ALOCACOES_RECURSOS: {
        Row: {
          fim_alocacao: string | null
          id: string
          inicio_alocacao: string | null
          ordem_servico_id: string | null
          papel: string | null
          recurso_fornecedor_id: string | null
          solicitacao_id: string | null
        }
        Insert: {
          fim_alocacao?: string | null
          id?: string
          inicio_alocacao?: string | null
          ordem_servico_id?: string | null
          papel?: string | null
          recurso_fornecedor_id?: string | null
          solicitacao_id?: string | null
        }
        Update: {
          fim_alocacao?: string | null
          id?: string
          inicio_alocacao?: string | null
          ordem_servico_id?: string | null
          papel?: string | null
          recurso_fornecedor_id?: string | null
          solicitacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "C_ALOCACOES_RECURSOS_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "C_ORDENS_SERVICO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "C_ALOCACOES_RECURSOS_recurso_fornecedor_id_fkey"
            columns: ["recurso_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "C_RECURSOS_FORNECEDOR"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "C_ALOCACOES_RECURSOS_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "C_REQUISICOES_SERVICO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "C_ALOCACOES_RECURSOS_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "C_V_PROJETOS_FINANCEIROS"
            referencedColumns: ["solicitacao_id"]
          },
        ]
      }
      C_APONTAMENTOS_TEMPO: {
        Row: {
          alocacao_id: string | null
          aprovado: boolean | null
          data_trabalho: string
          descricao: string | null
          hora_fim: string | null
          hora_inicio: string | null
          horas: number | null
          id: string
          mes_faturamento: string | null
        }
        Insert: {
          alocacao_id?: string | null
          aprovado?: boolean | null
          data_trabalho: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          horas?: number | null
          id?: string
          mes_faturamento?: string | null
        }
        Update: {
          alocacao_id?: string | null
          aprovado?: boolean | null
          data_trabalho?: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          horas?: number | null
          id?: string
          mes_faturamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "C_APONTAMENTOS_TEMPO_alocacao_id_fkey"
            columns: ["alocacao_id"]
            isOneToOne: false
            referencedRelation: "C_ALOCACOES_RECURSOS"
            referencedColumns: ["id"]
          },
        ]
      }
      C_CLIENTES: {
        Row: {
          criado_em: string | null
          documento: string | null
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string | null
          documento?: string | null
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string | null
          documento?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      C_CONTRATOS_CLIENTE: {
        Row: {
          cliente_id: string | null
          data_fim: string
          data_inicio: string
          id: string
          numero_contrato: string
          status: string | null
          valor_comprometido: number | null
          valor_disponivel: number | null
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          numero_contrato: string
          status?: string | null
          valor_comprometido?: number | null
          valor_disponivel?: number | null
          valor_total: number
        }
        Update: {
          cliente_id?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          numero_contrato?: string
          status?: string | null
          valor_comprometido?: number | null
          valor_disponivel?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "C_CONTRATOS_CLIENTE_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "C_CLIENTES"
            referencedColumns: ["id"]
          },
        ]
      }
      C_CONTRATOS_FORNECEDOR: {
        Row: {
          data_fim: string | null
          data_inicio: string | null
          fornecedor_id: string | null
          id: string
          numero_contrato: string
          status: string | null
          valor_comprometido: number | null
          valor_disponivel: number | null
          valor_total: number | null
        }
        Insert: {
          data_fim?: string | null
          data_inicio?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_contrato: string
          status?: string | null
          valor_comprometido?: number | null
          valor_disponivel?: number | null
          valor_total?: number | null
        }
        Update: {
          data_fim?: string | null
          data_inicio?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_contrato?: string
          status?: string | null
          valor_comprometido?: number | null
          valor_disponivel?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "C_CONTRATOS_FORNECEDOR_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "C_FORNECEDORES"
            referencedColumns: ["id"]
          },
        ]
      }
      C_ESPECIFICACOES_SERVICO: {
        Row: {
          contrato_id: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          numero_especificacao: string
          titulo: string | null
          valor_comprometido: number | null
          valor_disponivel: number | null
          valor_total: number
        }
        Insert: {
          contrato_id?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          numero_especificacao: string
          titulo?: string | null
          valor_comprometido?: number | null
          valor_disponivel?: number | null
          valor_total: number
        }
        Update: {
          contrato_id?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          numero_especificacao?: string
          titulo?: string | null
          valor_comprometido?: number | null
          valor_disponivel?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "C_ESPECIFICACOES_SERVICO_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "C_CONTRATOS_CLIENTE"
            referencedColumns: ["id"]
          },
        ]
      }
      C_FORNECEDORES: {
        Row: {
          documento: string | null
          email_contato: string | null
          id: string
          nome: string
        }
        Insert: {
          documento?: string | null
          email_contato?: string | null
          id?: string
          nome: string
        }
        Update: {
          documento?: string | null
          email_contato?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      C_METRICAS_SOLICITACAO: {
        Row: {
          horas_unidade: number | null
          id: string
          quantidade: number
          solicitacao_id: string | null
          taxa: number | null
          tipo_metrica: string | null
          valor_total: number | null
        }
        Insert: {
          horas_unidade?: number | null
          id?: string
          quantidade: number
          solicitacao_id?: string | null
          taxa?: number | null
          tipo_metrica?: string | null
          valor_total?: number | null
        }
        Update: {
          horas_unidade?: number | null
          id?: string
          quantidade?: number
          solicitacao_id?: string | null
          taxa?: number | null
          tipo_metrica?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "C_METRICAS_SOLICITACAO_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "C_REQUISICOES_SERVICO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "C_METRICAS_SOLICITACAO_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "C_V_PROJETOS_FINANCEIROS"
            referencedColumns: ["solicitacao_id"]
          },
        ]
      }
      C_ORDENS_SERVICO: {
        Row: {
          aberta_em: string | null
          contrato_fornecedor_id: string | null
          horas_solicitadas: number | null
          id: string
          numero_os: string
          perfil_solicitado_id: string | null
          quantidade_solicitada: number | null
          valor_consumido: number | null
          valor_disponivel: number | null
          valor_reservado: number | null
          valor_unitario: number | null
        }
        Insert: {
          aberta_em?: string | null
          contrato_fornecedor_id?: string | null
          horas_solicitadas?: number | null
          id?: string
          numero_os: string
          perfil_solicitado_id?: string | null
          quantidade_solicitada?: number | null
          valor_consumido?: number | null
          valor_disponivel?: number | null
          valor_reservado?: number | null
          valor_unitario?: number | null
        }
        Update: {
          aberta_em?: string | null
          contrato_fornecedor_id?: string | null
          horas_solicitadas?: number | null
          id?: string
          numero_os?: string
          perfil_solicitado_id?: string | null
          quantidade_solicitada?: number | null
          valor_consumido?: number | null
          valor_disponivel?: number | null
          valor_reservado?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "C_ORDENS_SERVICO_contrato_fornecedor_id_fkey"
            columns: ["contrato_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "C_CONTRATOS_FORNECEDOR"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "C_ORDENS_SERVICO_perfil_solicitado_id_fkey"
            columns: ["perfil_solicitado_id"]
            isOneToOne: false
            referencedRelation: "C_PERFIS_RECURSOS"
            referencedColumns: ["id"]
          },
        ]
      }
      C_PERFIS_RECURSOS: {
        Row: {
          descricao: string | null
          id: string
          nome: string
          valor_hora: number
        }
        Insert: {
          descricao?: string | null
          id?: string
          nome: string
          valor_hora: number
        }
        Update: {
          descricao?: string | null
          id?: string
          nome?: string
          valor_hora?: number
        }
        Relationships: []
      }
      C_RECURSOS_FORNECEDOR: {
        Row: {
          ativo: boolean | null
          email: string | null
          fornecedor_id: string | null
          id: string
          nome_completo: string
          perfil_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          email?: string | null
          fornecedor_id?: string | null
          id?: string
          nome_completo: string
          perfil_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          email?: string | null
          fornecedor_id?: string | null
          id?: string
          nome_completo?: string
          perfil_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "C_RECURSOS_FORNECEDOR_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "C_FORNECEDORES"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "C_RECURSOS_FORNECEDOR_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "C_PERFIS_RECURSOS"
            referencedColumns: ["id"]
          },
        ]
      }
      C_REQUISICOES_SERVICO: {
        Row: {
          codigo_rs: string
          complexidade: string | null
          escopo: string | null
          especificacao_id: string | null
          fim_planejado: string | null
          fim_real: string | null
          id: string
          inicio_planejado: string | null
          inicio_real: string | null
          justificativa: string | null
          notas_aceite: string | null
          percentual_conclusao: number | null
          responsavel_bu: string | null
          responsavel_cliente: string | null
          status: string | null
          titulo: string
          valor_total: number | null
        }
        Insert: {
          codigo_rs: string
          complexidade?: string | null
          escopo?: string | null
          especificacao_id?: string | null
          fim_planejado?: string | null
          fim_real?: string | null
          id?: string
          inicio_planejado?: string | null
          inicio_real?: string | null
          justificativa?: string | null
          notas_aceite?: string | null
          percentual_conclusao?: number | null
          responsavel_bu?: string | null
          responsavel_cliente?: string | null
          status?: string | null
          titulo: string
          valor_total?: number | null
        }
        Update: {
          codigo_rs?: string
          complexidade?: string | null
          escopo?: string | null
          especificacao_id?: string | null
          fim_planejado?: string | null
          fim_real?: string | null
          id?: string
          inicio_planejado?: string | null
          inicio_real?: string | null
          justificativa?: string | null
          notas_aceite?: string | null
          percentual_conclusao?: number | null
          responsavel_bu?: string | null
          responsavel_cliente?: string | null
          status?: string | null
          titulo?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "C_SOLICITACOES_SERVICO_especificacao_id_fkey"
            columns: ["especificacao_id"]
            isOneToOne: false
            referencedRelation: "C_ESPECIFICACOES_SERVICO"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          client_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          sale_date: string
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          sale_date?: string
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_date?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      z_papeis: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      z_sistemas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      z_usuarios: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          nome_completo: string | null
          senha_hash: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email: string
          id?: string
          nome_completo?: string | null
          senha_hash?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          nome_completo?: string | null
          senha_hash?: string | null
        }
        Relationships: []
      }
      z_usuarios_papeis: {
        Row: {
          atribuido_em: string | null
          atribuido_por: string | null
          id: string
          papel_id: string | null
          sistema_id: string | null
          usuario_id: string | null
        }
        Insert: {
          atribuido_em?: string | null
          atribuido_por?: string | null
          id?: string
          papel_id?: string | null
          sistema_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          atribuido_em?: string | null
          atribuido_por?: string | null
          id?: string
          papel_id?: string | null
          sistema_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "z_usuarios_papeis_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "z_papeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "z_usuarios_papeis_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "z_sistemas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "z_usuarios_papeis_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "z_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      C_V_PROJETOS_FINANCEIROS: {
        Row: {
          codigo_rs: string | null
          custo_fornecedor: number | null
          horas_totais: number | null
          orcamento_solicitacao: number | null
          solicitacao_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_global_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
      is_system_admin: { Args: { p_system_id: string }; Returns: boolean }
      is_user_admin_for_system: {
        Args: { system_key: string }
        Returns: boolean
      }
    }
    Enums: {
      system_profile: "admin" | "coord" | "user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      system_profile: ["admin", "coord", "user"],
    },
  },
} as const
