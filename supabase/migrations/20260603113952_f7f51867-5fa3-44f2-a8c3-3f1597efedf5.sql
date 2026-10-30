-- Notifications
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  programacao_id uuid REFERENCES public.programacoes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('publicada','atualizada')),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê próprias notificações"
  ON public.notificacoes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Usuário marca própria como lida"
  ON public.notificacoes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Usuário apaga própria notificação"
  ON public.notificacoes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_notificacoes_user ON public.notificacoes(user_id, created_at DESC);

-- Preferência de notificações no profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notificacoes_ativas boolean NOT NULL DEFAULT true;

-- RPC para disparar notificações em massa
CREATE OR REPLACE FUNCTION public.notificar_programacao(_prog_id uuid, _tipo text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo text;
  v_msg text;
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'cerimonialista')) THEN
    RAISE EXCEPTION 'Sem permissão para notificar';
  END IF;
  IF _tipo NOT IN ('publicada','atualizada') THEN
    RAISE EXCEPTION 'Tipo inválido';
  END IF;
  IF _tipo = 'publicada' THEN
    v_titulo := 'Nova programação publicada';
    v_msg := 'Cerimonial Sudoeste: a programação do culto de hoje já está disponível.';
  ELSE
    v_titulo := 'Programação atualizada';
    v_msg := 'Cerimonial Sudoeste: a programação do culto foi atualizada.';
  END IF;

  INSERT INTO public.notificacoes (user_id, programacao_id, tipo, titulo, mensagem)
  SELECT p.id, _prog_id, _tipo, v_titulo, v_msg
  FROM public.profiles p
  WHERE p.notificacoes_ativas = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Timer sessions (tela de retorno)
CREATE TABLE public.timer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  programacao_id uuid REFERENCES public.programacoes(id) ON DELETE SET NULL,
  item_id uuid,
  activity_name text NOT NULL DEFAULT '',
  responsible_name text,
  duration_seconds int NOT NULL DEFAULT 0,
  remaining_seconds int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','running','paused','finished')),
  started_at timestamptz,
  paused_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.timer_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timer_sessions TO authenticated;
GRANT ALL ON public.timer_sessions TO service_role;
ALTER TABLE public.timer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tela de retorno lê sessão pelo código"
  ON public.timer_sessions FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Staff cria sessão"
  ON public.timer_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Dono ou admin atualiza sessão"
  ON public.timer_sessions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Dono ou admin apaga sessão"
  ON public.timer_sessions FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_timer_sessions_touch
  BEFORE UPDATE ON public.timer_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime para timer e notificações
ALTER TABLE public.timer_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timer_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;