/**
 * O RASCUNHO DO GRÁFICO (fork Escale, Fase 7D): o que a lateral do editor edita. Aceita estados incompletos
 * (condição sem valor, sem tempo); `perguntaDoRascunho` converte para a pergunta do motor. Toda função
 * devolve uma cópia — o rascunho nunca é mutado.
 */
import { VARIAVEIS_POR_PERGUNTA_MAX } from "../catalogo/tipos";
import { opcoesDoGraficoNovo, type OpcoesDoGrafico } from "../graficos/opcoes";
import type { TipoPrincipal } from "../graficos/tipos";
import type { Granularidade, Operador, Periodo } from "../pergunta";
import { assuntoDoRascunho, tipoDoCampo, type CatalogoDaTela } from "./catalogo-da-tela";
import { operadoresDoTipo, precisaDeValor } from "./operadores";
import { horaDisponivel, periodoPadrao } from "./periodo-do-editor";
import { limiteDoTipo, TIPO_PADRAO } from "./tipos-de-grafico";

export type ValorDaCondicao = string | number | boolean | string[];
export type CondicaoDoRascunho = { chave: string; campo: string | null; op: Operador; valor?: ValorDaCondicao };
export type CaixaDoFiltro = { chave: string; modo: "todas" | "qualquer"; condicoes: readonly CondicaoDoRascunho[] };
export type RascunhoDoGrafico = {
  tipo: TipoPrincipal;
  indicadores: readonly string[];
  variaveis: readonly string[];
  tempo: { campo: string | null; granularidade: Granularidade | null; periodo: Periodo; fixo: boolean };
  /** [0] = principal; [1..] = "Novo grupo". */
  filtro: readonly CaixaDoFiltro[];
  ordem: { por: string | null; direcao: "asc" | "desc" };
  opcoes: OpcoesDoGrafico;
};

/** A caixa principal e até 3 grupos (a 7A aceita 3 `grupos`; com a principal em "qualquer" ela também vira grupo). */
export const CAIXAS_MAX = 4;

const chaveAleatoria = (): string => globalThis.crypto.randomUUID();
let geradorDeChave: () => string = chaveAleatoria;
/** Só os testes trocam. */
export function definirGeradorDeChave(g: (() => string) | null): void {
  geradorDeChave = g ?? chaveAleatoria;
}
const caixaVazia = (): CaixaDoFiltro => ({ chave: geradorDeChave(), modo: "todas", condicoes: [] });

export function rascunhoNovo(tipo: TipoPrincipal = TIPO_PADRAO): RascunhoDoGrafico {
  return {
    tipo,
    indicadores: [],
    variaveis: [],
    tempo: { campo: null, granularidade: null, periodo: periodoPadrao(), fixo: false },
    filtro: [caixaVazia()],
    ordem: { por: null, direcao: "asc" },
    opcoes: opcoesDoGraficoNovo(),
  };
}

export { assuntoDoRascunho };

function ordemSemOQueSaiu(r: RascunhoDoGrafico, indicadores: readonly string[], variaveis: readonly string[]): RascunhoDoGrafico["ordem"] {
  return r.ordem.por && ![...indicadores, ...variaveis].includes(r.ordem.por) ? { ...r.ordem, por: null } : r.ordem;
}

export function adicionarIndicador(r: RascunhoDoGrafico, id: string, cat: CatalogoDaTela): RascunhoDoGrafico {
  if (r.indicadores.includes(id) || r.indicadores.length >= limiteDoTipo(r.tipo)) return r;
  const comIndicador = { ...r, indicadores: [...r.indicadores, id] };
  if (r.tempo.campo) return comIndicador;
  // S21: o primeiro indicador sem tempo traz o campo de tempo padrão do assunto, agrupado por dia (S12).
  const assunto = cat.assuntos.find((a) => a.id === id.slice(0, id.indexOf(".")));
  const padrao = assunto?.tempos.find((t) => t.padrao) ?? assunto?.tempos[0];
  if (!padrao) return comIndicador;
  return { ...comIndicador, tempo: { ...r.tempo, campo: padrao.id, granularidade: "dia" } };
}

export function removerIndicador(r: RascunhoDoGrafico, id: string): RascunhoDoGrafico {
  const indicadores = r.indicadores.filter((x) => x !== id);
  return { ...r, indicadores, ordem: ordemSemOQueSaiu(r, indicadores, r.variaveis) };
}

export function adicionarVariavel(r: RascunhoDoGrafico, id: string): RascunhoDoGrafico {
  if (r.variaveis.includes(id) || r.variaveis.length >= VARIAVEIS_POR_PERGUNTA_MAX) return r;
  return { ...r, variaveis: [...r.variaveis, id] };
}

export function removerVariavel(r: RascunhoDoGrafico, id: string): RascunhoDoGrafico {
  const variaveis = r.variaveis.filter((x) => x !== id);
  return { ...r, variaveis, ordem: ordemSemOQueSaiu(r, r.indicadores, variaveis) };
}

export function definirTempo(r: RascunhoDoGrafico, campo: string | null): RascunhoDoGrafico {
  if (campo === null) return { ...r, tempo: { ...r.tempo, campo: null, granularidade: null } };
  return { ...r, tempo: { ...r.tempo, campo, granularidade: r.tempo.granularidade ?? "dia" } };
}

export function mudarGranularidade(r: RascunhoDoGrafico, g: Granularidade | null): RascunhoDoGrafico {
  return { ...r, tempo: { ...r.tempo, granularidade: g } };
}

export function mudarFixo(r: RascunhoDoGrafico, fixo: boolean): RascunhoDoGrafico {
  return { ...r, tempo: { ...r.tempo, fixo } };
}

/** Hora com mais de 31 dias (ou "tudo") cai para "dia". */
export function mudarPeriodo(r: RascunhoDoGrafico, periodo: Periodo): RascunhoDoGrafico {
  const horaInvalida = r.tempo.granularidade === "hora" && !horaDisponivel(periodo);
  return { ...r, tempo: { ...r.tempo, periodo, granularidade: horaInvalida ? "dia" : r.tempo.granularidade } };
}

const trocarCaixa = (r: RascunhoDoGrafico, i: number, f: (c: CaixaDoFiltro) => CaixaDoFiltro): RascunhoDoGrafico => ({
  ...r,
  filtro: r.filtro.map((c, k) => (k === i ? f(c) : c)),
});

export function adicionarCondicao(r: RascunhoDoGrafico, caixa: number, campo: string, cat: CatalogoDaTela): RascunhoDoGrafico {
  if (!r.filtro[caixa]) return r;
  const op = operadoresDoTipo(tipoDoCampo(campo, cat) ?? "texto")[0] ?? "igual_a";
  return trocarCaixa(r, caixa, (c) => ({ ...c, condicoes: [...c.condicoes, { chave: geradorDeChave(), campo, op }] }));
}

const aceitaLista = (op: Operador): boolean => op === "igual_a" || op === "diferente_de";

/** Trocar o campo, ou o operador para um que não leva valor (ou que não aceita lista), apaga o valor. */
export function mudarCondicao(
  r: RascunhoDoGrafico,
  caixa: number,
  chave: string,
  mudanca: Partial<Omit<CondicaoDoRascunho, "chave">>,
): RascunhoDoGrafico {
  return trocarCaixa(r, caixa, (c) => ({
    ...c,
    condicoes: c.condicoes.map((x) => {
      if (x.chave !== chave) return x;
      const op = mudanca.op ?? x.op;
      const campoMudou = mudanca.campo !== undefined && mudanca.campo !== x.campo;
      const listaSemLugar = Array.isArray(x.valor) && !aceitaLista(op);
      const apagaValor = mudanca.valor === undefined && (campoMudou || !precisaDeValor(op) || listaSemLugar);
      const { valor: _antigo, ...semValor } = x;
      return apagaValor ? { ...semValor, ...mudanca } : { ...x, ...mudanca };
    }),
  }));
}

export function removerCondicao(r: RascunhoDoGrafico, caixa: number, chave: string): RascunhoDoGrafico {
  const sem = trocarCaixa(r, caixa, (c) => ({ ...c, condicoes: c.condicoes.filter((x) => x.chave !== chave) }));
  const vazia = sem.filtro[caixa]?.condicoes.length === 0;
  if (!vazia || caixa === 0) return sem;
  return { ...sem, filtro: sem.filtro.filter((_, k) => k !== caixa) };
}

export function mudarModoDaCaixa(r: RascunhoDoGrafico, caixa: number, modo: "todas" | "qualquer"): RascunhoDoGrafico {
  return trocarCaixa(r, caixa, (c) => ({ ...c, modo }));
}

export function novoGrupo(r: RascunhoDoGrafico): RascunhoDoGrafico {
  if (r.filtro.length >= CAIXAS_MAX) return r;
  return { ...r, filtro: [...r.filtro, caixaVazia()] };
}

export function trocarTipo(
  r: RascunhoDoGrafico,
  tipo: TipoPrincipal,
): { rascunho: RascunhoDoGrafico } | { excede: { limite: number; indicadores: readonly string[] } } {
  const limite = limiteDoTipo(tipo);
  if (r.indicadores.length > limite) return { excede: { limite, indicadores: r.indicadores } };
  return { rascunho: { ...r, tipo } };
}

/** Depois do modal "Limite de indicadores" (S14). */
export function manterIndicadores(r: RascunhoDoGrafico, tipo: TipoPrincipal, escolhidos: readonly string[]): RascunhoDoGrafico {
  const indicadores = r.indicadores.filter((x) => escolhidos.includes(x)).slice(0, limiteDoTipo(tipo));
  return { ...r, tipo, indicadores, ordem: ordemSemOQueSaiu(r, indicadores, r.variaveis) };
}

export function mudarOrdem(r: RascunhoDoGrafico, ordem: Partial<RascunhoDoGrafico["ordem"]>): RascunhoDoGrafico {
  return { ...r, ordem: { ...r.ordem, ...ordem } };
}

export function mudarOpcoes(r: RascunhoDoGrafico, f: (o: OpcoesDoGrafico) => OpcoesDoGrafico): RascunhoDoGrafico {
  return { ...r, opcoes: f(r.opcoes) };
}

const semChaves = (r: RascunhoDoGrafico) => ({
  ...r,
  filtro: r.filtro.map(({ chave: _c, ...caixa }) => ({
    ...caixa,
    condicoes: caixa.condicoes.map(({ chave: _k, ...x }) => x),
  })),
});
/** Igual sem contar as `chave`s de tela. */
export const mesmoRascunho = (a: RascunhoDoGrafico, b: RascunhoDoGrafico): boolean =>
  JSON.stringify(semChaves(a)) === JSON.stringify(semChaves(b));
