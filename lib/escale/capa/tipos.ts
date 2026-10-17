import { z } from "zod";

import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Lead } from "@/lib/types/leads";

/**
 * A PREFERÊNCIA DO CARD (fork Escale, Fase 1E): a do "Personalizar cards" da
 * Clint (01-019; preferência `kanban_card`, padrão `Ph`, limites `Fda`/`Bda` do
 * bundle). É da pessoa e vale em todas as origens dela, como na Clint.
 */
export const ITENS_FIXOS = [
  "tags",
  "empresa",
  "ultimaMensagem",
  "atividades",
  "valor",
  "idade",
  "dono",
] as const;
export type ItemFixo = (typeof ITENS_FIXOS)[number];

export const CANAIS_DO_RODAPE = [
  "telefone",
  "mensagem",
  "email",
  "lembrete",
  "agendamento",
] as const;
export type CanalDoRodape = (typeof CANAIS_DO_RODAPE)[number];

/** Clint: "Limite de 10 campos atingido" (itens ligados + campos) e "Limite de 3 ícones no rodapé atingido". */
export const CAMPOS_MAX = 10;
export const CANAIS_MAX = 3;

export type EntidadeDoCampo = "contato" | "negocio";
export interface CampoEscolhido {
  entidade: EntidadeDoCampo;
  chave: string;
}

/**
 * Escrito à mão (não `z.infer`) porque as regras do esquema chamam `ocupados` e
 * `canaisLigados`, que recebem este tipo: inferir do esquema fecharia um ciclo.
 */
export interface PrefsDoCard {
  itens: Record<ItemFixo, boolean>;
  campos: CampoEscolhido[];
  canais: Record<CanalDoRodape, boolean>;
}

const itensSchema = z
  .object(
    Object.fromEntries(ITENS_FIXOS.map((i) => [i, z.boolean()])) as Record<ItemFixo, z.ZodBoolean>,
  )
  .strict();
const canaisSchema = z
  .object(
    Object.fromEntries(CANAIS_DO_RODAPE.map((c) => [c, z.boolean()])) as Record<
      CanalDoRodape,
      z.ZodBoolean
    >,
  )
  .strict();
const campoSchema = z
  .object({ entidade: z.enum(["contato", "negocio"]), chave: z.string().min(1).max(100) })
  .strict();

export const prefsDoCardSchema = z
  .object({
    itens: itensSchema,
    campos: z.array(campoSchema).max(CAMPOS_MAX),
    canais: canaisSchema,
  })
  .strict()
  .refine((p) => new Set(p.campos.map(chaveDoCampo)).size === p.campos.length, {
    message: "campo repetido",
  })
  .refine((p) => ocupados(p) <= CAMPOS_MAX, { message: "limite de campos" })
  .refine((p) => canaisLigados(p) <= CANAIS_MAX, { message: "limite de ícones" });

/** O padrão da Clint (`Ph`): o card que a Casca V4 já mostra. */
export const PREFS_PADRAO: PrefsDoCard = {
  itens: {
    tags: true,
    empresa: false,
    ultimaMensagem: true,
    atividades: true,
    valor: true,
    idade: true,
    dono: true,
  },
  campos: [],
  canais: { telefone: true, mensagem: true, email: true, lembrete: false, agendamento: false },
};

export function chaveDoCampo(c: CampoEscolhido): string {
  return `${c.entidade}:${c.chave}`;
}

/** Quantos dos 10 lugares a preferência ocupa (os canais ficam de fora). */
export function ocupados(p: Pick<PrefsDoCard, "itens" | "campos">): number {
  return Object.values(p.itens).filter(Boolean).length + p.campos.length;
}

export function canaisLigados(p: Pick<PrefsDoCard, "canais">): number {
  return Object.values(p.canais).filter(Boolean).length;
}

/** O jsonb do banco vira preferência, ou `null` se não servir mais. Nunca lança. */
export function lerPrefs(bruto: unknown): PrefsDoCard | null {
  const lido = prefsDoCardSchema.safeParse(bruto);
  return lido.success ? lido.data : null;
}

/** Liga ou desliga um item. Ligar com os 10 ocupados devolve a MESMA preferência. */
export function alternarItem(p: PrefsDoCard, item: ItemFixo): PrefsDoCard {
  if (!p.itens[item] && ocupados(p) >= CAMPOS_MAX) return p;
  return { ...p, itens: { ...p.itens, [item]: !p.itens[item] } };
}

export function alternarCampo(p: PrefsDoCard, campo: CampoEscolhido): PrefsDoCard {
  const chave = chaveDoCampo(campo);
  if (p.campos.some((c) => chaveDoCampo(c) === chave)) {
    return { ...p, campos: p.campos.filter((c) => chaveDoCampo(c) !== chave) };
  }
  if (ocupados(p) >= CAMPOS_MAX) return p;
  return { ...p, campos: [...p.campos, { entidade: campo.entidade, chave: campo.chave }] };
}

/** Liga ou desliga um ícone. Ligar com 3 ligados devolve a MESMA preferência. */
export function alternarCanal(p: PrefsDoCard, canal: CanalDoRodape): PrefsDoCard {
  if (!p.canais[canal] && canaisLigados(p) >= CANAIS_MAX) return p;
  return { ...p, canais: { ...p.canais, [canal]: !p.canais[canal] } };
}

export function prefsIguais(a: PrefsDoCard, b: PrefsDoCard): boolean {
  const itens = ITENS_FIXOS.every((i) => a.itens[i] === b.itens[i]);
  const canais = CANAIS_DO_RODAPE.every((c) => a.canais[c] === b.canais[c]);
  const camposA = a.campos.map(chaveDoCampo);
  const camposB = new Set(b.campos.map(chaveDoCampo));
  return itens && canais && camposA.length === camposB.size && camposA.every((c) => camposB.has(c));
}

/** O ponto da marca no ícone de ajustes (a Clint compara com o padrão, `Kmn`). */
export const diferemDoPadrao = (p: PrefsDoCard) => !prefsIguais(p, PREFS_PADRAO);

export interface CampoDaCapa extends CampoEscolhido {
  rotulo: string;
  /** `true` = rótulo é texto de interface (passa por `t()`); `false` = nome que a organização deu ao campo. */
  deInterface: boolean;
  opcoes?: ReadonlyArray<{ value: string; label: string }>;
}

/** Os campos do contato que temos (Fase 2 traz os personalizados do contato). */
export const CAMPOS_DO_CONTATO: readonly CampoDaCapa[] = [
  { entidade: "contato", chave: "email", rotulo: "Email", deInterface: true },
  { entidade: "contato", chave: "telefone", rotulo: "Telefone", deInterface: true },
];

/** Os do contato e os personalizados do negócio (`settings.fields`); numa visualização, a união das origens. */
export function camposDaCapa(
  settings: ReadonlyArray<Record<string, unknown> | null | undefined>,
): CampoDaCapa[] {
  const doNegocio = new Map<string, CampoDaCapa>();
  for (const s of settings) {
    for (const def of camposDoFunil(s ?? null)) {
      if (doNegocio.has(def.key)) continue;
      doNegocio.set(def.key, {
        entidade: "negocio",
        chave: def.key,
        rotulo: def.label,
        deInterface: false,
        ...(def.options?.length ? { opcoes: def.options } : {}),
      });
    }
  }
  return [...CAMPOS_DO_CONTATO, ...doNegocio.values()];
}

const chavesDoNegocio = (campos: readonly CampoDaCapa[]) =>
  new Set(campos.filter((c) => c.entidade === "negocio").map((c) => c.chave));

/**
 * A preferência vale em todas as origens, e os campos do negócio são do CRM
 * (catálogo da organização, migration 9006). O campo que foi apagado do CRM
 * sairia do card e ainda gastaria um dos 10 lugares: aqui ele é solto. Contato
 * não entra na conta. Nada a soltar devolve a MESMA preferência. Só chame com o
 * catálogo carregado: com ele vazio por falha, soltaria tudo.
 */
export function limparCamposSemOrigem(
  p: PrefsDoCard,
  catalogo: readonly CampoDaCapa[],
): PrefsDoCard {
  const existentes = chavesDoNegocio(catalogo);
  const campos = p.campos.filter((c) => c.entidade !== "negocio" || existentes.has(c.chave));
  return campos.length === p.campos.length ? p : { ...p, campos };
}

export function valorDoCampo(lead: Lead, campo: CampoEscolhido): unknown {
  if (campo.entidade === "negocio") return lead.custom_fields?.[campo.chave];
  if (campo.chave === "email") return lead.contact_email ?? null;
  if (campo.chave === "telefone") return lead.contact_phone ?? null;
  return null;
}

/** O valor como o chip escreve. `null` = vazio: o chip não aparece. Opção vira o rótulo dela. */
export function textoDoValor(
  valor: unknown,
  campo: Pick<CampoDaCapa, "opcoes">,
  sim: string,
  nao: string,
): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "boolean") return valor ? sim : nao;
  const rotulo = (v: unknown) =>
    campo.opcoes?.find((o) => o.value === String(v))?.label ?? String(v);
  if (Array.isArray(valor)) {
    const partes = valor.map(rotulo).filter((p) => p.trim() !== "");
    return partes.length ? partes.join(", ") : null;
  }
  const texto = rotulo(valor).trim();
  return texto === "" ? null : texto;
}
