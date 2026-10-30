import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LogIn, Maximize, Minimize, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { mmss, restanteAoVivo, TIMER_STATUS_LABEL, type TimerStatus } from "@/lib/timer";

export const Route = createFileRoute("/retorno/$code")({
  component: RetornoDisplay,
});

interface Session {
  id: string;
  code: string;
  activity_name: string;
  responsible_name: string | null;
  duration_seconds: number;
  remaining_seconds: number;
  status: TimerStatus;
  started_at: string | null;
}

type WakeLock = { release: () => Promise<void> };

function RetornoDisplay() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { user, isStaff, loading: authLoading } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(false);
  const [conexaoOk, setConexaoOk] = useState(true);
  const wakeRef = useRef<WakeLock | null>(null);
  const upper = code.toUpperCase();

  useEffect(() => {
    let alive = true;
    const STORAGE_KEY = `timer_session_${upper}`;

    async function load() {
      const { data, error } = await supabase.rpc("get_timer_session_public", { _code: upper });
      if (!alive) return;
      setConexaoOk(!error);
      if (error) return;
      const row = (Array.isArray(data) ? data[0] : data) as Session | undefined;
      setSession(row ?? null);
      try {
        if (row) localStorage.setItem(STORAGE_KEY, JSON.stringify(row));
      } catch {
        /* armazenamento indisponível */
      }
    }

    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) setSession(JSON.parse(cached));
    } catch {
      /* ignora */
    }

    load();
    const poll = setInterval(load, 1500);
    const tick = setInterval(() => setNow(new Date()), 250);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [upper]);

  // Mantém a tela da TV/tablet acesa enquanto esta página estiver aberta.
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } };
    async function pedir() {
      try {
        if (nav.wakeLock && document.visibilityState === "visible") {
          wakeRef.current = await nav.wakeLock.request("screen");
        }
      } catch {
        /* não suportado */
      }
    }
    pedir();
    const onVis = () => document.visibilityState === "visible" && pedir();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wakeRef.current?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  if (authLoading) {
    return <Tela>Verificando acesso…</Tela>;
  }

  if (!user || !isStaff) {
    return (
      <div className="min-h-dvh bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-[#ff6b5e] mx-auto mb-5" strokeWidth={1.5} />
          <h2 className="text-3xl font-display mb-3">Acesso da equipe</h2>
          <p className="text-white/65 mb-7 leading-relaxed">
            A tela de retorno é usada pela equipe do cerimonial e da técnica. Entre com uma conta que tenha acesso liberado.
          </p>
          {!user ? (
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="w-full py-3 rounded-xl bg-white text-black font-medium inline-flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Entrar
            </button>
          ) : (
            <div className="text-sm text-gold bg-gold/10 p-4 rounded-xl border border-gold/20">
              Sua conta ainda não tem acesso. Peça a um administrador para liberar.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Tela>
        <div className="text-white/60 text-2xl mb-3">Aguardando o painel</div>
        <div className="font-display text-8xl tracking-[0.3em] text-gold">{upper}</div>
        <div className="mt-6 text-white/45 max-w-md mx-auto">
          Abra um item no cronômetro do painel. Esta tela conecta sozinha.
        </div>
      </Tela>
    );
  }

  void now; // força re-render a cada tick
  const restante = restanteAoVivo(session);
  const negativo = restante < 0;
  const rodando = session.status === "running";
  const pct = session.duration_seconds > 0 ? Math.max(0, Math.min(100, (restante / session.duration_seconds) * 100)) : 0;

  const cor = negativo
    ? "#ff5a4f"
    : rodando && restante <= 10
      ? "#ff5a4f"
      : rodando && restante <= 60
        ? "#e8b04b"
        : "#e9e7f5";

  const relogio = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col select-none">
      <div className="px-[4vw] pt-[3vh] flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-white/45 flex items-center gap-3" style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.5rem)" }}>
            <span
              className={`inline-block w-3 h-3 rounded-full ${rodando ? "bg-[#4ade80] animate-pulse" : "bg-white/30"}`}
            />
            {negativo ? "Tempo esgotado" : TIMER_STATUS_LABEL[session.status]}
            {!conexaoOk && <span className="text-[#ff5a4f]">— sem conexão</span>}
          </div>
          <h1 className="font-display leading-[1.05] mt-2 break-words" style={{ fontSize: "clamp(2.5rem, 5.5vw, 6rem)" }}>
            {session.activity_name || "—"}
          </h1>
          {session.responsible_name && (
            <div className="text-white/60 mt-1" style={{ fontSize: "clamp(1.25rem, 2.4vw, 2.5rem)" }}>
              {session.responsible_name}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-display tabular text-white/80" style={{ fontSize: "clamp(2rem, 4vw, 4.5rem)" }}>
            {relogio}
          </div>
          <button
            onClick={alternarTelaCheia}
            className="mt-2 inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/80 px-2 py-1 rounded-lg"
          >
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            {fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className={`font-display leading-none tabular transition-colors ${negativo ? "animate-pulse" : ""}`}
          style={{ color: cor, fontSize: "min(30vw, 62vh)" }}
          aria-live="off"
        >
          {mmss(restante)}
        </div>
      </div>

      <div className="px-[4vw] pb-[4vh] flex items-center gap-6">
        <div className="h-3 flex-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: cor }} />
        </div>
        <div className="font-display text-2xl tracking-[0.3em] text-white/35">{session.code}</div>
      </div>
    </div>
  );
}

function Tela({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-black text-white flex items-center justify-center p-8 text-center">
      <div>{children}</div>
    </div>
  );
}
