import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Campo, Logo, botaoPrimario, inputCls } from "@/components/marca";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Cerimonial Sudoeste" }] }),
  component: AuthPage,
});

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered")) return "Já existe uma conta com este e-mail. Tente entrar.";
  if (m.includes("password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return msg;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/admin", replace: true });
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: { nome },
          },
        });
        if (error) throw error;
        toast.success("Conta criada", {
          description: "Você já recebe os avisos. Para editar programações, peça a um administrador para liberar seu acesso.",
          duration: 8000,
        });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(traduzErro(err instanceof Error ? err.message : "Não foi possível entrar."));
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    if (!email) {
      toast.error("Digite seu e-mail no campo acima para receber o link.");
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Enviamos um link para redefinir sua senha.");
    } catch (err) {
      toast.error(traduzErro(err instanceof Error ? err.message : "Não foi possível enviar o e-mail."));
    } finally {
      setResetting(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/admin` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar com o Google.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh vitral flex flex-col text-white">
      <div className="px-5 pt-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 -ml-2 px-2 py-1.5 rounded-lg text-sm text-white/75 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" /> Programação
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <Logo className="w-14 h-14 rounded-2xl shadow-lg mb-5" />
        <div className="w-full max-w-sm bg-card text-card-foreground rounded-2xl shadow-2xl p-6">
          <h1 className="font-display text-[2rem] leading-tight">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            {mode === "login"
              ? "Acompanhe as programações e receba avisos. A equipe do cerimonial entra aqui para editar."
              : "Com uma conta você recebe um aviso sempre que uma programação for publicada."}
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-input bg-background hover:bg-muted font-medium transition disabled:opacity-50 flex items-center justify-center gap-2.5"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.1z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.3 35.5 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou com e-mail</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Campo label="Nome">
                <input required autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
              </Campo>
            )}
            <Campo label="E-mail">
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </Campo>
            <Campo label="Senha">
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
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
            <button disabled={loading} className={`${botaoPrimario} w-full`}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            {mode === "login" ? (
              <button
                type="button"
                onClick={forgotPassword}
                disabled={resetting}
                className="text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
              >
                {resetting ? "Enviando…" : "Esqueci a senha"}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-anil font-medium hover:underline"
            >
              {mode === "login" ? "Criar conta" : "Já tenho conta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
