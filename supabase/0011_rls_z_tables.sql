-- Adicionar policies para tabelas z_

-- z_sistemas
ALTER TABLE public.z_sistemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos autenticados" ON public.z_sistemas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para todos autenticados" ON public.z_sistemas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- z_usuarios
ALTER TABLE public.z_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos autenticados" ON public.z_usuarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para todos autenticados" ON public.z_usuarios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- z_papeis
ALTER TABLE public.z_papeis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos autenticados" ON public.z_papeis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para todos autenticados" ON public.z_papeis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- z_permissoes
ALTER TABLE public.z_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos autenticados" ON public.z_permissoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para todos autenticados" ON public.z_permissoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- z_usuarios_papeis
ALTER TABLE public.z_usuarios_papeis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos autenticados" ON public.z_usuarios_papeis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para todos autenticados" ON public.z_usuarios_papeis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- z_papeis_permissoes
ALTER TABLE public.z_papeis_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos autenticados" ON public.z_papeis_permissoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir escrita para todos autenticados" ON public.z_papeis_permissoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
