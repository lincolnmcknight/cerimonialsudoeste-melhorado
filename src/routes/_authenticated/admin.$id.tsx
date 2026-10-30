import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BellRing,
  Copy,
  Eye,
  EyeOff,
  FileArchive,
  GripVertical,
  Loader2,
  MessageSquareText,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Timer,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClearableInput } from "@/components/ClearableInput";
import { TimerControlDialog } from "@/components/TimerControlDialog";
import {
  ITENS_COMUNS,
  TIPOS_CULTO,
  addMinutes,
  dataLonga,
  duracaoTexto,
  fmtTime,
  recalcularHorarios,
  type TipoCulto,
} from "@/lib/programacao";
import { downloadLouvorJAZip } from "@/lib/louvorja-export";
import { useAuth } from "@/hooks/use-auth";
import {
  BotaoCabecalho,
  Cabecalho,
  Campo,
  Confirmar,
  Painel,
  botaoMarca,
  botaoPrimario,
  botaoSecundario,
  inputCls,
  linkCabecalho,
} from "@/components/marca";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/$id")({
  head: () => ({ meta: [{ title: "Editar programação — Cerimonial Sudoeste" }] }),
  component: Editor,
});

interface Item {
  id: string;
  programacao_id: string;
  ordem: number;
  atividade: string;
  midia: string | null;
  responsavel: string | null;
  duracao_minutos: number;
  horario_estimado: string | null;
  horario_real: string | null;
  observacao: string | null;
  visivel_publico: boolean;
}

function Editor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { canCreate } = useAuth();
  const [showMeta, setShowMeta] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [timerItem, setTimerItem] = useState<Item | null>(null);
  const [excluindoItem, setExcluindoItem] = useState<Item | null>(null);
  const [askNotify, setAskNotify] = useState<null | "publicada" | "atualizada">(null);
  const [gerando, setGerando] = useState(false);
  const [publicando, setPublicando] = useState(false);

  const { data: prog, isLoading: carregandoProg } = useQuery({
    queryKey: ["prog", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("programacoes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: itensRaw } = useQuery({
    queryKey: ["itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programacao_itens")
        .select("*")
        .eq("programacao_id", id)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const [itens, setItens] = useState<Item[]>([]);
  const inicio = prog?.horario_inicio?.slice(0, 5) ?? "09:00";

  useEffect(() => {
    if (itensRaw && prog) setItens(recalcularHorarios(itensRaw, prog.horario_inicio));
  }, [itensRaw, prog]);

  const totalMin = useMemo(() => itens.reduce((s, i) => s + i.duracao_minutos, 0), [itens]);
  const termino = itens.length ? addMinutes(inicio, totalMin) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function atualizarLista() {
    qc.invalidateQueries({ queryKey: ["itens", id] });
    qc.invalidateQueries({ queryKey: ["prog", id] });
  }

  /**
   * Grava a ordem e recalcula os horários. Usa a função `reordenar_itens`
   * (uma chamada só). Se a migração ainda não foi aplicada, cai no modo
   * antigo (um update por item).
   */
  async function salvarOrdem(lista: Item[], inicioOverride?: string) {
    const { error } = await supabase.rpc("reordenar_itens", {
      _prog_id: id,
      _ids: lista.map((i) => i.id),
    });
    if (!error) return;
    const semFuncao = error.code === "PGRST202" || /reordenar_itens/i.test(error.message);
    if (!semFuncao) {
      toast.error(error.message);
      return;
    }
    const recalculado = recalcularHorarios(
      lista.map((it, idx) => ({ ...it, ordem: idx })),
      inicioOverride ?? inicio,
    );
    await Promise.all(
      recalculado.map((it) =>
        supabase
          .from("programacao_itens")
          .update({ ordem: it.ordem, horario_estimado: it.horario_estimado })
          .eq("id", it.id),
      ),
    );
  }

  async function recalcular() {
    await salvarOrdem(itens);
    atualizarLista();
    toast.success("Horários recalculados");
  }

  async function gerarLouvorJA() {
    if (!prog || gerando) return;
    setGerando(true);
    try {
      await downloadLouvorJAZip(
        { titulo: prog.titulo, data: prog.data, tema: prog.tema, pregador: prog.pregador },
        itens,
      );
      toast.success("Arquivo LouvorJA baixado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o arquivo.");
    } finally {
      setGerando(false);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = itens.findIndex((i) => i.id === active.id);
    const newIdx = itens.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(itens, oldIdx, newIdx).map((it, i) => ({ ...it, ordem: i }));
    setItens(recalcularHorarios(reordered, inicio));
    salvarOrdem(reordered).then(atualizarLista);
  }

  async function addItem(atividade = "Novo item", duracao = 5, abrir = true) {
    const ult = itens[itens.length - 1];
    const horario = ult ? addMinutes(ult.horario_estimado ?? inicio, ult.duracao_minutos) : inicio;
    const { data, error } = await supabase
      .from("programacao_itens")
      .insert({
        programacao_id: id,
        ordem: itens.length,
        atividade,
        duracao_minutos: duracao,
        horario_estimado: horario,
        visivel_publico: true,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setItens((l) => [...l, data as Item]);
    atualizarLista();
    if (abrir) setEditingItem(data as Item);
    else toast.success(`“${atividade}” adicionado`);
  }

  async function deleteItem(it: Item) {
    const { error } = await supabase.from("programacao_itens").delete().eq("id", it.id);
    if (error) return toast.error(error.message);
    const restantes = itens.filter((i) => i.id !== it.id);
    setItens(recalcularHorarios(restantes, inicio));
    await salvarOrdem(restantes);
    atualizarLista();
    toast.success("Item excluído");
  }

  async function duplicateItem(it: Item) {
    const idx = itens.findIndex((i) => i.id === it.id);
    const { data: novo, error } = await supabase
      .from("programacao_itens")
      .insert({
        programacao_id: id,
        ordem: it.ordem + 1,
        atividade: `${it.atividade} (cópia)`,
        midia: it.midia,
        responsavel: it.responsavel,
        duracao_minutos: it.duracao_minutos,
        observacao: it.observacao,
        visivel_publico: it.visivel_publico,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    const lista = [...itens];
    lista.splice(idx + 1, 0, novo as Item);
    setItens(recalcularHorarios(lista.map((x, i) => ({ ...x, ordem: i })), inicio));
    await salvarOrdem(lista);
    atualizarLista();
  }

  async function toggleVisibilidade(it: Item) {
    setItens((l) => l.map((x) => (x.id === it.id ? { ...x, visivel_publico: !x.visivel_publico } : x)));
    const { error } = await supabase
      .from("programacao_itens")
      .update({ visivel_publico: !it.visivel_publico })
      .eq("id", it.id);
    if (error) toast.error(error.message);
    atualizarLista();
  }

  async function togglePublicar() {
    if (!prog) return;
    setPublicando(true);
    const novoStatus = prog.status === "publicado" ? "rascunho" : "publicado";
    const { data, error } = await supabase
      .from("programacoes")
      .update({ status: novoStatus })
      .eq("id", id)
      .select("id, status");
    setPublicando(false);
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) {
      return toast.error("Você não pode publicar esta programação.", {
        description: "Peça a um administrador o perfil de cerimonialista ou acesso a esta programação.",
      });
    }
    qc.invalidateQueries({ queryKey: ["prog", id] });
    qc.invalidateQueries({ queryKey: ["admin-progs"] });
    if (novoStatus === "publicado") {
      toast.success("Programação publicada");
      if (canCreate) setAskNotify("publicada");
    } else {
      toast.success("Programação voltou para rascunho");
    }
  }

  async function notificar(tipo: "publicada" | "atualizada") {
    const { data, error } = await supabase.rpc("notificar_programacao", { _prog_id: id, _tipo: tipo });
    setAskNotify(null);
    if (error) return toast.error(error.message);
    toast.success(`Aviso enviado para ${data ?? 0} pessoa(s)`);
  }

  if (carregandoProg) {
    return (
      <div className="min-h-dvh bg-background">
        <Cabecalho voltar={{ to: "/admin", label: "Programações" }} largura="max-w-5xl">
          <div className="h-20" />
        </Cabecalho>
      </div>
    );
  }
  if (!prog) {
    return (
      <div className="min-h-dvh bg-background">
        <Cabecalho voltar={{ to: "/admin", label: "Programações" }} largura="max-w-5xl">
          <h1 className="font-display text-4xl">Programação não encontrada</h1>
        </Cabecalho>
      </div>
    );
  }

  const publicada = prog.status === "publicado";
  const ocultos = itens.filter((i) => !i.visivel_publico).length;

  const ferramentas = (
    <div className="space-y-2">
      <button onClick={recalcular} className={cn(botaoSecundario, "w-full justify-start text-sm py-2.5")}>
        <RefreshCw className="w-4 h-4 text-muted-foreground" /> Recalcular horários
      </button>
      <button
        onClick={gerarLouvorJA}
        disabled={gerando || itens.length === 0}
        className={cn(botaoSecundario, "w-full justify-start text-sm py-2.5")}
        title="Baixa um ZIP com um arquivo .txt por item, pronto para o LouvorJA"
      >
        {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4 text-muted-foreground" />}
        Baixar para o LouvorJA
      </button>
      {publicada && (
        <Link
          to="/programacao/$id"
          params={{ id }}
          className={cn(botaoSecundario, "w-full justify-start text-sm py-2.5")}
        >
          <Eye className="w-4 h-4 text-muted-foreground" /> Ver como o público vê
        </Link>
      )}
      <p className="text-xs text-muted-foreground px-1 pt-1 leading-relaxed">
        Os horários são calculados pela ordem e pela duração de cada item, a partir do início do culto.
        {ocultos > 0 && ` ${ocultos} ${ocultos === 1 ? "item está oculto" : "itens estão ocultos"} para o público.`}
      </p>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <Cabecalho
        voltar={{ to: "/admin", label: "Programações" }}
        largura="max-w-5xl"
        acoes={
          <BotaoCabecalho onClick={() => setShowMeta(true)}>
            <Settings2 className="w-4 h-4" /> Dados do culto
          </BotaoCabecalho>
        }
      >
        <span
          className={cn(
            "inline-block text-xs font-medium px-2.5 py-1 rounded-full",
            publicada ? "bg-[#4ade80]/15 text-[#a7f3c4]" : "bg-white/10 text-white/75",
          )}
        >
          {publicada ? "Publicada" : "Rascunho, visível só para a equipe"}
        </span>
        <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mt-3">{prog.titulo}</h1>
        <p className="text-white/70 mt-2">
          {dataLonga(prog.data)}, das {inicio}
          {termino ? ` às ${termino}` : ""}
          <span className="text-white/45">
            {" "}
            ({itens.length} {itens.length === 1 ? "item" : "itens"}
            {totalMin ? `, ${duracaoTexto(totalMin)}` : ""})
          </span>
        </p>
        {(prog.pregador || prog.tema) && (
          <p className="text-white/60 text-sm mt-1">
            {[prog.pregador && `Pregação: ${prog.pregador}`, prog.tema && `Tema: ${prog.tema}`].filter(Boolean).join(". ")}
          </p>
        )}
      </Cabecalho>

      <main className="max-w-5xl mx-auto px-4 sm:px-5 mt-6 pb-48 lg:grid lg:grid-cols-[1fr_17rem] lg:gap-8">
        <section aria-label="Ordem do culto">
          {itens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <p className="font-display text-2xl">A ordem do culto está vazia</p>
              <p className="text-sm text-muted-foreground mt-1">
                Comece pelos atalhos abaixo ou adicione um item em branco.
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {itens.map((it) => (
                    <SortableItem
                      key={it.id}
                      item={it}
                      onEdit={() => setEditingItem(it)}
                      onDelete={() => setExcluindoItem(it)}
                      onToggleVis={() => toggleVisibilidade(it)}
                      onDuplicate={() => duplicateItem(it)}
                      onTimer={() => setTimerItem(it)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          <button
            onClick={() => addItem()}
            className="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-anil hover:text-anil inline-flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Adicionar item
          </button>

          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-2">Atalhos: toque para adicionar ao fim</div>
            <div className="flex flex-wrap gap-1.5">
              {ITENS_COMUNS.map((c) => (
                <button
                  key={c.atividade}
                  onClick={() => addItem(c.atividade, c.duracao, false)}
                  className="px-3 py-1.5 rounded-full border border-border bg-card text-sm hover:border-anil/50 hover:text-anil transition"
                >
                  {c.atividade}
                  <span className="text-muted-foreground ml-1.5 text-xs">{c.duracao}′</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 lg:hidden">{ferramentas}</div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-6">{ferramentas}</div>
        </aside>
      </main>

      {/* Barra de publicação */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border px-4 pt-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:justify-end gap-2">
          {publicada && canCreate && (
            <button onClick={() => setAskNotify("atualizada")} className={cn(botaoMarca, "sm:w-auto")}>
              <BellRing className="w-4 h-4" /> Avisar sobre alterações
            </button>
          )}
          <button
            onClick={togglePublicar}
            disabled={publicando}
            className={cn(publicada ? botaoSecundario : botaoPrimario, "sm:min-w-56")}
          >
            {publicando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : publicada ? (
              <Undo2 className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {publicada ? "Voltar para rascunho" : "Publicar programação"}
          </button>
        </div>
      </div>

      {editingItem && (
        <ItemPainel
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onDelete={() => {
            setExcluindoItem(editingItem);
            setEditingItem(null);
          }}
          onSaved={async (mudouDuracao, atualizado) => {
            setEditingItem(null);
            if (mudouDuracao) {
              const lista = itens.map((i) => (i.id === atualizado.id ? atualizado : i));
              setItens(recalcularHorarios(lista, inicio));
              await salvarOrdem(lista);
            }
            atualizarLista();
          }}
        />
      )}

      {showMeta && (
        <MetaPainel
          prog={prog}
          podeExcluir={canCreate}
          onClose={() => setShowMeta(false)}
          onSaved={async (novoInicio) => {
            setShowMeta(false);
            if (novoInicio) await salvarOrdem(itens, novoInicio);
            atualizarLista();
            qc.invalidateQueries({ queryKey: ["admin-progs"] });
          }}
          onDeleted={() => {
            qc.invalidateQueries({ queryKey: ["admin-progs"] });
            navigate({ to: "/admin" });
          }}
        />
      )}

      {timerItem && <TimerControlDialog item={timerItem} onClose={() => setTimerItem(null)} />}

      <Confirmar
        aberto={!!excluindoItem}
        titulo="Excluir item?"
        descricao={
          <>
            “{excluindoItem?.atividade}” sai da programação e os horários seguintes são recalculados.
          </>
        }
        acao="Excluir"
        perigoso
        onClose={() => setExcluindoItem(null)}
        onConfirm={() => {
          if (excluindoItem) deleteItem(excluindoItem);
          setExcluindoItem(null);
        }}
      />

      <Confirmar
        aberto={!!askNotify}
        titulo={askNotify === "publicada" ? "Avisar a igreja?" : "Avisar sobre as alterações?"}
        descricao={
          askNotify === "publicada"
            ? "A programação já está no ar. Quer mandar um aviso para quem tem conta no app?"
            : "Quem tem conta no app recebe um aviso de que esta programação mudou."
        }
        acao="Enviar aviso"
        onClose={() => setAskNotify(null)}
        onConfirm={() => askNotify && notificar(askNotify)}
      />
    </div>
  );
}

function SortableItem({
  item,
  onEdit,
  onDelete,
  onToggleVis,
  onDuplicate,
  onTimer,
}: {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVis: () => void;
  onDuplicate: () => void;
  onTimer: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  } as React.CSSProperties;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative bg-card border border-border rounded-xl flex items-stretch",
        isDragging ? "shadow-2xl ring-2 ring-anil" : "",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="pl-1.5 pr-1 flex items-center text-muted-foreground/60 hover:text-foreground touch-none cursor-grab active:cursor-grabbing"
        aria-label={`Arrastar ${item.atividade}`}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <button
        onClick={onEdit}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex-1 min-w-0 text-left py-3 pr-2 flex gap-3"
      >
        <div className="w-12 shrink-0 pt-0.5">
          <div className="font-display text-xl leading-none text-noite tabular">{fmtTime(item.horario_estimado)}</div>
          <div className="text-xs text-muted-foreground mt-1 tabular">{item.duracao_minutos} min</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("font-medium leading-snug break-words", !item.visivel_publico && "text-muted-foreground")}>
            {item.atividade}
          </div>
          {(item.responsavel || item.midia) && (
            <div className="text-sm text-muted-foreground mt-0.5 truncate">
              {[item.responsavel, item.midia].filter(Boolean).join(" — ")}
            </div>
          )}
          {(!item.visivel_publico || item.observacao || item.horario_real) && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {!item.visivel_publico && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  <EyeOff className="w-3 h-3" /> Só a equipe vê
                </span>
              )}
              {item.observacao && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-anil/10 text-anil max-w-full">
                  <MessageSquareText className="w-3 h-3 shrink-0" />
                  <span className="truncate">{item.observacao}</span>
                </span>
              )}
              {item.horario_real && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-[#7a520c]">
                  Real {fmtTime(item.horario_real)}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      <div className="flex items-center gap-0.5 pr-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <button
          onClick={onTimer}
          className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-anil"
          aria-label={`Cronômetro de ${item.atividade}`}
          title="Abrir no cronômetro"
        >
          <Timer className="w-[18px] h-[18px]" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-[18px] h-[18px]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleVis}>
              {item.visivel_publico ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {item.visivel_publico ? "Ocultar do público" : "Mostrar ao público"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function ItemPainel({
  item,
  onClose,
  onSaved,
  onDelete,
}: {
  item: Item;
  onClose: () => void;
  onSaved: (mudouDuracao: boolean, atualizado: Item) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState(item);
  const [saving, setSaving] = useState(false);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.atividade.trim()) return toast.error("Dê um nome para a atividade.");
    setSaving(true);
    const duracao = Math.max(1, Number(form.duracao_minutos) || 1);
    const patch = {
      atividade: form.atividade.trim(),
      midia: form.midia?.trim() || null,
      responsavel: form.responsavel?.trim() || null,
      duracao_minutos: duracao,
      horario_real: form.horario_real || null,
      observacao: form.observacao?.trim() || null,
      visivel_publico: form.visivel_publico,
    };
    const { error } = await supabase.from("programacao_itens").update(patch).eq("id", item.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    onSaved(duracao !== item.duracao_minutos, { ...item, ...patch });
  }

  return (
    <Painel
      titulo="Item da programação"
      onClose={onClose}
      rodape={
        <div className="flex gap-2">
          <button onClick={onDelete} className={cn(botaoSecundario, "text-destructive px-3.5")} aria-label="Excluir item">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => save()} disabled={saving} className={cn(botaoPrimario, "flex-1")}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar item
          </button>
        </div>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <Campo label="Atividade">
          <ClearableInput
            autoFocus={item.atividade === "Novo item"}
            value={form.atividade}
            onChange={(e) => setForm({ ...form, atividade: e.target.value })}
            className={inputCls}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Duração (min)">
            <div className="flex items-center gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => setForm({ ...form, duracao_minutos: Math.max(1, form.duracao_minutos - 1) })}
                className="w-10 h-[42px] rounded-xl border border-input text-lg hover:bg-muted"
                aria-label="Menos um minuto"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.duracao_minutos}
                onChange={(e) => setForm({ ...form, duracao_minutos: Number(e.target.value) })}
                className={cn(inputCls, "mt-0 text-center tabular px-1")}
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, duracao_minutos: form.duracao_minutos + 1 })}
                className="w-10 h-[42px] rounded-xl border border-input text-lg hover:bg-muted"
                aria-label="Mais um minuto"
              >
                +
              </button>
            </div>
          </Campo>
          <Campo label="Horário real" dica="Quando de fato começou">
            <input
              type="time"
              value={form.horario_real?.slice(0, 5) ?? ""}
              onChange={(e) => setForm({ ...form, horario_real: e.target.value })}
              className={inputCls}
            />
          </Campo>
        </div>
        <Campo label="Responsável">
          <ClearableInput
            value={form.responsavel ?? ""}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            className={inputCls}
            placeholder="Quem conduz este momento"
          />
        </Campo>
        <Campo label="Mídia">
          <ClearableInput
            value={form.midia ?? ""}
            onChange={(e) => setForm({ ...form, midia: e.target.value })}
            className={inputCls}
            placeholder="Ex.: vídeo, slide, hino 123"
          />
        </Campo>
        <Campo label="Observação interna" dica="Só a equipe vê. Vai também no arquivo do LouvorJA.">
          <textarea
            value={form.observacao ?? ""}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            rows={3}
            className={inputCls}
          />
        </Campo>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
          <span>
            <span className="block text-sm font-medium">Mostrar para o público</span>
            <span className="block text-xs text-muted-foreground">Desligado, só a equipe vê este item.</span>
          </span>
          <Switch
            checked={form.visivel_publico}
            onCheckedChange={(v) => setForm({ ...form, visivel_publico: v })}
          />
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Painel>
  );
}

function MetaPainel({
  prog,
  podeExcluir,
  onClose,
  onSaved,
  onDeleted,
}: {
  prog: {
    id: string;
    titulo: string;
    data: string;
    tipo: string;
    pregador: string | null;
    tema: string | null;
    horario_inicio: string;
  };
  podeExcluir: boolean;
  onClose: () => void;
  onSaved: (novoInicio?: string) => void;
  onDeleted: () => void;
}) {
  const inicioOriginal = prog.horario_inicio?.slice(0, 5) ?? "09:00";
  const [form, setForm] = useState({
    titulo: prog.titulo,
    data: prog.data,
    tipo: prog.tipo as TipoCulto,
    pregador: prog.pregador ?? "",
    tema: prog.tema ?? "",
    horario_inicio: inicioOriginal,
  });
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  async function save() {
    if (!form.titulo.trim()) return toast.error("O título não pode ficar vazio.");
    setSalvando(true);
    const { error } = await supabase
      .from("programacoes")
      .update({
        ...form,
        titulo: form.titulo.trim(),
        pregador: form.pregador.trim() || null,
        tema: form.tema.trim() || null,
      })
      .eq("id", prog.id);
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Dados salvos");
    onSaved(form.horario_inicio !== inicioOriginal ? form.horario_inicio : undefined);
  }

  async function excluir() {
    const { error } = await supabase.from("programacoes").delete().eq("id", prog.id);
    if (error) return toast.error(error.message);
    toast.success("Programação excluída");
    onDeleted();
  }

  return (
    <Painel
      titulo="Dados do culto"
      onClose={onClose}
      rodape={
        <button onClick={save} disabled={salvando} className={cn(botaoPrimario, "w-full")}>
          {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar dados
        </button>
      }
    >
      <div className="space-y-4">
        <Campo label="Título">
          <ClearableInput value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={inputCls} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Data">
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={inputCls} />
          </Campo>
          <Campo label="Início" dica="Os horários dos itens acompanham">
            <input
              type="time"
              value={form.horario_inicio}
              onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })}
              className={inputCls}
            />
          </Campo>
        </div>
        <Campo label="Tipo de culto">
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCulto })}
            className={inputCls}
          >
            {TIPOS_CULTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Pregador">
          <ClearableInput value={form.pregador} onChange={(e) => setForm({ ...form, pregador: e.target.value })} className={inputCls} />
        </Campo>
        <Campo label="Tema">
          <ClearableInput value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} className={inputCls} />
        </Campo>

        {podeExcluir && (
          <div className="pt-4 mt-2 border-t border-border">
            <button
              onClick={() => setConfirmarExclusao(true)}
              className="w-full py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/8 inline-flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Excluir programação
            </button>
          </div>
        )}
      </div>

      <Confirmar
        aberto={confirmarExclusao}
        titulo="Excluir programação?"
        descricao={`“${prog.titulo}” e todos os itens serão apagados. Não dá para desfazer.`}
        acao="Excluir"
        perigoso
        onClose={() => setConfirmarExclusao(false)}
        onConfirm={excluir}
      />
    </Painel>
  );
}
