/** As contas e os textos do relatório e da lista de importações (fork Escale, Fase 2F; Clint `index-DXIjyGaW`). */
import { IDIOMA_PADRAO, type Idioma } from "@/lib/i18n/idiomas";
import { tagDeIdioma } from "@/lib/i18n/datas";

import type { Motivo } from "./regras";
import { ROTULO_DO_MOTIVO } from "./textos";
import type { ImportacaoLida, LinhaLida } from "./tipos";

/** "dd/mm/aaaa hh:mm", pelo idioma de quem lê (pt-BR e es formatam igual). */
export function dataEHora(iso: string, idioma: Idioma = IDIOMA_PADRAO): string {
  return new Date(iso).toLocaleString(tagDeIdioma(idioma), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "");
}

/** O relatório mostra até 500 linhas; a leitura traz 501 para a tela saber que cortou. */
export const LINHAS_DO_RELATORIO_MAX = 500;

export const processadas = (i: Pick<ImportacaoLida, "importadas" | "puladas" | "erros" | "revisar">) =>
  i.importadas + i.puladas + i.erros + i.revisar;

export const porcentagem = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

export type ChaveDoMotivo = Motivo | "erro" | "aviso:telefone" | "aviso:email" | "aviso:id" | "aviso:dono" | "aviso:campo";

export const ROTULO_DA_CHAVE: Record<string, string> = {
  ...Object.fromEntries(Object.entries(ROTULO_DO_MOTIVO).map(([m, r]) => [m, r.rotulo])),
  erro: "Erro",
  "aviso:telefone": ROTULO_DO_MOTIVO.INVALID_PHONE_FORMAT.rotulo,
  "aviso:email": "E-mail descartado",
  "aviso:id": "ID inválido",
  "aviso:dono": "Dono descartado",
  "aviso:campo": "Campo descartado",
};

export function chavesDaLinha(l: LinhaLida): ChaveDoMotivo[] {
  if (l.status === "erro") return ["erro"];
  if (l.status !== "importada") return l.motivo ? [l.motivo] : ["erro"];
  const a = l.detalhe?.avisos ?? {};
  const chaves: ChaveDoMotivo[] = [];
  if (a.telefone) chaves.push("aviso:telefone");
  if (a.email) chaves.push("aviso:email");
  if (a.id || a.negocioId) chaves.push("aviso:id");
  if (a.dono) chaves.push("aviso:dono");
  if (a.campos?.length) chaves.push("aviso:campo");
  return chaves;
}

export function agruparPorChave(linhas: readonly LinhaLida[]): Array<[ChaveDoMotivo, number]> {
  const contagem = new Map<ChaveDoMotivo, number>();
  for (const l of linhas) for (const c of chavesDaLinha(l)) contagem.set(c, (contagem.get(c) ?? 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
}

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function detalheDaLinha(l: LinhaLida): { titulo: string; meio: string | null; avisos: string[]; erro: string | null } {
  const n = l.normalizado ?? {};
  const negocio = (n.negocio ?? null) as { titulo?: string } | null;
  const titulo = texto(n.nome) ?? texto(n.email) ?? texto(n.telefone) ?? texto(negocio?.titulo) ?? "-";
  const meio = [texto(n.email), texto(n.telefone)].filter(Boolean).join(" · ") || null;
  const a = l.detalhe?.avisos ?? {};
  const avisos = [
    a.telefone ? `Telefone descartado: ${a.telefone}` : null,
    a.email ? `E-mail descartado: ${a.email}` : null,
    a.id ? `ID descartado: ${a.id}` : null,
    a.negocioId ? `ID descartado: ${a.negocioId}` : null,
    a.dono ? `Dono descartado: ${a.dono}` : null,
    ...(a.campos ?? []).map((c) => `Campo descartado: ${c.campo}`),
  ].filter((x): x is string => x !== null);
  return { titulo, meio: meio === titulo ? null : meio, avisos, erro: l.mensagem };
}

export const celula = (v: string) => {
  const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

export function csvDoRelatorio(linhas: readonly LinhaLida[], t: (texto: string) => string): string {
  const corpo = linhas.map((l) => {
    const d = detalheDaLinha(l);
    const motivo = chavesDaLinha(l).map((c) => t(ROTULO_DA_CHAVE[c] ?? c)).join(" · ");
    const detalhe = d.erro ?? [d.titulo, ...d.avisos].join(" · ");
    return [String(l.numero), motivo, detalhe].map(celula).join(",");
  });
  return `\uFEFF${[[t("Linha"), t("Motivo"), t("Detalhe")].join(","), ...corpo].join("\n")}`;
}
