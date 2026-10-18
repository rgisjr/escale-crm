import { z } from "zod";

import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { dataBrDoIso } from "@/lib/escale/filtros/periodo";

import { CAMPOS_DO_CONTATO_2A } from "./regras";

/**
 * OS FILTROS DA LISTA DE CONTATOS (fork Escale, Fase 2B; Clint `index-A38akjUb`,
 * `FieldFilterBuilder`, `TagFilterBuilder`): as seções Contato, Negócio, Tags e
 * Campos. Regras puras. Quem avalia é o banco (`fn_escale_contatos_do_filtro`,
 * migration 9102), com o filtro já compilado em `compilar-filtros.ts`.
 */

export const OPCOES_DE_TELEFONE = ["com", "sem", "invalido", "internacional"] as const;
export type OpcaoDeTelefone = (typeof OPCOES_DE_TELEFONE)[number];
/** Rótulos da Clint; quem mostra passa por `t()`. */
export const ROTULO_DO_TELEFONE: Record<OpcaoDeTelefone, string> = {
  com: "Com Telefone",
  sem: "Sem Telefone",
  invalido: "Telefone inválido",
  internacional: "Telefone internacional",
};

export const STATUS_DO_FILTRO = ["open", "won", "lost"] as const;
export type StatusDoFiltro = (typeof STATUS_DO_FILTRO)[number];
export const ROTULO_DO_STATUS: Record<StatusDoFiltro, string> = {
  open: "Aberto",
  won: "Ganho",
  lost: "Perdido",
};

/** Os donos especiais da Clint: "Sem dono" (`NO_USER`) e "Todos os donos" (`ALL_USERS`, = tem dono). */
export const DONO_SEM = "sem_dono";
export const DONO_COM = "com_dono";

export const TIPOS_DE_CAMPO = ["texto", "opcao", "opcoes", "booleano", "numero", "data"] as const;
export type TipoDeCampo = (typeof TIPOS_DE_CAMPO)[number];

export const OPERADORES = [
  "contem",
  "nao_contem",
  "igual",
  "diferente",
  "maior",
  "menor",
  "depois",
  "antes",
  "vazio",
  "preenchido",
] as const;
export type Operador = (typeof OPERADORES)[number];

const DE_TEXTO: readonly Operador[] = [
  "contem",
  "nao_contem",
  "igual",
  "diferente",
  "vazio",
  "preenchido",
];
const OPERADORES_DO_TIPO: Record<TipoDeCampo, readonly Operador[]> = {
  texto: DE_TEXTO,
  opcao: DE_TEXTO,
  opcoes: DE_TEXTO,
  booleano: ["igual", "diferente", "vazio", "preenchido"],
  numero: ["igual", "diferente", "maior", "menor", "vazio", "preenchido"],
  data: ["igual", "diferente", "depois", "antes", "vazio", "preenchido"],
};
export const operadoresDoTipo = (tipo: TipoDeCampo): readonly Operador[] =>
  OPERADORES_DO_TIPO[tipo];
export const precisaDeValor = (op: Operador): boolean => op !== "vazio" && op !== "preenchido";

/** Rótulos da Clint (`FieldFilterDropdown`); quem mostra passa por `t()`. */
export const ROTULO_DO_OPERADOR: Record<Operador, string> = {
  contem: "Contém",
  nao_contem: "Não contém",
  igual: "Igual",
  diferente: "Diferente",
  maior: "Maior que",
  menor: "Menor que",
  depois: "Depois de",
  antes: "Antes de",
  vazio: "Está vazio",
  preenchido: "Não está vazio",
};

export const CONDICOES_POR_GRUPO_MAX = 10;
export const GRUPOS_MAX = 5;
/** "Limite de {max} condições contém / não contém atingido neste filtro." (Clint). */
export const CONTEM_MAX = 10;

/** As condições de tag da Clint (`TagFilterBuilder`; prints 2b-16 e 2b-17). */
export const OPS_DE_TAG = ["possui", "nao_possui", "qualquer", "sem"] as const;
export type OpDeTag = (typeof OPS_DE_TAG)[number];
/** Rótulos da Clint; quem mostra passa por `t()`. */
export const ROTULO_DA_OP_DE_TAG: Record<OpDeTag, string> = {
  possui: "Possui a tag",
  nao_possui: "Não possui a tag",
  qualquer: "Qualquer tag",
  sem: "Sem tag",
};

const DIA = /^\d{4}-\d{2}-\d{2}$/;
export function diaValido(texto: string): boolean {
  if (!DIA.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}
const NUMERO = /^-?\d+(\.\d+)?$/;
const dia = z.string().refine(diaValido);
const uuid = z.string().uuid();
const DONO = /^(sem_dono|com_dono|agent:[0-9a-f-]{36}|[0-9a-f-]{36})$/i;

const condicaoSchema = z
  .object({
    alvo: z.enum(["contato", "negocio"]),
    chave: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,39}$/),
    tipo: z.enum(TIPOS_DE_CAMPO),
    op: z.enum(OPERADORES),
    valor: z.string().max(200).optional(),
  })
  .strict()
  .refine((c) => OPERADORES_DO_TIPO[c.tipo].includes(c.op), { message: "operador" })
  .refine((c) => !precisaDeValor(c.op) || (c.valor ?? "").trim() !== "", { message: "valor" })
  .refine((c) => c.tipo !== "numero" || !precisaDeValor(c.op) || NUMERO.test(c.valor ?? ""), {
    message: "numero",
  })
  .refine((c) => c.tipo !== "data" || !precisaDeValor(c.op) || diaValido(c.valor ?? ""), {
    message: "data",
  })
  .refine(
    (c) =>
      c.tipo !== "booleano" || !precisaDeValor(c.op) || c.valor === "true" || c.valor === "false",
    { message: "booleano" },
  );

const grupoSchema = z
  .object({
    modo: z.enum(["e", "ou"]),
    condicoes: z.array(condicaoSchema).min(1).max(CONDICOES_POR_GRUPO_MAX),
  })
  .strict();

const tag = z.string().trim().min(1).max(40);

const negocioSchema = z
  .object({
    tem: z.enum(["com", "sem"]).optional(),
    origens: z.array(uuid).max(50).optional(),
    etapas: z.array(uuid).max(200).optional(),
    status: z.array(z.enum(STATUS_DO_FILTRO)).max(3).optional(),
    donos: z.array(z.string().regex(DONO)).max(100).optional(),
    motivos: z.array(z.string().min(1).max(200)).max(60).optional(),
  })
  .strict();

/** Tags em grupos, como os Campos (prints 2b-18 a 2b-20): "possui"/"não possui" levam a tag; "qualquer"/"sem", não. */
const condicaoDeTagSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("possui"), tag }).strict(),
  z.object({ op: z.literal("nao_possui"), tag }).strict(),
  z.object({ op: z.literal("qualquer") }).strict(),
  z.object({ op: z.literal("sem") }).strict(),
]);

const grupoDeTagsSchema = z
  .object({
    modo: z.enum(["e", "ou"]),
    condicoes: z.array(condicaoDeTagSchema).min(1).max(CONDICOES_POR_GRUPO_MAX),
  })
  .strict();

const tagsSchema = z
  .object({ combinar: z.enum(["e", "ou"]), grupos: z.array(grupoDeTagsSchema).max(GRUPOS_MAX) })
  .strict();

type ComCampos = {
  campos?: { grupos: ReadonlyArray<{ condicoes: ReadonlyArray<{ op: string }> }> };
};
export function contarContem(f: ComCampos): number {
  return (f.campos?.grupos ?? [])
    .flatMap((g) => g.condicoes)
    .filter((c) => c.op === "contem" || c.op === "nao_contem").length;
}

export const filtrosDeContatosSchema = z
  .object({
    criadoEm: z.object({ de: dia.optional(), ate: dia.optional() }).strict().optional(),
    telefone: z.enum(OPCOES_DE_TELEFONE).optional(),
    negocio: negocioSchema.optional(),
    tags: tagsSchema.optional(),
    campos: z
      .object({ combinar: z.enum(["e", "ou"]), grupos: z.array(grupoSchema).max(GRUPOS_MAX) })
      .strict()
      .optional(),
  })
  .strict()
  .refine((f) => contarContem(f) <= CONTEM_MAX, { message: "contem" });

export type FiltrosDeContatos = z.infer<typeof filtrosDeContatosSchema>;
export type CondicaoDoFiltro = z.infer<typeof condicaoSchema>;
export type GrupoDoFiltro = z.infer<typeof grupoSchema>;
export type NegocioDoFiltro = z.infer<typeof negocioSchema>;
export type TagsDoFiltro = z.infer<typeof tagsSchema>;
export type CondicaoDeTag = z.infer<typeof condicaoDeTagSchema>;
export type GrupoDeTags = z.infer<typeof grupoDeTagsSchema>;

// ─── Campos que a seção Campos oferece ─────────────────────────────────────────
export type CampoDoFiltro = {
  alvo: "contato" | "negocio";
  chave: string;
  rotulo: string;
  tipo: TipoDeCampo;
  opcoes?: ReadonlyArray<{ value: string; label: string }>;
};

/** Do contato: os fixos e os da 2A (nascimento e links). A 2C acrescenta os personalizados. */
export const CAMPOS_DO_CONTATO_DO_FILTRO: readonly CampoDoFiltro[] = [
  { alvo: "contato", chave: "nome", rotulo: "Nome", tipo: "texto" },
  { alvo: "contato", chave: "email", rotulo: "Email", tipo: "texto" },
  { alvo: "contato", chave: "telefone", rotulo: "Telefone", tipo: "texto" },
  ...CAMPOS_DO_CONTATO_2A.map((c) => ({
    alvo: "contato" as const,
    chave: c.chave,
    rotulo: c.rotulo,
    tipo: (c.chave === "nascimento" ? "data" : "texto") as TipoDeCampo,
  })),
];

export const CAMPO_VALOR_DO_NEGOCIO: CampoDoFiltro = {
  alvo: "negocio",
  chave: "valor",
  rotulo: "Valor do negócio",
  tipo: "numero",
};

/** Do negócio: o valor e os campos do CRM (o catálogo da 1F-a projetado em `settings.fields`). */
export function camposDoNegocioDoFiltro(
  settings: ReadonlyArray<Record<string, unknown> | null | undefined>,
): CampoDoFiltro[] {
  const doCrm = camposFiltraveis(settings)
    .filter((c) => c.alvo === "negocio" && c.chave !== "valor")
    .map((c) => ({
      alvo: "negocio" as const,
      chave: c.chave,
      rotulo: c.rotulo,
      tipo: c.tipo,
      ...(c.opcoes ? { opcoes: c.opcoes } : {}),
    }));
  return [CAMPO_VALOR_DO_NEGOCIO, ...doCrm];
}

// ─── Enxugar, comparar, URL ────────────────────────────────────────────────────
const ordenada = <T extends string>(lista: readonly T[] | undefined): T[] =>
  [...new Set(lista ?? [])].sort((a, b) => a.localeCompare(b));

function enxugarNegocio(n: NegocioDoFiltro | undefined): NegocioDoFiltro | undefined {
  if (!n) return undefined;
  const saida: NegocioDoFiltro = {
    ...(n.tem ? { tem: n.tem } : {}),
    ...(n.origens?.length ? { origens: ordenada(n.origens) } : {}),
    ...(n.etapas?.length ? { etapas: ordenada(n.etapas) } : {}),
    ...(n.status?.length ? { status: ordenada(n.status) } : {}),
    ...(n.donos?.length ? { donos: ordenada(n.donos) } : {}),
    ...(n.motivos?.length ? { motivos: ordenada(n.motivos) } : {}),
  };
  return Object.keys(saida).length > 0 ? saida : undefined;
}

const enxugarCondicaoDeTag = (c: CondicaoDeTag): CondicaoDeTag =>
  c.op === "possui" || c.op === "nao_possui" ? { op: c.op, tag: c.tag.trim() } : { op: c.op };

/** Os grupos ficam na ordem em que a pessoa montou (como a Clint); grupo sem condição sai. */
function enxugarTags(tg: TagsDoFiltro | undefined): TagsDoFiltro | undefined {
  const grupos = (tg?.grupos ?? [])
    .map((g) => ({ modo: g.modo, condicoes: g.condicoes.map(enxugarCondicaoDeTag) }))
    .filter((g) => g.condicoes.length > 0);
  return grupos.length > 0 ? { combinar: tg?.combinar ?? "ou", grupos } : undefined;
}

export function enxugarFiltros(f: FiltrosDeContatos): FiltrosDeContatos {
  const criadoEm =
    f.criadoEm && (f.criadoEm.de || f.criadoEm.ate)
      ? {
          ...(f.criadoEm.de ? { de: f.criadoEm.de } : {}),
          ...(f.criadoEm.ate ? { ate: f.criadoEm.ate } : {}),
        }
      : undefined;
  const grupos = (f.campos?.grupos ?? []).filter((g) => g.condicoes.length > 0);
  const negocio = enxugarNegocio(f.negocio);
  const tags = enxugarTags(f.tags);
  return {
    ...(criadoEm ? { criadoEm } : {}),
    ...(f.telefone ? { telefone: f.telefone } : {}),
    ...(negocio ? { negocio } : {}),
    ...(tags ? { tags } : {}),
    ...(grupos.length > 0 ? { campos: { combinar: f.campos?.combinar ?? "ou", grupos } } : {}),
  };
}

export const temFiltros = (f: FiltrosDeContatos): boolean =>
  Object.keys(enxugarFiltros(f)).length > 0;

export const mesmosFiltros = (a: FiltrosDeContatos, b: FiltrosDeContatos): boolean =>
  JSON.stringify(enxugarFiltros(a)) === JSON.stringify(enxugarFiltros(b));

/** O `f` da URL → filtro válido; qualquer lixo vira filtro vazio. */
export function filtrosDaUrl(texto: string | null | undefined): FiltrosDeContatos {
  if (!texto) return {};
  try {
    const lido = filtrosDeContatosSchema.safeParse(JSON.parse(texto));
    return lido.success ? enxugarFiltros(lido.data) : {};
  } catch {
    return {};
  }
}

export function filtrosParaUrl(f: FiltrosDeContatos): string | null {
  const enxuto = enxugarFiltros(f);
  return Object.keys(enxuto).length > 0 ? JSON.stringify(enxuto) : null;
}

// ─── Seções ────────────────────────────────────────────────────────────────────
export const SECOES_DO_FILTRO = ["contato", "negocio", "tags", "campos"] as const;
export type SecaoDoFiltro = (typeof SECOES_DO_FILTRO)[number];

/** Quantas condições há nos grupos (o selo da seção e o chip; a Clint mostra "2" com dois grupos de uma, print 2b-20). */
export const contarCondicoes = (
  grupos: ReadonlyArray<{ condicoes: readonly unknown[] }> | undefined,
): number => (grupos ?? []).reduce((n, g) => n + g.condicoes.length, 0);

export function contarNaSecao(f: FiltrosDeContatos, secao: SecaoDoFiltro): number {
  const e = enxugarFiltros(f);
  if (secao === "contato") return (e.criadoEm ? 1 : 0) + (e.telefone ? 1 : 0);
  if (secao === "negocio") return Object.keys(e.negocio ?? {}).length;
  if (secao === "tags") return contarCondicoes(e.tags?.grupos);
  return contarCondicoes(e.campos?.grupos);
}

export function limparSecao(f: FiltrosDeContatos, secao: SecaoDoFiltro): FiltrosDeContatos {
  const { criadoEm, telefone, negocio, tags, campos } = enxugarFiltros(f);
  return enxugarFiltros({
    ...(secao === "contato" ? {} : { criadoEm, telefone }),
    ...(secao === "negocio" ? {} : { negocio }),
    ...(secao === "tags" ? {} : { tags }),
    ...(secao === "campos" ? {} : { campos }),
  });
}

// ─── Chips da faixa ────────────────────────────────────────────────────────────
export type ChaveDoChip =
  | "criadoEm"
  | "telefone"
  | "negocio.tem"
  | "negocio.origens"
  | "negocio.etapas"
  | "negocio.status"
  | "negocio.donos"
  | "negocio.motivos"
  | "tags"
  | "campos";
export type ChipDoFiltro = { chave: ChaveDoChip; secao: SecaoDoFiltro; quantidade: number };

const LISTAS_DO_NEGOCIO = ["origens", "etapas", "status", "donos", "motivos"] as const;

export function chipsDosFiltros(f: FiltrosDeContatos): ChipDoFiltro[] {
  const e = enxugarFiltros(f);
  const chips: ChipDoFiltro[] = [];
  if (e.criadoEm) chips.push({ chave: "criadoEm", secao: "contato", quantidade: 1 });
  if (e.telefone) chips.push({ chave: "telefone", secao: "contato", quantidade: 1 });
  if (e.negocio?.tem) chips.push({ chave: "negocio.tem", secao: "negocio", quantidade: 1 });
  for (const k of LISTAS_DO_NEGOCIO) {
    const lista = e.negocio?.[k];
    if (lista?.length)
      chips.push({ chave: `negocio.${k}`, secao: "negocio", quantidade: lista.length });
  }
  const tags = contarNaSecao(e, "tags");
  if (tags > 0) chips.push({ chave: "tags", secao: "tags", quantidade: tags });
  const campos = contarNaSecao(e, "campos");
  if (campos > 0) chips.push({ chave: "campos", secao: "campos", quantidade: campos });
  return chips;
}

export function removerChip(f: FiltrosDeContatos, chave: ChaveDoChip): FiltrosDeContatos {
  const e = enxugarFiltros(f);
  if (chave === "criadoEm") return enxugarFiltros({ ...e, criadoEm: undefined });
  if (chave === "telefone") return enxugarFiltros({ ...e, telefone: undefined });
  if (chave === "tags") return enxugarFiltros({ ...e, tags: undefined });
  if (chave === "campos") return enxugarFiltros({ ...e, campos: undefined });
  const parte = chave.slice("negocio.".length) as keyof NegocioDoFiltro;
  return enxugarFiltros({ ...e, negocio: { ...e.negocio, [parte]: undefined } });
}

/** "01/10/2026 – 17/10/2026" (sempre no formato brasileiro). */
export function textoDoPeriodo(p: { de?: string; ate?: string }): string {
  return `${p.de ? dataBrDoIso(p.de) : "…"} – ${p.ate ? dataBrDoIso(p.ate) : "…"}`;
}
