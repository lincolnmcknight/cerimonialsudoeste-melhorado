
-- 1. Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Tela de retorno lê sessão pelo código" ON public.timer_sessions;

-- 2. Restrict direct SELECT to owner and staff only
CREATE POLICY "Dono ou staff lê sessão"
  ON public.timer_sessions
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR public.is_staff(auth.uid()));

-- 3. Public RPC that returns only safe columns when the caller knows the code
CREATE OR REPLACE FUNCTION public.get_timer_session_public(_code text)
RETURNS TABLE (
  id uuid,
  code text,
  activity_name text,
  responsible_name text,
  duration_seconds integer,
  remaining_seconds integer,
  status text,
  started_at timestamptz,
  paused_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, code, activity_name, responsible_name, duration_seconds,
         remaining_seconds, status, started_at, paused_at, updated_at
  FROM public.timer_sessions
  WHERE code = upper(_code)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_timer_session_public(text) TO anon, authenticated;
