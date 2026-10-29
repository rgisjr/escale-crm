/**
 * A "pergunta" de um gráfico de Indicadores (fork Escale, Fase 7A): indicadores + variáveis +
 * tempo + filtros. O schema valida a forma; `validarPergunta` valida o sentido contra o catálogo.
 */
import { z } from "zod";

import { camposDoFiltroSchema, tagsSchema } from "@/lib/escale/contatos/filtros";

import { dimensaoPorId, medidaPorId, tempoPorId } from "./catalogo";
import type { CampoDinamico } from "./catalogo/campos-personalizados";
import { lerCampoDinamico } from "./catalogo/campos-personalizados";
import {
  CALCULADOS_MAX,
  CONDICOES_MAX,
  DIAS_MAX_POR_HORA,
  FILTROS_QUANTITATIVOS_MAX,
  INDICADORES_POR_PERGUNTA_MAX,
  LINHAS_DO_DETALHAMENTO_MAX,
  LINHAS_MAX,
  VARIAVEIS_POR_PERGUNTA_MAX,
  type Assunto,
  type TipoDeDimensao,
} from "./catalogo/tipos";

export const OPERADORES = [
  "igual_a",
  "diferente_de",
  "contem",
  "nao_contem",
  "comeca_com",
  "termina_com",
  "maior_que",
  "maior_ou_igual_a",
  "menor_que",
  "menor_ou_igual_a",
  "nao_vazio",
  "vazio",
] as const;
export type Operador = (typeof OPERADORES)[number];
export const GRANULARIDADES = ["hora", "dia", "semana", "mes", "trimestre", "ano"] as const;
export type Granularidade = (typeof GRANULARIDADES)[number];
export const ATALHOS_DE_PERIODO = [
  "hoje",
  "ontem",
  "7_dias",
  "15_dias",
  "1_mes",
  "esta_semana",
  "semana_passada",
  "este_mes",
  "mes_passado",
  "este_ano",
  "tudo",
  "personalizado",
] as const;

const id = z
  .string()
  .regex(/^[a-z_]+\.[a-z_0-9]+$|^campo:(negocio|contato|empresa):[a-z][a-z0-9_]{0,39}$/)
  .max(80);
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const periodoSchema = z
  .object({ atalho: z.enum(ATALHOS_DE_PERIODO), de: dia.optional(), ate: dia.optional() })
  .strict()
  .refine(
    (p) => p.atalho !== "personalizado" || (p.de && p.ate && p.de <= p.ate),
    "Período personalizado precisa de início e fim.",
  );
export type Periodo = z.infer<typeof periodoSchema>;

export const condicaoSchema = z
  .object({
    campo: id,
    op: z.enum(OPERADORES),
    valor: z
      .union([z.string().max(200), z.number().finite(), z.boolean(), z.array(z.string().max(200)).min(1).max(100)])
      .optional(),
  })
  .strict()
  .refine((c) => ["vazio", "nao_vazio"].includes(c.op) || c.valor !== undefined, "Operador precisa de valor.");
export type Condicao = z.infer<typeof condicaoSchema>;

const modo = z.enum(["todas", "qualquer"]);
export const grupoDeCondicoesSchema = z
  .object({ modo, condicoes: z.array(condicaoSchema).min(1).max(CONDICOES_MAX) })
  .strict();
export const filtroSchema = z
  .object({
    modo: modo.default("todas"),
    condicoes: z.array(condicaoSchema).max(CONDICOES_MAX).default([]),
    grupos: z.array(grupoDeCondicoesSchema).max(4).default([]),
  })
  .strict();
export type Filtro = z.infer<typeof filtroSchema>;

export const filtroDoPainelSchema = z
  .object({
    periodo: periodoSchema.optional(),
    usuarios: z.array(z.string().uuid()).max(100).optional(),
    gruposDeOrigem: z.array(z.string().uuid()).max(100).optional(),
    origens: z.array(z.string().uuid()).max(100).optional(),
    /** Forma da 2B (TagFilterBuilder): grupos de "possui" / "não possui" / "qualquer" / "sem", E/OU. */
    tags: tagsSchema.optional(),
    /** Forma da 2B (FieldFilterBuilder): grupos de condições de Contato, Negócio e Empresa. */
    campos: camposDoFiltroSchema.optional(),
  })
  .strict();
export type FiltroDoPainel = z.infer<typeof filtroDoPainelSchema>;

/** Fase 7F: os "filtros fixos" do gráfico (passo "Configure filtros" dos modelos), na forma do filtro do painel. */
export const filtroFixoSchema = filtroDoPainelSchema
  .pick({ usuarios: true, gruposDeOrigem: true, origens: true, tags: true })
  .partial()
  .strict();
export type FiltroFixo = z.infer<typeof filtroFixoSchema>;

/** Fase 7E: indicador calculado (A op B), comparação de períodos e filtro quantitativo. */
export const OPERACOES = ["soma", "subtracao", "multiplicacao", "divisao"] as const;
export type Operacao = (typeof OPERACOES)[number];
export const FORMATOS_DO_CALCULADO = ["numero", "moeda", "percentual"] as const;
export type FormatoDoCalculado = (typeof FORMATOS_DO_CALCULADO)[number];
export const MODOS_DE_COMPARACAO = ["equivalente", "mes_anterior", "ano_anterior"] as const;
export type ModoDeComparacao = (typeof MODOS_DE_COMPARACAO)[number];
export const OPERADORES_QUANTITATIVOS = [
  "igual_a",
  "diferente_de",
  "maior_que",
  "maior_ou_igual_a",
  "menor_que",
  "menor_ou_igual_a",
] as const;
export type OperadorQuantitativo = (typeof OPERADORES_QUANTITATIVOS)[number];
const idDeMedida = z.string().regex(/^[a-z_]+\.[a-z_0-9]+$/).max(80);
const idDeCalculado = z.string().regex(/^calc:[a-z0-9_]{1,40}$/);
export const calculadoSchema = z
  .object({
    id: idDeCalculado,
    nome: z.string().trim().min(1).max(80),
    a: idDeMedida,
    op: z.enum(OPERACOES),
    b: idDeMedida,
    formato: z.enum(FORMATOS_DO_CALCULADO),
  })
  .strict()
  .refine(
    (c) => c.formato !== "percentual" || c.op === "divisao",
    "O formato percentual só vale para divisão, porque ele mostra a razão entre os dois indicadores.",
  );
export type Calculado = z.infer<typeof calculadoSchema>;
export const filtroQuantitativoSchema = z
  .object({
    indicador: z.union([idDeMedida, idDeCalculado]),
    op: z.enum(OPERADORES_QUANTITATIVOS),
    valor: z.number().finite(),
  })
  .strict();
export type FiltroQuantitativo = z.infer<typeof filtroQuantitativoSchema>;

export const perguntaSchema = z
  .object({
    indicadores: z.array(id).min(1).max(INDICADORES_POR_PERGUNTA_MAX),
    variaveis: z.array(id).max(VARIAVEIS_POR_PERGUNTA_MAX).default([]),
    tempo: z
      .object({
        campo: id,
        granularidade: z.enum(GRANULARIDADES).optional(),
        periodo: periodoSchema,
        fixo: z.boolean().default(false),
      })
      .strict()
      .optional(),
    filtro: filtroSchema.default({ modo: "todas", condicoes: [], grupos: [] }),
    ordem: z
      .object({ por: z.union([id, idDeCalculado, z.literal("tempo")]), direcao: z.enum(["asc", "desc"]) })
      .strict()
      .optional(),
    limite: z.number().int().min(1).max(LINHAS_MAX).default(1000),
    calculados: z.array(calculadoSchema).max(CALCULADOS_MAX).default([]),
    filtroQuantitativo: z.array(filtroQuantitativoSchema).max(FILTROS_QUANTITATIVOS_MAX).default([]),
    comparacao: z.object({ modo: z.enum(MODOS_DE_COMPARACAO) }).strict().optional(),
    /** Heatmap dia × hora: agrupa por dia da semana e hora do campo de tempo (T7). */
    matrizDeTempo: z.boolean().default(false),
    /** Fase 7F: aplicado sempre, somado ao filtro do painel. */
    filtroFixo: filtroFixoSchema.optional(),
  })
  .strict();
export type Pergunta = z.infer<typeof perguntaSchema>;
/** T15: o Divisor é um gráfico sem pergunta. */
export const perguntaDoDivisorSchema = z.object({ divisor: z.literal(true) }).strict();
export type PerguntaDoDivisor = z.infer<typeof perguntaDoDivisorSchema>;

export const pontoSchema = z
  .object({
    variaveis: z
      .array(z.object({ id, valor: z.string().max(200).nullable() }).strict())
      .max(VARIAVEIS_POR_PERGUNTA_MAX)
      .default([]),
    /** Início do bucket (ISO sem fuso, como o motor devolve em `t`). */
    t: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/).optional(),
    /** Para o heatmap. */
    diaDaSemana: z.number().int().min(1).max(7).optional(),
    hora: z.number().int().min(0).max(23).optional(),
  })
  .strict();
export type Ponto = z.infer<typeof pontoSchema>;
const ordemDoDetalhamento = z.object({ coluna: z.string().max(80), direcao: z.enum(["asc", "desc"]) }).strict();
const pedidoBase = z.object({
  pergunta: perguntaSchema,
  filtroDoPainel: filtroDoPainelSchema.optional(),
  indicador: z.union([idDeMedida, idDeCalculado]),
  ponto: pontoSchema.default({ variaveis: [] }),
  colunas: z.array(z.string().max(80)).max(40).optional(),
  ordem: ordemDoDetalhamento.optional(),
});
export const POR_PAGINA_DO_DETALHAMENTO = [10, 25, 50] as const;
export const detalhamentoSchema = pedidoBase
  .extend({
    pagina: z.number().int().min(1).default(1),
    porPagina: z.union([z.literal(10), z.literal(25), z.literal(50)]).default(10),
  })
  .strict()
  .refine((d) => d.pagina * d.porPagina <= LINHAS_DO_DETALHAMENTO_MAX, "Página fora do teto.");
export type Detalhamento = z.infer<typeof detalhamentoSchema>;
export const detalhamentoParaCsvSchema = pedidoBase.strict();
export type DetalhamentoParaCsv = z.infer<typeof detalhamentoParaCsvSchema>;

export type CamposDaOrg = ReadonlyMap<string, CampoDinamico>;
export type Validacao = { ok: true; assunto: Assunto } | { ok: false; erro: string };

const SO_TEXTO: readonly Operador[] = ["contem", "nao_contem", "comeca_com", "termina_com"];
const SO_ORDEM: readonly Operador[] = ["maior_que", "maior_ou_igual_a", "menor_que", "menor_ou_igual_a"];

/** O operador serve para o tipo? (vazio e não vazio servem a todos.) */
export function operadorServe(tipo: TipoDeDimensao, op: Operador): boolean {
  if (op === "vazio" || op === "nao_vazio" || op === "igual_a" || op === "diferente_de") return true;
  if (tipo === "texto") return SO_TEXTO.includes(op);
  if (tipo === "numero" || tipo === "data") return SO_ORDEM.includes(op);
  return false;
}

/** Dias que um período cobre, para limitar a granularidade `hora`. `null` = sem fim (tudo). */
export function diasDoPeriodo(p: Periodo): number | null {
  switch (p.atalho) {
    case "hoje":
    case "ontem":
      return 1;
    case "7_dias":
    case "esta_semana":
    case "semana_passada":
      return 7;
    case "15_dias":
      return 15;
    case "1_mes":
      return 30;
    case "este_mes":
    case "mes_passado":
      return 31;
    case "este_ano":
    case "tudo":
      return null;
    case "personalizado": {
      const ms = Date.parse(`${p.ate}T00:00:00Z`) - Date.parse(`${p.de}T00:00:00Z`);
      return Math.round(ms / 86_400_000) + 1;
    }
  }
}

interface CampoResolvido {
  tipo: TipoDeDimensao;
}

function resolverCampo(assunto: Assunto, campo: string, doOrg: CamposDaOrg): CampoResolvido | null {
  const dinamico = lerCampoDinamico(campo);
  if (dinamico) {
    const def = doOrg.get(campo);
    if (!def || !assunto.camposPersonalizados[dinamico.objeto]) return null;
    return { tipo: def.tipo };
  }
  const achada = dimensaoPorId(campo);
  return achada && achada.assunto.id === assunto.id ? { tipo: achada.dimensao.tipo } : null;
}

function validarCondicao(assunto: Assunto, c: Condicao, doOrg: CamposDaOrg): string | null {
  const campo = resolverCampo(assunto, c.campo, doOrg);
  if (!campo) return `Campo "${c.campo}" não existe neste assunto.`;
  if (!operadorServe(campo.tipo, c.op)) return `Operador "${c.op}" não serve para "${c.campo}".`;
  return null;
}

export function validarPergunta(p: Pergunta, doOrg: CamposDaOrg = new Map()): Validacao {
  const falha = (erro: string): Validacao => ({ ok: false, erro });
  const primeira = medidaPorId(p.indicadores[0] ?? "");
  if (!primeira) return falha(`Indicador "${p.indicadores[0]}" não existe.`);
  const assunto = primeira.assunto;
  for (const idDoIndicador of p.indicadores) {
    const achado = medidaPorId(idDoIndicador);
    if (!achado) return falha(`Indicador "${idDoIndicador}" não existe.`);
    if (achado.assunto.id !== assunto.id) return falha("Os indicadores de um gráfico precisam ser do mesmo assunto.");
  }
  for (const v of p.variaveis) {
    if (!resolverCampo(assunto, v, doOrg)) return falha(`Variável "${v}" não existe neste assunto.`);
  }
  if (p.tempo) {
    const t = tempoPorId(p.tempo.campo);
    if (!t || t.assunto.id !== assunto.id) return falha(`Campo de tempo "${p.tempo.campo}" não existe neste assunto.`);
    if (p.tempo.granularidade === "hora") {
      const dias = diasDoPeriodo(p.tempo.periodo);
      if (dias === null || dias > DIAS_MAX_POR_HORA) {
        return falha(`A granularidade por hora aceita no máximo ${DIAS_MAX_POR_HORA} dias.`);
      }
    }
  }
  const idsDosCalculados = new Set(p.calculados.map((c) => c.id));
  if (idsDosCalculados.size !== p.calculados.length) return falha("Os indicadores calculados precisam de ids únicos.");
  if (p.indicadores.length + p.calculados.length > INDICADORES_POR_PERGUNTA_MAX) {
    return falha(`Este gráfico aceita no máximo ${INDICADORES_POR_PERGUNTA_MAX} indicadores.`);
  }
  for (const c of p.calculados) {
    for (const operando of [c.a, c.b]) {
      if (medidaPorId(operando)?.assunto.id !== assunto.id) return falha(`Operando "${operando}" não é deste assunto.`);
    }
  }
  for (const f of p.filtroQuantitativo) {
    const valido = f.indicador.startsWith("calc:")
      ? idsDosCalculados.has(f.indicador)
      : medidaPorId(f.indicador)?.assunto.id === assunto.id;
    if (!valido) return falha(`O filtro quantitativo usa "${f.indicador}", que não está na pergunta.`);
  }
  const ordenaPor = p.ordem?.por;
  if (
    ordenaPor &&
    ordenaPor !== "tempo" &&
    !p.indicadores.includes(ordenaPor) &&
    !p.variaveis.includes(ordenaPor) &&
    !idsDosCalculados.has(ordenaPor)
  ) {
    return falha("A ordenação precisa usar um indicador ou variável da pergunta.");
  }
  if (p.comparacao && (!p.tempo || p.tempo.periodo.atalho === "tudo")) {
    return falha("A comparação exige um campo de tempo com período definido.");
  }
  if (p.matrizDeTempo && (!p.tempo || p.variaveis.length > 0 || p.tempo.granularidade || p.comparacao)) {
    return falha("A matriz dia × hora usa só o campo de tempo, sem variáveis, granularidade nem comparação.");
  }
  if (p.ordem?.por === "tempo" && !p.tempo) return falha("Ordenar por tempo exige um campo de tempo.");

  const condicoes = [...p.filtro.condicoes, ...p.filtro.grupos.flatMap((g) => g.condicoes)];
  if (condicoes.length > CONDICOES_MAX) return falha(`O filtro aceita no máximo ${CONDICOES_MAX} condições.`);
  for (const c of condicoes) {
    const erro = validarCondicao(assunto, c, doOrg);
    if (erro) return falha(erro);
  }
  return { ok: true, assunto };
}

export type ValidacaoDoDetalhamento =
  | { ok: true; assunto: Assunto }
  | { ok: false; erro: string; semDetalhe?: true };

/** Fase 7E: o pedido de detalhamento aponta só para coisas do catálogo. */
export function validarDetalhamento(
  d: Detalhamento | DetalhamentoParaCsv,
  doOrg: CamposDaOrg = new Map(),
): ValidacaoDoDetalhamento {
  const valida = validarPergunta(d.pergunta, doOrg);
  if (!valida.ok) return valida;
  const { assunto } = valida;
  const falha = (erro: string): ValidacaoDoDetalhamento => ({ ok: false, erro });
  const calculado = d.pergunta.calculados.find((c) => c.id === d.indicador);
  if (d.indicador.startsWith("calc:") && !calculado) return falha(`Indicador "${d.indicador}" não existe neste gráfico.`);
  const operandos = calculado ? [calculado.a, calculado.b] : [d.indicador];
  for (const idDoOperando of operandos) {
    const achada = medidaPorId(idDoOperando);
    if (!achada || achada.assunto.id !== assunto.id) return falha(`Indicador "${idDoOperando}" não existe neste gráfico.`);
    if (achada.medida.semDetalhe) return { ok: false, erro: "Essa métrica ainda não suporta detalhamento.", semDetalhe: true };
  }
  for (const v of d.ponto.variaveis) {
    if (!d.pergunta.variaveis.includes(v.id)) return falha(`O ponto usa "${v.id}", que não é variável do gráfico.`);
  }
  if (d.ponto.t && !d.pergunta.tempo?.granularidade) return falha("O ponto de tempo exige uma granularidade.");
  if ((d.ponto.diaDaSemana !== undefined || d.ponto.hora !== undefined) && !d.pergunta.matrizDeTempo) {
    return falha("Dia da semana e hora só valem na matriz dia × hora.");
  }
  const chavesDoCatalogo = new Set(assunto.colunasDoDetalhamento.map((c) => c.chave));
  const colunaServe = (chave: string): boolean => {
    if (chavesDoCatalogo.has(chave)) return true;
    const dinamico = lerCampoDinamico(chave);
    return Boolean(dinamico && doOrg.has(chave) && assunto.camposPersonalizados[dinamico.objeto]);
  };
  for (const chave of [...(d.colunas ?? []), ...(d.ordem ? [d.ordem.coluna] : [])]) {
    if (!colunaServe(chave)) return falha(`Coluna "${chave}" não existe neste assunto.`);
  }
  return { ok: true, assunto };
}
