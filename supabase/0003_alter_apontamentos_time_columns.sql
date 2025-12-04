-- Drop view that depends on the column to be dropped
DROP VIEW IF EXISTS public."C_V_PROJETOS_FINANCEIROS";

-- Alter table structure
ALTER TABLE public."C_APONTAMENTOS_TEMPO"
ADD COLUMN IF NOT EXISTS "hora_inicio" time without time zone,
ADD COLUMN IF NOT EXISTS "hora_fim" time without time zone;

-- Drop old column and add generated one
ALTER TABLE public."C_APONTAMENTOS_TEMPO" DROP COLUMN "horas";

ALTER TABLE public."C_APONTAMENTOS_TEMPO"
ADD COLUMN "horas" numeric(6,2) GENERATED ALWAYS AS (
  GREATEST(0, ROUND(((EXTRACT(EPOCH FROM (hora_fim - hora_inicio)) - 3600) / 3600)::numeric, 2))
) STORED;

-- Recreate the view
CREATE OR REPLACE VIEW public."C_V_PROJETOS_FINANCEIROS" AS
SELECT
  sr.id as solicitacao_id,
  sr.codigo_rs,
  sum(tm.valor_total) as orcamento_solicitacao,
  sum(te.horas * rp.valor_hora) as custo_fornecedor,
  sum(te.horas) as horas_totais
FROM public."C_REQUISICOES_SERVICO" sr
LEFT JOIN public."C_METRICAS_SOLICITACAO" tm on tm.solicitacao_id = sr.id
LEFT JOIN public."C_ALOCACOES_RECURSOS" ra on ra.solicitacao_id = sr.id
LEFT JOIN public."C_RECURSOS_FORNECEDOR" sres on sres.id = ra.recurso_fornecedor_id
LEFT JOIN public."C_PERFIS_RECURSOS" rp on rp.id = sres.perfil_id
LEFT JOIN public."C_APONTAMENTOS_TEMPO" te on te.alocacao_id = ra.id
GROUP BY sr.id, sr.codigo_rs;
