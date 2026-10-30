import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  HelpCircle,
  Loader2,
  LogOut,
  Monitor,
  Plus,
  Search,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useAuth } from "@/hooks/use-auth";
import { useNotificacoes } from "@/hooks/use-notificacoes";
import { addDaysISO, dataLonga, fmtTime, tipoLabel, todayISO } from "@/lib/programacao";
import { codeForUser } from "@/lib/timer";
import { InstallPWA } from "@/components/InstallPWA";
import {
  BotaoCabecalho,
  Cabecalho,
  Campo,
  Contador,
  Painel,
  botaoPrimario,
  botaoSecundario,
  inputCls,
  linkCabecalho,
} from "@/components/marca";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Painel — Cerimonial Sudoeste" }] }),
  component: AdminHome,
});

type Aba = "proximas" | "rascunhos" | "anteriores";

function AdminHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, roles, canCreate, isStaff, isAdmin, loading, nome } = useAuth();
  const { naoLidas } = useNotificacoes();
  const [aba, setAba] = useState<Aba>("proximas");
  const [busca, setBusca] = useState("");
  const [duplicando, setDuplicando] = useState<{ id: string; titulo: string; data: string } | null>(null);
  const hoje = todayISO();

  const { data: progs, isLoading } = useQuery({
    queryKey: ["admin-progs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programacoes")
        .select("*")
        .order("data", { ascending: false })
        .order("horario_inicio", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isStaff,
  });

  useEffect(() => {
    if (!loading && !isStaff) navigate({ to: "/" });
  }, [loading, isStaff, navigate]);

  const contagem = useMemo(() => {
    const l = progs ?? [];
    return {
      proximas: l.filter((p) => p.data >= hoje).length,
      rascunhos: l.filter((p) => p.status === "rascunho").length,
      anteriores: l.filter((p) => p.data < hoje).length,
    };
  }, [progs, hoje]);

  const lista = useMemo(() => {
    let l = progs ?? [];
    if (aba === "proximas") l = l
        .filter((p) => p.data >= hoje)
        .sort((a, b) => a.data.localeCompare(b.data) || a.horario_inicio.localeCompare(b.horario_inicio));
    if (aba === "rascunhos") l = l.filter((p) => p.status === "rascunho");
    if (aba === "anteriores") l = l.filter((p) => p.data < hoje);
    const q = busca.trim().toLowerCase();
    if (q) {
      l = l.filter((p) =>
        [p.titulo, p.pregador, p.tema, tipoLabel(p.tipo)].some((v) => v?.toLowerCase().includes(q)),
      );
    }
    return l;
  }, [progs, aba, busca, hoje]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading || !isStaff) return null;

  const codigo = user ? codeForUser(user.id) : "";
  const primeiroNome = nome.split(" ")[0];

  return (
    <div className="min-h-dvh bg-background pb-24">
      <InstallPWA />
      <Cabecalho
        largura="max-w-4xl"
        acoes={
          <>
            <Link to="/notificacoes" className={linkCabecalho} aria-label="Notificações">
              <Bell className="w-[18px] h-[18px]" />
              <Contador n={naoLidas} />
            </Link>
            <BotaoCabecalho onClick={logout}>
              <LogOut className="w-4 h-4" /> Sair
            </BotaoCabecalho>
          </>
        }
      >
        <p className="text-sm text-white/65">
          {primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}. Você entra como{" "}
          {roles.length ? roles.map((r) => ROLE_LABEL[r].toLowerCase()).join(" e ") : "editor"}.
        </p>
        <h1 className="font-display text-5xl leading-none mt-2">Programações</h1>
      </Cabecalho>

      <main className="max-w-4xl mx-auto px-5 mt-6 space-y-6">
        {/* Ações principais */}
        <div className="grid gap-3 sm:grid-cols-3">
          {canCreate && (
            <Link to="/admin/nova" className={cn(botaoPrimario, "py-4 text-base")}>
              <Plus className="w-5 h-5" /> Nova programação
            </Link>
          )}
          <a
            href={`/retorno/${codigo}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted transition"
          >
            <Monitor className="w-5 h-5 text-anil shrink-0" />
            <span className="flex-1 min-w-0 leading-tight">
              <span className="block text-sm font-medium">Tela de retorno</span>
              <span className="block text-xs text-muted-foreground">
                Código <span className="font-semibold tracking-[0.2em] text-foreground">{codigo}</span>
              </span>
            </span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
          {isAdmin && (
            <Link
              to="/admin/acessos"
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted transition"
            >
              <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
              <span className="flex-1 text-sm font-medium">Acessos da equipe</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          )}
        </div>

        <details className="group rounded-xl border border-border bg-card/60 px-4 py-3 text-sm">
          <summary className="cursor-pointer list-none flex items-center gap-2 font-medium text-foreground/85">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            Como usar o cronômetro na tela de retorno
            <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground transition group-open:rotate-90" />
          </summary>
          <ol className="list-decimal pl-5 mt-3 space-y-1.5 text-muted-foreground">
            <li>Abra a tela de retorno na TV ou tablet do púlpito e digite o código {codigo}.</li>
            <li>
              Na programação, toque no relógio <Timer className="inline w-3.5 h-3.5 -mt-0.5" /> do item que vai
              começar.
            </li>
            <li>Ajuste a duração se precisar e toque em Iniciar. A tela acompanha em tempo real.</li>
            <li>O código é sempre o mesmo para você: a tela pode ficar aberta o culto inteiro.</li>
          </ol>
        </details>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div role="tablist" className="inline-flex p-1 rounded-xl bg-muted self-start">
            {(
              [
                ["proximas", "Próximas"],
                ["rascunhos", "Rascunhos"],
                ["anteriores", "Anteriores"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={aba === k}
                onClick={() => setAba(k)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-sm transition",
                  aba === k ? "bg-card shadow-sm font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span className="ml-1.5 text-xs text-muted-foreground tabular">{contagem[k]}</span>
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, pregador ou tema"
              aria-label="Buscar"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[76px] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <p className="font-display text-2xl">
              {busca ? "Nada encontrado" : aba === "rascunhos" ? "Nenhum rascunho" : "Nenhuma programação aqui"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {busca
                ? "Tente outro termo de busca."
                : canCreate
                  ? "Crie uma nova ou duplique uma programação anterior."
                  : "Quando liberarem uma programação para você, ela aparece aqui."}
            </p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {lista.map((p) => (
              <li key={p.id} className="flex items-center gap-2 pr-2 hover:bg-muted/50 transition-colors">
                <Link
                  to="/admin/$id"
                  params={{ id: p.id }}
                  className="flex-1 min-w-0 flex items-center gap-4 pl-4 py-3.5"
                >
                  <div className="w-12 shrink-0 text-center">
                    <div className="font-display text-[1.75rem] leading-none text-noite tabular">
                      {format(parseISO(p.data), "dd")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(p.data), "MMM", { locale: ptBR }).replace(".", "")}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium leading-snug break-words">{p.titulo}</span>
                      <StatusSelo status={p.status} hoje={p.data === hoje} />
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5 truncate">
                      {tipoLabel(p.tipo)}, {fmtTime(p.horario_inicio)}
                      {p.pregador ? ` — ${p.pregador}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground/80 mt-0.5">
                      Editada {formatDistanceToNow(parseISO(p.updated_at), { locale: ptBR, addSuffix: true })}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center shrink-0">
                  {p.status === "publicado" && (
                    <Link
                      to="/programacao/$id"
                      params={{ id: p.id }}
                      className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Ver como o público vê"
                      title="Ver como o público vê"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  )}
                  {canCreate && (
                    <button
                      onClick={() => setDuplicando({ id: p.id, titulo: p.titulo, data: p.data })}
                      className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Duplicar"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {duplicando && (
        <DuplicarPainel
          prog={duplicando}
          onClose={() => setDuplicando(null)}
          onDone={(novoId) => {
            setDuplicando(null);
            qc.invalidateQueries({ queryKey: ["admin-progs"] });
            navigate({ to: "/admin/$id", params: { id: novoId } });
          }}
        />
      )}
    </div>
  );
}

function StatusSelo({ status, hoje }: { status: string; hoje: boolean }) {
  return (
    <>
      {hoje && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gold/25 text-[#7a520c]">Hoje</span>}
      <span
        className={cn(
          "text-[11px] font-medium px-2 py-0.5 rounded-full",
          status === "publicado" ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        {status === "publicado" ? "Publicada" : "Rascunho"}
      </span>
    </>
  );
}

function DuplicarPainel({
  prog,
  onClose,
  onDone,
}: {
  prog: { id: string; titulo: string; data: string };
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const [data, setData] = useState(() => {
    // Sugere a mesma data na próxima semana (ou a próxima semana a partir de hoje).
    let d = addDaysISO(prog.data, 7);
    while (d < todayISO()) d = addDaysISO(d, 7);
    return d;
  });
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    if (!data) return;
    setSalvando(true);
    const { data: novoId, error } = await supabase.rpc("duplicar_programacao", {
      _prog_id: prog.id,
      _nova_data: data,
    });
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Cópia criada como rascunho");
    if (novoId) onDone(novoId as string);
  }

  return (
    <Painel
      titulo="Duplicar programação"
      descricao={`Cria um rascunho de “${prog.titulo}” com os mesmos itens, para outra data.`}
      onClose={onClose}
      rodape={
        <div className="flex gap-2">
          <button onClick={onClose} className={cn(botaoSecundario, "flex-1")}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={salvando || !data} className={cn(botaoPrimario, "flex-1")}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            Duplicar
          </button>
        </div>
      }
    >
      <Campo label="Nova data" dica={data ? dataLonga(data) : undefined}>
        <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className={inputCls} />
      </Campo>
    </Painel>
  );
}
