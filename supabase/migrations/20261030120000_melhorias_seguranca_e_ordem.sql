-- =====================================================================
-- Melhorias de segurança e desempenho (versão melhorada do app)
-- =====================================================================

-- 1) notificar_programacao
--    A última versão havia perdido a checagem de permissão (qualquer
--    usuário logado podia disparar avisos para todos) e passou a ignorar
--    a preferência "notificações ativas" do perfil. Restauramos as duas.
CREATE OR REPLACE FUNCTION public.notificar_programacao(_prog_id uuid, _tipo text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_titulo_prog text;
  v_data date;
  v_status public.status_programacao;
  v_titulo text;
  v_msg text;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'cerimonialista')) THEN
    RAISE EXCEPTION 'Sem permissão para notificar';
  END IF;
  IF _tipo NOT IN ('publicada', 'atualizada') THEN
    RAISE EXCEPTION 'Tipo inválido';
  END IF;

  SELECT titulo, data, status INTO v_titulo_prog, v_data, v_status
  FROM public.programacoes WHERE id = _prog_id;

  IF v_titulo_prog IS NULL THEN
    RAISE EXCEPTION 'Programação não encontrada';
  END IF;
  IF v_status <> 'publicado' THEN
    RAISE EXCEPTION 'Publique a programação antes de notificar';
  END IF;

  IF _tipo = 'publicada' THEN
    v_titulo := 'Nova programação';
    v_msg := '"' || v_titulo_prog || '" (' || to_char(v_data, 'DD/MM') || ') foi publicada.';
  ELSE
    v_titulo := 'Programação atualizada';
    v_msg := '"' || v_titulo_prog || '" (' || to_char(v_data, 'DD/MM') || ') teve alterações.';
  END IF;

  INSERT INTO public.notificacoes (user_id, programacao_id, tipo, titulo, mensagem)
  SELECT p.id, _prog_id, _tipo, v_titulo, v_msg
  FROM public.profiles p
  WHERE p.notificacoes_ativas = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_programacao(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.notificar_programacao(uuid, text) TO authenticated;

-- 2) reordenar_itens
--    Antes, cada arrastar/soltar disparava um UPDATE por item (N chamadas
--    de rede). Agora uma única chamada grava a nova ordem e recalcula os
--    horários estimados no servidor, de forma atômica.
CREATE OR REPLACE FUNCTION public.reordenar_itens(_prog_id uuid, _ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inicio time;
  v_cursor time;
  v_item record;
  v_ordem integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT public.pode_editar_programacao(v_uid, _prog_id) THEN
    RAISE EXCEPTION 'Sem permissão para editar esta programação';
  END IF;

  SELECT horario_inicio INTO v_inicio FROM public.programacoes WHERE id = _prog_id;
  IF v_inicio IS NULL THEN
    RAISE EXCEPTION 'Programação não encontrada';
  END IF;
  v_cursor := v_inicio;

  -- Itens na ordem enviada; itens que não vieram na lista vão para o fim.
  FOR v_item IN
    SELECT i.id, i.duracao_minutos
    FROM public.programacao_itens i
    LEFT JOIN LATERAL (
      SELECT array_position(_ids, i.id) AS pos
    ) p ON true
    WHERE i.programacao_id = _prog_id
    ORDER BY COALESCE(p.pos, 2147483647), i.ordem
  LOOP
    UPDATE public.programacao_itens
       SET ordem = v_ordem,
           horario_estimado = v_cursor
     WHERE id = v_item.id;
    v_ordem := v_ordem + 1;
    v_cursor := v_cursor + make_interval(mins => v_item.duracao_minutos);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reordenar_itens(uuid, uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reordenar_itens(uuid, uuid[]) TO authenticated;

-- 3) Índice para buscar a sessão de cronômetro mais recente de cada usuário
CREATE INDEX IF NOT EXISTS idx_timer_sessions_created_by
  ON public.timer_sessions (created_by, created_at DESC);
