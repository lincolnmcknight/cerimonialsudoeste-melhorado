import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TIPOS_CULTO = [
  { value: "sabado_manha", label: "Sábado de manhã", inicio: "09:00", titulo: "Culto de Sábado" },
  { value: "culto_ja", label: "Culto JA", inicio: "17:00", titulo: "Culto JA" },
  { value: "domingo", label: "Domingo", inicio: "19:00", titulo: "Culto de Domingo" },
  { value: "quarta_feira", label: "Quarta-feira", inicio: "19:30", titulo: "Culto de Quarta-feira" },
  { value: "semana_oracao", label: "Semana de oração", inicio: "19:30", titulo: "Semana de Oração" },
  { value: "evento_especial", label: "Evento especial", inicio: "19:00", titulo: "" },
] as const;

export type TipoCulto = (typeof TIPOS_CULTO)[number]["value"];

export function tipoLabel(value: string): string {
  return TIPOS_CULTO.find((t) => t.value === value)?.label ?? value;
}

export function tipoInfo(value: string) {
  return TIPOS_CULTO.find((t) => t.value === value);
}

/** Itens que se repetem em quase todo culto — atalhos no editor. */
export const ITENS_COMUNS: { atividade: string; duracao: number }[] = [
  { atividade: "Prelúdio", duracao: 5 },
  { atividade: "Boas-vindas", duracao: 3 },
  { atividade: "Hino de abertura", duracao: 5 },
  { atividade: "Oração", duracao: 3 },
  { atividade: "Leitura bíblica", duracao: 3 },
  { atividade: "Louvor congregacional", duracao: 15 },
  { atividade: "Momento infantil", duracao: 10 },
  { atividade: "Ofertório", duracao: 5 },
  { atividade: "Louvor especial", duracao: 5 },
  { atividade: "Sermão", duracao: 40 },
  { atividade: "Hino final", duracao: 5 },
  { atividade: "Oração final", duracao: 3 },
  { atividade: "Avisos", duracao: 5 },
];

/** Data local (não UTC) no formato AAAA-MM-DD. */
export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Soma dias a uma data AAAA-MM-DD sem passar por UTC. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

export function dataLonga(iso: string): string {
  const s = format(parseISO(iso), "EEEE, d 'de' MMMM", { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dataCurta(iso: string): string {
  return format(parseISO(iso), "d MMM", { locale: ptBR });
}

/** Add minutes to a HH:MM(:SS) time string, returning HH:MM */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = ((total % 60) + 60) % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function fmtTime(time?: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

/** "HH:MM" → minutos desde a meia-noite */
export function toMinutes(time?: string | null): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function duracaoTexto(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export interface ProgItemLike {
  duracao_minutos: number;
  ordem: number;
}

/** Recompute estimated start time for each item based on order + duration */
export function recalcularHorarios<T extends ProgItemLike>(
  itens: T[],
  inicio: string,
): (T & { horario_estimado: string })[] {
  const sorted = [...itens].sort((a, b) => a.ordem - b.ordem);
  let cursor = inicio;
  return sorted.map((it) => {
    const horario = cursor;
    cursor = addMinutes(cursor, it.duracao_minutos);
    return { ...it, horario_estimado: horario };
  });
}

export type EstadoItem = "passado" | "agora" | "futuro";

/**
 * Para a programação de hoje, diz em que ponto do culto estamos,
 * com base no horário estimado e na duração de cada item.
 */
export function estadoDosItens<T extends { id: string; horario_estimado: string | null; duracao_minutos: number }>(
  itens: T[],
  dataISO: string,
  agora: Date,
): Record<string, EstadoItem> {
  const out: Record<string, EstadoItem> = {};
  const hoje = todayISO(agora);
  if (dataISO !== hoje) {
    const futuro = dataISO > hoje;
    itens.forEach((i) => (out[i.id] = futuro ? "futuro" : "passado"));
    return out;
  }
  const min = agora.getHours() * 60 + agora.getMinutes();
  itens.forEach((i) => {
    const ini = toMinutes(i.horario_estimado);
    const fim = ini + i.duracao_minutos;
    out[i.id] = min >= fim ? "passado" : min >= ini ? "agora" : "futuro";
  });
  return out;
}
