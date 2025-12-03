# 🔧 Guia Rápido: Corrigir Erro de Constraint na Tela Projetos

## ⚠️ Problema
Ao tentar criar um novo projeto na tela **Projetos**, você recebe o erro:
```
duplicate key value violates unique constraint "uk_metrica_solicitacao"
```

## ✅ Solução em 3 Passos

### Passo 1: Acessar o Supabase Dashboard
1. Abra seu navegador
2. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
3. Faça login na sua conta
4. Selecione o projeto **contratos**

### Passo 2: Abrir o SQL Editor
1. No menu lateral esquerdo, clique em **SQL Editor**
2. Clique em **New query** (ou "Nova consulta")

### Passo 3: Executar o Script de Correção
1. Copie o código abaixo:

```sql
ALTER TABLE public."C_METRICAS_SOLICITACAO" 
DROP CONSTRAINT IF EXISTS uk_metrica_solicitacao;
```

2. Cole no editor SQL
3. Clique no botão **Run** (ou pressione Ctrl+Enter)
4. Aguarde a mensagem de sucesso

## 🎉 Pronto!

Após executar o script:
- ✅ Você poderá criar múltiplos projetos do mesmo tipo para uma RS
- ✅ Cada recurso pode ter sua própria métrica
- ✅ O erro não aparecerá mais

## 📝 Explicação Técnica

A constraint `uk_metrica_solicitacao` estava impedindo que uma mesma Requisição de Serviço (RS) tivesse mais de uma métrica do mesmo tipo. Isso não faz sentido quando um projeto tem vários recursos associados, pois cada recurso precisa de sua própria métrica.

**Antes:** RS-001 → apenas 1 métrica USH ❌  
**Depois:** RS-001 → múltiplas métricas USH (uma por recurso) ✅

## 🔍 Verificação

Para confirmar que a correção foi aplicada:

1. Volte para a aplicação
2. Acesse a tela **Projetos**
3. Tente criar um novo projeto
4. O erro não deve mais aparecer

## 📞 Precisa de Ajuda?

Se encontrar algum problema:
1. Verifique se você está conectado ao projeto correto no Supabase
2. Confirme que tem permissões de administrador
3. Tente executar o script novamente

---

**Arquivo de migração:** `supabase/migrations/0004_remove_unique_constraint_metricas.sql`  
**Documentação completa:** `docs/fix-metricas-constraint.md`
