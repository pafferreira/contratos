# Correção do Erro "duplicate key value violates unique constraint uk_metrica_solicitacao"

## Problema Identificado

A tela de **Projetos** apresenta o erro `duplicate key value violates unique constraint "uk_metrica_solicitacao"` ao tentar criar múltiplas métricas do mesmo tipo para uma mesma Requisição de Serviço (RS).

### Causa Raiz

Na tabela `C_METRICAS_SOLICITACAO`, existe uma constraint única definida em:
```sql
constraint uk_metrica_solicitacao unique (solicitacao_id, tipo_metrica)
```

Esta constraint impede que uma mesma RS tenha mais de uma métrica do mesmo tipo (ex: múltiplos recursos USH). No entanto, **um projeto pode ter vários recursos associados**, e cada recurso pode ter sua própria métrica do mesmo tipo.

## Solução Implementada

Foi criada a migração `0004_remove_unique_constraint_metricas.sql` que remove esta constraint, permitindo múltiplas métricas do mesmo tipo por RS.

## Como Aplicar a Correção

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard** do seu projeto
2. Vá para **SQL Editor**
3. Execute o seguinte comando:

```sql
ALTER TABLE public."C_METRICAS_SOLICITACAO" 
DROP CONSTRAINT IF EXISTS uk_metrica_solicitacao;
```

4. Clique em **Run** para executar

### Opção 2: Via Supabase CLI

Se você tiver o Supabase CLI configurado localmente:

```bash
npx supabase db push
```

### Opção 3: Via Cliente SQL

Se você usa um cliente SQL (como pgAdmin, DBeaver, etc.):

1. Conecte-se ao banco de dados
2. Execute o SQL acima

## Verificação

Após aplicar a migração, você poderá:

- Criar múltiplas métricas do mesmo tipo para uma mesma RS
- Associar vários recursos a um projeto
- Cada recurso pode ter sua própria métrica (USH, USD, PF, etc.)

## Exemplo de Uso

Agora você pode ter, por exemplo:
- RS-001 com 3 métricas USH (uma para cada recurso diferente)
- RS-001 com 2 métricas PF
- E assim por diante

## Arquivos Modificados

- ✅ `supabase/migrations/0004_remove_unique_constraint_metricas.sql` - Nova migração criada
- ℹ️ `src/app/(dashboard)/projetos/page.tsx` - Nenhuma alteração necessária no código

## Observações

- A remoção da constraint não afeta a integridade dos dados existentes
- O código da aplicação já está preparado para lidar com múltiplas métricas
- Não há necessidade de alterar o código TypeScript/React
