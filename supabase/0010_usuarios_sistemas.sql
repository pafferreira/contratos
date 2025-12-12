CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função de timestamp
CREATE OR REPLACE FUNCTION public.timestamp_atualizacao()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Tabela z_sistemas
CREATE TABLE IF NOT EXISTS public.z_sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Tabela z_usuarios
CREATE TABLE IF NOT EXISTS public.z_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nome_completo text,
  senha_hash text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Tabela z_papeis
CREATE TABLE IF NOT EXISTS public.z_papeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id uuid REFERENCES public.z_sistemas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sistema_id, nome)
);

-- Tabela z_permissoes
CREATE TABLE IF NOT EXISTS public.z_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id uuid REFERENCES public.z_sistemas(id) ON DELETE CASCADE,
  recurso text NOT NULL,
  acao text NOT NULL,
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sistema_id, recurso, acao)
);

-- Tabela z_usuarios_papeis
CREATE TABLE IF NOT EXISTS public.z_usuarios_papeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.z_usuarios(id) ON DELETE CASCADE,
  papel_id uuid REFERENCES public.z_papeis(id) ON DELETE CASCADE,
  atribuido_por uuid,
  atribuido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, papel_id)
);

-- Tabela z_papeis_permissoes
CREATE TABLE IF NOT EXISTS public.z_papeis_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  papel_id uuid REFERENCES public.z_papeis(id) ON DELETE CASCADE,
  permissao_id uuid REFERENCES public.z_permissoes(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (papel_id, permissao_id)
);

-- Triggers de timestamp
DROP TRIGGER IF EXISTS trg_z_sistemas_timestamp ON public.z_sistemas;
CREATE TRIGGER trg_z_sistemas_timestamp BEFORE UPDATE ON public.z_sistemas
  FOR EACH ROW EXECUTE FUNCTION public.timestamp_atualizacao();

DROP TRIGGER IF EXISTS trg_z_usuarios_timestamp ON public.z_usuarios;
CREATE TRIGGER trg_z_usuarios_timestamp BEFORE UPDATE ON public.z_usuarios
  FOR EACH ROW EXECUTE FUNCTION public.timestamp_atualizacao();

DROP TRIGGER IF EXISTS trg_z_papeis_timestamp ON public.z_papeis;
CREATE TRIGGER trg_z_papeis_timestamp BEFORE UPDATE ON public.z_papeis
  FOR EACH ROW EXECUTE FUNCTION public.timestamp_atualizacao();

DROP TRIGGER IF EXISTS trg_z_permissoes_timestamp ON public.z_permissoes;
CREATE TRIGGER trg_z_permissoes_timestamp BEFORE UPDATE ON public.z_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.timestamp_atualizacao();

-- Habilitar RLS
ALTER TABLE public.z_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_usuarios_papeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_papeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_papeis_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_sistemas ENABLE ROW LEVEL SECURITY;
