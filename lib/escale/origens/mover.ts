/**
 * ARRASTAR ORIGENS NO PAINEL (fork Escale): o que gravar quando alguém solta
 * uma origem, e como a lista fica até o servidor responder.
 *
 * A ordem das origens é a `position` de `crm_pipelines`, UMA régua para a
 * organização inteira; cada grupo mostra as suas na ordem dessa régua. Por isso
 * o vizinho mandado ao servidor (`depois_de` de `PATCH /api/v1/pipelines/[id]`)
 * é sempre um funil ATIVO da régua, e a régua daqui é a mesma da rota: ativos,
 * sem a origem arrastada.
 */
import { montarOrigens, type FunilDaOrigem, type Origens } from "./regras";

export interface MovimentoDeOrigem {
  id: string;
  /** O grupo novo, só quando a origem muda de grupo. */
  grupoNovo: string | null;
  /** O funil ativo logo acima na régua da organização; `null` = primeiro da régua. */
  depoisDe: string | null;
}

/** O que o `@hello-pangea/dnd` conta ao soltar: a origem, o grupo de saída, o de chegada e a posição nele. */
export interface Arraste {
  id: string;
  de: string;
  para: string;
  indice: number;
}

/** `null` quando não há o que gravar (mesmo lugar ou grupo que não está na árvore). */
export function movimentoDoArraste(origens: Origens, { id, de, para, indice }: Arraste): MovimentoDeOrigem | null {
  const destino = montarOrigens(origens).grupos.find((g) => g.id === para);
  if (!destino) return null;
  if (de === para && destino.funis.findIndex((f) => f.id === id) === indice) return null;
  const resto = destino.funis.filter((f) => f.id !== id);
  const regua = origens.funis.filter((f) => !f.is_archived && f.id !== id);
  return { id, grupoNovo: de === para ? null : para, depoisDe: vizinhoDeCima(resto, regua, indice) };
}

function vizinhoDeCima(resto: FunilDaOrigem[], regua: FunilDaOrigem[], indice: number): string | null {
  if (indice > 0) return resto[indice - 1]?.id ?? null;
  const primeira = resto[0];
  // Grupo vazio: a origem vai para o fim da régua.
  if (!primeira) return regua.at(-1)?.id ?? null;
  // Topo do grupo: logo abaixo de quem vem antes da atual primeira, sem passar
  // à frente das origens dos outros grupos.
  const k = regua.findIndex((f) => f.id === primeira.id);
  return k > 0 ? (regua[k - 1]?.id ?? null) : null;
}

/** A lista como fica depois do movimento, sem esperar o servidor. Nova lista; a original não muda. */
export function moverNaLista(origens: Origens, { id, grupoNovo, depoisDe }: MovimentoDeOrigem): Origens {
  const alvo = origens.funis.find((f) => f.id === id);
  if (!alvo) return origens;
  const movido = grupoNovo ? { ...alvo, group_id: grupoNovo } : alvo;
  const resto = origens.funis.filter((f) => f.id !== id);
  const i = depoisDe === null ? 0 : resto.findIndex((f) => f.id === depoisDe) + 1;
  return { ...origens, funis: [...resto.slice(0, i), movido, ...resto.slice(i)] };
}

/**
 * Arrastar para outro grupo são duas escritas (grupo, depois posição). Quando só a
 * segunda falha, a origem JÁ está no grupo novo no banco: `origens` é a lista relida
 * de lá, para a tela não voltar a origem a um grupo onde ela não está mais.
 */
export class PosicaoNaoGravada extends Error {
  constructor(
    public readonly causa: unknown,
    public readonly origens: Origens,
  ) {
    super(causa instanceof Error ? causa.message : "posição não gravada");
    this.name = "PosicaoNaoGravada";
  }
}
