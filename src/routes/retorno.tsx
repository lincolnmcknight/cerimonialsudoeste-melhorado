import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Monitor } from "lucide-react";

export const Route = createFileRoute("/retorno")({
  head: () => ({ meta: [{ title: "Tela de retorno — Cerimonial Sudoeste" }] }),
  component: RetornoLayout,
});

function RetornoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = pathname === "/retorno" || pathname === "/retorno/";
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  if (!isRoot) return <Outlet />;

  return (
    <div className="min-h-dvh vitral text-white flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <Monitor className="w-10 h-10 mx-auto mb-5 text-gold" strokeWidth={1.5} />
        <h1 className="font-display text-5xl leading-none">Tela de retorno</h1>
        <p className="text-white/65 mt-3 mb-8">
          Digite o código de 4 letras que aparece no painel da cerimonialista, no botão “Tela de retorno”.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const c = code.trim().toUpperCase();
            if (c) navigate({ to: "/retorno/$code", params: { code: c } });
          }}
          className="space-y-3"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="····"
            maxLength={6}
            aria-label="Código"
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full text-center text-5xl tracking-[0.4em] font-display py-5 rounded-2xl bg-white/8 border border-white/20 text-white placeholder:text-white/25 focus:outline-none focus:border-gold"
            autoFocus
          />
          <button
            type="submit"
            disabled={code.length < 4}
            className="w-full py-4 rounded-2xl bg-gold text-noite font-semibold hover:brightness-105 active:scale-[0.99] transition disabled:opacity-40"
          >
            Conectar
          </button>
        </form>
        <Link to="/" className="text-white/45 text-sm mt-8 inline-block hover:text-white/80">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
