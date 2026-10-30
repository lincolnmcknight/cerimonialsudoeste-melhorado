import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "cerimonialista" | "editor" | "tecnico_projecao";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  cerimonialista: "Cerimonialista",
  editor: "Editor",
  tecnico_projecao: "Técnico de projeção",
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadRoles(uid: string) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (alive) setRoles((data ?? []).map((r) => r.role as Role));
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadRoles(data.session.user.id);
      }
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const isStaff = roles.some((r) => r === "admin" || r === "cerimonialista" || r === "editor");
  const canCreate = isAdmin || roles.includes("cerimonialista");
  const canExport = canCreate || roles.includes("tecnico_projecao");
  const nome =
    (user?.user_metadata?.nome as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";

  return { session, user, roles, loading, isStaff, isAdmin, canCreate, canExport, nome };
}
