import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Crown, Loader2, Pencil, Projector, Search, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useAuth, type Role } from "@/hooks/use-auth";
import { Cabecalho, Confirmar } from "@/components/marca";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/acessos")({
  head: () => ({ meta: [{ title: "Acessos — Cerimonial Sudoeste" }] }),
  component: AcessosPage,
});

const PAPEIS: Role[] = ["admin", "cerimonialista", "editor", "tecnico_projecao"];

const PERFIS = [
  {
    key: "admin",
    label: "Administrador",
    icon: Crown,
    perms: [
      "Gerencia usuários e permissões",
      "Cria, edita, publica e exclui qualquer programação",
      "Vê rascunhos, publicadas e anteriores",
    ],
  },
  {
    key: "cerimonialista",
    label: "Cerimonialista",
    icon: Sparkles,
    perms: [
      "Cria programações e organiza os itens",
      "Publica, atualiza e envia avisos",
      "Usa o cronômetro da tela de retorno",
      "Duplica e exclui programações",
    ],
  },
  {
    key: "editor",
    label: "Editor",
    icon: Pencil,
    perms: [
      "Edita as programações liberadas para ele",
      "Adiciona, remove e reorganiza itens",
      "Não gerencia usuários nem exclui programações",
    ],
  },
  {
    key: "tecnico_projecao",
    label: "Técnico de projeção",
    icon: Projector,
    perms: [
      "Vê as programações publicadas",
      "Baixa o programa no formato do LouvorJA",
      "Não edita, não publica e não usa o cronômetro",
    ],
  },
  {
    key: "comum",
    label: "Membro (sem papel)",
    icon: User,
    perms: ["Vê as programações publicadas", "Recebe avisos de novas programações"],
  },
] as const;

function AcessosPage() {
  const { isAdmin, user, loading } = useAuth();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [alterando, setAlterando] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<{ id: string; nome: string } | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["acessos"],
    queryFn: async () => {
      const [{ data: profiles }, { data: ur }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email").order("nome"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const byUser = new Map<string, Role[]>();
      (ur ?? []).forEach((r) => {
        const arr = byUser.get(r.user_id) ?? [];
        arr.push(r.role as Role);
        byUser.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
    },
    enabled: isAdmin,
  });

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const l = data ?? [];
    const filtrada = q ? l.filter((u) => `${u.nome} ${u.email}`.toLowerCase().includes(q)) : l;
    // Equipe primeiro, depois membros
    return [...filtrada].sort((a, b) => Number(b.roles.length > 0) - Number(a.roles.length > 0));
  }, [data, busca]);

  const equipe = (data ?? []).filter((u) => u.roles.length > 0).length;

  async function toggleRole(userId: string, role: Role, has: boolean) {
    if (userId === user?.id && role === "admin" && has) {
      toast.error("Você não pode remover o seu próprio acesso de administrador.");
      return;
    }
    setAlterando(`${userId}:${role}`);
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: userId, role });
    setAlterando(null);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["acessos"] });
  }

  async function handleDeleteUser(userId: string) {
    setExcluindoId(userId);
    try {
      const { error } = await supabase.rpc("admin_excluir_usuario", { _user_id: userId });
      if (error) throw error;
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: ["acessos"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o usuário.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-dvh bg-background">
        <Cabecalho voltar={{ to: "/admin", label: "Programações" }}>
          <h1 className="font-display text-4xl">Acessos</h1>
          <p className="text-white/70 mt-2">Somente administradores gerenciam acessos.</p>
        </Cabecalho>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <Cabecalho voltar={{ to: "/admin", label: "Programações" }} largura="max-w-4xl">
        <h1 className="font-display text-5xl leading-none">Acessos da equipe</h1>
        <p className="text-white/70 mt-3 max-w-lg">
          Quem cria conta entra como membro e só vê as programações. Dê um papel para quem ajuda a montar,
          publicar ou projetar os cultos.
        </p>
      </Cabecalho>

      <main className="max-w-4xl mx-auto px-5 mt-6 lg:grid lg:grid-cols-[1fr_18rem] lg:gap-8 space-y-8 lg:space-y-0">
        <section>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display text-2xl">
              Pessoas <span className="text-muted-foreground text-lg">({data?.length ?? 0}, {equipe} na equipe)</span>
            </h2>
          </div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail"
              aria-label="Buscar pessoas"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {lista.map((u) => (
                <li key={u.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-noite shrink-0">
                      {(u.nome || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {u.nome || "Sem nome"}
                        {u.id === user?.id && <span className="text-muted-foreground font-normal"> (você)</span>}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                    </div>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => setExcluir({ id: u.id, nome: u.nome || u.email || "este usuário" })}
                        disabled={excluindoId === u.id}
                        className="p-2 -mr-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8"
                        aria-label={`Excluir ${u.nome}`}
                      >
                        {excluindoId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3 pl-12">
                    {PAPEIS.map((r) => {
                      const has = u.roles.includes(r);
                      const busy = alterando === `${u.id}:${r}`;
                      return (
                        <button
                          key={r}
                          onClick={() => toggleRole(u.id, r, has)}
                          disabled={busy}
                          aria-pressed={has}
                          className={cn(
                            "text-sm px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 transition",
                            has
                              ? "bg-noite text-white border-noite"
                              : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
                          )}
                        >
                          {busy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : has ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : null}
                          {ROLE_LABEL[r]}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
              {lista.length === 0 && (
                <li className="text-center text-muted-foreground py-8">Ninguém encontrado com “{busca}”.</li>
              )}
            </ul>
          )}
        </section>

        <aside>
          <h2 className="font-display text-2xl mb-3">O que cada papel faz</h2>
          <div className="space-y-2">
            {PERFIS.map((p) => {
              const Icon = p.icon;
              return (
                <details key={p.key} className="group bg-card border border-border rounded-xl" open={p.key === "cerimonialista"}>
                  <summary className="list-none cursor-pointer px-4 py-3 flex items-center gap-3">
                    <Icon className="w-[18px] h-[18px] text-accent" />
                    <span className="flex-1 font-medium text-sm">{p.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition group-open:rotate-90" />
                  </summary>
                  <ul className="px-4 pb-3 space-y-1.5 text-sm text-muted-foreground">
                    {p.perms.map((perm) => (
                      <li key={perm} className="pl-7 relative">
                        <span className="absolute left-2 top-2 w-1 h-1 rounded-full bg-muted-foreground/60" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </aside>
      </main>

      <Confirmar
        aberto={!!excluir}
        titulo="Excluir usuário?"
        descricao={
          <>
            A conta de <strong>{excluir?.nome}</strong> será apagada, junto com os acessos e avisos dela. Não dá
            para desfazer.
          </>
        }
        acao="Excluir"
        perigoso
        onClose={() => setExcluir(null)}
        onConfirm={() => {
          if (excluir) handleDeleteUser(excluir.id);
          setExcluir(null);
        }}
      />
    </div>
  );
}
