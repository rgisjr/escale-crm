/**
 * O tradutor do detalhamento (fork Escale, Fase 7E, T8/T9): a mesma pergunta sem agregação, com as
 * colunas do catálogo. Nenhum identificador vem do cliente: colunas, ordem e medida são ids do
 * catálogo; valores do ponto clicado e chaves de campos personalizados vão em `$n`.
 */
import { medidaPorId, tempoPorId } from "../catalogo";
import {
  LINHAS_DO_CSV_DO_DETALHAMENTO_MAX,
  LINHAS_DO_DETALHAMENTO_MAX,
  type Assunto,
  type ColunaDoDetalhamento,
} from "../catalogo/tipos";
import type { Detalhamento, DetalhamentoParaCsv } from "../pergunta";
import { ErroDoMotor } from "./erros";
import { filtroFixoSql, filtroSql, frag, intervaloEfetivo, Montagem, painelSql, type Contexto } from "./sql";
import { lerCampoDinamico } from "../catalogo/campos-personalizados";

const TRUNC = { hora: "hour", dia: "day", semana: "week", mes: "month", trimestre: "quarter", ano: "year" } as const;

export interface ColunaDaPagina {
  chave: string;
  nome: string;
  formato: ColunaDoDetalhamento["formato"] | null;
}
export interface SqlDoDetalhamento {
  text: string;
  values: unknown[];
  /** Na ordem do SELECT (a coluna `total`, quando há, vem depois). */
  colunas: ColunaDaPagina[];
  assunto: string;
}

/** Os aliases de join que um fragmento cita. */
const aliasesCitados = (assunto: Assunto, sql: string): string[] =>
  Object.keys(assunto.joins).filter((a) => new RegExp(String.raw`\b${a}\.`).test(sql));

/** O predicado de linha do indicador; `null` = toda linha conta. Calculado = A ou B. */
function predicadoDoIndicador(d: Detalhamento | DetalhamentoParaCsv): string | null {
  const calc = d.pergunta.calculados.find((c) => c.id === d.indicador);
  const ids = calc ? [calc.a, calc.b] : [d.indicador];
  const predicados = ids.map((id) => medidaPorId(id)?.medida.detalheSql);
  if (predicados.some((x) => !x)) return null;
  return predicados.length === 1 ? (predicados[0] as string) : predicados.map((x) => `(${x})`).join(" or ");
}

export function montarSqlDoDetalhamento(
  d: Detalhamento | DetalhamentoParaCsv,
  ctx: Contexto,
  modo: "pagina" | "csv" = "pagina",
): SqlDoDetalhamento {
  const operando = d.pergunta.calculados.find((c) => c.id === d.indicador)?.a ?? d.indicador;
  const achada = medidaPorId(operando);
  if (!achada) throw new ErroDoMotor("pergunta_invalida", `Indicador ${operando} não existe.`);
  if (achada.medida.semDetalhe) throw new ErroDoMotor("sem_detalhamento");
  const { assunto } = achada;
  const m = new Montagem(assunto, ctx);
  const alias = assunto.base.alias;

  // Colunas: as pedidas (na ordem do catálogo) ou todas; depois os campos personalizados pedidos.
  const pedidas = d.colunas ? new Set(d.colunas) : null;
  const doCatalogo = assunto.colunasDoDetalhamento.filter((c) => !pedidas || pedidas.has(c.chave));
  const dinamicas = (d.colunas ?? []).filter((c) => lerCampoDinamico(c));
  const selecao: string[] = [];
  const colunas: ColunaDaPagina[] = [];
  const aliasDe = new Map<string, string>();
  const adicionar = (chave: string, nome: string, expr: string, formato: ColunaDaPagina["formato"]): void => {
    const k = `k${selecao.length}`;
    selecao.push(`${expr} as ${k}`);
    colunas.push({ chave, nome, formato });
    aliasDe.set(chave, k);
  };
  for (const c of doCatalogo) {
    m.usar(c.precisa);
    adicionar(c.chave, c.nome, frag(c.sql), c.formato ?? null);
  }
  for (const id of dinamicas) {
    const campo = m.campo(id);
    if (!campo) throw new ErroDoMotor("pergunta_invalida", `Coluna ${id} não existe.`);
    m.usar(campo.precisa);
    adicionar(id, campo.nome, campo.expr, null);
  }
  if (!selecao.length) throw new ErroDoMotor("pergunta_invalida", "Nenhuma coluna escolhida.");

  // Filtros
  const onde: string[] = [`${alias}.organization_id = $1`];
  if (assunto.base.condicaoFixa) onde.push(assunto.base.condicaoFixa);
  const campoDeTempo = d.pergunta.tempo ? tempoPorId(d.pergunta.tempo.campo)?.tempo : undefined;
  const intervalo = intervaloEfetivo(d.pergunta, d.filtroDoPainel, ctx);
  if (intervalo && campoDeTempo) {
    m.usar(campoDeTempo.precisa);
    const expr = frag(campoDeTempo.sql);
    onde.push(
      `${expr} >= (${m.parametros.add(intervalo.de)}::date)::timestamp at time zone $2`,
      `${expr} < (${m.parametros.add(intervalo.ate)}::date + 1)::timestamp at time zone $2`,
    );
  }
  const doFiltro = filtroSql(m, d.pergunta.filtro);
  if (doFiltro) onde.push(doFiltro);
  onde.push(...filtroFixoSql(m, d.pergunta, []));
  onde.push(...painelSql(m, d.filtroDoPainel, []));

  const predicado = predicadoDoIndicador(d);
  if (predicado) {
    m.usar(aliasesCitados(assunto, predicado));
    onde.push(`(${frag(predicado)})`);
  }

  // O ponto clicado
  for (const v of d.ponto.variaveis) {
    const campo = m.campo(v.id);
    if (!campo) throw new ErroDoMotor("pergunta_invalida", `Variável ${v.id} não existe.`);
    m.usar(campo.precisaDaChave);
    onde.push(v.valor === null ? `${campo.expr} is null` : `${campo.expr}::text = ${m.parametros.add(v.valor)}`);
  }
  if (d.ponto.t && campoDeTempo && d.pergunta.tempo?.granularidade) {
    m.usar(campoDeTempo.precisa);
    const g = TRUNC[d.pergunta.tempo.granularidade];
    onde.push(`date_trunc('${g}', (${frag(campoDeTempo.sql)} at time zone $2)) = ${m.parametros.add(d.ponto.t)}::timestamp`);
  }
  if ((d.ponto.diaDaSemana !== undefined || d.ponto.hora !== undefined) && campoDeTempo) {
    m.usar(campoDeTempo.precisa);
    const base = `(${frag(campoDeTempo.sql)} at time zone $2)`;
    if (d.ponto.diaDaSemana !== undefined) onde.push(`extract(isodow from ${base})::int = ${m.parametros.add(d.ponto.diaDaSemana)}::int`);
    if (d.ponto.hora !== undefined) onde.push(`extract(hour from ${base})::int = ${m.parametros.add(d.ponto.hora)}::int`);
  }

  // Ordem: coluna escolhida (alias kN) ou a primeira data, do mais novo ao mais antigo; desempate pelo id.
  const colunaOrdenada = d.ordem ? aliasDe.get(d.ordem.coluna) : undefined;
  const primeiraData = doCatalogo.find((c) => c.tipo === "data");
  const porPadrao = primeiraData ? aliasDe.get(primeiraData.chave) : undefined;
  const ordem = colunaOrdenada
    ? `${colunaOrdenada} ${d.ordem?.direcao === "asc" ? "asc" : "desc"} nulls last`
    : porPadrao
      ? `${porPadrao} desc nulls last`
      : null;
  const teto = (modo === "csv" ? LINHAS_DO_CSV_DO_DETALHAMENTO_MAX : LINHAS_DO_DETALHAMENTO_MAX) + 1;
  const base = [
    `select ${selecao.join(", ")}`,
    `from ${assunto.base.tabela} ${alias}`,
    ...Object.entries(assunto.joins).filter(([a]) => m.aliases.has(a)).map(([, j]) => j.sql),
    `where ${onde.join(" and ")}`,
    `order by ${ordem ? `${ordem}, ` : ""}${alias}.id asc`,
    `limit ${teto}`,
  ].join(" ");
  if (modo === "csv") {
    return { text: `with base as (${base}) select * from base`, values: m.parametros.valores, colunas, assunto: assunto.id };
  }
  const pagina = "pagina" in d ? d.pagina : 1;
  const porPagina = "porPagina" in d ? d.porPagina : 10;
  const deslocamento = m.parametros.add((pagina - 1) * porPagina);
  const limite = m.parametros.add(porPagina);
  return {
    text: `with base as (${base}) select *, count(*) over() as total from base offset ${deslocamento} limit ${limite}`,
    values: m.parametros.valores,
    colunas,
    assunto: assunto.id,
  };
}
