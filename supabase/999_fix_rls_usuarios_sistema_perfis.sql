-- Ajusta RLS da tabela de permissões para evitar recursão em policies
-- Execute este script no SQL Editor do Supabase.

-- Remove policies antigas que possam estar causando recursão
drop policy if exists "usp_all" on public.usuarios_sistema_perfis;
drop policy if exists "usuarios_sistema_perfis_select" on public.usuarios_sistema_perfis;
drop policy if exists "usuarios_sistema_perfis_insert" on public.usuarios_sistema_perfis;
drop policy if exists "usuarios_sistema_perfis_update" on public.usuarios_sistema_perfis;
drop policy if exists "usuarios_sistema_perfis_delete" on public.usuarios_sistema_perfis;

-- Garante que a tabela tem RLS habilitado
alter table public.usuarios_sistema_perfis enable row level security;

-- Nenhuma policy criada aqui: ajuste conforme regra desejada.
-- Sugestão segura (restrita ao próprio usuário):
-- create policy "usp_owner"
-- on public.usuarios_sistema_perfis
-- for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
