import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, ChevronRight, LogIn, LogOut, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  addMinutes,
  dataLonga,
  estadoDosItens,
  fmtTime,
  tipoLabel,
  todayISO,
} from "@/lib/programacao";
import { useAuth } from "@/hooks/use-auth";
import { useNotificacoes } from "@/hooks/use-notificacoes";
import { useNow } from "@/hooks/use-now";
import { InstallPWA } from "@/components/InstallPWA";
import {
  BotaoCabecalho,
  Cabecalho,
  Contador,
  IconeWhatsApp,
  WHATSAPP_CERIMONIAL,
  linkCabecalho,
} from "@/components/marca";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cerimonial Sudoeste — Programação dos cultos" },
      {
        name: "description",
        content: "Cerimonial Sudoeste: a programação do culto de hoje e dos próximos encontros.",
      },
    ],
  }),
  component: Home,
});

const CAMPOS = "id,titulo,data,tipo,horario_inicio,pregador,tema,status,updated_at";

function Home() {
  const now = useNow(30_000);
  const today = todayISO(now);
  const navigate = useNavigate();
  const { user, isStaff, loading } = useAuth();
  const { naoLidas } = useNotificacoes();

  // Equipe logada vai direto para o painel (comportamento original).
  useEffect(() => {
    if (!loading && user && isStaff) navigate({ to: "/admin", replace: true });
  }, [user, isStaff, loading, navigate]);

  const { data: progs, isLoading } = useQuery({
    queryKey: ["prog-publicas", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programacoes")
        .select(CAMPOS)
        .eq("status", "publicado")
        .gte("data", today)
        .order("data")
        .order("horario_inicio")
        .limit(13);
      if (error) throw error;
      return data ?? [];
    },
  });

  const hoje = (progs ?? []).filter((p) => p.data === today);
  const proximas = (progs ?? []).filter((p) => p.data > today).slice(0, 12);

  const { data: itensHoje } = useQuery({
    queryKey: ["itens-hoje", hoje.map((p) => p.id).join(",")],
    enabled: hoje.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programacao_itens")
        .select("id,programacao_id,ordem,atividade,responsavel,duracao_minutos,horario_estimado")
        .in(
          "programacao_id",
          hoje.map((p) => p.id),
        )
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-dvh bg-background pb-24">
      <InstallPWA />
      <Cabecalho
        acoes={
          !loading &&
          (user ? (
            <>
              <Link to="/notificacoes" className={linkCabecalho} aria-label="Notificações">
                <Bell className="w-[18px] h-[18px]" />
                <Contador n={naoLidas} />
              </Link>
              <BotaoCabecalho onClick={() => supabase.auth.signOut()}>
                <LogOut className="w-4 h-4" /> Sair
              </BotaoCabecalho>
            </>
          ) : (
            <Link to="/auth" className={linkCabecalho}>
              <LogIn className="w-4 h-4" /> Entrar
            </Link>
          ))
        }
      >
        <p className="text-sm text-white/65">{dataLonga(today)}</p>
        <h1 className="font-display text-[2.9rem] sm:text-6xl leading-[1.02] mt-1.5">
          Programação
          <br />
          dos cultos
        </h1>
        <p className="text-white/70 mt-3 max-w-sm">
          A ordem de cada culto, com horários e responsáveis, sempre atualizada pela equipe do cerimonial.
        </p>
      </Cabecalho>

      <main className="max-w-2xl mx-auto px-5 mt-7 space-y-9">
        {isLoading && <Esqueleto />}

        {hoje.length > 0 && (
          <section aria-labelledby="t-hoje" className="space-y-3">
            <h2 id="t-hoje" className="font-display text-2xl">
              Hoje
            </h2>
            {hoje.map((p) => {
              const itens = (itensHoje ?? []).filter((i) => i.programacao_id === p.id);
              return <CartaoHoje key={p.id} prog={p} itens={itens} now={now} />;
            })}
          </section>
        )}

        {proximas.length > 0 && (
          <section aria-labelledby="t-prox">
            <h2 id="t-prox" className="font-display text-2xl mb-3">
              {hoje.length > 0 ? "Próximos" : "Próximos cultos"}
            </h2>
            <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {proximas.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/programacao/$id"
                    params={{ id: p.id }}
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/60 transition-colors"
                  >
                    <DataBloco iso={p.data} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium leading-snug break-words">{p.titulo}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {tipoLabel(p.tipo)}, {fmtTime(p.horario_inicio)}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!isLoading && hoje.length === 0 && proximas.length === 0 && (
          <section className="bg-card border border-border rounded-2xl px-6 py-10 text-center">
            <CalendarPlus className="w-9 h-9 text-muted-foreground/70 mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="font-display text-2xl">Nenhuma programação publicada</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
              Assim que o cerimonial publicar o próximo culto, ele aparece aqui.
              {user ? " Você também recebe um aviso." : " Entre para receber um aviso."}
            </p>
          </section>
        )}

        <a
          href={WHATSAPP_CERIMONIAL.link}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-[#25d366]/50 transition-colors"
        >
          <span className="w-11 h-11 rounded-full bg-[#25d366]/12 text-[#128c4b] flex items-center justify-center shrink-0">
            <IconeWhatsApp className="w-6 h-6" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-medium">Vai participar de um culto?</span>
            <span className="block text-sm text-muted-foreground">
              Envie suas informações para a cerimonialista {WHATSAPP_CERIMONIAL.nome} pelo WhatsApp.
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </a>
      </main>
    </div>
  );
}

function DataBloco({ iso }: { iso: string }) {
  const d = parseISO(iso);
  return (
    <div className="w-12 shrink-0 text-center">
      <div className="font-display text-[1.75rem] leading-none text-noite tabular">{format(d, "dd")}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {format(d, "EEE", { locale: ptBR }).replace(".", "")}
      </div>
    </div>
  );
}

interface ItemHoje {
  id: string;
  atividade: string;
  responsavel: string | null;
  duracao_minutos: number;
  horario_estimado: string | null;
}

function CartaoHoje({
  prog,
  itens,
  now,
}: {
  prog: { id: string; titulo: string; tipo: string; horario_inicio: string; tema: string | null; pregador: string | null; data: string };
  itens: ItemHoje[];
  now: Date;
}) {
  const estados = estadoDosItens(itens, prog.data, now);
  const atual = itens.find((i) => estados[i.id] === "agora");
  const ultimo = itens[itens.length - 1];
  const fim = ultimo?.horario_estimado ? addMinutes(ultimo.horario_estimado, ultimo.duracao_minutos) : null;
  const terminou = itens.length > 0 && itens.every((i) => estados[i.id] === "passado");

  let status: React.ReactNode = <>Começa às {fmtTime(prog.horario_inicio)}</>;
  if (atual) {
    status = (
      <>
        <span className="inline-block w-2 h-2 rounded-full bg-gold mr-2 align-middle animate-pulse" />
        Agora: <strong className="font-semibold text-white">{atual.atividade}</strong>
        {atual.responsavel ? `, com ${atual.responsavel}` : ""}
      </>
    );
  } else if (terminou && fim) {
    status = <>Encerrado por volta das {fim}</>;
  }

  return (
    <Link
      to="/programacao/$id"
      params={{ id: prog.id }}
      className="block rounded-2xl overflow-hidden bg-noite text-white shadow-[0_18px_40px_-20px_rgb(27_19_64/0.6)] group"
    >
      <div className="h-1 bg-gradient-to-r from-[#b8336a] via-[#6a2c86] to-[#2b4ea2]" aria-hidden />
      <div className="p-5">
        <div className="text-sm text-white/60">
          {tipoLabel(prog.tipo)}, às {fmtTime(prog.horario_inicio)}
          {fim ? ` até ${fim}` : ""}
        </div>
        <div className="font-display text-[2rem] leading-tight mt-1">{prog.titulo}</div>
        {prog.tema && <div className="font-display italic text-lg text-white/80 mt-1">“{prog.tema}”</div>}
        {prog.pregador && <div className="text-sm text-white/65 mt-2">Pregação: {prog.pregador}</div>}
        <div className="mt-5 pt-4 border-t border-white/12 flex items-center justify-between gap-3">
          <div className="text-sm text-white/80 min-w-0">{status}</div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-white shrink-0 group-hover:gap-2 transition-all">
            Ver a ordem <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-40 rounded-2xl bg-muted animate-pulse" />
      <div className="h-16 rounded-2xl bg-muted animate-pulse" />
      <div className="h-16 rounded-2xl bg-muted animate-pulse" />
    </div>
  );
}
