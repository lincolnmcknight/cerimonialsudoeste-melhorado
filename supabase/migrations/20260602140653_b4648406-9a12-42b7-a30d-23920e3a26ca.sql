
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'cerimonialista', 'editor');
CREATE TYPE public.tipo_culto AS ENUM ('sabado_manha', 'culto_ja', 'domingo', 'quarta_feira', 'semana_oracao', 'evento_especial');
CREATE TYPE public.status_programacao AS ENUM ('rascunho', 'publicado');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles visíveis para autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário atualiza próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuário insere próprio perfil" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê seus papéis" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','cerimonialista','editor'))
$$;

-- Programações
CREATE TABLE public.programacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  tipo public.tipo_culto NOT NULL,
  pregador TEXT,
  tema TEXT,
  status public.status_programacao NOT NULL DEFAULT 'rascunho',
  horario_inicio TIME NOT NULL DEFAULT '09:00',
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prog_data ON public.programacoes(data);
CREATE INDEX idx_prog_status ON public.programacoes(status);
GRANT SELECT ON public.programacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programacoes TO authenticated;
GRANT ALL ON public.programacoes TO service_role;
ALTER TABLE public.programacoes ENABLE ROW LEVEL SECURITY;

-- Permissões de edição (cerimonialista concede acesso a editores)
CREATE TABLE public.programacao_editores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programacao_id UUID NOT NULL REFERENCES public.programacoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(programacao_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.programacao_editores TO authenticated;
GRANT ALL ON public.programacao_editores TO service_role;
ALTER TABLE public.programacao_editores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pode_editar_programacao(_user_id UUID, _prog_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin') OR
    public.has_role(_user_id, 'cerimonialista') OR
    EXISTS (SELECT 1 FROM public.programacao_editores WHERE programacao_id = _prog_id AND user_id = _user_id) OR
    EXISTS (SELECT 1 FROM public.programacoes WHERE id = _prog_id AND criado_por = _user_id)
$$;

-- Políticas de programações
CREATE POLICY "Público vê publicadas" ON public.programacoes FOR SELECT TO anon, authenticated
  USING (status = 'publicado' OR public.is_staff(auth.uid()));
CREATE POLICY "Staff cria programação" ON public.programacoes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cerimonialista'));
CREATE POLICY "Editores autorizados atualizam" ON public.programacoes FOR UPDATE TO authenticated
  USING (public.pode_editar_programacao(auth.uid(), id));
CREATE POLICY "Admin/cerimonialista exclui" ON public.programacoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cerimonialista'));

-- Políticas de editores
CREATE POLICY "Staff vê editores" ON public.programacao_editores FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Admin/cerimonialista concede" ON public.programacao_editores FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cerimonialista'));
CREATE POLICY "Admin/cerimonialista revoga" ON public.programacao_editores FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cerimonialista'));

-- Itens da programação
CREATE TABLE public.programacao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programacao_id UUID NOT NULL REFERENCES public.programacoes(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  atividade TEXT NOT NULL,
  midia TEXT,
  responsavel TEXT,
  duracao_minutos INT NOT NULL DEFAULT 5,
  horario_estimado TIME,
  horario_real TIME,
  observacao TEXT,
  visivel_publico BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_itens_prog ON public.programacao_itens(programacao_id, ordem);
GRANT SELECT ON public.programacao_itens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programacao_itens TO authenticated;
GRANT ALL ON public.programacao_itens TO service_role;
ALTER TABLE public.programacao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público vê itens visíveis de publicadas" ON public.programacao_itens FOR SELECT TO anon, authenticated
  USING (
    public.is_staff(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.programacoes p
      WHERE p.id = programacao_id
        AND p.status = 'publicado'
        AND programacao_itens.visivel_publico = true
    )
  );
CREATE POLICY "Editores criam itens" ON public.programacao_itens FOR INSERT TO authenticated
  WITH CHECK (public.pode_editar_programacao(auth.uid(), programacao_id));
CREATE POLICY "Editores atualizam itens" ON public.programacao_itens FOR UPDATE TO authenticated
  USING (public.pode_editar_programacao(auth.uid(), programacao_id));
CREATE POLICY "Editores excluem itens" ON public.programacao_itens FOR DELETE TO authenticated
  USING (public.pode_editar_programacao(auth.uid(), programacao_id));

-- Trigger para criar profile no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER touch_programacoes BEFORE UPDATE ON public.programacoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_itens BEFORE UPDATE ON public.programacao_itens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
