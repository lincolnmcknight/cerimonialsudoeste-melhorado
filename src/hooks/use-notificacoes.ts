import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface Notificacao {
  id: string;
  user_id: string;
  programacao_id: string | null;
  tipo: "publicada" | "atualizada";
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

export function useNotificacoes() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notificacoes", user?.id],
    queryFn: async () => {
      if (!user) return [] as Notificacao[];
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notificacao[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notificacao;
          qc.invalidateQueries({ queryKey: ["notificacoes", user.id] });
          toast(n.titulo, { description: n.mensagem });
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(n.titulo, { body: n.mensagem });
            } catch {
              /* ignore */
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const naoLidas = (q.data ?? []).filter((n) => !n.lida).length;
  return { ...q, naoLidas };
}
