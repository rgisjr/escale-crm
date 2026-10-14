/**
 * VISUALIZAÇÕES (fork Escale, Fase 1C): um quadro que junta várias origens, como
 * as "Visualizações" da Clint. Regras puras — o painel, as janelas, as rotas e o
 * quadro combinado usam as mesmas, para nunca dizerem coisas diferentes.
 *
 * Etapas com EXATAMENTE o mesmo nome (sem espaço nas pontas) viram uma coluna e
 * somam os cards; nomes diferentes viram colunas próprias. Cada card continua na
 * origem dele: arrastar leva para a etapa de mesmo nome NA ORIGEM DO CARD, e a
 * origem que não tem essa etapa recusa.
 *
 * Quem vê a visualização é a RLS (migration 9003); o que aparece dentro dela é a
 * RLS de cada origem, porque o quadro lê cada uma com a sessão de quem olha.
 */
import { normalizar } from "@/lib/catalogo/busca";
import { midpoint } from "@/lib/kanban/fractional-indexing";
import type { BoardData, Stage } from "@/lib/kanban/types";
import { proximoNaEtapaInteira } from "@/lib/kanban/vizinho-na-etapa";
import type { Lead } from "@/lib/types/leads";

import type { ArvoreDeOrigens, FunilDaOrigem, GrupoNaArvore, Origens, VereditoDeNome } from "../origens/regras";

/** O mesmo CHECK `crm_pipeline_views_acesso_valido` (migration 9003). */
export const ACESSOS_DE_VISUALIZACAO = ["todos", "escolhidos"] as const;
export type AcessoDaVisualizacao = (typeof ACESSOS_DE_VISUALIZACAO)[number];

/** O mesmo teto do CHECK `crm_pipeline_views_nome_valido`. */
export const NOME_DE_VISUALIZACAO_MAX = 60;
/** O mesmo teto de `fn_escale_salvar_visualizacao`: cada origem é um quadro inteiro lido. */
export const VISUALIZACAO_MAX_ORIGENS = 20;

export interface Visualizacao {
  id: string;
  name: string;
  acesso: AcessoDaVisualizacao;
  /** Os funis, na ordem das colunas. */
  origens: string[];
  /** Quem vê com acesso "escolhidos". Só gerente+ recebe a lista inteira (RLS). */
  pessoas: string[];
}

const chave = (nome: string) => normalizar(nome).trim();

export function validarNomeDeVisualizacao(
  bruto: string,
  visualizacoes: readonly Pick<Visualizacao, "id" | "name">[],
  ignorarId: string | null,
): VereditoDeNome {
  const nome = bruto.trim().replace(/\s+/g, " ");
  if (!nome) return { ok: false, erro: "Dê um nome à visualização." };
  if (nome.length > NOME_DE_VISUALIZACAO_MAX) {
    return { ok: false, erro: "O nome da visualização pode ter até 60 caracteres." };
  }
  // Mais estrito que o índice do banco (que só ignora caixa), como nos grupos.
  const procurado = chave(nome);
  if (visualizacoes.some((v) => v.id !== ignorarId && chave(v.name) === procurado)) {
    return { ok: false, erro: "Já existe uma visualização com esse nome." };
  }
  return { ok: true, nome };
}

export function validarOrigensDaVisualizacao(
  pedidas: readonly string[],
  origens: Origens,
): { ok: true; ids: string[] } | { ok: false; erro: string } {
  const ids = [...new Set(pedidas)];
  if (ids.length === 0 || ids.length > VISUALIZACAO_MAX_ORIGENS) {
    return { ok: false, erro: "Uma visualização junta de 1 a 20 origens." };
  }
  // `origens` é o que a sessão lê da PRÓPRIA organização: id do vizinho não está aqui.
  const vivas = new Set(origens.funis.filter((f) => !f.is_archived).map((f) => f.id));
  if (ids.some((id) => !vivas.has(id))) return { ok: false, erro: "Escolha origens ativas desta organização." };
  return { ok: true, ids };
}

export interface GravacaoDeVisualizacao {
  nome: string;
  acesso: AcessoDaVisualizacao;
  origens: string[];
  pessoas: string[];
}

/** O que a rota manda para `fn_escale_salvar_visualizacao`, já validado. `erro` é chave do dicionário. */
export function montarGravacao(
  pedido: { name: string; acesso: AcessoDaVisualizacao; origens: readonly string[]; pessoas: readonly string[] },
  origens: Origens,
  visualizacoes: readonly Visualizacao[],
  ignorarId: string | null,
): { ok: true; gravacao: GravacaoDeVisualizacao } | { ok: false; erro: string } {
  const nome = validarNomeDeVisualizacao(pedido.name, visualizacoes, ignorarId);
  if (!nome.ok) return nome;
  const escolhidas = validarOrigensDaVisualizacao(pedido.origens, origens);
  if (!escolhidas.ok) return escolhidas;
  // Acesso "todos" não guarda lista: uma lista esquecida voltaria a valer se
  // alguém trocasse para "escolhidos" sem olhar.
  const pessoas = pedido.acesso === "escolhidos" ? [...new Set(pedido.pessoas)] : [];
  if (pedido.acesso === "escolhidos" && pessoas.length === 0) {
    return { ok: false, erro: "Escolha quem vê a visualização." };
  }
  return { ok: true, gravacao: { nome: nome.nome, acesso: pedido.acesso, origens: escolhidas.ids, pessoas } };
}

/** As origens que o quadro abre: as da visualização, na ordem dela, sem arquivada nem apagada. */
export function origensVivasDaVisualizacao(v: Pick<Visualizacao, "origens">, origens: Origens): FunilDaOrigem[] {
  const porId = new Map(origens.funis.map((f) => [f.id, f]));
  return v.origens.flatMap((id) => {
    const funil = porId.get(id);
    return funil && !funil.is_archived ? [funil] : [];
  });
}

/** A seleção do painel na ordem do próprio painel: é a ordem das colunas. */
export function ordenarNaArvore(marcadas: ReadonlySet<string>, arvore: ArvoreDeOrigens): string[] {
  return [...arvore.grupos.flatMap((g) => g.funis), ...arvore.semGrupo]
    .map((f) => f.id)
    .filter((id) => marcadas.has(id));
}

export type EstadoDaCaixa = "marcada" | "parcial" | "vazia";

export function estadoDoGrupo(grupo: Pick<GrupoNaArvore, "funis">, marcadas: ReadonlySet<string>): EstadoDaCaixa {
  const marcadasAqui = grupo.funis.filter((f) => marcadas.has(f.id)).length;
  if (marcadasAqui === 0) return "vazia";
  return marcadasAqui === grupo.funis.length ? "marcada" : "parcial";
}

export function alternarNaSelecao(marcadas: ReadonlySet<string>, ids: readonly string[], marcar: boolean): Set<string> {
  const proxima = new Set(marcadas);
  for (const id of ids) {
    if (marcar) proxima.add(id);
    else proxima.delete(id);
  }
  return proxima;
}

/** A visualização aberta no quadro (`/app/pipelines/visualizacoes/<id>`), ou `null` fora dele. */
export function visualizacaoDoCaminho(pathname: string): string | null {
  return /^\/app\/pipelines\/visualizacoes\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}

/** A lupa do painel também procura nas visualizações (sem acento, sem caixa). */
export function filtrarVisualizacoes<V extends Pick<Visualizacao, "name">>(lista: readonly V[], busca: string): V[] {
  const termo = chave(busca);
  return termo ? lista.filter((v) => chave(v.name).includes(termo)) : [...lista];
}

// ── O quadro combinado ──────────────────────────────────────────────────────

export interface ColunaCombinada {
  /** O `droppableId`: o nome, que é o que junta as etapas. */
  chave: string;
  nome: string;
  /** A cor da primeira etapa que deu nome à coluna. */
  cor: string | null;
  /** Origem → a etapa de destino dela nesta coluna (a primeira com esse nome). */
  destinos: Record<string, string>;
  /** Todas as etapas com esse nome, de todas as origens. */
  etapas: string[];
}

export function montarColunas(quadros: readonly Pick<BoardData, "pipeline" | "stages">[]): ColunaCombinada[] {
  const colunas: ColunaCombinada[] = [];
  for (const quadro of quadros) {
    // A coluna nova de uma origem entra logo depois da última coluna DESSA
    // origem: "Entrada, Atendimento, Proposta" + "Entrada, Qualificação,
    // Proposta" dá "Entrada, Qualificação, Atendimento, Proposta".
    let anterior = -1;
    const etapas = [...quadro.stages].sort((a, b) => a.position - b.position);
    for (const etapa of etapas) {
      const nome = etapa.name.trim();
      let indice = colunas.findIndex((c) => c.nome === nome);
      if (indice < 0) {
        // Depois da última coluna já vista NESTA origem; sem nenhuma vista
        // ainda (primeira etapa dela sem casar com coluna existente), vai pro
        // fim — nunca na frente de colunas de OUTRA origem já colocadas.
        indice = anterior + 1 > 0 ? anterior + 1 : colunas.length;
        colunas.splice(indice, 0, { chave: `coluna:${nome}`, nome, cor: etapa.color, destinos: {}, etapas: [] });
      }
      const coluna = colunas[indice]!;
      coluna.etapas.push(etapa.id);
      if (!(quadro.pipeline.id in coluna.destinos)) coluna.destinos[quadro.pipeline.id] = etapa.id;
      anterior = indice;
    }
  }
  return colunas;
}

/** Os cards da coluna, de todas as origens, na ordem das posições. */
export function cardsDaColuna(coluna: Pick<ColunaCombinada, "etapas">, leads: readonly Lead[]): Lead[] {
  const etapas = new Set(coluna.etapas);
  return leads.filter((l) => etapas.has(l.stage_id)).sort((a, b) => a.position_in_stage - b.position_in_stage);
}

export type Soltura =
  | { tipo: "nada" }
  | { tipo: "recusa" }
  | { tipo: "mover"; pipelineId: string; stageId: string; positionInStage: number };

/**
 * Onde o card cai. `visiveis` é a coluna como está na tela (filtrada); a posição
 * só faz sentido entre cards da MESMA etapa de destino, então os vizinhos de
 * outras origens são pulados. `etapaInteira` é a etapa de destino sem filtro, do
 * cache do quadro da origem do card (o mesmo cuidado de #2545 no funil).
 */
export function planejarSoltura(args: {
  lead: Pick<Lead, "id" | "pipeline_id">;
  coluna: Pick<ColunaCombinada, "destinos">;
  visiveis: readonly Lead[];
  indice: number;
  etapaInteira: readonly Lead[] | null;
}): Soltura {
  const stageId = args.coluna.destinos[args.lead.pipeline_id];
  if (!stageId) return { tipo: "recusa" };
  const lista = args.visiveis.filter((l) => l.id !== args.lead.id);
  const daEtapa = (l: Lead) => l.stage_id === stageId;
  const acima = [...lista.slice(0, args.indice)].reverse().find(daEtapa) ?? null;
  const abaixo = lista.slice(args.indice).find(daEtapa) ?? null;
  const depois = proximoNaEtapaInteira(acima, abaixo, args.etapaInteira, args.lead.id);
  const posicao = midpoint(acima?.position_in_stage ?? null, depois?.position_in_stage ?? null);
  if (Number.isNaN(posicao)) return { tipo: "nada" };
  return { tipo: "mover", pipelineId: args.lead.pipeline_id, stageId, positionInStage: posicao };
}

/**
 * Os `settings` que o filtro do quadro combinado lê: os motivos de perda de
 * todas as origens juntos, para o filtro por categoria enxergar todos.
 */
export function settingsDaVisualizacao(quadros: readonly Pick<BoardData, "pipeline">[]): Record<string, unknown> {
  const lost_reasons = quadros.flatMap((q) => {
    const bruto = (q.pipeline.settings as { lost_reasons?: unknown } | null | undefined)?.lost_reasons;
    return Array.isArray(bruto) ? bruto : [];
  });
  return { lost_reasons };
}
