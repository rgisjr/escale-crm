/**
 * A FICHA DO NEGÓCIO (fork Escale, Fase 1G): regras puras da tela própria do
 * negócio, igual à Clint (`/deal/:id`). Sem React e sem rede.
 *
 * Próximo negócio (C8): a Clint ordena pela ordem do quadro e desempata pela
 * posição na etapa; sem ordem escolhida, a posição; o anterior é a mesma
 * consulta invertida; os filtros do quadro valem ("O próximo negócio leva em
 * consideração a ordem e os filtros atuais da listagem de negócios.").
 * Código: `raw-v2/js/getStageGroupInfo-BptXw8sG.js.txt`.
 */
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

export const ABAS_DO_NEGOCIO = [
  "atividades",
  "contato",
  "empresa",
  "negocio",
  "conversas",
  "arquivos",
  "historico",
] as const;
export type AbaDoNegocio = (typeof ABAS_DO_NEGOCIO)[number];

/** Os rótulos da Clint (prints 01 a 07 de 17/10). */
export const ROTULO_DA_ABA: Readonly<Record<AbaDoNegocio, string>> = {
  atividades: "Atividades",
  contato: "Contato",
  empresa: "Empresa",
  negocio: "Negócio",
  conversas: "Conversas",
  arquivos: "Arquivos",
  historico: "Histórico",
};

export const PARAM_ABA = "aba";
/** A etapa escolhida no seletor do próximo negócio (ausente = a etapa do negócio). */
export const PARAM_ETAPA_DO_PROXIMO = "pe";
const PARAMS_DA_FICHA = new Set(["lead", PARAM_ABA, PARAM_ETAPA_DO_PROXIMO]);

export function abaDaUrl(valor: string | null | undefined): AbaDoNegocio {
  return ABAS_DO_NEGOCIO.find((a) => a === valor) ?? "atividades";
}

export type ParametrosDaPagina = Record<string, string | string[] | undefined>;

/** Os `searchParams` de uma página do servidor como texto de busca, na ordem em que chegaram. */
export function buscaDosParametros(sp: ParametrosDaPagina): string {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(sp)) {
    if (valor === undefined) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) busca.append(chave, v);
  }
  return busca.toString();
}

/** Os parâmetros do quadro (filtros, filtro salvo e ordem da 1D), sem os que são da ficha. */
export function buscaDoQuadro(qs: string): string {
  const saida = new URLSearchParams();
  new URLSearchParams(qs).forEach((valor, chave) => {
    if (!PARAMS_DA_FICHA.has(chave)) saida.append(chave, valor);
  });
  return saida.toString();
}

export function rotaDoNegocio(
  id: string,
  qs = "",
  extra: { aba?: AbaDoNegocio | null; etapa?: string | null } = {},
): string {
  const busca = new URLSearchParams(buscaDoQuadro(qs));
  if (extra.aba && extra.aba !== "atividades") busca.set(PARAM_ABA, extra.aba);
  if (extra.etapa) busca.set(PARAM_ETAPA_DO_PROXIMO, extra.etapa);
  const resto = busca.toString();
  return resto ? `/app/negocios/${id}?${resto}` : `/app/negocios/${id}`;
}

export function rotaDoQuadro(origemId: string, qs = ""): string {
  const resto = buscaDoQuadro(qs);
  return resto ? `/app/pipelines/${origemId}?${resto}` : `/app/pipelines/${origemId}`;
}

export interface Migalha {
  rotulo: string;
  href: string | null;
}

/** C1: grupo › origem › negócio. Só a origem é link (volta ao quadro com os mesmos filtros). */
export function migalhasDoNegocio(e: {
  grupo: string | null;
  origem: { id: string; nome: string };
  negocio: string;
  qs?: string;
}): Migalha[] {
  return [
    ...(e.grupo ? [{ rotulo: e.grupo, href: null }] : []),
    { rotulo: e.origem.nome, href: rotaDoQuadro(e.origem.id, e.qs ?? "") },
    { rotulo: e.negocio, href: null },
  ];
}

export interface Vizinhos {
  anterior: Lead | null;
  proximo: Lead | null;
}

const PELA_POSICAO = (a: Lead, b: Lead) => a.position_in_stage - b.position_in_stage;

export function vizinhosNaEtapa(
  leads: readonly Lead[],
  etapaId: string,
  atualId: string,
  ordem?: (a: Lead, b: Lead) => number,
): Vizinhos {
  const lista = leads.filter((l) => l.stage_id === etapaId).sort(ordem ?? PELA_POSICAO);
  const i = lista.findIndex((l) => l.id === atualId);
  if (i === -1) return { anterior: null, proximo: lista[0] ?? null };
  return { anterior: lista[i - 1] ?? null, proximo: lista[i + 1] ?? null };
}

export function etapasDoProximo(stages: readonly Stage[]): Stage[] {
  return stages.filter((s) => !s.is_archived).sort((a, b) => a.position - b.position);
}

export type StatusDoNegocio = Lead["status"];

/** N6 (Q3): para onde vai o negócio fechado que volta a "Aberto". */
export function etapaParaReabrir(stages: readonly Stage[], status: StatusDoNegocio): string | null {
  const abertas = stages
    .filter((s) => !s.is_won && !s.is_lost && !s.is_archived)
    .sort((a, b) => a.position - b.position);
  if (abertas.length === 0) return null;
  return status === "won" ? abertas[abertas.length - 1]!.id : abertas[0]!.id;
}

/** C7: a Clint só mostra "N Negócios" com mais de um (`Ue>1`). */
export function deveMostrarContador(total: number): boolean {
  return total > 1;
}

const maiuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const semPonto = (s: string) => s.replace(".", "");

/** "Qui, 15 Out" (cabeçalho do dia em "Próximas atividades", print 01). */
export function cabecalhoDoDia(iso: string, idioma = "pt-BR"): string {
  const d = new Date(iso);
  const semana = maiuscula(semPonto(d.toLocaleDateString(idioma, { weekday: "short" })));
  return `${semana}, ${diaEMes(d, idioma)}`;
}

/** "15 Out". */
function diaEMes(d: Date, idioma: string): string {
  return `${d.getDate()} ${maiuscula(semPonto(d.toLocaleDateString(idioma, { month: "short" })))}`;
}

/** "16:21". */
export function horaDaTarefa(iso: string, idioma = "pt-BR"): string {
  return new Date(iso).toLocaleTimeString(idioma, { hour: "2-digit", minute: "2-digit" });
}

const chaveDoDia = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const instante = (iso: string | null) => (iso ? Date.parse(iso) : Number.NEGATIVE_INFINITY);

export interface DiaDeTarefas<T> {
  chave: string;
  /** `null` = sem prazo. */
  rotulo: string | null;
  tarefas: T[];
}

export function diasDasTarefas<T extends { due_date: string | null }>(
  tarefas: readonly T[],
  idioma = "pt-BR",
): DiaDeTarefas<T>[] {
  const ordenadas = [...tarefas].sort((a, b) => instante(b.due_date) - instante(a.due_date));
  const dias = new Map<string, DiaDeTarefas<T>>();
  for (const x of ordenadas) {
    const chave = x.due_date ? chaveDoDia(new Date(x.due_date)) : "sem-prazo";
    const dia = dias.get(chave) ?? {
      chave,
      rotulo: x.due_date ? cabecalhoDoDia(x.due_date, idioma) : null,
      tarefas: [],
    };
    dias.set(chave, { ...dia, tarefas: [...dia.tarefas, x] });
  }
  return [...dias.values()];
}

/** "há 3 dias" (cartões do Histórico, print 07). */
export function haQuantoTempo(iso: string, agora: Date = new Date(), idioma = "pt-BR"): string {
  const seg = Math.round((Date.parse(iso) - agora.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: "always" });
  const abs = Math.abs(seg);
  if (abs < 60) return rtf.format(seg, "second");
  if (abs < 3600) return rtf.format(Math.round(seg / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seg / 3600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.round(seg / 86_400), "day");
  if (abs < 86_400 * 365) return rtf.format(Math.round(seg / (86_400 * 30)), "month");
  return rtf.format(Math.round(seg / (86_400 * 365)), "year");
}

/** O domingo da semana (a semana brasileira, como o "Essa semana" da Clint). */
function domingoDe(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
}

const ddmmaaaa = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

export interface SecaoDoHistorico<T> {
  chave: string;
  /** "Esta semana", "Semana passada" ou a data do domingo (dd/mm/aaaa) — print que falta 9. */
  rotulo: string;
  /** O dia do evento mais novo da seção ("14 Out", ao lado de "ESTA SEMANA" no print 07). */
  data: string;
  itens: T[];
}

export function secoesDoHistorico<T extends { performed_at: string }>(
  itens: readonly T[],
  agora: Date = new Date(),
  idioma = "pt-BR",
): SecaoDoHistorico<T>[] {
  const esta = domingoDe(agora).getTime();
  const passada = domingoDe(
    new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 7),
  ).getTime();
  const ordenados = [...itens].sort(
    (a, b) => Date.parse(b.performed_at) - Date.parse(a.performed_at),
  );
  const secoes = new Map<string, SecaoDoHistorico<T>>();
  for (const item of ordenados) {
    const quando = new Date(item.performed_at);
    const domingo = domingoDe(quando);
    const chave = ddmmaaaa(domingo);
    const rotulo =
      domingo.getTime() === esta
        ? "Esta semana"
        : domingo.getTime() === passada
          ? "Semana passada"
          : chave;
    const secao = secoes.get(chave) ?? { chave, rotulo, data: diaEMes(quando, idioma), itens: [] };
    secoes.set(chave, { ...secao, itens: [...secao.itens, item] });
  }
  return [...secoes.values()];
}
