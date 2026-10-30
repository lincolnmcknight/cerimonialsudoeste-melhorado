import { useEffect, useState } from "react";
import { Download, PlusSquare, Share, X } from "lucide-react";
import { Painel, botaoPrimario } from "@/components/marca";
import { Logo } from "@/components/marca";

const CHAVE = "cs_instalar_dispensado_ate";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Convite discreto para instalar o app. Aparece só quando o navegador
 * permite instalar, e some por 30 dias se a pessoa fechar.
 */
export function InstallPWA() {
  const [visivel, setVisivel] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [instrucoesIOS, setInstrucoesIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ||
      document.referrer.includes("android-app://");
    if (standalone) return;

    try {
      const ate = Number(localStorage.getItem(CHAVE) || 0);
      if (ate > Date.now()) return;
    } catch {
      /* ignora */
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const ehIOS = /iphone|ipad|ipod/.test(ua);
    setIos(ehIOS);
    if (ehIOS && !/crios|fxios|optios|edgios/.test(ua)) setVisivel(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisivel(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dispensar() {
    setVisivel(false);
    try {
      localStorage.setItem(CHAVE, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    } catch {
      /* ignora */
    }
  }

  async function instalar() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setVisivel(false);
      setDeferred(null);
    } else if (ios) {
      setInstrucoesIOS(true);
    }
  }

  if (!visivel) return null;

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-40 px-4 no-print"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-md flex items-center gap-3 rounded-2xl bg-noite text-white p-3 pl-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <Logo className="w-10 h-10" />
          <div className="flex-1 min-w-0 leading-tight">
            <div className="font-medium text-sm">Instale o app do Cerimonial</div>
            <div className="text-xs text-white/60">Abre direto da tela inicial, como um aplicativo.</div>
          </div>
          <button
            onClick={instalar}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl bg-white text-noite"
          >
            <Download className="w-4 h-4" /> Instalar
          </button>
          <button onClick={dispensar} className="p-1.5 rounded-lg text-white/60 hover:text-white" aria-label="Agora não">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Painel
        aberto={instrucoesIOS}
        titulo="Instalar no iPhone"
        descricao="Dois toques no Safari e o app fica na sua tela de início."
        onClose={() => setInstrucoesIOS(false)}
        rodape={
          <button className={`${botaoPrimario} w-full`} onClick={() => setInstrucoesIOS(false)}>
            Entendi
          </button>
        }
      >
        <ol className="space-y-5">
          <li className="flex items-start gap-4">
            <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-display text-xl text-noite shrink-0">
              1
            </span>
            <span className="pt-1.5">
              Toque em <strong>Compartilhar</strong> <Share className="inline w-4 h-4 -mt-1 text-anil" /> na barra do
              Safari.
            </span>
          </li>
          <li className="flex items-start gap-4">
            <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-display text-xl text-noite shrink-0">
              2
            </span>
            <span className="pt-1.5">
              Escolha <strong>Adicionar à Tela de Início</strong> <PlusSquare className="inline w-4 h-4 -mt-1 text-anil" />.
            </span>
          </li>
        </ol>
      </Painel>
    </>
  );
}
