export type Json =

  | string

  | number

  | boolean

  | null

  | { [key: string]: Json | undefined }

  | Json[];



export type TablesInsert<T> = T extends { Row: infer R; Insert: infer I }

  ? I extends undefined

  ? R

  : I

  : never;



export type TablesUpdate<T> = T extends { Row: infer R; Update: infer U }

  ? U extends undefined

  ? R

  : U

  : never;



export type TablesRow<T> = T extends { Row: infer R } ? R : never;



export type Database = {

  public: {

    Tables: {

      "C_CLIENTES": {

        Row: {

          id: string;

          nome: string;

          documento: string | null;

          criado_em: string | null;

        };

        Insert: {

          id?: string;

          nome: string;

          documento?: string | null;

          criado_em?: string | null;

        };

        Update: {

          id?: string;

          nome?: string;

          documento?: string | null;

          criado_em?: string | null;

        };

      };

      "C_FORNECEDORES": {

        Row: {

          id: string;

          nome: string;

          documento: string | null;

          email_contato: string | null;

        };

        Insert: {

          id?: string;

          nome: string;

          documento?: string | null;

          email_contato?: string | null;

        };

        Update: {

          id?: string;

          nome?: string;

          documento?: string | null;

          email_contato?: string | null;

        };

      };

      "C_CONTRATOS_CLIENTE": {

        Row: {

          id: string;

          cliente_id: string | null;

          numero_contrato: string;

          data_inicio: string;

          data_fim: string;

          valor_total: number;

          valor_comprometido: number | null;

          valor_disponivel: number | null;

        };

        Insert: {

          id?: string;

          cliente_id?: string | null;

          numero_contrato: string;

          data_inicio: string;

          data_fim: string;

          valor_total: number;

          valor_comprometido?: number | null;

          valor_disponivel?: number | null;

        };

        Update: {

          id?: string;

          cliente_id?: string | null;

          numero_contrato?: string;

          data_inicio?: string;

          data_fim?: string;

          valor_total?: number;

          valor_comprometido?: number | null;

          valor_disponivel?: number | null;

        };

      };

      "C_CONTRATOS_FORNECEDOR": {

        Row: {

          id: string;

          fornecedor_id: string | null;

          numero_contrato: string;

          data_inicio: string;

          data_fim: string;

          valor_total: number;

          valor_comprometido: number | null;

          valor_disponivel: number | null;
          status: string | null;

        };

        Insert: {

          id?: string;

          fornecedor_id?: string | null;

          numero_contrato: string;

          data_inicio: string;

          data_fim: string;

          valor_total: number;

          valor_comprometido?: number | null;

          valor_disponivel?: number | null;
          status?: string | null;

        };

        Update: {

          id?: string;

          fornecedor_id?: string | null;

          numero_contrato?: string;

          data_inicio?: string;

          data_fim?: string;

          valor_total?: number;

          valor_comprometido?: number | null;

          valor_disponivel?: number | null;
          status?: string | null;

        };

      };
      "C_PERFIS_RECURSOS": {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          valor_hora: number;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          valor_hora: number;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          valor_hora?: number;
        };
      };
      "C_RECURSOS_FORNECEDOR": {
        Row: {
          id: string;
          fornecedor_id: string | null;
          perfil_id: string | null;
          nome_completo: string;
          email: string | null;
          ativo: boolean | null;
        };
        Insert: {
          id?: string;
          fornecedor_id?: string | null;
          perfil_id?: string | null;
          nome_completo: string;
          email?: string | null;
          ativo?: boolean | null;
        };
        Update: {
          id?: string;
          fornecedor_id?: string | null;
          perfil_id?: string | null;
          nome_completo?: string;
          email?: string | null;
          ativo?: boolean | null;
        };
      },
      "C_ALOCACOES_RECURSOS": {
        Row: {
          id: string;
          solicitacao_id: string | null;
          recurso_fornecedor_id: string | null;
          ordem_servico_id: string | null;
          papel: string | null;
          inicio_alocacao: string | null;
          fim_alocacao: string | null;
        };
        Insert: {
          id?: string;
          solicitacao_id?: string | null;
          recurso_fornecedor_id?: string | null;
          ordem_servico_id?: string | null;
          papel?: string | null;
          inicio_alocacao?: string | null;
          fim_alocacao?: string | null;
        };
        Update: {
          id?: string;
          solicitacao_id?: string | null;
          recurso_fornecedor_id?: string | null;
          ordem_servico_id?: string | null;
          papel?: string | null;
          inicio_alocacao?: string | null;
          fim_alocacao?: string | null;
        };
      },
      "C_APONTAMENTOS_TEMPO": {
        Row: {
          id: string;
          alocacao_id: string | null;
          data_trabalho: string;
          horas: number | null; // Generated column might be null if inputs are null
          hora_inicio: string | null;
          hora_fim: string | null;
          aprovado: boolean | null;
          mes_faturamento: string | null;
          descricao: string | null;
        };
        Insert: {
          id?: string;
          alocacao_id?: string | null;
          data_trabalho: string;
          // horas is generated, cannot insert
          hora_inicio?: string | null;
          hora_fim?: string | null;
          aprovado?: boolean | null;
          mes_faturamento?: string | null;
          descricao?: string | null;
        };
        Update: {
          id?: string;
          alocacao_id?: string | null;
          data_trabalho?: string;
          // horas is generated, cannot update
          hora_inicio?: string | null;
          hora_fim?: string | null;
          aprovado?: boolean | null;
          mes_faturamento?: string | null;
          descricao?: string | null;
        };
      };

      clients: {

        Row: {

          id: string;

          name: string;

          tax_id: string | null;

          created_at: string | null;

        };

        Insert: {

          id?: string;

          name: string;

          tax_id?: string | null;

          created_at?: string | null;

        };

        Update: {

          id?: string;

          name?: string;

          tax_id?: string | null;

          created_at?: string | null;

        };

      };

      "P_clients": {

        Row: {

          id: string;

          name: string;

          tax_id: string | null;

          created_at: string | null;

        };

        Insert: {

          id?: string;

          name: string;

          tax_id?: string | null;

          created_at?: string | null;

        };

        Update: {

          id?: string;

          name?: string;

          tax_id?: string | null;

          created_at?: string | null;

        };

      };

      client_contracts: {

        Row: {

          id: string;

          contract_number: string;

          client_name: string;

          start_date: string;

          end_date: string;

          total_value: number;

          remaining_value: number;

          description: string | null;

          created_at: string | null;

          created_by: string | null;

        };

        Insert: {

          id?: string;

          contract_number: string;

          client_name: string;

          start_date: string;

          end_date: string;

          total_value: number;

          remaining_value: number;

          description?: string | null;

          created_at?: string | null;

          created_by?: string | null;

        };

        Update: {

          id?: string;

          contract_number?: string;

          client_name?: string;

          start_date?: string;

          end_date?: string;

          total_value?: number;

          remaining_value?: number;

          description?: string | null;

          created_at?: string | null;

          created_by?: string | null;

        };

      };

      "P_client_contracts": {

        Row: {

          id: string;

          client_id: string | null;

          contract_number: string;

          start_date: string;

          end_date: string;

          total_value: number;

          committed_value: number | null;

          remaining_value: number | null;

        };

        Insert: {

          id?: string;

          client_id?: string | null;

          contract_number: string;

          start_date: string;

          end_date: string;

          total_value: number;

          committed_value?: number | null;

          remaining_value?: number | null;

        };

        Update: {

          id?: string;

          client_id?: string | null;

          contract_number?: string;

          start_date?: string;

          end_date?: string;

          total_value?: number;

          committed_value?: number | null;

          remaining_value?: number | null;

        };

      };

      "P_service_specs": {

        Row: {

          id: string;

          contract_id: string | null;

          spec_number: string;

          title: string | null;

          description: string | null;

          total_value: number;

          committed_value: number | null;

          remaining_value: number | null;

        };

        Insert: {

          id?: string;

          contract_id?: string | null;

          spec_number: string;

          title?: string | null;

          description?: string | null;

          total_value: number;

          committed_value?: number | null;

          remaining_value?: number | null;

        };

        Update: {

          id?: string;

          contract_id?: string | null;

          spec_number?: string;

          title?: string | null;

          description?: string | null;

          total_value?: number;

          committed_value?: number | null;

          remaining_value?: number | null;

        };

      };

      "P_service_requests": {

        Row: {

          id: string;

          spec_id: string | null;

          rs_code: string;

          title: string;

          scope: string | null;

          complexity: string | null;

          planned_start: string | null;

          planned_end: string | null;

          actual_start: string | null;

          actual_end: string | null;

          completion_percent: number | null;

          client_lead: string | null;

          bu_lead: string | null;

          justification: string | null;

          acceptance_notes: string | null;

        };

        Insert: {

          id?: string;

          spec_id?: string | null;

          rs_code: string;

          title: string;

          scope?: string | null;

          complexity?: string | null;

          planned_start?: string | null;

          planned_end?: string | null;

          actual_start?: string | null;

          actual_end?: string | null;

          completion_percent?: number | null;

          client_lead?: string | null;

          bu_lead?: string | null;

          justification?: string | null;

          acceptance_notes?: string | null;

        };

        Update: {

          id?: string;

          spec_id?: string | null;

          rs_code?: string;

          title?: string;

          scope?: string | null;

          complexity?: string | null;

          planned_start?: string | null;

          planned_end?: string | null;

          actual_start?: string | null;

          actual_end?: string | null;

          completion_percent?: number | null;

          client_lead?: string | null;

          bu_lead?: string | null;

          justification?: string | null;

          acceptance_notes?: string | null;

        };

      };

      "P_supplier_contracts": {

        Row: {

          id: string;

          supplier_id: string | null;

          contract_number: string;

          start_date: string | null;

          end_date: string | null;

          total_value: number | null;

          committed_value: number | null;

          remaining_value: number | null;

        };

        Insert: {

          id?: string;

          supplier_id?: string | null;

          contract_number: string;

          start_date?: string | null;

          end_date?: string | null;

          total_value?: number | null;

          committed_value?: number | null;

          remaining_value?: number | null;

        };

        Update: {

          id?: string;

          supplier_id?: string | null;

          contract_number?: string;

          start_date?: string | null;

          end_date?: string | null;

          total_value?: number | null;

          committed_value?: number | null;

          remaining_value?: number | null;

        };

      };

      "P_service_orders": {

        Row: {

          id: string;

          supplier_contract_id: string | null;

          os_number: string;

          opened_at: string | null;

          requested_profile_id: string | null;

          requested_quantity: number | null;

          requested_hours: number | null;

          unit_rate: number | null;

          total_reserved: number | null;

          total_consumed: number | null;

          remaining_value: number | null;

        };

        Insert: {

          id?: string;

          supplier_contract_id?: string | null;

          os_number: string;

          opened_at?: string | null;

          requested_profile_id?: string | null;

          requested_quantity?: number | null;

          requested_hours?: number | null;

          unit_rate?: number | null;

          total_reserved?: number | null;

          total_consumed?: number | null;

          remaining_value?: number | null;

        };

        Update: {

          id?: string;

          supplier_contract_id?: string | null;

          os_number?: string;

          opened_at?: string | null;

          requested_profile_id?: string | null;

          requested_quantity?: number | null;

          requested_hours?: number | null;

          unit_rate?: number | null;

          total_reserved?: number | null;

          total_consumed?: number | null;

          remaining_value?: number | null;

        };

      };

      "P_resource_profiles": {

        Row: {

          id: string;

          name: string;

          description: string | null;

          hourly_rate: number;

        };

        Insert: {

          id?: string;

          name: string;

          description?: string | null;

          hourly_rate: number;

        };

        Update: {

          id?: string;

          name?: string;

          description?: string | null;

          hourly_rate?: number;

        };

      };

      "P_supplier_resources": {

        Row: {

          id: string;

          supplier_id: string | null;

          profile_id: string | null;

          full_name: string;

          email: string | null;

          active: boolean | null;

        };

        Insert: {

          id?: string;

          supplier_id?: string | null;

          profile_id?: string | null;

          full_name: string;

          email?: string | null;

          active?: boolean | null;

        };

        Update: {

          id?: string;

          supplier_id?: string | null;

          profile_id?: string | null;

          full_name?: string;

          email?: string | null;

          active?: boolean | null;

        };

      };

      "P_time_entries": {

        Row: {

          id: string;

          allocation_id: string | null;

          work_date: string;

          hours: number;

          approved: boolean | null;

          billing_month: string | null;

        };

        Insert: {

          id?: string;

          allocation_id?: string | null;

          work_date: string;

          hours: number;

          approved?: boolean | null;

          billing_month?: string | null;

        };

        Update: {

          id?: string;

          allocation_id?: string | null;

          work_date?: string;

          hours?: number;

          approved?: boolean | null;

          billing_month?: string | null;

        };

      };

      "P_resource_allocations": {

        Row: {

          id: string;

          request_id: string | null;

          supplier_resource_id: string | null;

          os_id: string | null;

          role: string | null;

          allocation_start: string | null;

          allocation_end: string | null;

        };

        Insert: {

          id?: string;

          request_id?: string | null;

          supplier_resource_id?: string | null;

          os_id?: string | null;

          role?: string | null;

          allocation_start?: string | null;

          allocation_end?: string | null;

        };

        Update: {

          id?: string;

          request_id?: string | null;

          supplier_resource_id?: string | null;

          os_id?: string | null;

          role?: string | null;

          allocation_start?: string | null;

          allocation_end?: string | null;

        };

      };

      "P_request_metrics": {

        Row: {

          id: string;

          request_id: string | null;

          metric_type: string | null;

          quantity: number;

          unit_hours: number | null;

          rate: number | null;

          total_value: number | null;

        };

        Insert: {

          id?: string;

          request_id?: string | null;

          metric_type?: string | null;

          quantity: number;

          unit_hours?: number | null;

          rate?: number | null;

          total_value?: number | null;

        };

        Update: {

          id?: string;

          request_id?: string | null;

          metric_type?: string | null;

          quantity?: number;

          unit_hours?: number | null;

          rate?: number | null;

          total_value?: number | null;

        };

      };

      "P_project_evidences": {

        Row: {

          id: string;

          request_id: string | null;

          title: string;

          description: string | null;

          storage_path: string | null;

          created_at: string | null;

        };

        Insert: {

          id?: string;

          request_id?: string | null;

          title: string;

          description?: string | null;

          storage_path?: string | null;

          created_at?: string | null;

        };

        Update: {

          id?: string;

          request_id?: string | null;

          title?: string;

          description?: string | null;

          storage_path?: string | null;

          created_at?: string | null;

        };

      };

      "P_acceptance_criteria": {

        Row: {

          id: string;

          request_id: string | null;

          description: string;

          expected_evidence: string | null;

          approved_at: string | null;

        };

        Insert: {

          id?: string;

          request_id?: string | null;

          description: string;

          expected_evidence?: string | null;

          approved_at?: string | null;

        };

        Update: {

          id?: string;

          request_id?: string | null;

          description?: string;

          expected_evidence?: string | null;

          approved_at?: string | null;

        };

      };

      "P_suppliers": {

        Row: {

          id: string;

          name: string;

          tax_id: string | null;

          contact_email: string | null;

        };

        Insert: {

          id?: string;

          name: string;

          tax_id?: string | null;

          contact_email?: string | null;

        };

        Update: {

          id?: string;

          name?: string;

          tax_id?: string | null;

          contact_email?: string | null;

        };

      };

      "P_projects": {

        Row: {

          id: string;

          request_id: string | null;

          title: string;

          description: string | null;

          planned_start: string | null;

          planned_end: string | null;

          actual_start: string | null;

          actual_end: string | null;

          completion_percent: number | null;

        };

        Insert: {

          id?: string;

          request_id?: string | null;

          title: string;

          description?: string | null;

          planned_start?: string | null;

          planned_end?: string | null;

          actual_start?: string | null;

          actual_end?: string | null;

          completion_percent?: number | null;

        };

        Update: {

          id?: string;

          request_id?: string | null;

          title?: string;

          description?: string | null;

          planned_start?: string | null;

          planned_end?: string | null;

          actual_start?: string | null;

          actual_end?: string | null;

          completion_percent?: number | null;

        };

      };

      "P_project_financials": {

        Row: {

          request_id: string | null;

          rs_code: string | null;

          request_budget: number | null;

          supplier_cost: number | null;

          total_hours: number | null;

        };

        Insert: {

          request_id?: string | null;

          rs_code?: string | null;

          request_budget?: number | null;

          supplier_cost?: number | null;

          total_hours?: number | null;

        };

        Update: {

          request_id?: string | null;

          rs_code?: string | null;

          request_budget?: number | null;

          supplier_cost?: number | null;

          total_hours?: number | null;

        };

      };

    };

  };

};
