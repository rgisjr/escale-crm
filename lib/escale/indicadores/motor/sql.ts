/**
 * O tradutor: pergunta validada → uma consulta SQL parametrizada (fork Escale, Fase 7A).
 * Puro, sem banco. Nenhum identificador vem do cliente: os ids viram os fragmentos do catálogo.
 */
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";

import { dimensaoPorId, medidaPorId, tempoPorId } from "../catalogo";
import { lerCampoDinamico, type CampoDinamico } from "../catalogo/campos-personalizados";
import { CELULAS_DA_MATRIZ, DIAS_MAX_POR_HORA, type Assunto, type TipoDeDimensao, type Unidade } from "../catalogo/tipos";
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
import { sqlDoCalculado, unidadeDoCalculado } from "./calculados";
import { ErroDoMotor } from "./erros";
import { periodoAnterior, resolverPeriodo, type IntervaloDeDias } from "./periodo";

export interface Contexto {
  orgId: string;
  fuso: string;
  agora: Date;
  camposDaOrg: ReadonlyMap<string, CampoDinamico>;
}
export type Coluna = {
  chave: string;
  nome: string;
  papel: "variavel" | "tempo" | "indicador" | "rotulo" | "moedas" | "periodo";
  unidade?: Unidade;
  /** Fase 7E: coluna de indicador calculado (`cN`). */
  calculado?: boolean;
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
  /** Fase 7E: o SQL traz os dois ramos (`periodo` = atual/anterior) unidos por `union all`. */
  comparacao: boolean;
  /** Fase 7E: a pergunta pediu comparação mas o período é "Tudo"; o motor roda sem ela. */
  comparacaoSemPeriodo: boolean;
  /** Fase 7E: o período efetivo resolvido (null = sem limite de data). */
  periodo: IntervaloDeDias | null;
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
export const frag = (sql: string): string => sql.replaceAll("$fuso", "$2");

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

export class Montagem {
  readonly parametros: Parametros;
  readonly aliases = new Set<string>();

  constructor(
    readonly assunto: Assunto,
    readonly ctx: Contexto,
    parametros?: Parametros,
  ) {
    this.parametros = parametros ?? new Parametros(ctx.orgId, ctx.fuso);
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

export function filtroSql(m: Montagem, filtro: Filtro): string | null {
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

export function painelSql(m: Montagem, painel: FiltroDoPainel | undefined, ignorados: string[]): string[] {
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

const OPERADOR_QUANTITATIVO = {
  igual_a: "=",
  diferente_de: "<>",
  maior_que: ">",
  maior_ou_igual_a: ">=",
  menor_que: "<",
  menor_ou_igual_a: "<=",
} as const;

interface Ramo {
  corpo: string;
  colunas: Coluna[];
  temMoeda: boolean;
  ignorados: string[];
  granularidadeAjustada: boolean;
  intervalo: IntervaloDeDias | null;
}
interface OpcoesDoRamo {
  /** undefined = resolver pelo período efetivo; null = sem limite de data. */
  intervalo?: IntervaloDeDias | null;
  periodo?: "atual" | "anterior";
}

function montarRamo(p: Pergunta, painel: FiltroDoPainel | undefined, ctx: Contexto, assunto: Assunto, parametros: Parametros, opcoes: OpcoesDoRamo): Ramo {
  const m = new Montagem(assunto, ctx, parametros);
  const alias = assunto.base.alias;
  const colunas: Coluna[] = [];
  const selecao: string[] = [];
  if (opcoes.periodo) {
    // O rótulo é constante do código, nunca texto do cliente.
    selecao.push(`'${opcoes.periodo}'::text as periodo`);
    colunas.push({ chave: "periodo", nome: "Período", papel: "periodo" });
  }

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

  // Tempo: o bucket (ou a matriz dia × hora) e/ou o período (R4: gráfico sem tempo ignora o período do painel)
  const efetivo = periodoEfetivo(p, painel);
  const campoDeTempo = p.tempo ? tempoPorId(p.tempo.campo)?.tempo : undefined;
  if (p.tempo && !campoDeTempo) throw new ErroDoMotor("pergunta_invalida", `Tempo ${p.tempo.campo} não existe.`);
  const dias = efetivo.periodo ? diasDoPeriodo(efetivo.periodo) : null;
  const granularidadeAjustada = p.tempo?.granularidade === "hora" && (dias === null || dias > DIAS_MAX_POR_HORA);
  const granularidade = granularidadeAjustada ? "dia" : p.tempo?.granularidade;
  let temBucket = false;
  if (p.matrizDeTempo && campoDeTempo) {
    m.usar(campoDeTempo.precisa);
    const base = `(${frag(campoDeTempo.sql)} at time zone $2)`;
    selecao.push(`extract(isodow from ${base})::int as dsem`, `extract(hour from ${base})::int as hora`);
    colunas.push({ chave: "dsem", nome: "Dia da semana", papel: "tempo" }, { chave: "hora", nome: "Hora", papel: "tempo" });
    temBucket = true;
  } else if (granularidade && campoDeTempo) {
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
  const sqlDaMedida = (id: string): string => {
    const achado = medidaPorId(id);
    if (!achado || achado.assunto.id !== assunto.id) throw new ErroDoMotor("pergunta_invalida", `Indicador ${id} inválido.`);
    m.usar(achado.medida.precisa);
    temMoeda ||= Boolean(achado.medida.moeda);
    return frag(achado.medida.sql);
  };
  p.indicadores.forEach((id, i) => {
    selecao.push(`${sqlDaMedida(id)} as i${i}`);
    const achado = medidaPorId(id);
    colunas.push({ chave: `i${i}`, nome: `${assunto.nome} ${achado?.medida.nome ?? ""}`, papel: "indicador", unidade: achado?.medida.unidade });
  });
  // Calculados: o operando entra na conta mesmo sem ser coluna da tela (T22).
  const sqlDosCalculados = p.calculados.map((c) => sqlDoCalculado(c, sqlDaMedida));
  p.calculados.forEach((c, i) => {
    selecao.push(`${sqlDosCalculados[i]} as c${i}`);
    colunas.push({ chave: `c${i}`, nome: c.nome, papel: "indicador", unidade: unidadeDoCalculado(c), calculado: true });
  });
  if (temMoeda) {
    selecao.push(`count(distinct ${alias}.currency) as moedas`);
    colunas.push({ chave: "moedas", nome: "Moedas", papel: "moedas" });
  }

  // Filtros
  const onde: string[] = [`${alias}.organization_id = $1`];
  if (assunto.base.condicaoFixa) onde.push(assunto.base.condicaoFixa);
  const intervalo =
    opcoes.intervalo !== undefined
      ? opcoes.intervalo
      : efetivo.periodo && campoDeTempo
        ? resolverPeriodo(efetivo.periodo, ctx.agora, ctx.fuso)
        : null;
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

  // Filtro quantitativo (T5): `having` sobre o fragmento agregado, valor em `$n`.
  const having = p.filtroQuantitativo.map((f) => {
    const posicao = p.calculados.findIndex((c) => c.id === f.indicador);
    const fragmento = posicao >= 0 ? (sqlDosCalculados[posicao] as string) : sqlDaMedida(f.indicador);
    const alvo = f.op === "diferente_de" ? `coalesce(${fragmento}, 0)` : fragmento;
    return `${alvo} ${OPERADOR_QUANTITATIVO[f.op]} ${m.parametros.add(f.valor)}::numeric`;
  });

  // Ordem e limite
  const agrupa = variaveis.length > 0 || temBucket || Boolean(opcoes.periodo);
  const ordem = p.matrizDeTempo ? "order by 1, 2" : agrupa ? ordenacao(p, variaveis, temBucket) : "";
  const posicoes = colunas.filter((c) => ["variavel", "rotulo", "tempo", "periodo"].includes(c.papel));
  const limite = p.matrizDeTempo ? CELULAS_DA_MATRIZ + 1 : p.limite + 1;
  const corpo = [
    `select ${selecao.join(", ")}`,
    `from ${assunto.base.tabela} ${alias}`,
    ...Object.entries(assunto.joins).filter(([a]) => m.aliases.has(a)).map(([, j]) => j.sql),
    `where ${onde.join(" and ")}`,
    ...(agrupa ? [`group by ${posicoes.map((_, i) => i + 1).join(", ")}`] : []),
    ...(having.length ? [`having ${having.join(" and ")}`] : []),
    ...(ordem ? [ordem] : []),
    `limit ${limite}`,
  ].join(" ");
  return { corpo, colunas, temMoeda, ignorados, granularidadeAjustada, intervalo };
}

/** O intervalo de datas que a pergunta cobre hoje (null = sem limite). */
export function intervaloEfetivo(p: Pergunta, painel: FiltroDoPainel | undefined, ctx: Contexto): IntervaloDeDias | null {
  const efetivo = periodoEfetivo(p, painel);
  const campo = p.tempo ? tempoPorId(p.tempo.campo) : null;
  return efetivo.periodo && campo ? resolverPeriodo(efetivo.periodo, ctx.agora, ctx.fuso) : null;
}

export function montarSql(pedida: Pergunta, painel: FiltroDoPainel | undefined, ctx: Contexto): SqlMontado {
  const primeira = medidaPorId(pedida.indicadores[0] ?? "");
  if (!primeira) throw new ErroDoMotor("pergunta_invalida", `Indicador ${pedida.indicadores[0] ?? ""} não existe.`);
  const assunto = primeira.assunto;
  const parametros = new Parametros(ctx.orgId, ctx.fuso);
  // Sem período ("Tudo") não há o que comparar: roda a consulta simples e avisa.
  const comparar = Boolean(pedida.comparacao) && intervaloEfetivo(pedida, painel, ctx) !== null;
  const p: Pergunta = comparar ? pedida : { ...pedida, comparacao: undefined };
  const atual = montarRamo(p, painel, ctx, assunto, parametros, comparar ? { periodo: "atual" } : {});
  const comum = {
    assunto: assunto.id,
    temMoeda: atual.temMoeda,
    ignorados: atual.ignorados,
    granularidadeAjustada: atual.granularidadeAjustada,
    periodo: atual.intervalo,
    comparacaoSemPeriodo: Boolean(pedida.comparacao) && !comparar,
  };
  if (!comparar || !atual.intervalo || !p.comparacao) {
    return { ...comum, text: atual.corpo, values: parametros.valores, colunas: atual.colunas, comparacao: false };
  }
  const anterior = montarRamo(p, painel, ctx, assunto, parametros, {
    intervalo: periodoAnterior(atual.intervalo, p.comparacao.modo),
    periodo: "anterior",
  });
  return {
    ...comum,
    text: `(${atual.corpo}) union all (${anterior.corpo})`,
    values: parametros.valores,
    colunas: atual.colunas,
    comparacao: true,
  };
}

function ordenacao(p: Pergunta, variaveis: string[], temBucket: boolean): string {
  if (p.ordem) {
    const por = p.ordem.por;
    const calculado = p.calculados.findIndex((c) => c.id === por);
    const coluna =
      por === "tempo"
        ? "t"
        : calculado >= 0
          ? `c${calculado}`
          : p.indicadores.includes(por)
            ? `i${p.indicadores.indexOf(por)}`
            : `v${variaveis.indexOf(por)}`;
    if (por === "tempo" ? temBucket : true) return `order by ${coluna} ${p.ordem.direcao}`;
  }
  // Fase 7D (S10): sem ordem pedida, a 1ª variável com ordem natural (etapa) sai na ordem do quadro.
  const natural = variaveis[0] ? dimensaoPorId(variaveis[0])?.dimensao.ordemNatural : undefined;
  const aposOTempo = natural ? `min(${frag(natural)}) asc nulls last, ` : "";
  return `order by ${temBucket ? "t asc, " : ""}${aposOTempo}i0 desc`;
}
