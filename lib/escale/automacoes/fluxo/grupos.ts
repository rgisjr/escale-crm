import {
  excluirCaixa,
  percorrer,
  type AcaoDaRegra,
  type CaixaDoDesenho,
  type DadosDaAcao,
  type DadosDaCaixa,
  type Desenho,
} from "@/lib/automation/desenho-da-regra";

import { tipoDoNo } from "./paleta";

/**
 * FORK ESCALE · Fase 5B (ajuste): o passo "Ações" da Clint tem VÁRIAS ações dentro. O
 * motor tem uma ação por passo da fila, então o agrupamento é só de tela: na tela, o
 * passo é uma caixa de ação "esperta" (`acao.type === TIPO_DO_GRUPO`, com a lista em
 * `config.acoes`); antes de validar e de gravar, `achatar` devolve a fila do motor, uma
 * caixa por ação e na mesma ordem. O corpo gravado é o mesmo de sempre.
 */
export const TIPO_DO_GRUPO = "grupo_de_acoes";
/** O aviso do passo "Ações" que ficou sem nenhuma ação (a próxima gravação o aponta). */
export const PROBLEMA_DO_GRUPO_VAZIO = "Adicione pelo menos uma ação neste passo.";
/** O separador do id da ação dentro do grupo: `acao-1__0`, `acao-1__1`. */
const SEPARADOR = "__";

export type DadosDoGrupo = DadosDaAcao & { acao: { type: typeof TIPO_DO_GRUPO } };

export function ehGrupo(dados: DadosDaCaixa): dados is DadosDoGrupo {
  return dados.kind === "acao" && dados.acao.type === TIPO_DO_GRUPO;
}

/** As ações de um passo "Ações" (lista vazia se o dado não é um grupo ou está torto). */
export function acoesDoGrupo(dados: DadosDaCaixa): AcaoDaRegra[] {
  if (!ehGrupo(dados)) return [];
  const lista = dados.acao.config.acoes;
  return Array.isArray(lista) ? (lista as AcaoDaRegra[]) : [];
}

/** Os dados de um passo "Ações" com estas ações (sem problemas: a próxima gravação confere de novo). */
export function dadosDoGrupo(acoes: readonly AcaoDaRegra[]): DadosDaAcao {
  return { kind: "acao", acao: { type: TIPO_DO_GRUPO, config: { acoes: [...acoes] } } };
}

export function novoGrupo(id: string, posicao: { x: number; y: number }, acoes: readonly AcaoDaRegra[] = []): CaixaDoDesenho {
  return { id, type: "acao", position: posicao, data: dadosDoGrupo(acoes) };
}

/** O id da caixa na tela a que um id do desenho achatado pertence (`acao-1__2` → `acao-1`). */
export function idNaTela(idAchatado: string): string {
  const i = idAchatado.indexOf(SEPARADOR);
  return i < 0 ? idAchatado : idAchatado.slice(0, i);
}

/**
 * Do desenho do motor (uma caixa por ação) para o da tela: ações seguidas do mesmo tipo
 * "Ações" (tag, tarefa, webhook, mover, atribuir…) viram um passo só; WhatsApp, e-mail e
 * IA seguem como passos próprios. O id do grupo é o da primeira ação dele.
 */
export function agrupar(desenho: Desenho): Desenho {
  const { fila } = percorrer(desenho);
  const caixas: CaixaDoDesenho[] = [];
  /** A posição, em `caixas`, do grupo que ainda aceita a próxima ação (nenhum, depois de um canal). */
  let aberto = -1;
  for (const c of fila) {
    const comum = c.data.kind === "acao" && tipoDoNo(c.data) === "acoes";
    if (!comum) {
      aberto = -1;
      caixas.push(c);
      continue;
    }
    const acao = (c.data as DadosDaAcao).acao;
    if (aberto >= 0) {
      const grupo = caixas[aberto]!;
      caixas[aberto] = { ...grupo, data: dadosDoGrupo([...acoesDoGrupo(grupo.data), acao]) };
    } else {
      caixas.push(novoGrupo(c.id, c.position, [acao]));
      aberto = caixas.length - 1;
    }
  }
  const ligacoes = caixas.slice(1).map((c, i) => ({ id: `ligacao-${i + 1}`, source: caixas[i]!.id, target: c.id }));
  return { caixas, ligacoes };
}

/**
 * Da tela para o desenho do motor: cada grupo vira uma caixa por ação, ligadas em fila, e
 * o grupo vazio some (a fila se fecha por cima dele, como ao excluir a caixa). É esta
 * fila que `validarDesenho` confere e de onde sai o corpo gravado.
 */
export function achatar(desenho: Desenho): Desenho {
  let atual = desenho;
  for (const c of desenho.caixas) {
    if (ehGrupo(c.data) && acoesDoGrupo(c.data).length === 0) atual = excluirCaixa(atual, c.id);
  }
  const caixas: CaixaDoDesenho[] = [];
  const primeira = new Map<string, string>();
  const ultima = new Map<string, string>();
  const dentro: Desenho["ligacoes"] = [];
  let n = 0;
  const proximaLigacao = () => `ligacao-${(n += 1)}`;
  for (const c of atual.caixas) {
    if (!ehGrupo(c.data)) {
      caixas.push(c);
      primeira.set(c.id, c.id);
      ultima.set(c.id, c.id);
      continue;
    }
    const ids = acoesDoGrupo(c.data).map((acao, i) => {
      const id = `${c.id}${SEPARADOR}${i}`;
      caixas.push({ id, type: "acao", position: c.position, data: { kind: "acao", acao } });
      return id;
    });
    primeira.set(c.id, ids[0]!);
    ultima.set(c.id, ids[ids.length - 1]!);
    ids.slice(1).forEach((id, i) => dentro.push({ id: proximaLigacao(), source: ids[i]!, target: id }));
  }
  const fora = atual.ligacoes.map((l) => ({
    id: proximaLigacao(),
    source: ultima.get(l.source) ?? l.source,
    target: primeira.get(l.target) ?? l.target,
  }));
  return { caixas, ligacoes: [...dentro, ...fora] };
}

/** Quantas ações o desenho da tela tem de verdade (cada grupo conta as suas). */
export function contarAcoes(desenho: Desenho): number {
  return desenho.caixas.reduce((total, c) => {
    if (c.data.kind !== "acao") return total;
    return total + (ehGrupo(c.data) ? acoesDoGrupo(c.data).length : 1);
  }, 0);
}

/** Os passos "Ações" sem nenhuma ação: a pessoa os criou e não preencheu. */
export function gruposVazios(desenho: Desenho): CaixaDoDesenho[] {
  return desenho.caixas.filter((c) => ehGrupo(c.data) && acoesDoGrupo(c.data).length === 0);
}
