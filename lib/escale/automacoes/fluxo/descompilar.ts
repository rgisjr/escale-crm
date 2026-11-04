/**
 * FORK ESCALE · 5D: a volta do `compilar.ts` — o grafo de uma automação em modo fluxo vira, de novo, as
 * caixas e as ligações da tela. Inverte o compilador: o `match_reply` `<id>__resposta` é absorvido pela
 * caixa da mensagem (botões voltam a ser saídas `botao:<id>`), o nó `acoes_da_automacao` volta a ser
 * uma fila de caixas e o nó `end` some (saída sem ligação).
 */
import {
  ID_DAS_CONDICOES,
  telaDoGatilho,
  type CaixaDoDesenho,
  type Desenho,
  type LigacaoDoDesenho,
  type RegraGravada,
} from "@/lib/automation/desenho-da-regra";
import {
  ESPERA_SEM_LIMITE_MS,
  SUFIXO_DA_RESPOSTA,
  type SaidaDoNo,
  type TempoDeResposta,
  type UnidadeDoAtraso,
} from "@/lib/escale/automacoes/fluxo/caixas";
import { NO_REPLY_BRANCH_ID, type FlowGraph, type FlowNode } from "@/lib/followup/graph-schema";

type Aresta = FlowGraph["edges"][number];
type NoDe<T extends FlowNode["type"]> = Extract<FlowNode, { type: T }>;

const RAMO_QUALQUER_RESPOSTA = "respondeu";

/** A maior unidade que divide o tempo sem sobra. */
export function unidadeDoAtraso(ms: number): { quantidade: number; unidade: UnidadeDoAtraso } {
  const unidades: Array<[UnidadeDoAtraso, number]> = [["dias", 86_400_000], ["horas", 3_600_000], ["minutos", 60_000], ["segundos", 1_000]];
  for (const [unidade, base] of unidades) if (ms % base === 0) return { quantidade: ms / base, unidade };
  return { quantidade: Math.round(ms / 1_000), unidade: "segundos" };
}

function tempoDeResposta(graceMs: number): TempoDeResposta {
  if (graceMs === ESPERA_SEM_LIMITE_MS) return null;
  if (graceMs % 86_400_000 === 0) return { quantidade: graceMs / 86_400_000, unidade: "dias" };
  if (graceMs % 3_600_000 === 0) return { quantidade: graceMs / 3_600_000, unidade: "horas" };
  return { quantidade: Math.max(1, Math.round(graceMs / 60_000)), unidade: "minutos" };
}

export function desenhoDoFluxo(regra: RegraGravada, grafo: FlowGraph): Desenho {
  const caixas: CaixaDoDesenho[] = [];
  const ligacoes: LigacaoDoDesenho[] = [];
  const nos = new Map(grafo.nodes.map((n) => [n.id, n]));
  const saindo = (id: string): Aresta[] => grafo.edges.filter((e) => e.source === id);
  const ehFim = (id: string) => nos.get(id)?.type === "end";

  const ligar = (source: string, target: string, saida: SaidaDoNo = "proximo") => {
    if (ehFim(target) || !nos.has(target)) return;
    ligacoes.push({ id: `ligacao-${ligacoes.length + 1}`, source, target, ...(saida === "proximo" ? {} : { saida }) });
  };
  const ligarSimples = (origem: string, ultima: string) => {
    for (const e of saindo(origem)) if (e.condition.type === "always") ligar(ultima, e.target);
  };

  for (const no of grafo.nodes) {
    if (no.type === "trigger") caixaDoGatilho(no, regra, caixas, ligacoes, saindo(no.id), ligar);
    else if (no.type === "wait") {
      caixas.push({ id: no.id, type: "atraso", position: no.position, data: { kind: "atraso", ...unidadeDoAtraso(no.config.mode === "fixed" ? no.config.duration_ms : 0), janela: no.config.mode === "fixed" ? (no.config.janela ?? null) : null } });
      ligarSimples(no.id, no.id);
    } else if (no.type === "condicoes_da_automacao") caixaDeCondicoes(no, caixas, saindo(no.id), ligar);
    else if (no.type === "acoes_da_automacao") {
      const ultima = caixasDasAcoes(no, caixas, ligar);
      ligarSimples(no.id, ultima);
    } else if (no.type === "action") caixaDaMensagem(no, nos, caixas, saindo, ligar);
  }
  return { caixas, ligacoes };
}

function caixaDoGatilho(
  no: NoDe<"trigger">,
  regra: RegraGravada,
  caixas: CaixaDoDesenho[],
  ligacoes: LigacaoDoDesenho[],
  saidas: Aresta[],
  ligar: (s: string, t: string, saida?: SaidaDoNo) => void,
): void {
  caixas.push({ id: no.id, type: "gatilho", position: no.position, data: { kind: "gatilho", evento: regra.trigger_event, tela: telaDoGatilho(regra.trigger_config) } });
  const primeiro = saidas.find((e) => e.condition.type === "always")?.target;
  if (regra.conditions.length === 0) {
    if (primeiro) ligar(no.id, primeiro);
    return;
  }
  const linhas = regra.conditions.map((c) => ({ field: c.field, op: c.op, value: c.value }));
  caixas.push({ id: ID_DAS_CONDICOES, type: "condicoes", position: { x: no.position.x, y: no.position.y + 120 }, data: { kind: "condicoes", linhas, grupos: [{ id: "g1", modo: "todas", linhas }] } });
  ligacoes.push({ id: `ligacao-${ligacoes.length + 1}`, source: no.id, target: ID_DAS_CONDICOES });
  if (primeiro) ligar(ID_DAS_CONDICOES, primeiro, "grupo:g1");
}

function caixaDeCondicoes(
  no: NoDe<"condicoes_da_automacao">,
  caixas: CaixaDoDesenho[],
  saidas: Aresta[],
  ligar: (s: string, t: string, saida?: SaidaDoNo) => void,
): void {
  const grupos = no.config.grupos.map((g) => ({ id: g.id, modo: g.modo, linhas: g.linhas.map((l) => ({ ...l })) }));
  caixas.push({ id: no.id, type: "condicoes", position: no.position, data: { kind: "condicoes", linhas: grupos[0]?.linhas ?? [], grupos } });
  for (const e of saidas) {
    if (e.condition.type === "branch") ligar(no.id, e.target, `grupo:${e.condition.branch_id}`);
    else if (e.condition.type === "always") ligar(no.id, e.target, "nenhuma");
  }
}

/** N ações num nó só voltam a ser N caixas em fila. Devolve o id da última. */
function caixasDasAcoes(
  no: NoDe<"acoes_da_automacao">,
  caixas: CaixaDoDesenho[],
  ligar: (s: string, t: string, saida?: SaidaDoNo) => void,
): string {
  let anterior = no.id;
  no.config.acoes.forEach((acao, k) => {
    const id = k === 0 ? no.id : `${no.id}__${k}`;
    caixas.push({ id, type: "acao", position: { x: no.position.x, y: no.position.y + k * 100 }, data: { kind: "acao", acao: { type: acao.type, config: acao.config } } });
    if (k > 0) ligacoesInternas(anterior, id, ligar);
    anterior = id;
  });
  return anterior;
}

function ligacoesInternas(de: string, para: string, ligar: (s: string, t: string, saida?: SaidaDoNo) => void): void {
  ligar(de, para);
}

function caixaDaMensagem(
  no: NoDe<"action">,
  nos: Map<string, FlowNode>,
  caixas: CaixaDoDesenho[],
  saindo: (id: string) => Aresta[],
  ligar: (s: string, t: string, saida?: SaidaDoNo) => void,
): void {
  const config = no.config;
  const passos = config.mode === "steps" ? config.passos : config.mode === "text" ? [{ tipo: "texto" as const, texto: config.body }] : null;
  if (!passos) return;
  const resposta = nos.get(`${no.id}${SUFIXO_DA_RESPOSTA}`);
  const tempo = resposta?.type === "match_reply" ? tempoDeResposta(resposta.config.grace_timeout_ms) : null;
  caixas.push({
    id: no.id,
    type: "acao",
    position: no.position,
    data: { kind: "acao", acao: { type: "send_whatsapp_message", config: { channel_session_id: "conversation", passos, ...(tempo ? { tempo_de_resposta: tempo } : {}) } } },
  });
  if (resposta?.type !== "match_reply") {
    for (const e of saindo(no.id)) if (e.condition.type === "always") ligar(no.id, e.target);
    return;
  }
  for (const e of saindo(resposta.id)) {
    const c = e.condition;
    if (c.type === "always") ligar(no.id, e.target);
    else if (c.type === "branch" && c.branch_id === NO_REPLY_BRANCH_ID) ligar(no.id, e.target, "nao_respondeu");
    else if (c.type === "branch" && c.branch_id === RAMO_QUALQUER_RESPOSTA) ligar(no.id, e.target);
    else if (c.type === "branch") ligar(no.id, e.target, `botao:${c.branch_id}`);
  }
}
