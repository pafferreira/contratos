-- Remove a constraint única que impede múltiplas métricas do mesmo tipo para uma RS
-- Isso permite que um projeto tenha vários recursos associados com o mesmo tipo de métrica

ALTER TABLE public."C_METRICAS_SOLICITACAO" 
DROP CONSTRAINT IF EXISTS uk_metrica_solicitacao;
