/**
 * Código fixo e determinístico por usuário: a tela de retorno pode ser
 * aberta uma única vez e continua funcionando para todos os cronômetros
 * disparados por essa pessoa. (Mesmo algoritmo da versão original, para
 * que telas já pareadas continuem funcionando.)
 */
export function codeForUser(userId: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const clean = userId.replace(/[^a-f0-9]/gi, "").toUpperCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += chars[hash % chars.length];
    hash = Math.floor(hash / chars.length) + clean.charCodeAt(i % clean.length);
  }
  return out;
}

export type TimerStatus = "waiting" | "running" | "paused" | "finished";

export const TIMER_STATUS_LABEL: Record<TimerStatus, string> = {
  waiting: "Aguardando",
  running: "Em andamento",
  paused: "Pausado",
  finished: "Encerrado",
};

export function restanteAoVivo(s: {
  status: string;
  started_at: string | null;
  remaining_seconds: number;
}): number {
  if (s.status === "running" && s.started_at) {
    const elapsed = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000);
    return s.remaining_seconds - elapsed;
  }
  return s.remaining_seconds;
}

export function mmss(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  const abs = Math.abs(totalSeconds);
  const m = String(Math.floor(abs / 60)).padStart(2, "0");
  const s = String(abs % 60).padStart(2, "0");
  return `${neg ? "−" : ""}${m}:${s}`;
}
