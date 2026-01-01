-- =====================================================
-- SCHEMA COMPLETO DO SISTEMA DE CONTRATOS
-- Versão: 1.1.1
-- Data: 2026-01-01
-- =====================================================

-- =====================================================
-- TABELAS DE CLIENTES E CONTRATOS
-- =====================================================

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS public."C_CLIENTES" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Contratos com Clientes
CREATE TABLE IF NOT EXISTS public."C_CONTRATOS_CLIENTE" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public."C_CLIENTES"(id) ON DELETE CASCADE,
  numero_contrato TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  valor_total NUMERIC(14,2) NOT NULL,
  valor_comprometido NUMERIC(14,2) DEFAULT 0,
  valor_disponivel NUMERIC(14,2) GENERATED ALWAYS AS (valor_total - valor_comprometido) STORED,
  status TEXT CHECK (status IN ('rascunho','ativo','encerrado')),
  UNIQUE (cliente_id, numero_contrato)
);

-- Tabela de Especificações de Serviço
CREATE TABLE IF NOT EXISTS public."C_ESPECIFICACOES_SERVICO" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES public."C_CONTRATOS_CLIENTE"(id) ON DELETE CASCADE,
  numero_especificacao TEXT NOT NULL,
  titulo TEXT,
  descricao TEXT,
  data_inicio DATE,
  data_fim DATE,
  valor_total NUMERIC(14,2) NOT NULL,
  valor_comprometido NUMERIC(14,2) DEFAULT 0,
  valor_disponivel NUMERIC(14,2) GENERATED ALWAYS AS (valor_total - valor_comprometido) STORED,
  UNIQUE (contrato_id, numero_especificacao)
);

-- Tabela de Requisições de Serviço (RS)
CREATE TABLE IF NOT EXISTS public."C_REQUISICOES_SERVICO" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  especificacao_id UUID REFERENCES public."C_ESPECIFICACOES_SERVICO"(id) ON DELETE CASCADE,
  codigo_rs TEXT NOT NULL,
  titulo TEXT NOT NULL,
  escopo TEXT,
  valor_total NUMERIC(14,2),
  complexidade TEXT CHECK (complexidade IN ('baixa','media','alta')),
  inicio_planejado DATE,
  fim_planejado DATE,
  inicio_real DATE,
  fim_real DATE,
  percentual_conclusao NUMERIC(5,2) DEFAULT 0,
  responsavel_cliente TEXT,
  responsavel_bu TEXT,
  justificativa TEXT,
  notas_aceite TEXT,
  status TEXT DEFAULT 'planejada' CHECK (status IN ('planejada','em_execucao','homologacao','encerrada')),
  UNIQUE (especificacao_id, codigo_rs)
);

-- Tabela de Métricas de Solicitação
CREATE TABLE IF NOT EXISTS public."C_METRICAS_SOLICITACAO" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID REFERENCES public."C_REQUISICOES_SERVICO"(id) ON DELETE CASCADE,
  tipo_metrica TEXT CHECK (tipo_metrica IN ('USH','USD','PF','PARCELA_FIXA')),
  quantidade NUMERIC(10,2) NOT NULL,
  horas_unidade NUMERIC(10,2),
  taxa NUMERIC(12,2),
  valor_total NUMERIC(14,2)
);

-- =====================================================
-- TABELAS DE FORNECEDORES E RECURSOS
-- =====================================================

-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public."C_FORNECEDORES" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT UNIQUE,
  email_contato TEXT
);

-- Tabela de Contratos com Fornecedores
CREATE TABLE IF NOT EXISTS public."C_CONTRATOS_FORNECEDOR" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES public."C_FORNECEDORES"(id) ON DELETE CASCADE,
  numero_contrato TEXT NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  valor_total NUMERIC(14,2),
  valor_comprometido NUMERIC(14,2) DEFAULT 0,
  valor_disponivel NUMERIC(14,2) GENERATED ALWAYS AS (valor_total - valor_comprometido) STORED,
  status TEXT CHECK (status IN ('rascunho','ativo','encerrado')),
  UNIQUE (fornecedor_id, numero_contrato)
);

-- Tabela de Perfis de Recursos
CREATE TABLE IF NOT EXISTS public."C_PERFIS_RECURSOS" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_hora NUMERIC(12,2) NOT NULL
);

-- Tabela de Recursos de Fornecedor
CREATE TABLE IF NOT EXISTS public."C_RECURSOS_FORNECEDOR" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES public."C_FORNECEDORES"(id) ON DELETE CASCADE,
  perfil_id UUID REFERENCES public."C_PERFIS_RECURSOS"(id),
  nome_completo TEXT NOT NULL,
  email TEXT,
  ativo BOOLEAN DEFAULT true
);

-- Tabela de Ordens de Serviço
CREATE TABLE IF NOT EXISTS public."C_ORDENS_SERVICO" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_fornecedor_id UUID REFERENCES public."C_CONTRATOS_FORNECEDOR"(id) ON DELETE CASCADE,
  numero_os TEXT NOT NULL,
  aberta_em DATE DEFAULT now(),
  perfil_solicitado_id UUID REFERENCES public."C_PERFIS_RECURSOS"(id),
  quantidade_solicitada INTEGER,
  horas_solicitadas NUMERIC(10,2),
  valor_unitario NUMERIC(12,2),
  valor_reservado NUMERIC(14,2),
  valor_consumido NUMERIC(14,2) DEFAULT 0,
  valor_disponivel NUMERIC(14,2) GENERATED ALWAYS AS (valor_reservado - valor_consumido) STORED,
  UNIQUE (contrato_fornecedor_id, numero_os)
);

-- =====================================================
-- TABELAS DE ALOCAÇÕES E APONTAMENTOS
-- =====================================================

-- Tabela de Alocações de Recursos
CREATE TABLE IF NOT EXISTS public."C_ALOCACOES_RECURSOS" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID REFERENCES public."C_REQUISICOES_SERVICO"(id) ON DELETE CASCADE,
  recurso_fornecedor_id UUID REFERENCES public."C_RECURSOS_FORNECEDOR"(id),
  ordem_servico_id UUID REFERENCES public."C_ORDENS_SERVICO"(id),
  papel TEXT,
  inicio_alocacao DATE,
  fim_alocacao DATE
);

-- Tabela de Apontamentos de Tempo
CREATE TABLE IF NOT EXISTS public."C_APONTAMENTOS_TEMPO" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alocacao_id UUID REFERENCES public."C_ALOCACOES_RECURSOS"(id) ON DELETE CASCADE,
  data_trabalho DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  horas NUMERIC(6,2) GENERATED ALWAYS AS (
    CASE 
      WHEN hora_inicio IS NOT NULL AND hora_fim IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (hora_fim - hora_inicio)) / 3600
      ELSE NULL
    END
  ) STORED,
  aprovado BOOLEAN DEFAULT false,
  mes_faturamento DATE,
  descricao TEXT
);

-- =====================================================
-- TABELAS DE AUTENTICAÇÃO E CONTROLE DE ACESSO
-- =====================================================

-- Tabela de Sistemas
CREATE TABLE IF NOT EXISTS public."z_sistemas" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS public."z_usuarios" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nome_completo TEXT,
  senha_hash TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Papéis (Roles)
CREATE TABLE IF NOT EXISTS public."z_papeis" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id UUID REFERENCES public."z_sistemas"(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (sistema_id, nome)
);

-- Tabela de Permissões
CREATE TABLE IF NOT EXISTS public."z_permissoes" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id UUID REFERENCES public."z_sistemas"(id) ON DELETE CASCADE,
  recurso TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (sistema_id, recurso, acao)
);

-- Tabela de Associação Usuários-Papéis
CREATE TABLE IF NOT EXISTS public."z_usuarios_papeis" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public."z_usuarios"(id) ON DELETE CASCADE,
  papel_id UUID REFERENCES public."z_papeis"(id) ON DELETE CASCADE,
  atribuido_por UUID REFERENCES public."z_usuarios"(id),
  atribuido_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (usuario_id, papel_id)
);

-- Tabela de Associação Papéis-Permissões
CREATE TABLE IF NOT EXISTS public."z_papeis_permissoes" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  papel_id UUID REFERENCES public."z_papeis"(id) ON DELETE CASCADE,
  permissao_id UUID REFERENCES public."z_permissoes"(id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (papel_id, permissao_id)
);

-- =====================================================
-- VIEWS
-- =====================================================

-- View de Projetos Financeiros
CREATE OR REPLACE VIEW public."C_V_PROJETOS_FINANCEIROS" AS
SELECT
  sr.id AS solicitacao_id,
  sr.codigo_rs,
  SUM(tm.valor_total) AS orcamento_solicitacao
FROM public."C_REQUISICOES_SERVICO" sr
LEFT JOIN public."C_METRICAS_SOLICITACAO" tm ON tm.solicitacao_id = sr.id
GROUP BY sr.id, sr.codigo_rs;

-- =====================================================
-- FUNCTIONS E TRIGGERS
-- =====================================================

-- Função para definir mês de faturamento automaticamente
CREATE OR REPLACE FUNCTION public.set_mes_faturamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    NEW.mes_faturamento := date_trunc('month', NEW.data_trabalho)::date;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para definir mês de faturamento
DROP TRIGGER IF EXISTS trg_set_mes_faturamento ON public."C_APONTAMENTOS_TEMPO";
CREATE TRIGGER trg_set_mes_faturamento
BEFORE INSERT OR UPDATE ON public."C_APONTAMENTOS_TEMPO"
FOR EACH ROW EXECUTE FUNCTION public.set_mes_faturamento();

-- Função para atualizar timestamp de atualização
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Triggers para atualizar timestamp
DROP TRIGGER IF EXISTS update_z_sistemas_updated_at ON public."z_sistemas";
CREATE TRIGGER update_z_sistemas_updated_at
BEFORE UPDATE ON public."z_sistemas"
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_z_usuarios_updated_at ON public."z_usuarios";
CREATE TRIGGER update_z_usuarios_updated_at
BEFORE UPDATE ON public."z_usuarios"
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_z_papeis_updated_at ON public."z_papeis";
CREATE TRIGGER update_z_papeis_updated_at
BEFORE UPDATE ON public."z_papeis"
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_z_permissoes_updated_at ON public."z_permissoes";
CREATE TRIGGER update_z_permissoes_updated_at
BEFORE UPDATE ON public."z_permissoes"
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public."C_CLIENTES" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_CONTRATOS_CLIENTE" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_ESPECIFICACOES_SERVICO" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_REQUISICOES_SERVICO" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_METRICAS_SOLICITACAO" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_FORNECEDORES" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_CONTRATOS_FORNECEDOR" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_PERFIS_RECURSOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_RECURSOS_FORNECEDOR" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_ORDENS_SERVICO" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_ALOCACOES_RECURSOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."C_APONTAMENTOS_TEMPO" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."z_sistemas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."z_usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."z_papeis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."z_permissoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."z_usuarios_papeis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."z_papeis_permissoes" ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Permitir acesso autenticado
CREATE POLICY "Permitir acesso autenticado" ON public."C_CLIENTES" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_CONTRATOS_CLIENTE" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_ESPECIFICACOES_SERVICO" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_REQUISICOES_SERVICO" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_METRICAS_SOLICITACAO" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_FORNECEDORES" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_CONTRATOS_FORNECEDOR" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_PERFIS_RECURSOS" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_RECURSOS_FORNECEDOR" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_ORDENS_SERVICO" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_ALOCACOES_RECURSOS" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."C_APONTAMENTOS_TEMPO" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."z_sistemas" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."z_usuarios" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."z_papeis" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."z_permissoes" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."z_usuarios_papeis" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir acesso autenticado" ON public."z_papeis_permissoes" FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para tabelas de contratos
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_cliente_id ON public."C_CONTRATOS_CLIENTE"(cliente_id);
CREATE INDEX IF NOT EXISTS idx_especificacoes_contrato_id ON public."C_ESPECIFICACOES_SERVICO"(contrato_id);
CREATE INDEX IF NOT EXISTS idx_requisicoes_especificacao_id ON public."C_REQUISICOES_SERVICO"(especificacao_id);
CREATE INDEX IF NOT EXISTS idx_metricas_solicitacao_id ON public."C_METRICAS_SOLICITACAO"(solicitacao_id);

-- Índices para tabelas de fornecedores
CREATE INDEX IF NOT EXISTS idx_contratos_fornecedor_fornecedor_id ON public."C_CONTRATOS_FORNECEDOR"(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_recursos_fornecedor_id ON public."C_RECURSOS_FORNECEDOR"(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_recursos_perfil_id ON public."C_RECURSOS_FORNECEDOR"(perfil_id);
CREATE INDEX IF NOT EXISTS idx_ordens_contrato_fornecedor_id ON public."C_ORDENS_SERVICO"(contrato_fornecedor_id);

-- Índices para tabelas de alocações
CREATE INDEX IF NOT EXISTS idx_alocacoes_solicitacao_id ON public."C_ALOCACOES_RECURSOS"(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_recurso_id ON public."C_ALOCACOES_RECURSOS"(recurso_fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_ordem_servico_id ON public."C_ALOCACOES_RECURSOS"(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_apontamentos_alocacao_id ON public."C_APONTAMENTOS_TEMPO"(alocacao_id);
CREATE INDEX IF NOT EXISTS idx_apontamentos_data_trabalho ON public."C_APONTAMENTOS_TEMPO"(data_trabalho);
CREATE INDEX IF NOT EXISTS idx_apontamentos_mes_faturamento ON public."C_APONTAMENTOS_TEMPO"(mes_faturamento);

-- Índices para tabelas de autenticação
CREATE INDEX IF NOT EXISTS idx_usuarios_papeis_usuario_id ON public."z_usuarios_papeis"(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_papeis_papel_id ON public."z_usuarios_papeis"(papel_id);
CREATE INDEX IF NOT EXISTS idx_papeis_permissoes_papel_id ON public."z_papeis_permissoes"(papel_id);
CREATE INDEX IF NOT EXISTS idx_papeis_permissoes_permissao_id ON public."z_papeis_permissoes"(permissao_id);
CREATE INDEX IF NOT EXISTS idx_papeis_sistema_id ON public."z_papeis"(sistema_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_sistema_id ON public."z_permissoes"(sistema_id);
