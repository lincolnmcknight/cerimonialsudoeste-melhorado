import { useEffect, useState } from "react";
import { RefreshCw, Terminal, WifiOff, X } from "lucide-react";
import { getErrorLogs, clearErrorLogs } from "@/lib/query-client";
import { Painel, botaoPrimario, botaoSecundario } from "@/components/marca";

/**
 * Faixa no topo quando o aparelho fica sem internet ou quando o servidor
 * não responde. Pode ser fechada; volta a aparecer se surgir um erro novo.
 */
export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  const [logs, setLogs] = useState(getErrorLogs());
  const [dispensadoEm, setDispensadoEm] = useState(0);
  const [verLogs, setVerLogs] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const i = setInterval(() => setLogs([...getErrorLogs()]), 2000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(i);
    };
  }, []);

  const ultimoErro = logs.length ? new Date(logs[logs.length - 1].timestamp).getTime() : 0;
  const temErroNovo = ultimoErro > dispensadoEm;
  const mostrar = !online || temErroNovo;

  return (
    <>
      {mostrar && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 no-print" role="status">
          <div
            className={`px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-white ${
              online ? "bg-[#b7791f]" : "bg-destructive"
            }`}
          >
            {online ? <RefreshCw className="w-4 h-4 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
            <div className="text-sm font-medium flex-1">
              {online ? "O servidor demorou a responder." : "Sem internet. As informações podem estar desatualizadas."}
            </div>
            {temErroNovo && (
              <button
                className="p-1.5 rounded-lg hover:bg-white/20"
                onClick={() => setVerLogs(true)}
                aria-label="Ver detalhes técnicos"
              >
                <Terminal className="w-4 h-4" />
              </button>
            )}
            <button
              className="p-1.5 rounded-lg hover:bg-white/20"
              onClick={() => setDispensadoEm(Date.now())}
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Painel
        aberto={verLogs}
        titulo="Detalhes técnicos"
        descricao="Informações para identificar bloqueios na rede. Envie para quem cuida do app, se precisar."
        onClose={() => setVerLogs(false)}
        rodape={
          <div className="flex gap-2">
            <button
              className={`${botaoSecundario} flex-1`}
              onClick={() => {
                clearErrorLogs();
                setLogs([]);
                setVerLogs(false);
              }}
            >
              Limpar
            </button>
            <button className={`${botaoPrimario} flex-1`} onClick={() => setVerLogs(false)}>
              Fechar
            </button>
          </div>
        }
      >
        <div className="rounded-xl bg-muted p-3 font-mono text-[11px] leading-relaxed space-y-3 max-h-[50vh] overflow-auto">
          {logs.length === 0 ? (
            <div className="text-muted-foreground">Nenhum erro registrado.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="border-b border-border pb-2 last:border-0">
                <div className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString("pt-BR")}</div>
                <div className="font-semibold">{log.message}</div>
                {log.details && (
                  <pre className="mt-1 opacity-70 whitespace-pre-wrap break-all">{JSON.stringify(log.details, null, 2)}</pre>
                )}
              </div>
            ))
          )}
        </div>
      </Painel>
    </>
  );
}
