/**
 * O tradutor: pergunta validada → uma consulta SQL parametrizada (fork Escale, Fase 7A).
 * Puro, sem banco. Nenhum identificador vem do cliente: os ids viram os fragmentos do catálogo.
 */
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";

import { dimensaoPorId, medidaPorId, tempoPorId } from "../catalogo";
import { lerCampoDinamico, type CampoDinamico } from "../catalogo/campos-personalizados";
import { DIAS_MAX_POR_HORA, type Assunto, type TipoDeDimensao, type Unidade } from "../catalogo/tipos";
import {
  diasDoPeriodo,
  type Condicao,
  type FiltroDoPainel,
  type Filtro,
  type Granularidade,
  type Periodo,
  type Pergunta,
} from "../pergunta";
import {
  Parametros,
  camposDoPainelSql,
  campoPersonalizadoSql,
  condicaoSql,
  tagsDoPainelSql,
  type AlvoDoCampoDoPainel,
} from "./condicoes";
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
  /** A granularidade `hora` virou `dia` porque o período do painel passa de 31 dias. */
  granularidadeAjustada: boolean;
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

  /** Expressão jsonb do valor de um campo do filtro do painel (2B), ou `null` se o assunto não tem o objeto. */
  valorDoCampoDoPainel(alvo: AlvoDoCampoDoPainel, chave: string): string | null {
    const origem = this.assunto.camposPersonalizados[alvo];
    if (!origem) return null;
    this.usar(origem.precisa);
    const a = origem.sql.replace(/\.custom_fields$/, "");
    const fixo = FIXOS_DO_PAINEL[alvo]?.[chave];
    if (fixo) return fixo(a);
    return `(${origem.sql} -> ${this.parametros.add(chave)})`;
  }

  condicao(c: Condicao): string | null {
    const campo = this.campo(c.campo);
    if (!campo) return null;
    this.usar(campo.precisaDaChave);
    const expr = campo.uuid && campo.tipo === "texto" ? `${campo.expr}::text` : campo.expr;
    return condicaoSql(expr, campo.tipo, c, this.parametros);
  }
}

/** Os campos fixos que a lista de contatos (9102, 9105) lê por coluna; o resto vem de `custom_fields`. */
const FIXOS_DO_PAINEL: Partial<Record<AlvoDoCampoDoPainel, Record<string, (alias: string) => string>>> = {
  contato: {
    nome: (a) => `to_jsonb(coalesce(${a}.name, ${a}.display_name))`,
    email: (a) => `to_jsonb(${a}.email)`,
    telefone: (a) => `to_jsonb(${a}.phone_number)`,
    nascimento: (a) => `to_jsonb(${a}.birthdate::text)`,
  },
  negocio: { valor: (a) => `to_jsonb(${a}.value_cents / 100.0)` },
  empresa: {
    nome: (a) => `to_jsonb(coalesce(nullif(btrim(${a}.trade_name), ''), ${a}.legal_name))`,
    cidade: (a) => `to_jsonb(${a}.city)`,
    estado: (a) => `to_jsonb(${a}.state)`,
    cnpj: (a) => `to_jsonb(${a}.cnpj)`,
  },
};

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

/** R4: qual período vale para a pergunta, e se o do painel foi ignorado (gráfico sem tempo). */
export function periodoEfetivo(p: Pergunta, painel?: FiltroDoPainel): { periodo: Periodo | null; ignorado: boolean } {
  if (!p.tempo) return { periodo: null, ignorado: Boolean(painel?.periodo) };
  if (p.tempo.fixo || !painel?.periodo) return { periodo: p.tempo.periodo, ignorado: false };
  return { periodo: painel.periodo, ignorado: false };
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
  const compilado = compilarFiltros({ tags: painel.tags, campos: painel.campos }, m.ctx.fuso);
  if (compilado.tags) {
    const regra = assunto.filtroDoPainel.tags;
    if (!regra) ignorados.push("tags");
    else {
      m.usar(regra.precisa);
      clausulas.push(tagsDoPainelSql(regra.sql, compilado.tags, parametros));
    }
  }
  if (compilado.campos) {
    const { sql, ignorado } = camposDoPainelSql(compilado.campos, (alvo, chave) => m.valorDoCampoDoPainel(alvo, chave), parametros);
    if (ignorado) ignorados.push("campos");
    if (sql) clausulas.push(sql);
  }
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

  // Tempo: o bucket e/ou o período (R4: gráfico sem tempo ignora o período do painel)
  const efetivo = periodoEfetivo(p, painel);
  const campoDeTempo = p.tempo ? tempoPorId(p.tempo.campo)?.tempo : undefined;
  if (p.tempo && !campoDeTempo) throw new ErroDoMotor("pergunta_invalida", `Tempo ${p.tempo.campo} não existe.`);
  const dias = efetivo.periodo ? diasDoPeriodo(efetivo.periodo) : null;
  const granularidadeAjustada = p.tempo?.granularidade === "hora" && (dias === null || dias > DIAS_MAX_POR_HORA);
  const granularidade = granularidadeAjustada ? "dia" : p.tempo?.granularidade;
  let temBucket = false;
  if (granularidade && campoDeTempo) {
    m.usar(campoDeTempo.precisa);
    // Texto ISO sem fuso: o driver não reinterpreta o horário local do servidor.
    selecao.push(
      `to_char(date_trunc('${TRUNC[granularidade]}', (${frag(campoDeTempo.sql)} at time zone $2)), 'YYYY-MM-DD"T"HH24:MI:SS') as t`,
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
    colunas.push({ chave: `i${i}`, nome: `${assunto.nome} ${achado.medida.nome}`, papel: "indicador", unidade: achado.medida.unidade });
    temMoeda ||= Boolean(achado.medida.moeda);
  });
  if (temMoeda) {
    selecao.push(`count(distinct ${alias}.currency) as moedas`);
    colunas.push({ chave: "moedas", nome: "Moedas", papel: "moedas" });
  }

  // Filtros
  const onde: string[] = [`${alias}.organization_id = $1`];
  if (assunto.base.condicaoFixa) onde.push(assunto.base.condicaoFixa);
  const intervalo = efetivo.periodo && campoDeTempo ? resolverPeriodo(efetivo.periodo, ctx.agora, ctx.fuso) : null;
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
  const ignorados: string[] = efetivo.ignorado ? ["periodo"] : [];
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

  return { text: corpo.join(" "), values: m.parametros.valores, colunas, assunto: assunto.id, temMoeda, ignorados, granularidadeAjustada };
}

function ordenacao(p: Pergunta, variaveis: string[], temBucket: boolean): string {
  if (p.ordem) {
    const por = p.ordem.por;
    const coluna =
      por === "tempo" ? "t" : p.indicadores.includes(por) ? `i${p.indicadores.indexOf(por)}` : `v${variaveis.indexOf(por)}`;
    if (por === "tempo" ? temBucket : true) return `order by ${coluna} ${p.ordem.direcao}`;
  }
  // Fase 7D (S10): sem ordem pedida, a 1ª variável com ordem natural (etapa) sai na ordem do quadro.
  const natural = variaveis[0] ? dimensaoPorId(variaveis[0])?.dimensao.ordemNatural : undefined;
  const aposOTempo = natural ? `min(${frag(natural)}) asc nulls last, ` : "";
  return `order by ${temBucket ? "t asc, " : ""}${aposOTempo}i0 desc`;
}
