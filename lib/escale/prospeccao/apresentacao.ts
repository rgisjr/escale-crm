import {
  numeroBr,
  porcento,
  type ChaveDoSegmento,
  type TomDoStatus,
  type Traduzir,
} from "@/lib/escale/campanhas/apresentacao";

import type {
  ContagemDaProspeccao,
  LinhaDeProspeccao,
  ProgressoDaEmpresa,
  SituacaoDaProspeccao,
} from "./tipos";

/**
 * O QUE A PROSPECÇÃO MOSTRA (fork Escale, Fase 8D; D3–D6). Funções puras: o
 * servidor conta, aqui se decide rótulo, cor, barra, funil e texto. Os textos
 * passam por `t` (quem chama traduz).
 */

// ─── Situação (selo) ───────────────────────────────────────────────────────

export const ROTULO_DA_SITUACAO: Record<SituacaoDaProspeccao, string> = {
  buscando: "Buscando empresas",
  erro_na_busca: "Erro na busca",
  rascunho: "Rascunho",
  em_progresso: "Em progresso",
  pausada: "Pausada",
  completa: "Completo",
};

export const DICA_DA_SITUACAO: Record<SituacaoDaProspeccao, string> = {
  buscando: "Estamos buscando as empresas no Google Maps.",
  erro_na_busca: "A busca não terminou. Abra a prospecção para ver o motivo.",
  rascunho: "A busca terminou e a prospecção aguarda a configuração da abordagem.",
  em_progresso: "O agente está abordando as empresas aos poucos, no ritmo escolhido.",
  pausada: "Nenhuma empresa nova é abordada até você retomar.",
  completa: "Todas as empresas da fila foram abordadas.",
};

export const TOM_DA_SITUACAO: Record<SituacaoDaProspeccao, TomDoStatus> = {
  buscando: "ciano",
  erro_na_busca: "vermelho",
  rascunho: "cinza",
  em_progresso: "azul",
  pausada: "laranja",
  completa: "verde",
};

export const SITUACOES_QUE_PULSAM: ReadonlySet<SituacaoDaProspeccao> = new Set([
  "buscando",
  "em_progresso",
]);

// ─── Progresso da empresa ──────────────────────────────────────────────────

/** Os rótulos do original (`app/app/prospecting/_client.tsx`, já traduzidos). */
export const ROTULO_DO_PROGRESSO: Record<ProgressoDaEmpresa, string> = {
  new: "Encontrado",
  queued: "Na fila",
  sending: "Preparando abordagem",
  sent: "Abordado",
  skipped: "Não abordado",
  failed: "Revisar falha",
  replied: "Respondeu",
  qualified: "Qualificado",
};

export const TOM_DO_PROGRESSO: Record<ProgressoDaEmpresa, TomDoStatus> = {
  new: "cinza",
  queued: "amarelo",
  sending: "ciano",
  sent: "azul",
  skipped: "granito",
  failed: "vermelho",
  replied: "verde",
  qualified: "verde",
};

// ─── Barra de resultado (D5) ───────────────────────────────────────────────

export type ChaveDaProspeccao = "falhas" | "abordadas" | "responderam" | "qualificadas";

export interface SegmentoDaProspeccao {
  chave: ChaveDaProspeccao;
  /** O acumulado que a dica mostra ("10 abordadas"). */
  quantidade: number;
  /** Largura em % das encontradas (segmentos disjuntos). */
  largura: number;
  /** Percentual inteiro do acumulado sobre as encontradas. */
  porcento: number;
}

/** As cores dos segmentos de WhatsApp (8A) que cada segmento da Prospecção usa. */
export const COR_DO_SEGMENTO_DA_PROSPECCAO: Record<ChaveDaProspeccao, ChaveDoSegmento> = {
  falhas: "erro",
  abordadas: "entregues",
  responderam: "lidos",
  qualificadas: "enviados",
};

export function segmentosDaProspeccao(c: ContagemDaProspeccao): SegmentoDaProspeccao[] {
  const base = c.encontradas;
  if (base <= 0) return [];
  const brutos: [ChaveDaProspeccao, number, number][] = [
    ["falhas", c.falhas, c.falhas],
    ["abordadas", Math.max(0, c.abordadas - c.responderam), c.abordadas],
    ["responderam", Math.max(0, c.responderam - c.qualificadas), c.responderam],
    ["qualificadas", c.qualificadas, c.qualificadas],
  ];
  return brutos
    .filter(([, faixa]) => faixa > 0)
    .map(([chave, faixa, quantidade]) => ({
      chave,
      quantidade,
      largura: (faixa / base) * 100,
      porcento: porcento(quantidade, base) ?? 0,
    }));
}

const TEXTO_DO_SEGMENTO: Record<ChaveDaProspeccao, string> = {
  falhas: "{n} com falha - {p}%",
  abordadas: "{n} abordadas - {p}%",
  responderam: "{n} responderam - {p}%",
  qualificadas: "{n} qualificadas - {p}%",
};

export function textoDoSegmentoDaProspeccao(s: SegmentoDaProspeccao, t: Traduzir): string {
  return t(TEXTO_DO_SEGMENTO[s.chave])
    .replace("{n}", numeroBr(s.quantidade))
    .replace("{p}", String(s.porcento));
}

// ─── Funil e cartões (D10) ─────────────────────────────────────────────────

export function etapasDoFunil(
  c: ContagemDaProspeccao,
  t: Traduzir,
): { chave: string; rotulo: string; quantidade: number; porcento: number | null }[] {
  const etapa = (chave: string, rotulo: string, quantidade: number) => ({
    chave,
    rotulo: t(rotulo),
    quantidade,
    porcento: porcento(quantidade, c.encontradas),
  });
  return [
    etapa("encontradas", "Encontradas", c.encontradas),
    etapa("abordadas", "Abordadas", c.abordadas),
    etapa("responderam", "Responderam", c.responderam),
    etapa("qualificadas", "Qualificadas", c.qualificadas),
  ];
}

/** "50%"; sem base, "—". */
export function textoDoPorcento(parte: number, base: number): string {
  const p = porcento(parte, base);
  return p === null ? "—" : `${p}%`;
}

/** "US$ 0,45"; sem custo, "—" (formato brasileiro, regra 5 do CLAUDE.md). */
export function custoEmDolar(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function textoDasEmpresas(n: number, t: Traduzir): string {
  return n === 1 ? t("1 empresa") : t("{n} empresas").replace("{n}", numeroBr(n));
}

/** O subtítulo da linha (D6). */
export function subtituloDaProspeccao(l: LinhaDeProspeccao, t: Traduzir): string {
  if (l.situacao === "buscando") return t("Buscando empresas");
  return l.encontradas === 1
    ? t("1 empresa encontrada")
    : t("{n} empresas encontradas").replace("{n}", numeroBr(l.encontradas));
}

export function textoDoRitmo(diario: number, intervalo: number, t: Traduzir): string {
  return t("{n} abordagens em 24 horas, com pelo menos {m} minutos entre elas.")
    .replace("{n}", numeroBr(diario))
    .replace("{m}", numeroBr(intervalo));
}
