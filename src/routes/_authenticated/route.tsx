import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw redirect({ to: "/auth" });

      // Assigns the initial role server-side via SECURITY DEFINER function.
      // Direct client writes to user_roles are denied by RLS to prevent
      // privilege escalation.
      await supabase.rpc("bootstrap_user_role");

      return { user: data.user };
    } catch (err) {
      if (err instanceof Error && (err.message?.includes('fetch') || err.message?.includes('network'))) {
        console.error("Erro de rede no middleware de autenticação", err);
        // We don't redirect here to let the global network error handler show the retry/offline message
      }
      throw err;
    }
  },
  component: () => <Outlet />,
});
