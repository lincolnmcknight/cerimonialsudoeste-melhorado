import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileArchive, Loader2, Pencil, Printer, Share2, User2, Film } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  addMinutes,
  dataLonga,
  duracaoTexto,
  estadoDosItens,
  fmtTime,
  tipoLabel,
} from "@/lib/programacao";
import { downloadLouvorJAZip } from "@/lib/louvorja-export";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { BotaoCabecalho, Cabecalho, linkCabecalho } from "@/components/marca";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/programacao/$id")({
  component: Page,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Não foi possível carregar: {error.message}</div>
  ),
});

function Page() {
  const { id } = Route.useParams();
  const { canExport, isStaff, loading: authLoading } = useAuth();
  const now = useNow(30_000);
  const [gerando, setGerando] = useState(false);

  const { data: prog, isLoading } = useQuery({
    queryKey: ["prog-publica", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programacoes")
        .select("id,titulo,data,tipo,horario_inicio,pregador,tema,status,updated_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programacao_itens")
        .select("*")
        .eq("programacao_id", id)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Cabecalho voltar={{ to: "/" }}>
          <div className="h-24" />
        </Cabecalho>
        <div className="max-w-2xl mx-auto px-5 mt-6 space-y-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!prog) {
    return (
      <div className="min-h-dvh bg-background">
        <Cabecalho voltar={{ to: "/" }}>
          <h1 className="font-display text-4xl">Programação não encontrada</h1>
          <p className="text-white/70 mt-2">Ela pode ter sido removida ou ainda não foi publicada.</p>
        </Cabecalho>
      </div>
    );
  }

  const visiveis = (itens ?? []).filter((i) => i.visivel_publico);
  const estados = estadoDosItens(visiveis, prog.data, now);
  const ultimo = visiveis[visiveis.length - 1];
  const fim = ultimo?.horario_estimado ? addMinutes(ultimo.horario_estimado, ultimo.duracao_minutos) : null;

  async function compartilhar() {
    if (!prog) return;
    const url = window.location.href;
    const texto = `${prog.titulo} — ${dataLonga(prog.data)}, às ${fmtTime(prog.horario_inicio)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: prog.titulo, text: texto, url });
        return;
      } catch {
        /* usuário cancelou */
        return;
      }
    }
    await navigator.clipboard.writeText(`${texto}\n${url}`);
    toast.success("Link copiado");
  }

  async function gerarLouvorJA() {
    if (!prog || gerando) return;
    setGerando(true);
    try {
      await downloadLouvorJAZip(
        { titulo: prog.titulo, data: prog.data, tema: prog.tema, pregador: prog.pregador },
        itens ?? [],
      );
      toast.success("Arquivo LouvorJA baixado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o arquivo.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <Cabecalho
        voltar={{ to: "/" }}
        acoes={
          <>
            {!authLoading && isStaff && (
              <Link to="/admin/$id" params={{ id: prog.id }} className={linkCabecalho}>
                <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span>
              </Link>
            )}
            <BotaoCabecalho onClick={() => window.print()} aria-label="Imprimir" className="hidden sm:inline-flex">
              <Printer className="w-4 h-4" />
            </BotaoCabecalho>
            <BotaoCabecalho onClick={compartilhar}>
              <Share2 className="w-4 h-4" /> Compartilhar
            </BotaoCabecalho>
          </>
        }
      >
        <p className="text-sm text-white/65 flex flex-wrap gap-x-3">
          <span>{dataLonga(prog.data)}</span>
          <span className="text-white/45">{tipoLabel(prog.tipo)}</span>
        </p>
        <h1 className="font-display text-[2.6rem] sm:text-5xl leading-[1.05] mt-1.5">{prog.titulo}</h1>
        {prog.tema && <p className="font-display italic text-xl text-white/85 mt-3">“{prog.tema}”</p>}
        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-white/55">Início</dt>
            <dd className="font-display text-2xl tabular">{fmtTime(prog.horario_inicio)}</dd>
          </div>
          {fim && (
            <div>
              <dt className="text-white/55">Término previsto</dt>
              <dd className="font-display text-2xl tabular">{fim}</dd>
            </div>
          )}
          {prog.pregador && (
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-white/55">Pregação</dt>
              <dd className="text-base mt-1">{prog.pregador}</dd>
            </div>
          )}
        </dl>
      </Cabecalho>

      <main className="max-w-2xl mx-auto px-5 mt-8">
        {canExport && (
          <button
            type="button"
            onClick={gerarLouvorJA}
            disabled={gerando}
            className="no-print mb-6 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted transition disabled:opacity-60"
          >
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
            Baixar programa para o LouvorJA
          </button>
        )}

        {visiveis.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
            A ordem do culto será publicada em breve.
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl mb-4">Ordem do culto</h2>
            <ol className="relative">
              <div className="absolute left-[4.5625rem] top-3 bottom-3 w-0.5 trilho rounded" aria-hidden />
              {visiveis.map((it) => {
                const estado = estados[it.id];
                return (
                  <li
                    key={it.id}
                    className={cn("relative grid grid-cols-[3.75rem_1.75rem_1fr] items-start", estado === "passado" && "opacity-55")}
                    aria-current={estado === "agora" ? "step" : undefined}
                  >
                    <div className="pt-3.5 text-right font-display text-xl leading-none tabular text-noite">
                      {fmtTime(it.horario_estimado)}
                    </div>
                    <div className="flex justify-center pt-4">
                      <span
                        className={cn(
                          "w-3 h-3 rounded-full marco relative z-[1]",
                          estado === "agora" && "marco-agora",
                          estado === "passado" && "marco-passado",
                        )}
                      />
                    </div>
                    <div
                      className={cn(
                        "mb-2.5 rounded-xl px-4 py-3",
                        estado === "agora" ? "bg-card border-2 border-gold shadow-sm" : "bg-card border border-border",
                      )}
                    >
                      {estado === "agora" && (
                        <div className="text-xs font-semibold text-[#9a6a12] mb-0.5">Acontecendo agora</div>
                      )}
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="font-medium leading-snug">{it.atividade}</div>
                        <div className="text-xs text-muted-foreground shrink-0 tabular">
                          {duracaoTexto(it.duracao_minutos)}
                        </div>
                      </div>
                      {(it.responsavel || it.midia) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                          {it.responsavel && (
                            <span className="inline-flex items-center gap-1.5">
                              <User2 className="w-3.5 h-3.5" /> {it.responsavel}
                            </span>
                          )}
                          {it.midia && (
                            <span className="inline-flex items-center gap-1.5">
                              <Film className="w-3.5 h-3.5" /> {it.midia}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Atualizada {formatDistanceToNow(parseISO(prog.updated_at), { locale: ptBR, addSuffix: true })}. Os
          horários são estimados.
        </p>
      </main>
    </div>
  );
}
