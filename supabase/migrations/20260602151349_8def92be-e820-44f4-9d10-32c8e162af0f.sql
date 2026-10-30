-- Stop auto-assigning 'editor' role to new signups.
-- Only the FIRST user becomes admin+cerimonialista. All others get NO role
-- and must be granted access by an admin via the new "Acessos" screen.
CREATE OR REPLACE FUNCTION public.bootstrap_user_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total int;
  v_mine int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT count(*) INTO v_mine FROM public.user_roles WHERE user_id = v_uid;
  IF v_mine > 0 THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_total FROM public.user_roles;
  IF v_total = 0 THEN
    -- Primeiro usuário do sistema: vira admin e cerimonialista
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin');
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'cerimonialista');
  END IF;
  -- Demais usuários: nenhum papel até admin conceder
END;
$$;

-- Allow admins to list profiles so they can grant roles by email/name
CREATE POLICY "Admin vê todos perfis"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to list every role assignment
CREATE POLICY "Admin vê todos papéis"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Helper to duplicate a programação and its items in a single transaction.
-- Caller must already be allowed to create programações.
CREATE OR REPLACE FUNCTION public.duplicar_programacao(_prog_id uuid, _nova_data date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'cerimonialista')) THEN
    RAISE EXCEPTION 'Sem permissão para duplicar';
  END IF;

  INSERT INTO public.programacoes (titulo, data, tipo, horario_inicio, pregador, tema, status, criado_por)
  SELECT titulo || ' (cópia)', _nova_data, tipo, horario_inicio, pregador, tema, 'rascunho', v_uid
  FROM public.programacoes WHERE id = _prog_id
  RETURNING id INTO v_new_id;

  INSERT INTO public.programacao_itens
    (programacao_id, ordem, atividade, midia, responsavel, duracao_minutos, horario_estimado, observacao, visivel_publico)
  SELECT v_new_id, ordem, atividade, midia, responsavel, duracao_minutos, horario_estimado, observacao, visivel_publico
  FROM public.programacao_itens WHERE programacao_id = _prog_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.duplicar_programacao(uuid, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.duplicar_programacao(uuid, date) TO authenticated;