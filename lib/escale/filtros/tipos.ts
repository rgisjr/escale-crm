import { z } from "zod";

/**
 * OS FILTROS DO QUADRO DE NEGÓCIOS (fork Escale, Fase 1D).
 *
 * Uma forma só para os três lugares que falam de filtro: a URL do quadro
 * (`url.ts`), o filtro salvo (`crm_filtros_salvos.criterios`) e a tela
 * (`components/escale/filtros/`). O schema mora aqui para a rota recusar
 * exatamente o que a tela não consegue montar.
 *
 * Status é uma LISTA: "Em aberto" é o padrão, como na Clint, e dá para juntar
 * ganhos e perdidos. Ganho e perda continuam sendo ETAPAS (motor do original,
 * decisão de 15/10): o quadro esconde a coluna de ganho e a de perda quando o
 * status não as pede (`etapasVisiveis`, em `aplicar.ts`).
 */
export const STATUS_DO_NEGOCIO = ["open", "won", "lost"] as const;
export type StatusDoNegocio = (typeof STATUS_DO_NEGOCIO)[number];

export const UNIDADES_DE_TEMPO = ["horas", "dias"] as const;
export type UnidadeDeTempo = (typeof UNIDADES_DE_TEMPO)[number];

/** Os canais do CHECK `conversations_channel_check`. */
export const CANAIS_DA_CONVERSA = ["whatsapp", "instagram", "facebook"] as const;
export type CanalDaConversa = (typeof CANAIS_DA_CONVERSA)[number];

/** "Aberta" e "Encerrada": a mesma régua do cabeçalho do Inbox (`ConversationHeader`). */
export const SITUACOES_DA_CONVERSA = ["aberta", "encerrada"] as const;
export type SituacaoDaConversa = (typeof SITUACOES_DA_CONVERSA)[number];
export const STATUS_DE_CONVERSA_ENCERRADA: readonly string[] = ["resolved", "closed", "archived"];

/** O "ninguém" do filtro de atendentes ("Não atribuídos"). */
export const SEM_ATENDENTE = "nenhum";

export const ALVOS_DE_CAMPO = ["negocio", "contato"] as const;
export type AlvoDeCampo = (typeof ALVOS_DE_CAMPO)[number];
export const OPERADORES_DE_CAMPO = ["contem", "igual", "entre", "preenchido", "vazio"] as const;
export type OperadorDeCampo = (typeof OPERADORES_DE_CAMPO)[number];

export const CAMPOS_FIXOS_DE_ORDEM = [
  "contato.nome",
  "negocio.titulo",
  "negocio.criado",
  "negocio.atualizado",
  "negocio.valor",
  "negocio.previsao",
  "negocio.ganho",
  "negocio.perdido",
  "negocio.tempo_na_etapa",
  "atividades.concluidas",
  "atividades.abertas",
  "atendimento.ultima_mensagem",
  "atendimento.nao_lidas",
] as const;
/** Campo personalizado do negócio na ordenação: `campo:<chave>`. */
export const PREFIXO_DE_CAMPO = "campo:";

export const CONDICOES_DE_CAMPO_MAX = 10;
export const CRITERIOS_DE_ORDEM_MAX = 3;

const numero = z.number().finite().min(0).max(1e12);
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const intervaloSchema = z.object({ min: numero.optional(), max: numero.optional() }).strict();
const intervaloDeTempoSchema = z
  .object({ min: numero.optional(), max: numero.optional(), unidade: z.enum(UNIDADES_DE_TEMPO) })
  .strict();

export const condicaoDeCampoSchema = z
  .object({
    alvo: z.enum(ALVOS_DE_CAMPO),
    chave: z.string().min(1).max(40),
    op: z.enum(OPERADORES_DE_CAMPO),
    valor: z.string().max(200).optional(),
    ate: z.string().max(200).optional(),
  })
  .strict();

export const criterioDeOrdemSchema = z
  .object({
    campo: z
      .string()
      .max(60)
      .refine((c) => (CAMPOS_FIXOS_DE_ORDEM as readonly string[]).includes(c) || /^campo:[a-z][a-z0-9_]*$/i.test(c)),
    direcao: z.enum(["asc", "desc"]),
  })
  .strict();

export const filtroDeConversaSchema = z
  .object({
    existe: z.enum(["com", "sem"]).optional(),
    naoLidas: z.boolean().optional(),
    semResposta: z.boolean().optional(),
    situacao: z.array(z.enum(SITUACOES_DA_CONVERSA)).max(2).optional(),
    canais: z.array(z.enum(CANAIS_DA_CONVERSA)).max(3).optional(),
    atendentes: z.array(z.string().min(1).max(80)).max(100).optional(),
  })
  .strict();

export const filtrosDoQuadroSchema = z
  .object({
    status: z.array(z.enum(STATUS_DO_NEGOCIO)).min(1).max(3),
    busca: z.string().max(200).optional(),
    /** O `owner` do original: uuid, `agent:<uuid>` ou `unassigned`. */
    dono: z.string().min(1).max(80).optional(),
    tags: z.array(z.string().min(1).max(80)).max(50).optional(),
    /** Só o OU é guardado: E é o padrão (`lib/kanban/filters.ts`). */
    modoDasTags: z.literal("ou").optional(),
    atrasados: z.literal(true).optional(),
    motivoDePerda: z.string().min(1).max(200).optional(),
    categoriaDePerda: z.string().min(1).max(200).optional(),
    criadoEm: z.object({ de: dia.optional(), ate: dia.optional() }).strict().optional(),
    /** Centavos, na moeda da organização (a régua da #1531 em `applyFilters`). */
    valor: intervaloSchema.optional(),
    conversa: filtroDeConversaSchema.optional(),
    campos: z.array(condicaoDeCampoSchema).max(CONDICOES_DE_CAMPO_MAX).optional(),
    atividadesConcluidas: intervaloSchema.optional(),
    tempoNaEtapa: intervaloDeTempoSchema.optional(),
    tempoDesdeEntrada: intervaloDeTempoSchema.optional(),
    ordem: z.array(criterioDeOrdemSchema).max(CRITERIOS_DE_ORDEM_MAX).optional(),
  })
  .strict();

export type FiltrosDoQuadro = z.infer<typeof filtrosDoQuadroSchema>;
export type CondicaoDeCampo = z.infer<typeof condicaoDeCampoSchema>;
export type CriterioDeOrdem = z.infer<typeof criterioDeOrdemSchema>;
export type FiltroDeConversa = z.infer<typeof filtroDeConversaSchema>;
export type Intervalo = z.infer<typeof intervaloSchema>;
export type IntervaloDeTempo = z.infer<typeof intervaloDeTempoSchema>;

export const FILTROS_PADRAO: FiltrosDoQuadro = { status: ["open"] };

/** Status sem repetição, na ordem fixa; nada válido vira o padrão ("Em aberto"). */
export function normalizarStatus(lista: readonly string[]): StatusDoNegocio[] {
  const escolhidos = STATUS_DO_NEGOCIO.filter((s) => lista.includes(s));
  return escolhidos.length > 0 ? escolhidos : [...FILTROS_PADRAO.status];
}

export const ehStatusPadrao = (status: readonly StatusDoNegocio[]) => status.length === 1 && status[0] === "open";

const semIndefinidos = <T extends object>(objeto: T): T =>
  Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined)) as T;

function intervalo<T extends { min?: number; max?: number }>(i: T | undefined): T | undefined {
  if (!i || (i.min === undefined && i.max === undefined)) return undefined;
  return semIndefinidos(i);
}

function enxugarConversa(c: FiltroDeConversa | undefined): FiltroDeConversa | undefined {
  if (!c) return undefined;
  // "Sem conversa" não combina com nenhum outro critério de conversa.
  if (c.existe === "sem") return { existe: "sem" };
  const limpo = semIndefinidos<FiltroDeConversa>({
    existe: c.existe,
    naoLidas: c.naoLidas || undefined,
    semResposta: c.semResposta || undefined,
    situacao: c.situacao?.length ? [...c.situacao] : undefined,
    canais: c.canais?.length ? [...c.canais] : undefined,
    atendentes: c.atendentes?.length ? [...c.atendentes] : undefined,
  });
  return Object.keys(limpo).length > 0 ? limpo : undefined;
}

/**
 * O filtro sem nada vazio: é o que vai para a URL e para o filtro salvo, e é
 * sobre ele que se conta e se compara. Uma seção "aberta e vazia" não é filtro.
 */
export function enxugar(f: FiltrosDoQuadro): FiltrosDoQuadro {
  const tags = f.tags?.length ? [...f.tags] : undefined;
  const criadoEm =
    f.criadoEm && (f.criadoEm.de || f.criadoEm.ate)
      ? semIndefinidos({ de: f.criadoEm.de || undefined, ate: f.criadoEm.ate || undefined })
      : undefined;
  return semIndefinidos<FiltrosDoQuadro>({
    status: normalizarStatus(f.status),
    busca: f.busca?.trim() || undefined,
    dono: f.dono && f.dono !== "any" ? f.dono : undefined,
    tags,
    modoDasTags: tags && tags.length > 1 ? f.modoDasTags : undefined,
    atrasados: f.atrasados || undefined,
    motivoDePerda: f.motivoDePerda?.trim() ? f.motivoDePerda : undefined,
    categoriaDePerda: f.categoriaDePerda?.trim() ? f.categoriaDePerda : undefined,
    criadoEm,
    valor: intervalo(f.valor),
    conversa: enxugarConversa(f.conversa),
    campos: f.campos?.length ? [...f.campos] : undefined,
    atividadesConcluidas: intervalo(f.atividadesConcluidas),
    tempoNaEtapa: intervalo(f.tempoNaEtapa),
    tempoDesdeEntrada: intervalo(f.tempoDesdeEntrada),
    ordem: f.ordem?.length ? [...f.ordem] : undefined,
  });
}

// ── As seções do painel (Clint: Negócio, Conversas, Tags, Campos, Outros) ──

export const SECOES_DE_FILTRO = ["negocio", "conversas", "tags", "campos", "outros"] as const;
export type SecaoDeFiltro = (typeof SECOES_DE_FILTRO)[number];

const CHAVES_DA_SECAO: Record<SecaoDeFiltro, ReadonlyArray<keyof FiltrosDoQuadro>> = {
  negocio: ["dono", "criadoEm", "valor", "atrasados", "motivoDePerda", "categoriaDePerda"],
  conversas: ["conversa"],
  tags: ["tags", "modoDasTags"],
  campos: ["campos"],
  outros: ["atividadesConcluidas", "tempoNaEtapa", "tempoDesdeEntrada"],
};

/** Quantos critérios cada seção tem ligados. Status e busca têm controle próprio e não contam. */
export function contarPorSecao(f: FiltrosDoQuadro): Record<SecaoDeFiltro, number> {
  const e = enxugar(f);
  const presentes = (chaves: ReadonlyArray<keyof FiltrosDoQuadro>) => chaves.filter((k) => e[k] !== undefined).length;
  return {
    negocio: presentes(CHAVES_DA_SECAO.negocio),
    conversas: e.conversa ? Object.keys(e.conversa).length : 0,
    tags: e.tags ? 1 : 0,
    campos: e.campos?.length ?? 0,
    outros: presentes(CHAVES_DA_SECAO.outros),
  };
}

function semChaves(f: FiltrosDoQuadro, chaves: ReadonlyArray<keyof FiltrosDoQuadro>): FiltrosDoQuadro {
  const copia: Partial<FiltrosDoQuadro> = { ...f };
  for (const chave of chaves) delete copia[chave];
  return enxugar({ ...copia, status: f.status });
}

export const limparSecao = (f: FiltrosDoQuadro, secao: SecaoDeFiltro) => semChaves(f, CHAVES_DA_SECAO[secao]);

/** "Limpar filtros": tira os critérios e mantém status e ordenação, que têm controle próprio. */
export function limparCriterios(f: FiltrosDoQuadro): FiltrosDoQuadro {
  return enxugar({ status: f.status, ordem: f.ordem });
}

export function temCriterios(f: FiltrosDoQuadro): boolean {
  return Object.keys(enxugar(f)).some((k) => k !== "status" && k !== "ordem");
}

function canonico(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(objeto)
        .sort()
        .map((k) => [k, canonico(objeto[k])]),
    );
  }
  return valor;
}

/**
 * Dois filtros dizem a mesma coisa? Sem olhar a ordem das chaves: o jsonb do
 * banco devolve as chaves numa ordem e a URL em outra.
 */
export function mesmosFiltros(a: FiltrosDoQuadro, b: FiltrosDoQuadro): boolean {
  return JSON.stringify(canonico(enxugar(a))) === JSON.stringify(canonico(enxugar(b)));
}

// ── O resumo (chips) com o painel fechado ──────────────────────────────────

export type ChaveDeCriterio =
  | "dono"
  | "criadoEm"
  | "valor"
  | "atrasados"
  | "motivoDePerda"
  | "categoriaDePerda"
  | "conversa"
  | "tags"
  | "campos"
  | "atividadesConcluidas"
  | "tempoNaEtapa"
  | "tempoDesdeEntrada";

/** Rótulos em português: a tela passa por `t()`. A ordem é a do chip na tela. */
const ROTULOS_DOS_CRITERIOS: Record<ChaveDeCriterio, string> = {
  dono: "Dono",
  criadoEm: "Data de criação",
  valor: "Valor",
  atrasados: "Apenas atrasados",
  motivoDePerda: "Motivo de perda",
  categoriaDePerda: "Categoria de perda",
  conversa: "Conversas",
  tags: "Tags",
  campos: "Campos",
  atividadesConcluidas: "Atividades concluídas",
  tempoNaEtapa: "Tempo na etapa",
  tempoDesdeEntrada: "Tempo desde a entrada",
};

export interface CriterioAtivo {
  id: ChaveDeCriterio;
  rotulo: string;
  /** Tags e campos dizem quantos ("2 tags"). */
  n?: number;
}

export function criteriosAtivos(f: FiltrosDoQuadro): CriterioAtivo[] {
  const e = enxugar(f);
  return (Object.keys(ROTULOS_DOS_CRITERIOS) as ChaveDeCriterio[])
    .filter((id) => e[id] !== undefined)
    .map((id) => ({
      id,
      rotulo: ROTULOS_DOS_CRITERIOS[id],
      ...(id === "tags" ? { n: e.tags?.length } : id === "campos" ? { n: e.campos?.length } : {}),
    }));
}

export const removerCriterio = (f: FiltrosDoQuadro, id: ChaveDeCriterio) =>
  semChaves(f, id === "tags" ? ["tags", "modoDasTags"] : [id]);
