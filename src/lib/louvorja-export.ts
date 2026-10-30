import JSZip from "jszip";
import { fmtTime } from "@/lib/programacao";

/** Minimal shape of a programme item needed for the LouvorJA export. */
export interface LouvorJAItem {
  ordem: number;
  atividade: string;
  midia: string | null;
  responsavel: string | null;
  duracao_minutos: number;
  horario_estimado: string | null;
  observacao: string | null;
  visivel_publico: boolean;
}

export interface LouvorJAProgramacao {
  titulo: string;
  data: string;
  tema?: string | null;
  pregador?: string | null;
}

/** Remove characters that are invalid in file names on Windows/macOS/Linux. */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build "[Posição] - [Nome do Item] ([Mídia]).txt" */
export function buildFileName(item: LouvorJAItem, position: number): string {
  const base = `${position} - ${item.atividade}`;
  const withMedia = item.midia?.trim() ? `${base} (${item.midia.trim()})` : base;
  return `${sanitizeFileName(withMedia)}.txt`;
}

/** Build the detailed text body for a single item. */
export function buildFileContent(
  item: LouvorJAItem,
  position: number,
  prog: LouvorJAProgramacao,
): string {
  const lines: string[] = [
    `PROGRAMAÇÃO: ${prog.titulo}`,
    `DATA: ${prog.data}`,
  ];
  if (prog.tema) lines.push(`TEMA: ${prog.tema}`);
  if (prog.pregador) lines.push(`PREGADOR: ${prog.pregador}`);
  lines.push("", "----------------------------------------", "");
  lines.push(`ITEM: ${position}`);
  lines.push(`ATIVIDADE: ${item.atividade}`);
  lines.push(`HORÁRIO ESTIMADO: ${fmtTime(item.horario_estimado) || "—"}`);
  lines.push(`DURAÇÃO: ${item.duracao_minutos} min`);
  lines.push(`RESPONSÁVEL / EQUIPE: ${item.responsavel?.trim() || "—"}`);
  lines.push(`MÚSICA / MÍDIA: ${item.midia?.trim() || "—"}`);
  lines.push("", "OBSERVAÇÕES:");
  lines.push(item.observacao?.trim() || "—");
  return lines.join("\r\n");
}

/**
 * Generates a ZIP with one .txt per item and triggers a browser download.
 * Throws if there are no items.
 */
export async function downloadLouvorJAZip(
  prog: LouvorJAProgramacao,
  itens: LouvorJAItem[],
): Promise<void> {
  const itensVisiveis = itens.filter((item) => item.visivel_publico);
  if (itensVisiveis.length === 0) {
    throw new Error("A programação não possui itens visíveis.");
  }

  const zip = new JSZip();
  const sorted = [...itensVisiveis].sort((a, b) => a.ordem - b.ordem);
  const usedNames = new Set<string>();

  sorted.forEach((item, idx) => {
    const position = idx + 1;
    let name = buildFileName(item, position);
    // Avoid silent overwrite when two items produce the same file name.
    let n = 2;
    while (usedNames.has(name)) {
      name = name.replace(/\.txt$/, ` (${n++}).txt`);
    }
    usedNames.add(name);
    zip.file(name, buildFileContent(item, position, prog));
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFileName(`${prog.data} - ${prog.titulo}`)} - LouvorJA.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
