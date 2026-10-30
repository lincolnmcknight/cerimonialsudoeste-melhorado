CREATE POLICY "Técnico de projeção vê itens para exportação"
ON public.programacao_itens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'tecnico_projecao'::public.app_role));