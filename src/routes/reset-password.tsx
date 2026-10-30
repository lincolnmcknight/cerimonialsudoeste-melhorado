import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Campo, Logo, botaoPrimario, inputCls } from "@/components/marca";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — Cerimonial Sudoeste" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As duas senhas precisam ser iguais.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha alterada. Entre com a nova senha.");
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  }

  const tipo = showPassword ? "text" : "password";

  return (
    <div className="min-h-dvh vitral flex flex-col text-white">
      <div className="px-5 pt-5">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 -ml-2 px-2 py-1.5 rounded-lg text-sm text-white/75 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" /> Entrar
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <Logo className="w-14 h-14 rounded-2xl shadow-lg mb-5" />
        <div className="w-full max-w-sm bg-card text-card-foreground rounded-2xl shadow-2xl p-6">
          <h1 className="font-display text-[2rem] leading-tight">Nova senha</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            {ready
              ? "Escolha uma senha com pelo menos 6 caracteres."
              : "Abra esta página pelo link que enviamos para o seu e-mail."}
          </p>
          {ready && (
            <form onSubmit={submit} className="space-y-4">
              <Campo label="Nova senha">
                <div className="relative">
                  <input
                    required
                    type={tipo}
                    autoComplete="new-password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-[calc(50%+3px)] -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </Campo>
              <Campo label="Repita a senha">
                <input
                  required
                  type={tipo}
                  autoComplete="new-password"
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputCls}
                />
              </Campo>
              <button disabled={loading} className={`${botaoPrimario} w-full`}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar nova senha
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
