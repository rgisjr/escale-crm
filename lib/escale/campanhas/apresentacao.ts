import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

import type { ContagemDaLinha, LinhaDeCampanha } from "./tipos";

/**
 * O QUE A LISTA DE CAMPANHAS MOSTRA (fork Escale, Fase 8A; N5–N8). Funções
 * puras: o servidor conta, aqui se decide rótulo, cor, barra, cartão e texto.
 * Os textos passam por `t` (quem chama traduz).
 */
export type Traduzir = (texto: string) => string;

// ─── Status (selo) ─────────────────────────────────────────────────────────

export type TomDoStatus =
  "cinza" | "ciano" | "amarelo" | "azul" | "laranja" | "verde" | "granito" | "vermelho";

/** Os rótulos do selo (seção 6 do PRD; os da Clint, mais "Pronta para enviar"). */
export const ROTULO_DO_STATUS: Record<StatusDaCampanha, string> = {
  draft: "Rascunho",
  preparing: "Processando",
  ready: "Pronta para enviar",
  scheduled: "Agendado",
  running: "Em progresso",
  paused: "Pausada",
  completed: "Completo",
  cancelled: "Cancelado",
  failed: "Erro de processamento",
};

/** A dica do selo (material, "Textos de status"; Processando e Pronta são nossos). */
export const DICA_DO_STATUS: Record<StatusDaCampanha, string> = {
  draft: "Sua campanha foi salva como rascunho e ainda não foi enviada.",
  preparing: "Estamos montando a lista de contatos da sua campanha.",
  ready: "A lista de contatos está pronta e a campanha aguarda o envio.",
  scheduled: "Sua campanha foi agendada e será enviada na data e hora programadas.",
  running: "Sua mensagem está sendo enviada para os contatos da sua campanha.",
  paused: "Sua campanha foi pausada. Nenhum contato novo recebe mensagem até você retomar o envio.",
  completed: "O envio da campanha foi concluído.",
  cancelled: "Sua campanha foi cancelada e o envio não foi realizado.",
  failed: "Ocorreu um erro na sua campanha e ela não foi enviada para seus contatos.",
};

export const TOM_DO_STATUS: Record<StatusDaCampanha, TomDoStatus> = {
  draft: "cinza",
  preparing: "ciano",
  ready: "cinza",
  scheduled: "amarelo",
  running: "azul",
  paused: "laranja",
  completed: "verde",
  cancelled: "granito",
  failed: "vermelho",
};

/** Os que pulsam enquanto o servidor trabalha (material 2.1). */
export const STATUS_QUE_PULSAM: ReadonlySet<StatusDaCampanha> = new Set(["preparing", "running"]);

// ─── Números ───────────────────────────────────────────────────────────────

export const numeroBr = (n: number): string => n.toLocaleString("pt-BR");

/** Percentual inteiro; sem base, `null` (a tela mostra "—"). */
export function porcento(parte: number, base: number): number | null {
  if (base <= 0) return null;
  return Math.round((parte / base) * 100);
}

// ─── Barra de resultado (N6; 002, 008) ─────────────────────────────────────

export type ChaveDoSegmento = "erro" | "entregues" | "lidos" | "enviados";

export interface SegmentoDaBarra {
  chave: ChaveDoSegmento;
  quantidade: number;
  /** % da largura da barra (sobre os adicionados). */
  largura: number;
  porcento: number;
}

/** Segmentos disjuntos, na ordem da Clint; só os que têm alguém. */
export function segmentosDaBarra(c: ContagemDaLinha): SegmentoDaBarra[] {
  const base = c.adicionados;
  if (base <= 0) return [];
  const partes: Array<[ChaveDoSegmento, number]> = [
    ["erro", c.erros],
    ["entregues", Math.max(0, c.entregues - c.lidos)],
    ["lidos", c.lidos],
    ["enviados", Math.max(0, c.enviados - c.entregues)],
  ];
  return partes
    .filter(([, quantidade]) => quantidade > 0)
    .map(([chave, quantidade]) => ({
      chave,
      quantidade,
      largura: Math.min(100, (quantidade / base) * 100),
      porcento: Math.round((quantidade / base) * 100),
    }));
}

/** "16 lidos - 53%" (008); o erro sem percentual, como o código da Clint. */
export function textoDoSegmento(s: SegmentoDaBarra, t: Traduzir): string {
  const n = numeroBr(s.quantidade);
  const p = String(s.porcento);
  switch (s.chave) {
    case "erro":
      return t("{n} inválidos ou com erro").replace("{n}", n);
    case "entregues":
      return t("{n} entregues - {p}%").replace("{n}", n).replace("{p}", p);
    case "lidos":
      return t("{n} lidos - {p}%").replace("{n}", n).replace("{p}", p);
    case "enviados":
      return t("{n} enviados - {p}%").replace("{n}", n).replace("{p}", p);
  }
}

// ─── Resumo (N7; 003) ──────────────────────────────────────────────────────

export type ChaveDoCartao = "adicionados" | "enviados" | "entregues" | "lidas" | "erros";

export const ORDEM_DOS_CARTOES: readonly ChaveDoCartao[] = [
  "adicionados",
  "enviados",
  "entregues",
  "lidas",
  "erros",
];

export const ROTULO_DO_CARTAO: Record<ChaveDoCartao, string> = {
  adicionados: "Adicionados para envio",
  enviados: "Enviados",
  entregues: "Entregues",
  lidas: "Lidas",
  erros: "Erros",
};

export function valoresDoCartao(
  chave: ChaveDoCartao,
  r: ContagemDaLinha,
): { total: number; porcento: number | null } {
  const total = {
    adicionados: r.adicionados,
    enviados: r.enviados,
    entregues: r.entregues,
    lidas: r.lidos,
    erros: r.erros,
  }[chave];
  return { total, porcento: chave === "adicionados" ? null : porcento(total, r.adicionados) };
}

// ─── Tempo e datas (N8) ────────────────────────────────────────────────────

const MES_MEDIO = 30.4375;
const ANO_MEDIO = 365.25;

/**
 * "há um mês" no molde do `relativeTime` do dayjs que a Clint usa (002): os
 * limites dele (44 s, 89 s, 44 min, 89 min, 21 h, 35 h, 25 d, 45 d, 10 meses,
 * 17 meses), com arredondamento.
 */
export function tempoDesde(iso: string, agora: Date, t: Traduzir): string {
  const seg = Math.max(0, (agora.getTime() - Date.parse(iso)) / 1000);
  const comN = (texto: string, n: number) => t(texto).replace("{n}", String(n));
  if (Math.round(seg) <= 44) return t("há poucos segundos");
  if (Math.round(seg) <= 89) return t("há um minuto");
  const min = Math.round(seg / 60);
  if (min <= 44) return comN("há {n} minutos", min);
  if (min <= 89) return t("há uma hora");
  const horas = Math.round(seg / 3600);
  if (horas <= 21) return comN("há {n} horas", horas);
  if (horas <= 35) return t("há um dia");
  const dias = Math.round(seg / 86_400);
  if (dias <= 25) return comN("há {n} dias", dias);
  if (dias <= 45) return t("há um mês");
  const meses = Math.round(seg / (86_400 * MES_MEDIO));
  if (meses <= 10) return comN("há {n} meses", meses);
  if (meses <= 17) return t("há um ano");
  return comN("há {n} anos", Math.round(seg / (86_400 * ANO_MEDIO)));
}

function partes(iso: string, fuso: string | undefined, comHora: boolean): Record<string, string> {
  const formatadas = new Intl.DateTimeFormat("en-GB", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).formatToParts(new Date(iso));
  return Object.fromEntries(formatadas.map((p) => [p.type, p.value]));
}

/** "10/09/2026 12:39" — sempre o formato brasileiro (regra 5), em qualquer idioma da tela. */
export function dataEHoraBr(iso: string, fuso?: string): string {
  const p = partes(iso, fuso, true);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export function dataBr(iso: string, fuso?: string): string {
  const p = partes(iso, fuso, false);
  return `${p.day}/${p.month}/${p.year}`;
}

/** A "Data agendamento" (N8): a agendada; senão, quando começou. */
export const dataDoDisparo = (
  l: Pick<LinhaDeCampanha, "agendadaPara" | "iniciadaEm">,
): string | null => l.agendadaPara ?? l.iniciadaEm;

/** "30 Solicitados há um mês" (002); sem snapshot, "Criado em 01/10/2026". */
export function subtituloDaCampanha(
  l: Pick<LinhaDeCampanha, "solicitados" | "criadaEm">,
  agora: Date,
  t: Traduzir,
  fuso?: string,
): string {
  if (l.solicitados > 0) {
    const palavra = l.solicitados === 1 ? t("Solicitado") : t("Solicitados");
    return `${numeroBr(l.solicitados)} ${palavra} ${tempoDesde(l.criadaEm, agora, t)}`;
  }
  return `${t("Criado em")} ${dataBr(l.criadaEm, fuso)}`;
}
