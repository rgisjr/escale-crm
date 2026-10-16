import { applyFilters, type LeadFilters } from "@/lib/kanban/filters";
import type { BoardData, Stage } from "@/lib/kanban/types";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import type { Lead } from "@/lib/types/leads";

import { chaveDoCampo, passaCondicao, type CampoFiltravel } from "./campos";
import { dadosDeFiltro, type ConversaDoFiltro } from "./dados-do-quadro";
import {
  SEM_ATENDENTE,
  STATUS_DE_CONVERSA_ENCERRADA,
  enxugar,
  type FiltroDeConversa,
  type FiltrosDoQuadro,
  type Intervalo,
  type IntervaloDeTempo,
  type StatusDoNegocio,
} from "./tipos";

/**
 * APLICAR OS FILTROS DO QUADRO (fork Escale, Fase 1D).
 *
 * O que o original já filtra (dono, tags com E/OU nas três caixas, atrasados,
 * motivo e categoria de perda, valor na moeda da organização) continua com as
 * regras DELE (`applyFilters`): filtrar por uma régua e mostrar por outra é o
 * defeito que o filtro de marcador já teve. O fork acrescenta o resto: status
 * com várias escolhas, a busca que também olha o contato, data de criação,
 * conversa, campos, atividades e tempo.
 */
export interface ContextoDoRecorte {
  /** A moeda da organização: o filtro de valor só compara negócios nela (#1531). */
  moeda: string | null;
  campos: readonly CampoFiltravel[];
  agora?: Date;
  /** A categoria de um motivo de perda, na régua da origem do card (#1537). */
  categoriaDo?: (motivo: string) => string | undefined;
}

const HORA_MS = 3_600_000;
const HORAS_POR_UNIDADE = { horas: 1, dias: 24 } as const;

function paraLeadFilters(f: FiltrosDoQuadro, moeda: string | null): LeadFilters {
  return {
    status: "all",
    owner: f.dono,
    tag: f.tags,
    tagMode: f.modoDasTags,
    overdueOnly: f.atrasados,
    lostReason: f.motivoDePerda,
    lostCategory: f.categoriaDePerda,
    valueCentsMin: f.valor?.min ?? null,
    valueCentsMax: f.valor?.max ?? null,
    valueCurrency: moeda,
  };
}

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

function passaBusca(l: Lead, busca: string): boolean {
  if (!busca) return true;
  const texto = [l.title, l.description, dadosDeFiltro(l)?.contato_nome, l.contact_email, l.contact_phone]
    .filter(Boolean)
    .join(" ");
  if (normalizar(texto).includes(busca)) return true;
  // Telefone se digita de qualquer jeito: com 4 dígitos ou mais, compara só os dígitos.
  const digitos = busca.replace(/\D/g, "");
  return digitos.length >= 4 && (l.contact_phone ?? "").replace(/\D/g, "").includes(digitos);
}

/** O dia LOCAL (fuso de quem olha) de um instante ISO, como `YYYY-MM-DD`. */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/** O dia local de `iso` está no período? Sem período, passa; com período e sem data, não passa. */
function noPeriodo(iso: string | null, p: { de?: string; ate?: string } | undefined): boolean {
  if (!p) return true;
  if (!iso) return false;
  const dia = diaLocal(iso);
  return !(p.de && dia < p.de) && !(p.ate && dia > p.ate);
}

const dentro = (n: number, i: Intervalo | undefined) =>
  !i || ((i.min === undefined || n >= i.min) && (i.max === undefined || n <= i.max));

/** Unidades INTEIRAS desde `desde` ("2 dias na etapa" = de 48h a 71h59). */
function passaTempo(desde: string | null, i: IntervaloDeTempo | undefined, agora: Date): boolean {
  if (!i) return true;
  const inicio = desde ? Date.parse(desde) : Number.NaN;
  if (Number.isNaN(inicio)) return false;
  return dentro(Math.floor((agora.getTime() - inicio) / HORA_MS / HORAS_POR_UNIDADE[i.unidade]), i);
}

export function situacaoDaConversa(status: string): "aberta" | "encerrada" {
  return STATUS_DE_CONVERSA_ENCERRADA.includes(status) ? "encerrada" : "aberta";
}

/** A última mensagem é do cliente: a equipe ainda não respondeu. */
function aguardandoResposta(c: ConversaDoFiltro): boolean {
  const entrada = c.ultima_entrada ? Date.parse(c.ultima_entrada) : Number.NaN;
  if (Number.isNaN(entrada)) return false;
  const saida = c.ultima_saida ? Date.parse(c.ultima_saida) : Number.NaN;
  return Number.isNaN(saida) || entrada > saida;
}

function passaConversa(l: Lead, c: FiltroDeConversa | undefined): boolean {
  if (!c) return true;
  const extra = dadosDeFiltro(l)?.conversa ?? null;
  const tem = Boolean(l.conversa) || extra !== null;
  if (c.existe === "sem") return !tem;
  // Qualquer outro critério de conversa (o filtro chega enxuto) pede uma conversa.
  if (!tem) return false;
  if (c.naoLidas && !((l.conversa?.unread ?? 0) > 0)) return false;
  if (c.semResposta && !(extra && aguardandoResposta(extra))) return false;
  if (c.situacao && !(extra && c.situacao.includes(situacaoDaConversa(extra.status)))) return false;
  if (c.canais && !(extra && (c.canais as readonly string[]).includes(extra.canal))) return false;
  if (c.atendentes && !c.atendentes.includes(extra?.atendente_id ?? SEM_ATENDENTE)) return false;
  return true;
}

export function aplicarFiltrosDoQuadro(leads: readonly Lead[], filtros: FiltrosDoQuadro, ctx: ContextoDoRecorte): Lead[] {
  const f = enxugar(filtros);
  const agora = ctx.agora ?? new Date();
  const status = new Set<string>(f.status);
  const busca = normalizar(f.busca ?? "");
  const campos = new Map(ctx.campos.map((c) => [chaveDoCampo(c), c]));
  return applyFilters([...leads], paraLeadFilters(f, ctx.moeda), { categoriaDo: ctx.categoriaDo }).filter((l) => {
    if (!status.has(l.status)) return false;
    if (!passaBusca(l, busca)) return false;
    if (!noPeriodo(l.created_at, f.criadoEm)) return false;
    // FORK ESCALE · Casca V4: ganho e perda pelo dia do fechamento, só dos negócios nesse status.
    if (f.ganhoEm && !(l.status === "won" && noPeriodo(l.closed_at, f.ganhoEm))) return false;
    if (f.perdidoEm && !(l.status === "lost" && noPeriodo(l.closed_at, f.perdidoEm))) return false;
    if (!passaConversa(l, f.conversa)) return false;
    if (!(f.campos ?? []).every((c) => passaCondicao(l, c, campos.get(chaveDoCampo(c))))) return false;
    if (!dentro(dadosDeFiltro(l)?.atividades_concluidas ?? 0, f.atividadesConcluidas)) return false;
    if (!passaTempo(l.stage_changed_at ?? l.created_at, f.tempoNaEtapa, agora)) return false;
    return passaTempo(l.created_at, f.tempoDesdeEntrada, agora);
  });
}

/**
 * As colunas que o quadro mostra: a de ganho só quando o status pede ganhos; a
 * de perda, só quando pede perdidos (decisão de 15/10, caminho A).
 */
export function etapasVisiveis(stages: readonly Stage[], status: readonly StatusDoNegocio[]): Stage[] {
  return stages.filter((s) => (!s.is_won || status.includes("won")) && (!s.is_lost || status.includes("lost")));
}

/** O quadro de UMA origem como a tela mostra: colunas visíveis e os cards filtrados delas. */
export function recortarQuadro(
  quadro: Pick<BoardData, "pipeline" | "stages" | "leads">,
  filtros: FiltrosDoQuadro,
  ctx: Omit<ContextoDoRecorte, "categoriaDo">,
): { stages: Stage[]; leads: Lead[] } {
  const stages = etapasVisiveis(quadro.stages, enxugar(filtros).status);
  const visiveis = new Set(stages.map((s) => s.id));
  const leads = aplicarFiltrosDoQuadro(quadro.leads, filtros, {
    ...ctx,
    categoriaDo: (motivo) => categoriaDoMotivo(motivo, quadro.pipeline.settings),
  }).filter((l) => visiveis.has(l.stage_id));
  return { stages, leads };
}
