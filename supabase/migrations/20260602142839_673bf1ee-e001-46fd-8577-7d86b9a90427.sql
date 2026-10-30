
-- 1) Restrict profile reads to owner only
DROP POLICY IF EXISTS "Profiles visíveis para autenticados" ON public.profiles;

CREATE POLICY "Usuário vê próprio perfil"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2) Lock down user_roles writes: deny all client writes
CREATE POLICY "Apenas admin gerencia papéis - insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admin gerencia papéis - update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admin gerencia papéis - delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) Bootstrap function: secure first-access role assignment
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
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin');
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'cerimonialista');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'editor');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_user_role() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_user_role() TO authenticated;
