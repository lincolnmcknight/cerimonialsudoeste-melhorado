import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BellRing, CheckCheck, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNotificacoes } from "@/hooks/use-notificacoes";
import { useAuth } from "@/hooks/use-auth";
import { Cabecalho } from "@/components/marca";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({ meta: [{ title: "Avisos — Cerimonial Sudoeste" }] }),
  component: NotifPage,
});

function NotifPage() {
  const { user, isStaff } = useAuth();
  const { data, naoLidas } = useNotificacoes();
  const qc = useQueryClient();
  const [prefAtivas, setPrefAtivas] = useState<boolean | null>(null);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission | "indisponivel">("default");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBrowserPerm("Notification" in window ? Notification.permission : "indisponivel");
    }
    if (!user) return;
    supabase
      .from("profiles")
      .select("notificacoes_ativas")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setPrefAtivas(data?.notificacoes_ativas ?? true));
  }, [user]);

  const chave = ["notificacoes", user?.id];

  async function togglePref(novo: boolean) {
    if (!user) return;
    setPrefAtivas(novo);
    const { error } = await supabase.from("profiles").update({ notificacoes_ativas: novo }).eq("id", user.id);
    if (error) {
      setPrefAtivas(!novo);
      return toast.error(error.message);
    }
    toast.success(novo ? "Você volta a receber avisos" : "Avisos desligados");
  }

  async function pedirPermissao() {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setBrowserPerm(p);
    if (p === "granted") toast.success("Avisos do celular ativados");
    if (p === "denied") toast.error("O navegador bloqueou os avisos. Libere nas configurações do site.");
  }

  async function marcarTodas() {
    if (!user) return;
    await supabase.from("notificacoes").update({ lida: true }).eq("user_id", user.id).eq("lida", false);
    qc.invalidateQueries({ queryKey: chave });
  }

  async function marcarLida(id: string) {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: chave });
  }

  async function apagar(id: string) {
    await supabase.from("notificacoes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: chave });
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <Cabecalho voltar={{ to: isStaff ? "/admin" : "/", label: isStaff ? "Programações" : "Programação" }}>
        <h1 className="font-display text-5xl leading-none">Avisos</h1>
        <p className="text-white/70 mt-3">
          Você recebe um aviso quando o cerimonial publica ou altera uma programação.
        </p>
      </Cabecalho>

      <main className="max-w-2xl mx-auto px-5 mt-6 space-y-6">
        <section className="bg-card border border-border rounded-2xl divide-y divide-border">
          <label className="flex items-center justify-between gap-4 px-4 py-3.5">
            <span>
              <span className="block font-medium">Receber avisos</span>
              <span className="block text-sm text-muted-foreground">Novas programações e alterações.</span>
            </span>
            <Switch
              checked={prefAtivas ?? true}
              disabled={prefAtivas === null}
              onCheckedChange={togglePref}
              aria-label="Receber avisos"
            />
          </label>
          {browserPerm !== "granted" && browserPerm !== "indisponivel" && (
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span>
                <span className="block font-medium">Avisos no celular</span>
                <span className="block text-sm text-muted-foreground">
                  {browserPerm === "denied"
                    ? "Bloqueados pelo navegador. Libere nas configurações do site."
                    : "Mostra o aviso mesmo com o app em segundo plano."}
                </span>
              </span>
              {browserPerm === "default" && (
                <button
                  onClick={pedirPermissao}
                  className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl bg-noite text-white hover:bg-noite/90"
                >
                  <BellRing className="w-4 h-4" /> Ativar
                </button>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">Recebidos</h2>
            {naoLidas > 0 && (
              <button onClick={marcarTodas} className="text-sm text-anil inline-flex items-center gap-1.5 hover:underline">
                <CheckCheck className="w-4 h-4" /> Marcar todos como lidos
              </button>
            )}
          </div>

          {(data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
              Nenhum aviso por enquanto.
            </div>
          ) : (
            <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {(data ?? []).map((n) => (
                <li key={n.id} className={cn("flex items-start gap-3 px-4 py-3.5", !n.lida && "bg-anil/[0.04]")}>
                  <span
                    className={cn("mt-2 w-2 h-2 rounded-full shrink-0", n.lida ? "bg-transparent" : "bg-accent")}
                    aria-label={n.lida ? undefined : "Não lido"}
                  />
                  <div className="flex-1 min-w-0">
                    {n.programacao_id ? (
                      <Link
                        to="/programacao/$id"
                        params={{ id: n.programacao_id }}
                        onClick={() => !n.lida && marcarLida(n.id)}
                        className="group block"
                      >
                        <div className={cn("leading-snug", !n.lida && "font-medium")}>{n.titulo}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">{n.mensagem}</div>
                        <div className="text-xs text-muted-foreground mt-1.5 inline-flex items-center gap-1">
                          {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                          <span className="text-anil group-hover:underline inline-flex items-center ml-2">
                            Ver programação <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <>
                        <div className={cn("leading-snug", !n.lida && "font-medium")}>{n.titulo}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">{n.mensagem}</div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => apagar(n.id)}
                    className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8"
                    aria-label="Apagar aviso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
