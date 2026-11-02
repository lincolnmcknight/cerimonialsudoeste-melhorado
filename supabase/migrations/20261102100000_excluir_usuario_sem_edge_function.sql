-- Exclusão de usuário pelo administrador, direto no banco
-- (substitui a edge function admin-delete-user, que dependia do Lovable Cloud).
CREATE OR REPLACE FUNCTION public.admin_excluir_usuario(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários.';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir a própria conta.';
  END IF;
  DELETE FROM public.notificacoes WHERE user_id = _user_id;
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_excluir_usuario(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_excluir_usuario(uuid) TO authenticated;
