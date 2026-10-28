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
  CONDICOES_MAX,
  DIAS_MAX_POR_HORA,
  INDICADORES_POR_PERGUNTA_MAX,
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
    grupos: z.array(grupoDeCondicoesSchema).max(3).default([]),
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
    ordem: z.object({ por: z.union([id, z.literal("tempo")]), direcao: z.enum(["asc", "desc"]) }).strict().optional(),
    limite: z.number().int().min(1).max(LINHAS_MAX).default(1000),
  })
  .strict();
export type Pergunta = z.infer<typeof perguntaSchema>;

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
  if (p.ordem && p.ordem.por !== "tempo" && !p.indicadores.includes(p.ordem.por) && !p.variaveis.includes(p.ordem.por)) {
    return falha("A ordenação precisa usar um indicador ou variável da pergunta.");
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
