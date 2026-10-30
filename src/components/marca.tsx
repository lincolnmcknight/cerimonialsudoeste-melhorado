import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { forwardRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  const [erro, setErro] = useState(false);
  if (erro) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-white/10 font-display text-white",
          className,
        )}
        aria-hidden
      >
        CS
      </span>
    );
  }
  return (
    <img
      src="/favicon.png"
      alt=""
      className={cn("rounded-lg object-cover", className)}
      onError={() => setErro(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho das páginas                                               */
/* ------------------------------------------------------------------ */

export function Cabecalho({
  voltar,
  acoes,
  children,
  largura = "max-w-2xl",
  className,
}: {
  voltar?: { to: "/" | "/admin" | "/auth"; label?: string };
  acoes?: ReactNode;
  children?: ReactNode;
  largura?: string;
  className?: string;
}) {
  return (
    <header className={cn("cabecalho pb-9", className)} style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
      <div className={cn("mx-auto px-5", largura)}>
        <div className="flex items-center justify-between gap-3 min-h-10 no-print">
          {voltar ? (
            <Link
              to={voltar.to}
              className="inline-flex items-center gap-1.5 -ml-2 px-2 py-1.5 rounded-lg text-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {voltar.label ?? "Voltar"}
            </Link>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2.5 text-sm text-white/85">
              <Logo className="w-8 h-8" />
              <span className="font-medium tracking-tight">Cerimonial Sudoeste</span>
            </Link>
          )}
          <div className="flex items-center gap-1">{acoes}</div>
        </div>
        {children && <div className="mt-7">{children}</div>}
      </div>
    </header>
  );
}

/** Botão discreto para o cabeçalho escuro */
export const BotaoCabecalho = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function BotaoCabecalho({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50",
        className,
      )}
    />
  );
});

export const linkCabecalho =
  "relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors";

export function Contador({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-gold text-[10px] leading-4 font-semibold text-noite text-center">
      {n > 9 ? "9+" : n}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Painel: folha inferior no celular, janela centralizada no desktop   */
/* ------------------------------------------------------------------ */

export function Painel({
  titulo,
  descricao,
  aberto = true,
  onClose,
  children,
  rodape,
}: {
  titulo: string;
  descricao?: string;
  aberto?: boolean;
  onClose: () => void;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-noite/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 bg-card shadow-2xl flex flex-col",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:rounded-2xl sm:max-h-[86dvh]",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 sm:data-[state=open]:slide-in-from-bottom-2 sm:data-[state=open]:fade-in-0",
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3 px-5 pt-4 sm:pt-5">
            <div>
              <DialogPrimitive.Title className="font-display text-[1.75rem] leading-tight">
                {titulo}
              </DialogPrimitive.Title>
              {descricao ? (
                <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">
                  {descricao}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{titulo}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="p-2 -mr-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5">{children}</div>
          {rodape && (
            <div
              className="border-t border-border px-5 py-4 bg-card rounded-b-2xl"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {rodape}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Confirmação                                                         */
/* ------------------------------------------------------------------ */

export function Confirmar({
  aberto,
  titulo,
  descricao,
  acao,
  perigoso,
  onConfirm,
  onClose,
}: {
  aberto: boolean;
  titulo: string;
  descricao: ReactNode;
  acao: string;
  perigoso?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl font-normal">{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={perigoso ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {acao}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Formulários                                                         */
/* ------------------------------------------------------------------ */

export const inputCls =
  "mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-[15px] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-shadow";

export function Campo({
  label,
  dica,
  children,
  className,
}: {
  label: string;
  dica?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      {children}
      {dica && <span className="block text-xs text-muted-foreground mt-1">{dica}</span>}
    </label>
  );
}

export const botaoPrimario =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium px-4 py-3 hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none";

export const botaoMarca =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground font-medium px-4 py-3 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none";

export const botaoSecundario =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card text-foreground font-medium px-4 py-3 hover:bg-muted active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none";

/* ------------------------------------------------------------------ */
/* Ícone do WhatsApp                                                   */
/* ------------------------------------------------------------------ */

export function IconeWhatsApp({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.001 3.2C8.935 3.2 3.2 8.935 3.2 16c0 2.257.593 4.463 1.72 6.407L3.2 28.8l6.55-1.71a12.77 12.77 0 0 0 6.25 1.62h.006c7.065 0 12.8-5.735 12.8-12.8 0-3.42-1.332-6.634-3.75-9.05A12.716 12.716 0 0 0 16.001 3.2Zm0 23.36h-.005a10.6 10.6 0 0 1-5.4-1.478l-.388-.23-3.887 1.015 1.038-3.79-.253-.4A10.607 10.607 0 0 1 5.4 16c0-5.844 4.756-10.6 10.6-10.6 2.83 0 5.49 1.104 7.49 3.108a10.522 10.522 0 0 1 3.11 7.492c0 5.844-4.756 10.56-10.6 10.56Zm5.812-7.933c-.318-.16-1.884-.93-2.176-1.037-.293-.107-.506-.16-.72.16-.213.32-.826 1.037-1.013 1.25-.187.213-.373.24-.69.08-.318-.16-1.343-.495-2.559-1.578-.946-.844-1.585-1.887-1.771-2.207-.187-.32-.02-.493.14-.653.144-.144.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.737-.987-2.377-.26-.624-.524-.54-.72-.55l-.613-.011a1.18 1.18 0 0 0-.853.4c-.293.32-1.12 1.093-1.12 2.667 0 1.573 1.147 3.093 1.307 3.307.16.213 2.257 3.443 5.467 4.828.764.33 1.36.527 1.825.674.767.244 1.464.21 2.015.128.615-.092 1.884-.77 2.15-1.513.267-.744.267-1.383.187-1.514-.08-.13-.293-.213-.611-.373Z" />
    </svg>
  );
}

export const WHATSAPP_CERIMONIAL = {
  nome: "Bianca Paiva",
  telefone: "+55 61 8249-4955",
  link:
    "https://wa.me/556182494955?text=" +
    encodeURIComponent("Olá, Bianca! Gostaria de enviar as informações do culto."),
};
