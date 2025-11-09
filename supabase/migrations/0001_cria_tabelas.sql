create table if not exists public."C_CLIENTES" (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text unique,
  criado_em timestamp with time zone default now()
);

create table if not exists public."C_CONTRATOS_CLIENTE" (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public."C_CLIENTES"(id) on delete cascade,
  numero_contrato text not null,
  data_inicio date not null,
  data_fim date not null,
  valor_total numeric(14,2) not null,
  valor_comprometido numeric(14,2) default 0,
  valor_disponivel numeric(14,2) generated always as (valor_total - valor_comprometido) stored,
  status text check (status in ('rascunho','ativo','encerrado')),
  unique (cliente_id, numero_contrato)
);

create table if not exists public."C_ESPECIFICACOES_SERVICO" (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid references public."C_CONTRATOS_CLIENTE"(id) on delete cascade,
  numero_especificacao text not null,
  titulo text,
  descricao text,
  valor_total numeric(14,2) not null,
  valor_comprometido numeric(14,2) default 0,
  valor_disponivel numeric(14,2) generated always as (valor_total - valor_comprometido) stored,
  unique (contrato_id, numero_especificacao)
);

create table if not exists public."C_SOLICITACOES_SERVICO" (
  id uuid primary key default gen_random_uuid(),
  especificacao_id uuid references public."C_ESPECIFICACOES_SERVICO"(id) on delete cascade,
  codigo_rs text not null,
  titulo text not null,
  escopo text,
  complexidade text check (complexidade in ('baixa','media','alta')),
  inicio_planejado date,
  fim_planejado date,
  inicio_real date,
  fim_real date,
  percentual_conclusao numeric(5,2) default 0,
  responsavel_cliente text,
  responsavel_bu text,
  justificativa text,
  notas_aceite text,
  status text check (status in ('planejada','em_execucao','homologacao','encerrada')),
  unique (especificacao_id, codigo_rs)
);

create table if not exists public."C_METRICAS_SOLICITACAO" (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid references public."C_SOLICITACOES_SERVICO"(id) on delete cascade,
  tipo_metrica text check (tipo_metrica in ('USH','USD','PF','PARCELA_FIXA')),
  quantidade numeric(10,2) not null,
  horas_unidade numeric(10,2),
  taxa numeric(12,2),
  valor_total numeric(14,2),
  constraint uk_metrica_solicitacao unique (solicitacao_id, tipo_metrica)
);

create table if not exists public."C_FORNECEDORES" (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text unique,
  email_contato text
);

create table if not exists public."C_CONTRATOS_FORNECEDOR" (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references public."C_FORNECEDORES"(id) on delete cascade,
  numero_contrato text not null,
  data_inicio date,
  data_fim date,
  valor_total numeric(14,2),
  valor_comprometido numeric(14,2) default 0,
  valor_disponivel numeric(14,2) generated always as (valor_total - valor_comprometido) stored,
  unique (fornecedor_id, numero_contrato)
);

create table if not exists public."C_PERFIS_RECURSOS" (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  valor_hora numeric(12,2) not null
);

create table if not exists public."C_RECURSOS_FORNECEDOR" (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references public."C_FORNECEDORES"(id) on delete cascade,
  perfil_id uuid references public."C_PERFIS_RECURSOS"(id),
  nome_completo text not null,
  email text,
  ativo boolean default true
);

create table if not exists public."C_ORDENS_SERVICO" (
  id uuid primary key default gen_random_uuid(),
  contrato_fornecedor_id uuid references public."C_CONTRATOS_FORNECEDOR"(id) on delete cascade,
  numero_os text not null,
  aberta_em date default now(),
  perfil_solicitado_id uuid references public."C_PERFIS_RECURSOS"(id),
  quantidade_solicitada integer,
  horas_solicitadas numeric(10,2),
  valor_unitario numeric(12,2),
  valor_reservado numeric(14,2),
  valor_consumido numeric(14,2) default 0,
  valor_disponivel numeric(14,2) generated always as (valor_reservado - valor_consumido) stored,
  unique (contrato_fornecedor_id, numero_os)
);

create table if not exists public."C_ALOCACOES_RECURSOS" (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid references public."C_SOLICITACOES_SERVICO"(id) on delete cascade,
  recurso_fornecedor_id uuid references public."C_RECURSOS_FORNECEDOR"(id),
  ordem_servico_id uuid references public."C_ORDENS_SERVICO"(id),
  papel text,
  inicio_alocacao date,
  fim_alocacao date
);

create table if not exists public."C_APONTAMENTOS_TEMPO" (
  id uuid primary key default gen_random_uuid(),
  alocacao_id uuid references public."C_ALOCACOES_RECURSOS"(id) on delete cascade,
  data_trabalho date not null,
  horas numeric(6,2) not null,
  aprovado boolean default false,
  mes_faturamento date generated always as (date_trunc('month', data_trabalho)) stored
);

create view if not exists public."C_V_PROJETOS_FINANCEIROS" as
select
  sr.id as solicitacao_id,
  sr.codigo_rs,
  sum(tm.valor_total) as orcamento_solicitacao,
  sum(te.horas * rp.valor_hora) as custo_fornecedor,
  sum(te.horas) as horas_totais
from public."C_SOLICITACOES_SERVICO" sr
left join public."C_METRICAS_SOLICITACAO" tm on tm.solicitacao_id = sr.id
left join public."C_ALOCACOES_RECURSOS" ra on ra.solicitacao_id = sr.id
left join public."C_RECURSOS_FORNECEDOR" sres on sres.id = ra.recurso_fornecedor_id
left join public."C_PERFIS_RECURSOS" rp on rp.id = sres.perfil_id
left join public."C_APONTAMENTOS_TEMPO" te on te.alocacao_id = ra.id
group by sr.id, sr.codigo_rs;
