CREATE OR REPLACE FUNCTION public.notificar_programacao(_prog_id uuid, _tipo text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    count_notif INTEGER := 0;
    prog_titulo TEXT;
    notif_titulo TEXT;
    notif_mensagem TEXT;
BEGIN
    SELECT titulo INTO prog_titulo FROM public.programacoes WHERE id = _prog_id;

    IF _tipo = 'publicada' THEN
        notif_titulo := 'Nova Programação';
        notif_mensagem := 'A programação "' || prog_titulo || '" foi publicada.';
    ELSE
        notif_titulo := 'Programação Atualizada';
        notif_mensagem := 'A programação "' || prog_titulo || '" foi atualizada.';
    END IF;

    INSERT INTO public.notificacoes (user_id, programacao_id, tipo, titulo, mensagem)
    SELECT id, _prog_id, _tipo, notif_titulo, notif_mensagem
    FROM public.profiles;

    GET DIAGNOSTICS count_notif = ROW_COUNT;
    RETURN count_notif;
END;
$function$;