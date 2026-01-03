# Pasta Supabase - Documentação

Esta pasta contém todos os arquivos relacionados ao banco de dados Supabase do projeto.

## 📁 Estrutura de Arquivos

```
supabase/
├── migrations/
│   └── 00_schema_completo.sql    # Schema completo do banco de dados
├── functions/
│   └── send-auth-email/          # Edge Function para emails de acesso e reset
├── generate-types.ps1             # Script para gerar tipos TypeScript
└── README.md                      # Esta documentação
```

## 🗄️ Schema do Banco de Dados

O arquivo `migrations/00_schema_completo.sql` contém:

### Tabelas Principais

#### Módulo de Clientes e Contratos
- `C_CLIENTES` - Cadastro de clientes
- `C_CONTRATOS_CLIENTE` - Contratos com clientes
- `C_ESPECIFICACOES_SERVICO` - Especificações de serviço (ESP)
- `C_REQUISICOES_SERVICO` - Requisições de serviço (RS)
- `C_METRICAS_SOLICITACAO` - Métricas das solicitações

#### Módulo de Fornecedores e Recursos
- `C_FORNECEDORES` - Cadastro de fornecedores
- `C_CONTRATOS_FORNECEDOR` - Contratos com fornecedores
- `C_PERFIS_RECURSOS` - Perfis de recursos (ex: Desenvolvedor Sênior)
- `C_RECURSOS_FORNECEDOR` - Recursos alocados pelos fornecedores
- `C_ORDENS_SERVICO` - Ordens de serviço (OS)

#### Módulo de Alocações e Apontamentos
- `C_ALOCACOES_RECURSOS` - Alocação de recursos em projetos
- `C_APONTAMENTOS_TEMPO` - Apontamentos de horas trabalhadas

#### Módulo de Autenticação e Controle de Acesso
- `z_sistemas` - Sistemas disponíveis
- `z_usuarios` - Usuários do sistema
- `z_papeis` - Papéis/roles por sistema
- `z_permissoes` - Permissões disponíveis
- `z_usuarios_papeis` - Associação usuários-papéis
- `z_papeis_permissoes` - Associação papéis-permissões

### Views
- `C_V_PROJETOS_FINANCEIROS` - Visão financeira dos projetos

### Functions e Triggers
- `set_mes_faturamento()` - Define automaticamente o mês de faturamento
- `update_updated_at_column()` - Atualiza timestamp de modificação

### Segurança
- **RLS (Row Level Security)** habilitado em todas as tabelas
- Políticas de acesso baseadas em autenticação

## 🔧 Como Usar

### 1. Aplicar o Schema no Supabase

**Opção A: Via Dashboard do Supabase**
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá para seu projeto
3. Navegue até **SQL Editor**
4. Copie e cole o conteúdo de `migrations/00_schema_completo.sql`
5. Execute o script

**Opção B: Via Supabase CLI**
```bash
# Fazer login
supabase login

# Vincular projeto
supabase link --project-ref YOUR_PROJECT_ID

# Aplicar migração
supabase db push
```

### 2. Gerar Tipos TypeScript

Após aplicar o schema, gere os tipos TypeScript:

```powershell
# Execute o script
.\supabase\generate-types.ps1
```

Ou manualmente:

```bash
# Instalar Supabase CLI (se necessário)
npm install -g supabase

# Fazer login
supabase login

# Gerar tipos
supabase gen types typescript --linked > src/lib/supabase/types.ts
```

### 3. Atualizar o Schema

Quando precisar atualizar o schema:

1. Edite o arquivo `migrations/00_schema_completo.sql`
2. Aplique as mudanças no Supabase (via Dashboard ou CLI)
3. Regenere os tipos TypeScript:
   ```powershell
    .\supabase\generate-types.ps1
   ```

### 4. Edge Function - Emails customizados

A função `send-auth-email` envia emails customizados de magic link e redefinição de senha.

**Deploy**
```bash
supabase functions deploy send-auth-email
```

**Secrets necessários**
```bash
supabase secrets set \
  SUPABASE_URL=YOUR_SUPABASE_URL \
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
  SITE_URL=https://seu-dominio.com \
  SMTP_HOST=smtp.seu-provedor.com \
  SMTP_PORT=587 \
  SMTP_USERNAME=usuario_smtp \
  SMTP_PASSWORD=senha_smtp \
  SMTP_FROM=no-reply@seu-dominio.com
```

**Opcionais**
```bash
supabase secrets set \
  SMTP_FROM_NAME="Inventario de Contratos" \
  SMTP_TLS=true \
  APP_NAME="Inventario de Contratos" \
  CORS_ORIGIN=https://seu-dominio.com
```

**Observacoes**
- `SITE_URL` deve ser o dominio publico do app.
- O link gerado redireciona para `/auth/callback?next=/acesso-geral` ou `/acesso-reset`.

## 📊 Diagrama ER

O relacionamento entre as tabelas segue esta estrutura:

```
CLIENTES
  └── CONTRATOS_CLIENTE
        └── ESPECIFICACOES_SERVICO
              └── REQUISICOES_SERVICO
                    ├── METRICAS_SOLICITACAO
                    └── ALOCACOES_RECURSOS
                          └── APONTAMENTOS_TEMPO

FORNECEDORES
  ├── CONTRATOS_FORNECEDOR
  │     └── ORDENS_SERVICO
  │           └── ALOCACOES_RECURSOS
  └── RECURSOS_FORNECEDOR
        └── ALOCACOES_RECURSOS

PERFIS_RECURSOS
  ├── RECURSOS_FORNECEDOR
  └── ORDENS_SERVICO
```

## 🔐 Segurança e RLS

Todas as tabelas possuem Row Level Security (RLS) habilitado com a política:
- **Permitir acesso autenticado**: Usuários autenticados têm acesso completo

Para implementar políticas mais granulares, edite as políticas RLS no arquivo de migração.

## 📝 Notas Importantes

1. **Backup**: Sempre faça backup antes de aplicar mudanças no schema
2. **Tipos TypeScript**: Regenere os tipos após qualquer alteração no schema
3. **Migrações**: Mantenha um histórico de migrações para rastreabilidade
4. **Índices**: O schema inclui índices otimizados para as queries mais comuns

## 🚀 Comandos Úteis

```bash
# Ver status do projeto Supabase
supabase status

# Resetar banco de dados local (CUIDADO!)
supabase db reset

# Criar nova migração
supabase migration new nome_da_migracao

# Ver diferenças entre local e remoto
supabase db diff

# Fazer backup do banco
supabase db dump -f backup.sql
```

## 📚 Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Support](https://supabase.com/docs/guides/api/generating-types)

## 🆘 Problemas Comuns

### Erro ao gerar tipos
- Verifique se está logado: `supabase login`
- Verifique se o projeto está vinculado: `supabase link`
- Verifique as variáveis de ambiente no `.env.local`

### Erro ao aplicar migração
- Verifique se há conflitos com o schema existente
- Considere fazer um backup antes de aplicar
- Use `DROP TABLE IF EXISTS` com cuidado

### RLS bloqueando acesso
- Verifique se o usuário está autenticado
- Revise as políticas RLS no arquivo de migração
- Use o SQL Editor do Supabase para testar queries

---

**Versão**: 1.1.1  
**Última atualização**: 2026-01-01
