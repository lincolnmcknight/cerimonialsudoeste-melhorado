import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TIPOS_CULTO, dataLonga, tipoInfo, todayISO, type TipoCulto } from "@/lib/programacao";
import { Cabecalho, Campo, botaoPrimario, inputCls } from "@/components/marca";
import { ClearableInput } from "@/components/ClearableInput";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/nova")({
  head: () => ({ meta: [{ title: "Nova programação — Cerimonial Sudoeste" }] }),
  component: Nova,
});

function Nova() {
  const navigate = useNavigate();
  const [tituloEditado, setTituloEditado] = useState(false);
  const [form, setForm] = useState({
    titulo: "Culto de Sábado",
    data: todayISO(),
    tipo: "sabado_manha" as TipoCulto,
    pregador: "",
    tema: "",
    horario_inicio: "09:00",
  });
  const [loading, setLoading] = useState(false);

  function escolherTipo(tipo: TipoCulto) {
    const info = tipoInfo(tipo);
    setForm((f) => ({
      ...f,
      tipo,
      horario_inicio: info?.inicio ?? f.horario_inicio,
      titulo: tituloEditado ? f.titulo : (info?.titulo ?? f.titulo),
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("programacoes")
      .insert({
        ...form,
        titulo: form.titulo.trim(),
        pregador: form.pregador.trim() || null,
        tema: form.tema.trim() || null,
        criado_por: userData.user?.id,
        status: "rascunho",
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/admin/$id", params: { id: data.id } });
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <Cabecalho voltar={{ to: "/admin", label: "Programações" }}>
        <h1 className="font-display text-5xl leading-none">Nova programação</h1>
        <p className="text-white/70 mt-3">Preencha o básico agora. A ordem do culto você monta na próxima tela.</p>
      </Cabecalho>

      <main className="max-w-2xl mx-auto px-5 mt-6">
        <form onSubmit={save} className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-5">
          <fieldset>
            <legend className="text-sm font-medium text-foreground/80 mb-2">Tipo de culto</legend>
            <div className="flex flex-wrap gap-2">
              {TIPOS_CULTO.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => escolherTipo(t.value)}
                  aria-pressed={form.tipo === t.value}
                  className={cn(
                    "px-3.5 py-2 rounded-full border text-sm transition",
                    form.tipo === t.value
                      ? "bg-noite border-noite text-white"
                      : "bg-background border-border text-foreground/80 hover:border-foreground/30",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Campo label="Título">
            <ClearableInput
              required
              value={form.titulo}
              onChange={(e) => {
                setTituloEditado(true);
                setForm({ ...form, titulo: e.target.value });
              }}
              className={inputCls}
              placeholder="Ex.: Culto de Sábado"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Data" dica={form.data ? dataLonga(form.data) : undefined}>
              <input
                required
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className={inputCls}
              />
            </Campo>
            <Campo label="Início">
              <input
                required
                type="time"
                value={form.horario_inicio}
                onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })}
                className={inputCls}
              />
            </Campo>
          </div>

          <Campo label="Pregador" dica="Opcional">
            <ClearableInput
              value={form.pregador}
              onChange={(e) => setForm({ ...form, pregador: e.target.value })}
              className={inputCls}
            />
          </Campo>
          <Campo label="Tema" dica="Opcional">
            <ClearableInput
              value={form.tema}
              onChange={(e) => setForm({ ...form, tema: e.target.value })}
              className={inputCls}
            />
          </Campo>

          <button disabled={loading} className={cn(botaoPrimario, "w-full py-3.5")}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar e montar a ordem do culto
          </button>
        </form>
      </main>
    </div>
  );
}
