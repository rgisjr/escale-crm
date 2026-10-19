import { z } from "zod";

import { contarCondicoes, diaValido, tagsSchema } from "@/lib/escale/contatos/filtros";

import { PARAM_PRESET, PRESETS, presetDaUrl, type Preset } from "./presets";

/**
 * O PAINEL DE FILTROS DA FILA (fork Escale, Fase 3D; B1–B6 do PRD de Conversas;
 * Clint `index-CPsdLJFo`, `tr`/`jf`/`Xf`/`qf`).
 *
 * Uma forma só para a URL (`?f=`), o filtro salvo (`crm_filtros_das_listas`,
 * lista "conversas") e a tela. Os presets da 3A são valores deste painel
 * (`PAINEL_DO_PRESET`): escolher "Em espera" preenche "Status da conversa", e o
 * funil conta 1, como na Clint. Quem avalia é o banco (`fn_escale_conversa_passa`,
 * migration 9204), com o filtro compilado em `compilar-filtros-da-fila.ts`.
 */
export const STATUS_DA_FILA = ["em_espera", "em_aberto", "fechado", "arquivada"] as const;
export type StatusDaFila = (typeof STATUS_DA_FILA)[number];
/** Rótulos da Clint (c67); "Arquivada" é nosso (o original arquiva, a Clint não). Quem mostra passa por `t()`. */
export const ROTULO_DO_STATUS_DA_FILA: Readonly<Record<StatusDaFila, string>> = {
  em_espera: "Em espera",
  em_aberto: "Em aberto",
  fechado: "Fechado",
  arquivada: "Arquivada",
};

export const MARCAS = [
  "atribuidas_a_mim",
  "nao_atribuidas",
  "sem_resposta",
  "aguardando_contato",
  "em_transferencia",
  "lidas",
  "nao_lidas",
  "dentro_da_janela",
  "fora_da_janela",
  "suspensas",
] as const;
export type Marca = (typeof MARCAS)[number];
/** O original não guarda a janela de chamada (3B N20): os dois toggles ficam desligados com "Em breve". */
export const MARCAS_DE_CHAMADA = ["chamada_aberta", "chamada_fechada"] as const;
export type MarcaDeChamada = (typeof MARCAS_DE_CHAMADA)[number];
/** A ordem dos toggles da Clint (c32), com os dois de chamada no lugar deles. */
export const MARCAS_NA_TELA: ReadonlyArray<Marca | MarcaDeChamada> = [
  "atribuidas_a_mim",
  "nao_atribuidas",
  "sem_resposta",
  "aguardando_contato",
  "em_transferencia",
  "lidas",
  "nao_lidas",
  "dentro_da_janela",
  "fora_da_janela",
  "chamada_aberta",
  "chamada_fechada",
  "suspensas",
];
export const ROTULO_DA_MARCA: Readonly<Record<Marca | MarcaDeChamada, string>> = {
  atribuidas_a_mim: "Atribuídas a mim",
  nao_atribuidas: "Não atribuídas",
  sem_resposta: "Sem resposta do atendente",
  aguardando_contato: "Aguardando resposta do contato",
  em_transferencia: "Em transferência",
  lidas: "Lidas",
  nao_lidas: "Não lidas",
  dentro_da_janela: "Dentro da janela de conversa",
  fora_da_janela: "Fora da janela de conversa",
  chamada_aberta: "Janela de chamada aberta",
  chamada_fechada: "Janela de chamada fechada",
  suspensas: "Conversas suspensas",
};
/** Só valem no WhatsApp Oficial (o logo verde ao lado do toggle, c32). */
export const MARCAS_DO_OFICIAL: ReadonlyArray<Marca | MarcaDeChamada> = [
  "dentro_da_janela",
  "fora_da_janela",
  "chamada_aberta",
  "chamada_fechada",
];

export const SEM_ATENDENTE = "nenhum";
export const SEM_DONO = "sem_dono";
export const PREFIXO_DO_AGENTE = "agent:";
export const AGENTES_MAX = 20;
/** "Não informar" grava "Outro motivo" (3A N12): no filtro, é o motivo `other`. */
export const MOTIVO_NAO_INFORMADO = "other";
export const TIPOS_DE_DATA_DO_NEGOCIO = ["criacao", "ganho", "perda"] as const;
export type TipoDeDataDoNegocio = (typeof TIPOS_DE_DATA_DO_NEGOCIO)[number];
const STATUS_DO_NEGOCIO = ["open", "won", "lost"] as const;

const dia = z.string().refine(diaValido);
const uuid = z.string().uuid();
const DONO = /^(sem_dono|agent:[0-9a-f-]{36}|[0-9a-f-]{36})$/i;
const periodoSchema = z.object({ de: dia.optional(), ate: dia.optional() }).strict();

const conversasSchema = z
  .object({
    marcas: z.array(z.enum(MARCAS)).max(MARCAS.length).optional(),
    criadaEm: periodoSchema.optional(),
    status: z.array(z.enum(STATUS_DA_FILA)).max(STATUS_DA_FILA.length).optional(),
    atendentes: z
      .array(z.union([uuid, z.literal(SEM_ATENDENTE)]))
      .max(200)
      .optional(),
    agentes: z.array(uuid).max(AGENTES_MAX).optional(),
    setores: z.array(uuid).max(100).optional(),
  })
  .strict();

const negociosSchema = z
  .object({
    data: z
      .object({ tipo: z.enum(TIPOS_DE_DATA_DO_NEGOCIO), de: dia.optional(), ate: dia.optional() })
      .strict()
      .optional(),
    tem: z.enum(["com", "sem"]).optional(),
    status: z.array(z.enum(STATUS_DO_NEGOCIO)).max(3).optional(),
    motivos: z.array(z.string().min(1).max(200)).max(60).optional(),
    donos: z.array(z.string().regex(DONO)).max(100).optional(),
    grupos: z.array(uuid).max(50).optional(),
    origens: z.array(uuid).max(50).optional(),
    etapas: z.array(uuid).max(200).optional(),
  })
  .strict();

export const filtrosDaFilaSchema = z
  .object({
    conversas: conversasSchema.optional(),
    grupos: z.enum(["conversas", "grupos"]).optional(),
    negocios: negociosSchema.optional(),
    contatos: z.object({ tags: tagsSchema.optional() }).strict().optional(),
    canais: z.array(uuid).max(100).optional(),
  })
  .strict();

export type FiltrosDoPainel = z.infer<typeof filtrosDaFilaSchema>;
export type ConversasDoPainel = z.infer<typeof conversasSchema>;
export type NegociosDoPainel = z.infer<typeof negociosSchema>;
type TagsDoPainel = NonNullable<NonNullable<FiltrosDoPainel["contatos"]>["tags"]>;

// ─── Enxugar e comparar ────────────────────────────────────────────────────────
function lista<T extends string>(
  valores: readonly T[] | undefined,
  ordem?: readonly T[],
): T[] | undefined {
  const unicos = [...new Set(valores ?? [])];
  if (unicos.length === 0) return undefined;
  return ordem
    ? ordem.filter((v) => unicos.includes(v))
    : unicos.sort((a, b) => a.localeCompare(b));
}

function semVazios<T extends Record<string, unknown>>(objeto: T): T | undefined {
  const cheio = Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined));
  return Object.keys(cheio).length > 0 ? (cheio as T) : undefined;
}

function periodo(p: { de?: string; ate?: string } | undefined) {
  return p && (p.de || p.ate)
    ? semVazios({ de: p.de || undefined, ate: p.ate || undefined })
    : undefined;
}

function enxugarConversas(c: ConversasDoPainel | undefined): ConversasDoPainel | undefined {
  if (!c) return undefined;
  return semVazios<ConversasDoPainel>({
    marcas: lista(c.marcas, MARCAS),
    criadaEm: periodo(c.criadaEm),
    status: lista(c.status, STATUS_DA_FILA),
    atendentes: lista(c.atendentes),
    agentes: lista(c.agentes),
    setores: lista(c.setores),
  });
}

function enxugarNegocios(n: NegociosDoPainel | undefined): NegociosDoPainel | undefined {
  if (!n) return undefined;
  const datas = periodo(n.data);
  return semVazios<NegociosDoPainel>({
    data: n.data && datas ? { tipo: n.data.tipo, ...datas } : undefined,
    tem: n.tem,
    status: lista(n.status, STATUS_DO_NEGOCIO),
    motivos: lista(n.motivos),
    donos: lista(n.donos),
    grupos: lista(n.grupos),
    origens: lista(n.origens),
    etapas: lista(n.etapas),
  });
}

/** Os grupos ficam na ordem montada (como a Clint); grupo sem condição sai; a tag é aparada. */
function enxugarTags(tg: TagsDoPainel | undefined): TagsDoPainel | undefined {
  const grupos = (tg?.grupos ?? [])
    .map((g) => ({
      modo: g.modo,
      condicoes: g.condicoes.map((c) =>
        c.op === "possui" || c.op === "nao_possui" ? { op: c.op, tag: c.tag.trim() } : { op: c.op },
      ),
    }))
    .filter((g) => g.condicoes.length > 0);
  return grupos.length > 0
    ? ({ combinar: tg?.combinar ?? "ou", grupos } as TagsDoPainel)
    : undefined;
}

/** O painel sem nada vazio, na ordem fixa: é o que vai para a URL e para o salvo, e é sobre ele que se conta e compara. */
export function enxugarFiltrosDoPainel(f: FiltrosDoPainel): FiltrosDoPainel {
  const tags = enxugarTags(f.contatos?.tags);
  return (
    semVazios<FiltrosDoPainel>({
      conversas: enxugarConversas(f.conversas),
      grupos: f.grupos,
      negocios: enxugarNegocios(f.negocios),
      contatos: tags ? { tags } : undefined,
      canais: lista(f.canais),
    }) ?? {}
  );
}

export const mesmosFiltrosDoPainel = (a: FiltrosDoPainel, b: FiltrosDoPainel): boolean =>
  JSON.stringify(enxugarFiltrosDoPainel(a)) === JSON.stringify(enxugarFiltrosDoPainel(b));

// ─── Seções, contagem e limpar ─────────────────────────────────────────────────
export const SECOES_DA_FILA = ["conversas", "grupos", "negocios", "contatos", "canais"] as const;
export type SecaoDaFila = (typeof SECOES_DA_FILA)[number];

const CHAVES_DE_CONVERSAS = ["criadaEm", "status", "atendentes", "agentes", "setores"] as const;

/** O selo de cada acordeão (c64: status preenchido = 1; cada toggle conta 1). */
export function contarNaSecaoDaFila(f: FiltrosDoPainel, secao: SecaoDaFila): number {
  const e = enxugarFiltrosDoPainel(f);
  if (secao === "conversas") {
    const c = e.conversas;
    if (!c) return 0;
    return (c.marcas?.length ?? 0) + CHAVES_DE_CONVERSAS.filter((k) => c[k] !== undefined).length;
  }
  if (secao === "grupos") return e.grupos ? 1 : 0;
  if (secao === "negocios") return Object.keys(e.negocios ?? {}).length;
  if (secao === "contatos") return contarCondicoes(e.contatos?.tags?.grupos);
  return e.canais ? 1 : 0;
}

/** O selo do funil: a soma das seções. */
export const totalDeCriterios = (f: FiltrosDoPainel): number =>
  SECOES_DA_FILA.reduce((n, s) => n + contarNaSecaoDaFila(f, s), 0);

export const temCriterios = (f: FiltrosDoPainel): boolean => totalDeCriterios(f) > 0;

/** O X do acordeão: limpa só aquela seção. */
export function limparSecaoDaFila(f: FiltrosDoPainel, secao: SecaoDaFila): FiltrosDoPainel {
  const { [secao]: _fora, ...resto } = enxugarFiltrosDoPainel(f);
  return enxugarFiltrosDoPainel(resto);
}

// ─── Presets, salvos e o rótulo do botão ───────────────────────────────────────
export const PAINEL_DO_PRESET: Readonly<Record<Preset, FiltrosDoPainel>> = {
  todos: {},
  nao_lidas: { conversas: { marcas: ["nao_lidas"] } },
  meus_em_aberto: { conversas: { marcas: ["atribuidas_a_mim"], status: ["em_aberto"] } },
  em_aberto: { conversas: { status: ["em_aberto"] } },
  em_espera: { conversas: { status: ["em_espera"] } },
  fechadas: { conversas: { status: ["fechado"] } },
};

/** "Somente conversas" / "Somente grupos" (A4): só aparecem quando a organização tem grupo. */
export const PRESETS_DE_GRUPO = ["somente_conversas", "somente_grupos"] as const;
export type PresetDeGrupo = (typeof PRESETS_DE_GRUPO)[number];
export const PAINEL_DO_PRESET_DE_GRUPO: Readonly<Record<PresetDeGrupo, FiltrosDoPainel>> = {
  somente_conversas: { grupos: "conversas" },
  somente_grupos: { grupos: "grupos" },
};
export const ROTULO_DO_PRESET_DE_GRUPO: Readonly<Record<PresetDeGrupo, string>> = {
  somente_conversas: "Somente conversas",
  somente_grupos: "Somente grupos",
};

export function presetDoPainel(f: FiltrosDoPainel): Preset | PresetDeGrupo | null {
  const preset = PRESETS.find((p) => mesmosFiltrosDoPainel(PAINEL_DO_PRESET[p], f));
  if (preset) return preset;
  return (
    PRESETS_DE_GRUPO.find((p) => mesmosFiltrosDoPainel(PAINEL_DO_PRESET_DE_GRUPO[p], f)) ?? null
  );
}

export type RotuloDoBotao =
  | { tipo: "preset"; preset: Preset }
  | { tipo: "grupo"; preset: PresetDeGrupo }
  | { tipo: "salvo"; id: string; nome: string }
  | { tipo: "personalizado" };

/** O texto do botão (c31, c71): o preset, o salvo aplicado, ou "Personalizado". */
export function rotuloDoBotao(
  f: FiltrosDoPainel,
  salvos: ReadonlyArray<{ id: string; nome: string; criterios: FiltrosDoPainel }>,
): RotuloDoBotao {
  const preset = presetDoPainel(f);
  if (preset && (PRESETS as readonly string[]).includes(preset))
    return { tipo: "preset", preset: preset as Preset };
  if (preset) return { tipo: "grupo", preset: preset as PresetDeGrupo };
  const salvo = salvos.find((s) => mesmosFiltrosDoPainel(s.criterios, f));
  return salvo ? { tipo: "salvo", id: salvo.id, nome: salvo.nome } : { tipo: "personalizado" };
}

// ─── URL ───────────────────────────────────────────────────────────────────────
export const PARAM_DO_PAINEL = "f";

/** Texto → painel; vazio vira `{}`; lixo vira `null` (a rota responde 422). */
export function painelDoTexto(texto: string | null | undefined): FiltrosDoPainel | null {
  if (!texto) return {};
  try {
    const lido = filtrosDaFilaSchema.safeParse(JSON.parse(texto));
    return lido.success ? enxugarFiltrosDoPainel(lido.data) : null;
  } catch {
    return null;
  }
}

/** O painel da URL: `?f=` manda; sem ele, o preset de `?v=` (3A); lixo vira vazio. */
export function painelDaUrl(params: { get(chave: string): string | null }): FiltrosDoPainel {
  const texto = params.get(PARAM_DO_PAINEL);
  if (texto) return painelDoTexto(texto) ?? {};
  return PAINEL_DO_PRESET[presetDaUrl(params.get(PARAM_PRESET))];
}

/** O que vai para a URL: preset em `?v=` (o da 3A), o resto em `?f=`, nada quando vazio. */
export function paramsDoPainel(f: FiltrosDoPainel): { v: string | null; f: string | null } {
  const e = enxugarFiltrosDoPainel(f);
  if (!temCriterios(e)) return { v: null, f: null };
  const preset = presetDoPainel(e);
  if (preset && (PRESETS as readonly string[]).includes(preset)) return { v: preset, f: null };
  return { v: null, f: JSON.stringify(e) };
}
