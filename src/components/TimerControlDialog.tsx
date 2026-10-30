import { useEffect, useState } from "react";
import { Copy, Monitor, Pause, Play, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { codeForUser, mmss, restanteAoVivo, TIMER_STATUS_LABEL, type TimerStatus } from "@/lib/timer";
import { Painel, botaoPrimario, botaoSecundario, inputCls } from "@/components/marca";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  atividade: string;
  responsavel: string | null;
  duracao_minutos: number;
  programacao_id: string;
}

interface Session {
  id: string;
  code: string;
  activity_name: string;
  responsible_name: string | null;
  duration_seconds: number;
  remaining_seconds: number;
  status: TimerStatus;
  started_at: string | null;
  paused_at: string | null;
  item_id: string | null;
}

export function TimerControlDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [duracaoMin, setDuracaoMin] = useState<string>(String(item.duracao_minutos));
  const [, setTick] = useState(0);

  // Reaproveita a sessão do usuário (mesmo código) ou cria uma nova.
  useEffect(() => {
    if (!user) return;
    let alive = true;

    (async () => {
      const { data: existing } = await supabase
        .from("timer_sessions")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      let s = existing?.[0] as Session | undefined;

      const base = {
        programacao_id: item.programacao_id,
        item_id: item.id,
        activity_name: item.atividade,
        responsible_name: item.responsavel,
        duration_seconds: item.duracao_minutos * 60,
        remaining_seconds: item.duracao_minutos * 60,
        status: "waiting" as const,
        started_at: null,
        paused_at: null,
      };

      if (!s) {
        const { data, error } = await supabase
          .from("timer_sessions")
          .insert({ ...base, code: codeForUser(user.id), created_by: user.id })
          .select()
          .single();
        if (error) {
          toast.error(error.message);
          return;
        }
        s = data as Session;
      } else {
        // Se a sessão já está rodando/pausada para este mesmo item, preserva.
        // Caso contrário, prepara para o item atual mantendo o código.
        const mesmoItemAtivo = s.item_id === item.id && (s.status === "running" || s.status === "paused");
        if (!mesmoItemAtivo) {
          const { data } = await supabase.from("timer_sessions").update(base).eq("id", s.id).select().single();
          s = (data as Session) ?? s;
        }
      }
      if (!alive) return;
      setSession(s ?? null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [user, item.id, item.programacao_id, item.atividade, item.responsavel, item.duracao_minutos]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 250);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!session?.id) return;
    const ch = supabase
      .channel(`timer-ctrl-${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "timer_sessions", filter: `id=eq.${session.id}` },
        (p) => setSession(p.new as Session),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session?.id]);

  const restante = session ? restanteAoVivo(session) : 0;

  async function update(patch: Partial<Session>) {
    if (!session) return;
    const { data, error } = await supabase.from("timer_sessions").update(patch).eq("id", session.id).select().single();
    if (error) return toast.error(error.message);
    setSession(data as Session);
  }

  const iniciar = () => {
    const seg = (Number(duracaoMin) || 1) * 60;
    return update({
      duration_seconds: seg,
      remaining_seconds: seg,
      status: "running",
      started_at: new Date().toISOString(),
      paused_at: null,
    });
  };
  const pausar = () =>
    update({ status: "paused", remaining_seconds: restante, started_at: null, paused_at: new Date().toISOString() });
  const continuar = () => update({ status: "running", started_at: new Date().toISOString(), paused_at: null });
  const reiniciar = () =>
    update({
      status: "waiting",
      remaining_seconds: session?.duration_seconds ?? (Number(duracaoMin) || 1) * 60,
      started_at: null,
      paused_at: null,
    });
  const encerrar = () => update({ status: "finished", remaining_seconds: 0, started_at: null });
  const ajustar = (seg: number) => {
    if (!session) return;
    const novoRestante = session.remaining_seconds + seg;
    if (session.status !== "running" && novoRestante < 0) return;
    return update({
      remaining_seconds: novoRestante,
      duration_seconds: Math.max(60, session.duration_seconds + seg),
    });
  };

  const negativo = restante < 0;
  const ativo = session?.status === "running" || session?.status === "paused";

  return (
    <Painel titulo="Cronômetro" descricao={item.atividade + (item.responsavel ? `, com ${item.responsavel}` : "")} onClose={onClose}>
      {loading || !session ? (
        <div className="py-12 text-center text-muted-foreground">Preparando o cronômetro…</div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl bg-muted px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Código da tela de retorno</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(session.code);
                  toast.success("Código copiado");
                }}
                className="font-display text-3xl tracking-[0.3em] text-noite inline-flex items-center gap-2"
                title="Copiar código"
              >
                {session.code}
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <a
              href={`/retorno/${session.code}`}
              target="_blank"
              rel="noreferrer"
              className={cn(botaoPrimario, "text-sm py-2.5 px-3.5")}
            >
              <Monitor className="w-4 h-4" /> Abrir tela
            </a>
          </div>

          <div className="text-center">
            <div
              className={cn(
                "font-display text-[5.5rem] leading-none tabular transition-colors",
                negativo ? "text-destructive" : "text-noite",
              )}
              aria-live="polite"
            >
              {mmss(restante)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {negativo ? "Tempo esgotado" : TIMER_STATUS_LABEL[session.status]}
            </div>
          </div>

          {session.status === "waiting" && (
            <label className="block">
              <span className="text-sm font-medium text-foreground/80">Duração (minutos)</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={duracaoMin}
                onChange={(e) => setDuracaoMin(e.target.value.replace(/[^0-9]/g, ""))}
                className={cn(inputCls, "text-center text-lg tabular")}
              />
            </label>
          )}

          {ativo && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => ajustar(-60)} className={cn(botaoSecundario, "py-2.5 text-sm")}>
                − 1 min
              </button>
              <button onClick={() => ajustar(60)} className={cn(botaoSecundario, "py-2.5 text-sm")}>
                + 1 min
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {session.status === "waiting" && (
              <button onClick={iniciar} className={cn(botaoPrimario, "col-span-2 py-3.5")}>
                <Play className="w-4 h-4" /> Iniciar
              </button>
            )}
            {session.status === "running" && (
              <button onClick={pausar} className={cn(botaoPrimario, "col-span-2 py-3.5")}>
                <Pause className="w-4 h-4" /> Pausar
              </button>
            )}
            {session.status === "paused" && (
              <button onClick={continuar} className={cn(botaoPrimario, "col-span-2 py-3.5")}>
                <Play className="w-4 h-4" /> Continuar
              </button>
            )}
            {session.status !== "waiting" && (
              <button onClick={reiniciar} className={cn(botaoSecundario, session.status === "finished" && "col-span-2")}>
                <RotateCcw className="w-4 h-4" /> Reiniciar
              </button>
            )}
            {ativo && (
              <button onClick={encerrar} className={cn(botaoSecundario, "text-destructive")}>
                <Square className="w-4 h-4" /> Encerrar
              </button>
            )}
          </div>
        </div>
      )}
    </Painel>
  );
}
