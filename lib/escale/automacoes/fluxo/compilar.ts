/**
 * FORK ESCALE · 5D: do desenho da tela para o que o servidor grava.
 *
 *  - desenho linear de hoje (gatilho → condições → ações)  → MODO REGRA: o corpo de sempre.
 *  - com Atraso, ramos, botões com saída ou tempo de resposta → MODO FLUXO: a regra fica só com o
 *    gatilho (e o filtro inicial) e o resto vira o grafo de um fluxo de follow-up da superfície
 *    `crm_automation`. O servidor refaz esta compilação; nunca confia no grafo do cliente.
 *
 * A volta (grafo → desenho) está em `descompilar.ts`.
 */
import {
  corpoDoDesenho,
  PROBLEMAS,
  triggerConfigDaTela,
  validarDesenho,
  type CaixaDoDesenho,
  type CorpoDaRegra,
  type DadosDaAcao,
  type Desenho,
  type LigacaoDoDesenho,
  type ProblemaDoDesenho,
  type RegraGravada,
} from "@/lib/automation/desenho-da-regra";
import { passosSchema } from "@/lib/automation/envio-de-passos";
import {
  ATRASO_MAXIMO_MS,
  ATRASO_MINIMO_MS,
  botoesDaMensagem,
  ESPERA_SEM_LIMITE_MS,
  ID_DO_FIM,
  LIMITE_DE_ARESTAS,
  LIMITE_DE_NOS,
  msDoAtraso,
  msDoTempoDeResposta,
  PASSO_SO_NO_MODO_REGRA,
  RECUSA_ATRASO_MAXIMO,
  RECUSA_ATRASO_MINIMO,
  RECUSA_CAMPO_DO_EVENTO,
  RECUSA_CANAL_FIXO,
  RECUSA_SEGREDO_NO_FLUXO,
  RECUSA_TAMANHO_MAXIMO,
  SUFIXO_DA_RESPOSTA,
  temTempoDeResposta,
  type GrupoDeCondicoes,
  type SaidaDoNo,
  type TempoDeResposta,
} from "@/lib/escale/automacoes/fluxo/caixas";
import { TIPOS_DE_ACAO_NO_FLUXO } from "@/lib/followup/acoes-da-automacao";
import { flowGraphSchema, NO_REPLY_BRANCH_ID, type FlowGraph } from "@/lib/followup/graph-schema";

export { desenhoDoFluxo } from "@/lib/escale/automacoes/fluxo/descompilar";
export { ESPERA_SEM_LIMITE_MS } from "@/lib/escale/automacoes/fluxo/caixas";

export type ModoDoDesenho = "regra" | "fluxo";
export type Compilado =
  | { ok: true; modo: "regra"; corpo: CorpoDaRegra }
  | { ok: true; modo: "fluxo"; regra: Omit<CorpoDaRegra, "actions">; grafo: FlowGraph }
  | { ok: false; problemas: ProblemaDoDesenho[] };

type Entrada = { nome: string; desenho: Desenho; regraGravada: RegraGravada | null };
type No = Record<string, unknown> & { id: string };
type Aresta = { id: string; source: string; target: string; priority: number; condition: Record<string, unknown> };
type Alvo = (origem: string, saida: SaidaDoNo) => string;

const ehAcaoDeFluxo = (t: string) => (TIPOS_DE_ACAO_NO_FLUXO as readonly string[]).includes(t);
const acaoDe = (c: CaixaDoDesenho) => (c.data.kind === "acao" ? c.data.acao : null);
/** O segredo do webhook é cifrado só no modo regra; no grafo ficaria em texto aberto. */
const ehWebhookComSegredo = (a: { type: string; config: Record<string, unknown> }) =>
  a.type === "call_webhook" && typeof a.config.secret === "string" && a.config.secret.trim() !== "";
const saidaDa = (l: LigacaoDoDesenho): SaidaDoNo => l.saida ?? "proximo";

/** Um grupo só com a saída do próprio grupo ligada é o mesmo que "proximo" no modo regra. */
function saidaEfetiva(desenho: Desenho, l: LigacaoDoDesenho): SaidaDoNo {
  const origem = desenho.caixas.find((c) => c.id === l.source);
  if (origem?.data.kind === "condicoes" && origem.data.grupos?.length === 1 && l.saida === `grupo:${origem.data.grupos[0]!.id}`) {
    return "proximo";
  }
  return saidaDa(l);
}

export function modoDoDesenho(d: Desenho): ModoDoDesenho {
  const gatilho = d.caixas.find((c) => c.data.kind === "gatilho");
  const depoisDoGatilho = d.ligacoes.find((l) => l.source === gatilho?.id)?.target;
  for (const c of d.caixas) {
    if (c.data.kind === "atraso") return "fluxo";
    if (c.data.kind === "condicoes") {
      if ((c.data.grupos?.length ?? 0) > 1) return "fluxo";
      const unico = c.data.grupos?.[0];
      if (unico && unico.modo === "qualquer" && unico.linhas.length > 1) return "fluxo";
      if (c.id !== depoisDoGatilho) return "fluxo";
    }
    const acao = acaoDe(c);
    if (acao?.type === "send_whatsapp_message" && temTempoDeResposta(acao.config)) return "fluxo";
  }
  return d.ligacoes.some((l) => saidaEfetiva(d, l) !== "proximo") ? "fluxo" : "regra";
}

/* ───────────────────────── helpers do grafo ───────────────────────── */

const linhasValidas = (linhas: GrupoDeCondicoes["linhas"]) =>
  linhas.filter((l) => l.field.trim() && l.value.trim()).map((l) => ({ field: l.field.trim(), op: l.op, value: l.value.trim() }));

function gruposDaCaixa(c: CaixaDoDesenho): GrupoDeCondicoes[] {
  if (c.data.kind !== "condicoes") return [];
  return c.data.grupos ?? [{ id: "g1", modo: "todas", linhas: c.data.linhas }];
}

/** A caixa ligada ao gatilho vira filtro da regra quando é um grupo "todas" só, sem saída "nenhuma". */
function filtroInicial(d: Desenho, gatilhoId: string): { caixa: CaixaDoDesenho; linhas: GrupoDeCondicoes["linhas"] } | null {
  const alvo = d.ligacoes.find((l) => l.source === gatilhoId)?.target;
  const caixa = d.caixas.find((c) => c.id === alvo);
  if (!caixa || caixa.data.kind !== "condicoes") return null;
  const grupos = gruposDaCaixa(caixa);
  if (grupos.length !== 1 || grupos[0]!.modo !== "todas") return null;
  if (d.ligacoes.some((l) => l.source === caixa.id && saidaDa(l) === "nenhuma")) return null;
  return { caixa, linhas: grupos[0]!.linhas };
}

type Mapa = { absorvida: Map<string, string>; ultimaDoGrupo: Map<string, string>; ordem: Map<string, CaixaDoDesenho[]> };

/** Ações do motor de regras SEGUIDAS (uma entrada só, ligação "proximo") viram um nó `acoes_da_automacao`. */
function agruparAcoes(d: Desenho, ignoradas: Set<string>): Mapa {
  const absorvida = new Map<string, string>();
  const ultimaDoGrupo = new Map<string, string>();
  const ordem = new Map<string, CaixaDoDesenho[]>();
  const entradas = (id: string) => d.ligacoes.filter((l) => l.target === id);
  for (const c of d.caixas) {
    const acao = acaoDe(c);
    if (ignoradas.has(c.id) || !acao || !ehAcaoDeFluxo(acao.type) || absorvida.has(c.id)) continue;
    const grupo = [c];
    for (;;) {
      const atual = grupo[grupo.length - 1]!;
      const saidas = d.ligacoes.filter((l) => l.source === atual.id);
      const proxima = saidas.length === 1 && saidaDa(saidas[0]!) === "proximo" ? d.caixas.find((x) => x.id === saidas[0]!.target) : undefined;
      const a = proxima ? acaoDe(proxima) : null;
      if (!proxima || !a || !ehAcaoDeFluxo(a.type) || entradas(proxima.id).length !== 1 || grupo.length >= 10) break;
      if (grupo.some((g) => g.id === proxima.id)) break;
      grupo.push(proxima);
    }
    ordem.set(c.id, grupo);
    ultimaDoGrupo.set(c.id, grupo[grupo.length - 1]!.id);
    for (const g of grupo.slice(1)) absorvida.set(g.id, c.id);
  }
  return { absorvida, ultimaDoGrupo, ordem };
}

function mensagemTemResposta(d: Desenho, c: CaixaDoDesenho): boolean {
  const acao = acaoDe(c);
  if (acao?.type !== "send_whatsapp_message") return false;
  const ligadas = d.ligacoes.filter((l) => l.source === c.id).map(saidaDa);
  return temTempoDeResposta(acao.config) || ligadas.some((s) => s.startsWith("botao:"));
}

/* ───────────────────────── nós ───────────────────────── */

function noDaCaixa(c: CaixaDoDesenho, mapa: Mapa, problemas: ProblemaDoDesenho[]): No[] {
  const base = { id: c.id, position: c.position };
  const d = c.data;
  if (d.kind === "gatilho") return [{ ...base, type: "trigger", label: "Gatilho", config: {} }];
  if (d.kind === "atraso") {
    const ms = msDoAtraso(d);
    if (ms < ATRASO_MINIMO_MS) problemas.push({ caixa: c.id, mensagem: RECUSA_ATRASO_MINIMO });
    if (ms > ATRASO_MAXIMO_MS) problemas.push({ caixa: c.id, mensagem: RECUSA_ATRASO_MAXIMO });
    return [{ ...base, type: "wait", label: "Atraso", config: { mode: "fixed", duration_ms: ms, immune_to_reply: true, ...(d.janela ? { janela: d.janela } : {}) } }];
  }
  if (d.kind === "condicoes") {
    // Neste nó o contexto só tem o negócio e o contato: os campos do evento (`event.*`) só valem no filtro inicial.
    if (gruposDaCaixa(c).some((g) => g.linhas.some((l) => l.field.trim().startsWith("event.")))) {
      problemas.push({ caixa: c.id, mensagem: RECUSA_CAMPO_DO_EVENTO });
    }
    const grupos = gruposDaCaixa(c).map((g) => ({ id: g.id, modo: g.modo, linhas: linhasValidas(g.linhas) }));
    return [{ ...base, type: "condicoes_da_automacao", label: "Condições", config: { grupos } }];
  }
  if (d.acao.type === "send_whatsapp_message") return noDaMensagem(c, d, problemas);
  if (ehAcaoDeFluxo(d.acao.type)) {
    if ((mapa.ordem.get(c.id) ?? [c]).some((x) => ehWebhookComSegredo((x.data as DadosDaAcao).acao))) {
      problemas.push({ caixa: c.id, mensagem: RECUSA_SEGREDO_NO_FLUXO });
    }
    const acoes = (mapa.ordem.get(c.id) ?? [c]).map((x) => ({ type: (x.data as DadosDaAcao).acao.type, config: (x.data as DadosDaAcao).acao.config }));
    return [{ ...base, type: "acoes_da_automacao", label: "Ações", config: { acoes } }];
  }
  problemas.push({ caixa: c.id, mensagem: PASSO_SO_NO_MODO_REGRA });
  return [];
}

function noDaMensagem(c: CaixaDoDesenho, d: DadosDaAcao, problemas: ProblemaDoDesenho[]): No[] {
  const canal = d.acao.config.channel_session_id;
  if (typeof canal === "string" && canal !== "" && canal !== "conversation") {
    problemas.push({ caixa: c.id, mensagem: RECUSA_CANAL_FIXO });
  }
  // Texto único (`template`, o formato de sempre) vira uma sequência de um passo só.
  const template = typeof d.acao.config.template === "string" ? d.acao.config.template : null;
  const passos = passosSchema.safeParse(d.acao.config.passos ?? (template ? [{ tipo: "texto", texto: template }] : undefined));
  if (!passos.success) {
    problemas.push({ caixa: c.id, mensagem: PROBLEMAS.acaoIncompleta });
    return [];
  }
  return [{ id: c.id, position: c.position, type: "action", label: "WhatsApp", config: { mode: "steps", passos: passos.data } }];
}

function respostaDaMensagem(c: CaixaDoDesenho, d: Desenho): No {
  const config = (c.data as DadosDaAcao).acao.config;
  const ligadas = new Set(d.ligacoes.filter((l) => l.source === c.id).map(saidaDa));
  const ramos = botoesDaMensagem(config)
    .map((b, i) => ({ b, posicao: i + 1 }))
    .filter(({ b }) => ligadas.has(`botao:${b.id}`))
    .map(({ b, posicao }) => ({ id: b.id, label: b.titulo, op: "eq", pattern: b.titulo, alternativas: [String(posicao)] }));
  const tempo = (config as { tempo_de_resposta?: TempoDeResposta }).tempo_de_resposta;
  return {
    id: `${c.id}${SUFIXO_DA_RESPOSTA}`,
    position: { x: c.position.x + 0.1, y: c.position.y },
    type: "match_reply",
    label: "Resposta",
    config: {
      branches: ramos.length > 0 ? ramos : [{ id: "respondeu", label: "Respondeu", op: "contains", pattern: "*" }],
      grace_timeout_ms: tempo ? msDoTempoDeResposta(tempo) : ESPERA_SEM_LIMITE_MS,
    },
  };
}

/* ───────────────────────── arestas ───────────────────────── */

function arestasDaCaixa(c: CaixaDoDesenho, d: Desenho, mapa: Mapa, alvo: Alvo): Aresta[] {
  const arestas: Aresta[] = [];
  const nova = (source: string, target: string, condition: Record<string, unknown>) =>
    arestas.push({ id: `a-${source}-${arestas.length + 1}`, source, target, priority: 0, condition });
  const origem = mapa.ultimaDoGrupo.get(c.id) ?? c.id;
  const alvoDe = (s: SaidaDoNo) => alvo(origem, s);
  if (c.data.kind === "condicoes") {
    // Caixa sem `grupos` (a de hoje) só tem a saída "proximo": é a do grupo g1, e "não corresponde" fica sem ligação.
    const semGrupos = !c.data.grupos;
    for (const g of gruposDaCaixa(c)) nova(c.id, alvoDe(semGrupos ? "proximo" : `grupo:${g.id}`), { type: "branch", branch_id: g.id });
    nova(c.id, alvoDe("nenhuma"), { type: "always" });
    return arestas;
  }
  if (!mensagemTemResposta(d, c)) {
    nova(c.id, alvoDe("proximo"), { type: "always" });
    return arestas;
  }
  const resposta = `${c.id}${SUFIXO_DA_RESPOSTA}`;
  nova(c.id, resposta, { type: "always" });
  const ligados = botoesDaMensagem((c.data as DadosDaAcao).acao.config).filter((b) =>
    d.ligacoes.some((l) => l.source === c.id && saidaDa(l) === `botao:${b.id}`),
  );
  for (const b of ligados) nova(resposta, alvoDe(`botao:${b.id}`), { type: "branch", branch_id: b.id });
  if (ligados.length === 0) nova(resposta, alvoDe("proximo"), { type: "branch", branch_id: "respondeu" });
  else nova(resposta, alvoDe("proximo"), { type: "always" });
  nova(resposta, alvoDe("nao_respondeu"), { type: "branch", branch_id: NO_REPLY_BRANCH_ID });
  return arestas;
}

function arestaSimples(c: CaixaDoDesenho, alvo: Alvo, n: number): Aresta {
  return { id: `a-${c.id}-${n + 1}`, source: c.id, target: alvo(c.id, "proximo"), priority: 0, condition: { type: "always" } };
}

/* ───────────────────────── a compilação ───────────────────────── */

function alcancaveis(d: Desenho, inicio: string): Set<string> {
  const vistas = new Set<string>();
  const fila = [inicio];
  while (fila.length > 0) {
    const atual = fila.shift()!;
    if (vistas.has(atual)) continue;
    vistas.add(atual);
    for (const l of d.ligacoes) if (l.source === atual) fila.push(l.target);
  }
  return vistas;
}

function problemasDoZod(
  erro: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> },
  nos: No[],
): ProblemaDoDesenho[] {
  return erro.issues.map((i) => {
    const indice = i.path[0] === "nodes" && typeof i.path[1] === "number" ? i.path[1] : null;
    const id = indice !== null ? nos[indice]?.id : undefined;
    const caixa = id ? id.replace(SUFIXO_DA_RESPOSTA, "") : null;
    return { caixa, mensagem: caixa ? PROBLEMAS.acaoIncompleta : i.message };
  });
}

function compilarFluxo(e: Entrada): Compilado {
  const problemas: ProblemaDoDesenho[] = [];
  const d = e.desenho;
  const gatilho = d.caixas.find((c) => c.data.kind === "gatilho");
  if (!gatilho || gatilho.data.kind !== "gatilho") return { ok: false, problemas: [{ caixa: null, mensagem: PROBLEMAS.semGatilho }] };
  const { evento, tela } = gatilho.data;
  if (!e.nome.trim()) problemas.push({ caixa: null, mensagem: PROBLEMAS.semNome });
  if (!evento) problemas.push({ caixa: gatilho.id, mensagem: PROBLEMAS.semEvento });

  const filtro = filtroInicial(d, gatilho.id);
  const alcance = alcancaveis(d, gatilho.id);
  for (const c of d.caixas) if (!alcance.has(c.id)) problemas.push({ caixa: c.id, mensagem: PROBLEMAS.foraDaAutomacao });
  const ignoradas = new Set([...(filtro ? [filtro.caixa.id] : []), ...d.caixas.filter((c) => !alcance.has(c.id)).map((c) => c.id)]);
  const mapa = agruparAcoes(d, ignoradas);

  let usaFim = false;
  const alvo: Alvo = (origem, s) => {
    const real = origem === gatilho.id && filtro ? filtro.caixa.id : origem;
    const l = d.ligacoes.find((x) => x.source === real && (saidaDa(x) === s || (s === "proximo" && saidaEfetiva(d, x) === "proximo")));
    if (!l) {
      usaFim = true;
      return ID_DO_FIM;
    }
    return mapa.absorvida.get(l.target) ?? l.target;
  };

  const nos: No[] = [];
  const arestas: Aresta[] = [];
  for (const c of d.caixas) {
    if (ignoradas.has(c.id) || mapa.absorvida.has(c.id)) continue;
    nos.push(...noDaCaixa(c, mapa, problemas));
    if (c.data.kind === "gatilho" || c.data.kind === "atraso") arestas.push(arestaSimples(c, alvo, arestas.length));
    else arestas.push(...arestasDaCaixa(c, d, mapa, alvo));
    if (mensagemTemResposta(d, c)) nos.push(respostaDaMensagem(c, d));
  }
  if (usaFim) nos.push({ id: ID_DO_FIM, position: { x: 0, y: 0 }, type: "end", label: "Fim", config: { outcome: "custom", note: "Saída não conectada" } });

  if (nos.length > LIMITE_DE_NOS || arestas.length > LIMITE_DE_ARESTAS) problemas.push({ caixa: null, mensagem: RECUSA_TAMANHO_MAXIMO });
  if (problemas.length > 0) return { ok: false, problemas };

  const grafo = flowGraphSchema.safeParse({ nodes: nos, edges: arestas });
  if (!grafo.success) return { ok: false, problemas: problemasDoZod(grafo.error, nos) };
  const regra = {
    name: e.nome,
    trigger_event: evento,
    conditions: filtro ? linhasValidas(filtro.linhas) : [],
    trigger_config: triggerConfigDaTela(evento, tela, e.regraGravada),
  };
  return { ok: true, modo: "fluxo", regra, grafo: grafo.data };
}

export function compilar(e: Entrada): Compilado {
  if (modoDoDesenho(e.desenho) === "fluxo") return compilarFluxo(e);
  const r = validarDesenho(e);
  if (!r.ok) return { ok: false, problemas: r.problemas };
  return { ok: true, modo: "regra", corpo: corpoDoDesenho(e) };
}
