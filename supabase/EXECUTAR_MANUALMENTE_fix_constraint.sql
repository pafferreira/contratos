-- ============================================================================
-- SCRIPT DE CORREÇÃO: Remover constraint única de métricas
-- ============================================================================
-- 
-- PROBLEMA: 
-- A constraint uk_metrica_solicitacao impede que uma RS tenha múltiplas
-- métricas do mesmo tipo, mas um projeto pode ter vários recursos associados.
--
-- SOLUÇÃO:
-- Remover a constraint para permitir múltiplas métricas do mesmo tipo por RS.
--
-- COMO EXECUTAR:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá para SQL Editor
-- 3. Cole este script completo
-- 4. Clique em "Run"
--
-- ============================================================================

-- Verificar se a constraint existe antes de remover
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'uk_metrica_solicitacao'
    ) THEN
        ALTER TABLE public."C_METRICAS_SOLICITACAO" 
        DROP CONSTRAINT uk_metrica_solicitacao;
        
        RAISE NOTICE 'Constraint uk_metrica_solicitacao removida com sucesso!';
    ELSE
        RAISE NOTICE 'Constraint uk_metrica_solicitacao não existe (já foi removida ou nunca existiu).';
    END IF;
END $$;

-- Verificar a estrutura atual da tabela
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public."C_METRICAS_SOLICITACAO"'::regclass;

-- Exibir mensagem de sucesso
SELECT 'Migração aplicada com sucesso! Agora você pode criar múltiplas métricas do mesmo tipo para uma RS.' AS status;
