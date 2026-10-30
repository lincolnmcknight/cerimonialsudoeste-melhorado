-- Garantir que todos os perfis existentes tenham notificações ativas
UPDATE public.profiles SET notificacoes_ativas = true;

-- Garantir que novos perfis comecem com notificações ativas (já deve ser true por padrão, mas reforçamos)
ALTER TABLE public.profiles ALTER COLUMN notificacoes_ativas SET DEFAULT true;

-- Modificar a função RPC que envia notificações para ignorar a preferência
-- Nota: A função original provavelmente filtrava por notificacoes_ativas = true
-- Vamos recriá-la para enviar a todos os perfis ativos.

CREATE OR REPLACE FUNCTION public.notificar_programacao(_prog_id uuid, _tipo text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    count_notif INTEGER := 0;
    prog_titulo TEXT;
    notif_titulo TEXT;
    notif_mensagem TEXT;
BEGIN
    -- Obter título da programação
    SELECT titulo INTO prog_titulo FROM public.programacoes WHERE id = _prog_id;

    IF _tipo = 'publicada' THEN
        notif_titulo := 'Nova Programação';
        notif_mensagem := 'A programação "' || prog_titulo || '" foi publicada.';
    ELSE
        notif_titulo := 'Programação Atualizada';
        notif_mensagem := 'A programação "' || prog_titulo || '" foi atualizada.';
    END IF;

    -- Inserir notificações para TODOS os usuários ativos
    -- Removemos o filtro de 'notificacoes_ativas'
    INSERT INTO public.notificacoes (user_id, programacao_id, titulo, mensagem)
    SELECT id, _prog_id, notif_titulo, notif_mensagem
    FROM public.profiles;
    
    GET DIAGNOSTICS count_notif = ROW_COUNT;
    RETURN count_notif;
END;
$function$;