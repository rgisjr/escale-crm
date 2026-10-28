/**
 * O tradutor: pergunta validada → uma consulta SQL parametrizada (fork Escale, Fase 7A).
 * Puro, sem banco. Nenhum identificador vem do cliente: os ids viram os fragmentos do catálogo.
 */
import { dimensaoPorId, medidaPorId, tempoPorId } from "../catalogo";
import { lerCampoDinamico, type CampoDinamico } from "../catalogo/campos-personalizados";
import type { Assunto, TipoDeDimensao, Unidade } from "../catalogo/tipos";
import type { Condicao, FiltroDoPainel, Filtro, Granularidade, Pergunta } from "../pergunta";
import { Parametros, campoPersonalizadoSql, condicaoSql, tagsSql } from "./condicoes";
import { ErroDoMotor } from "./erros";
import { resolverPeriodo } from "./periodo";

export interface Contexto {
  orgId: string;
  fuso: string;
  agora: Date;
  camposDaOrg: ReadonlyMap<string, CampoDinamico>;
}
export type Coluna = {
  chave: string;
  nome: string;
  papel: "variavel" | "tempo" | "indicador" | "rotulo" | "moedas";
  unidade?: Unidade;
  tipo?: TipoDeDimensao;
};
export interface SqlMontado {
  text: string;
  values: unknown[];
  colunas: Coluna[];
  assunto: string;
  temMoeda: boolean;
  /** Filtros do painel que o assunto não aceita (a Clint ignora em vez de zerar o gráfico). */
  ignorados: string[];
}

const TRUNC: Record<Granularidade, string> = {
  hora: "hour",
  dia: "day",
  semana: "week",
  mes: "month",
  trimestre: "quarter",
  ano: "year",
};

/** O marcador `$fuso` dos fragmentos do catálogo vira o parâmetro fixo `$2`. */
const frag = (sql: string): string => sql.replaceAll("$fuso", "$2");

interface CampoSql {
  expr: string;
  rotulo?: string;
  tipo: TipoDeDimensao;
  uuid: boolean;
  precisa: readonly string[];
  /** Só os aliases que a chave usa (o rótulo pode exigir mais; o filtro compara a chave). */
  precisaDaChave: readonly string[];
  nome: string;
}

class Montagem {
  readonly parametros: Parametros;
  readonly aliases = new Set<string>();

  constructor(
    readonly assunto: Assunto,
    readonly ctx: Contexto,
  ) {
    this.parametros = new Parametros(ctx.orgId, ctx.fuso);
  }

  usar(precisa: readonly string[] | undefined): void {
    for (const alias of precisa ?? []) {
      if (this.aliases.has(alias)) continue;
      this.aliases.add(alias);
      this.usar(this.assunto.joins[alias]?.precisa);
    }
  }

  /** Resolve um id (dimensão do catálogo ou campo personalizado) para a expressão SQL. */
  campo(id: string): CampoSql | null {
    const dinamico = lerCampoDinamico(id);
    if (dinamico) {
      const def = this.ctx.camposDaOrg.get(id);
      const origem = this.assunto.camposPersonalizados[dinamico.objeto];
      if (!def || !origem) return null;
      return {
        expr: campoPersonalizadoSql(origem.sql, dinamico.chave, def.tipo, this.parametros),
        tipo: def.tipo,
        uuid: false,
        precisa: origem.precisa ?? [],
        precisaDaChave: origem.precisa ?? [],
        nome: def.nome,
      };
    }
    const achada = dimensaoPorId(id);
    if (!achada || achada.assunto.id !== this.assunto.id) return null;
    const d = achada.dimensao;
    return {
      expr: frag(d.sql),
      ...(d.rotuloSql ? { rotulo: frag(d.rotuloSql) } : {}),
      tipo: d.tipo,
      uuid: Boolean(d.uuid),
      precisa: d.precisa ?? [],
      precisaDaChave: (d.precisa ?? []).filter((a) => new RegExp(String.raw`\b${a}\.`).test(d.sql)),
      nome: d.nome,
    };
  }

  condicao(c: Condicao): string | null {
    const campo = this.campo(c.campo);
    if (!campo) return null;
    this.usar(campo.precisaDaChave);
    const expr = campo.uuid && campo.tipo === "texto" ? `${campo.expr}::text` : campo.expr;
    return condicaoSql(expr, campo.tipo, c, this.parametros);
  }
}

const juntar = (modo: "todas" | "qualquer", partes: string[]): string => {
  if (partes.length === 0) return "";
  return partes.length === 1 ? (partes[0] ?? "") : `(${partes.join(modo === "todas" ? " and " : " or ")})`;
};

function filtroSql(m: Montagem, filtro: Filtro): string | null {
  const grupos = filtro.grupos.map((g) => juntar(g.modo, g.condicoes.map((c) => m.condicao(c)).filter(nao_nulo)));
  const partes = [...filtro.condicoes.map((c) => m.condicao(c)).filter(nao_nulo), ...grupos.filter((g) => g)];
  return partes.length ? juntar(filtro.modo, partes) : null;
}
function nao_nulo<T>(v: T | null): v is T {
  return v !== null;
}

function painelSql(m: Montagem, painel: FiltroDoPainel | undefined, ignorados: string[]): string[] {
  if (!painel) return [];
  const { assunto, parametros } = m;
  const clausulas: string[] = [];
  const porLista: [keyof FiltroDoPainel, "usuario" | "origem" | "grupo_de_origem"][] = [
    ["usuarios", "usuario"],
    ["origens", "origem"],
    ["gruposDeOrigem", "grupo_de_origem"],
  ];
  for (const [chave, filtro] of porLista) {
    const lista = painel[chave] as string[] | undefined;
    if (!lista?.length) continue;
    const regra = assunto.filtroDoPainel[filtro];
    if (!regra) {
      ignorados.push(chave);
      continue;
    }
    m.usar(regra.precisa);
    clausulas.push(`${regra.sql} = any(${parametros.add(lista)}::uuid[])`);
  }
  if (painel.tags) {
    const regra = assunto.filtroDoPainel.tags;
    if (!regra) ignorados.push("tags");
    else {
      m.usar(regra.precisa);
      const sql = tagsSql(regra.sql, { ...painel.tags, valores: painel.tags.valores ?? [], operador: painel.tags.operador ?? "ou" }, parametros);
      if (sql) clausulas.push(sql);
    }
  }
  const campos = (painel.campos ?? []).map((c) => m.condicao(c));
  if (campos.some((c) => c === null)) ignorados.push("campos");
  clausulas.push(...campos.filter(nao_nulo));
  return clausulas;
}

export function montarSql(p: Pergunta, painel: FiltroDoPainel | undefined, ctx: Contexto): SqlMontado {
  const primeira = medidaPorId(p.indicadores[0] ?? "");
  if (!primeira) throw new ErroDoMotor("pergunta_invalida", `Indicador ${p.indicadores[0] ?? ""} não existe.`);
  const assunto = primeira.assunto;
  const m = new Montagem(assunto, ctx);
  const alias = assunto.base.alias;
  const colunas: Coluna[] = [];
  const selecao: string[] = [];

  // Variáveis (agrupam)
  const variaveis = p.variaveis.map((id, i) => {
    const campo = m.campo(id);
    if (!campo) throw new ErroDoMotor("pergunta_invalida", `Variável ${id} não existe.`);
    m.usar(campo.precisa);
    selecao.push(`${campo.expr} as v${i}`);
    colunas.push({ chave: `v${i}`, nome: campo.nome, papel: "variavel", tipo: campo.tipo });
    if (campo.rotulo) {
      selecao.push(`${campo.rotulo} as v${i}_rotulo`);
      colunas.push({ chave: `v${i}_rotulo`, nome: campo.nome, papel: "rotulo" });
    }
    return id;
  });

  // Tempo: o bucket e/ou o período
  const painelTemPeriodo = painel?.periodo !== undefined && !p.tempo?.fixo;
  const padrao = assunto.tempos.find((t) => t.padrao);
  const campoDeTempo = p.tempo ? tempoPorId(p.tempo.campo)?.tempo : painelTemPeriodo ? padrao : undefined;
  if (p.tempo && !campoDeTempo) throw new ErroDoMotor("pergunta_invalida", `Tempo ${p.tempo.campo} não existe.`);
  let temBucket = false;
  if (p.tempo?.granularidade && campoDeTempo) {
    m.usar(campoDeTempo.precisa);
    // Texto ISO sem fuso: o driver não reinterpreta o horário local do servidor.
    selecao.push(
      `to_char(date_trunc('${TRUNC[p.tempo.granularidade]}', (${frag(campoDeTempo.sql)} at time zone $2)), 'YYYY-MM-DD"T"HH24:MI:SS') as t`,
    );
    colunas.push({ chave: "t", nome: campoDeTempo.nome, papel: "tempo" });
    temBucket = true;
  }

  // Indicadores (agregam)
  let temMoeda = false;
  p.indicadores.forEach((id, i) => {
    const achado = medidaPorId(id);
    if (!achado || achado.assunto.id !== assunto.id) throw new ErroDoMotor("pergunta_invalida", `Indicador ${id} inválido.`);
    m.usar(achado.medida.precisa);
    selecao.push(`${frag(achado.medida.sql)} as i${i}`);
    colunas.push({ chave: `i${i}`, nome: achado.medida.nome, papel: "indicador", unidade: achado.medida.unidade });
    temMoeda ||= Boolean(achado.medida.moeda);
  });
  if (temMoeda) {
    selecao.push(`count(distinct ${alias}.currency) as moedas`);
    colunas.push({ chave: "moedas", nome: "Moedas", papel: "moedas" });
  }

  // Filtros
  const onde: string[] = [`${alias}.organization_id = $1`];
  if (assunto.base.condicaoFixa) onde.push(assunto.base.condicaoFixa);
  const periodo = painelTemPeriodo ? painel!.periodo! : p.tempo?.periodo;
  const intervalo = periodo && campoDeTempo ? resolverPeriodo(periodo, ctx.agora, ctx.fuso) : null;
  if (intervalo && campoDeTempo) {
    m.usar(campoDeTempo.precisa);
    const expr = frag(campoDeTempo.sql);
    onde.push(
      `${expr} >= (${m.parametros.add(intervalo.de)}::date)::timestamp at time zone $2`,
      `${expr} < (${m.parametros.add(intervalo.ate)}::date + 1)::timestamp at time zone $2`,
    );
  }
  const doFiltro = filtroSql(m, p.filtro);
  if (doFiltro) onde.push(doFiltro);
  const ignorados: string[] = [];
  onde.push(...painelSql(m, painel, ignorados));

  // Ordem e limite
  const agrupa = variaveis.length > 0 || temBucket;
  const ordem = agrupa ? ordenacao(p, variaveis, temBucket) : "";
  const posicoes = colunas.filter((c) => c.papel === "variavel" || c.papel === "rotulo" || c.papel === "tempo");
  const corpo = [
    `select ${selecao.join(", ")}`,
    `from ${assunto.base.tabela} ${alias}`,
    ...Object.entries(assunto.joins).filter(([a]) => m.aliases.has(a)).map(([, j]) => j.sql),
    `where ${onde.join(" and ")}`,
    ...(agrupa ? [`group by ${posicoes.map((_, i) => i + 1).join(", ")}`] : []),
    ...(ordem ? [ordem] : []),
    `limit ${p.limite + 1}`,
  ];

  return { text: corpo.join(" "), values: m.parametros.valores, colunas, assunto: assunto.id, temMoeda, ignorados };
}

function ordenacao(p: Pergunta, variaveis: string[], temBucket: boolean): string {
  if (p.ordem) {
    const por = p.ordem.por;
    const coluna =
      por === "tempo" ? "t" : p.indicadores.includes(por) ? `i${p.indicadores.indexOf(por)}` : `v${variaveis.indexOf(por)}`;
    if (por === "tempo" ? temBucket : true) return `order by ${coluna} ${p.ordem.direcao}`;
  }
  return `order by ${temBucket ? "t asc, " : ""}i0 desc`;
}
