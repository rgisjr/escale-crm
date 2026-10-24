import { z } from "zod";

import { FILTRO_VAZIO } from "@/lib/campanhas/audiencia";
import { ritmoSchema } from "@/lib/campanhas/schemas";
import { alvoSchema } from "@/lib/escale/massa/tipos";

/**
 * O ASSISTENTE DE CAMPANHA (fork Escale, Fase 8B; PRD B1–B17). Tudo o que os 4
 * passos juntam, validado por zod nas duas pontas, e a ida e a volta com as
 * colunas de `campaigns` (as do original e as `escale_*` da 9302).
 */
export const NOME_MIN = 3;
export const NOME_MAX = 80;
export const TEXTO_MAX = 4096;
export const TAGS_DO_POS_ENVIO_MAX = 20;
export const NUMEROS_EXTRAS_MAX = 10;

/** Os campos do CRM que uma variável aceita: os do renderizador da campanha. */
export const CAMPO_DA_VARIAVEL =
  /^(nome|primeiro_nome|saudacao|(contato|lead)\.[a-z][a-z0-9_]{0,39})$/;

export const variavelDoModeloSchema = z.discriminatedUnion("fonte", [
  z
    .object({
      fonte: z.literal("campo"),
      campo: z.string().regex(CAMPO_DA_VARIAVEL),
      alternativo: z.string().trim().max(200).nullable().default(null),
    })
    .strict(),
  z.object({ fonte: z.literal("fixo"), valor: z.string().trim().min(1).max(1000) }).strict(),
]);
export type VariavelDoModelo = z.infer<typeof variavelDoModeloSchema>;

/** A chave do slot é a do `slotKey` do original: "1" (corpo), "header:1", "button0:1". */
const CHAVE_DO_SLOT = /^[a-z0-9:_]{1,40}$/i;

export const mensagemSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("texto"), texto: z.string().trim().min(1).max(TEXTO_MAX) }).strict(),
  z
    .object({
      tipo: z.literal("modelo"),
      nome: z.string().min(1).max(512),
      idioma: z.string().min(2).max(16),
      categoria: z.string().max(40).nullable(),
      corpo: z.string().trim().min(1).max(TEXTO_MAX),
      variaveis: z.record(z.string().regex(CHAVE_DO_SLOT), variavelDoModeloSchema),
    })
    .strict(),
]);
export type MensagemDaCampanha = z.infer<typeof mensagemSchema>;
export type MensagemDeModelo = Extract<MensagemDaCampanha, { tipo: "modelo" }>;

export const quandoSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("agora") }).strict(),
  z.object({ modo: z.literal("agendar"), em: z.string().datetime() }).strict(),
]);
export type QuandoEnviar = z.infer<typeof quandoSchema>;

/**
 * O PÚBLICO (N7): a seleção do modal (ids ou O FILTRO de Contatos, como a B3 da
 * 2B), os avulsos (criados na hora e os do .csv) e os removidos. Sem teto.
 */
export const publicoSchema = z
  .object({
    selecao: alvoSchema.nullable().default(null),
    avulsos: z.array(z.string().uuid()).max(200_000).default([]),
    removidos: z.array(z.string().uuid()).max(20_000).default([]),
  })
  .strict();
export type PublicoDaCampanha = z.infer<typeof publicoSchema>;
export type SelecaoDoPublico = NonNullable<PublicoDaCampanha["selecao"]>;
export const PUBLICO_VAZIO: PublicoDaCampanha = { selecao: null, avulsos: [], removidos: [] };

export const STATUS_DO_POS_ENVIO = ["aberta", "fechada", "em_espera"] as const;
export type StatusDoPosEnvio = (typeof STATUS_DO_POS_ENVIO)[number];
export const ROTULO_DO_STATUS_DO_POS_ENVIO: Record<StatusDoPosEnvio, string> = {
  aberta: "Em aberto",
  fechada: "Fechado",
  em_espera: "Em espera",
};

/** O passo 3 (N11, N13): aplicado só a quem recebeu, depois da conclusão. */
export const posEnvioSchema = z
  .object({
    tags: z.array(z.string().trim().min(1).max(40)).max(TAGS_DO_POS_ENVIO_MAX).default([]),
    origemId: z.string().uuid().nullable().default(null),
    etapaId: z.string().uuid().nullable().default(null),
    statusDaConversa: z.enum(STATUS_DO_POS_ENVIO).default("aberta"),
    manterStatus: z.boolean().default(false),
    atendenteId: z.string().uuid().nullable().default(null),
    manterAtendente: z.boolean().default(false),
    donoDoNegocio: z.boolean().default(false),
  })
  .strict()
  .refine((p) => (p.origemId === null) === (p.etapaId === null), {
    message: "Escolha a origem e a etapa.",
    path: ["etapaId"],
  })
  .refine((p) => !p.donoDoNegocio || p.origemId !== null, {
    message: "A distribuição de dono só vale com uma origem.",
    path: ["donoDoNegocio"],
  });
export type PosEnvio = z.infer<typeof posEnvioSchema>;
export const POS_ENVIO_PADRAO: PosEnvio = {
  tags: [],
  origemId: null,
  etapaId: null,
  statusDaConversa: "aberta",
  manterStatus: false,
  atendenteId: null,
  manterAtendente: false,
  donoDoNegocio: false,
};

export const assistenteSchema = z
  .object({
    nome: z.string().trim().min(NOME_MIN).max(NOME_MAX),
    numeroId: z.string().uuid(),
    mensagem: mensagemSchema,
    quando: quandoSchema,
    baseLegal: z.enum(["consent", "legitimate_interest"]),
    lia: z.string().trim().max(120).nullable().default(null),
    publico: publicoSchema,
    posEnvio: posEnvioSchema,
    agenteId: z.string().uuid().nullable().default(null),
    ritmo: ritmoSchema,
    numerosExtras: z.array(z.string().uuid()).max(NUMEROS_EXTRAS_MAX).default([]),
  })
  .strict()
  .refine((a) => a.baseLegal !== "legitimate_interest" || (a.lia ?? "").trim() !== "", {
    message: "Interesse legítimo exige a referência da avaliação (LIA).",
    path: ["lia"],
  })
  .refine(
    (a) =>
      a.ritmo.janela_inicio_hora == null ||
      a.ritmo.janela_fim_hora == null ||
      a.ritmo.janela_fim_hora > a.ritmo.janela_inicio_hora,
    { message: "A janela precisa terminar depois de começar.", path: ["ritmo", "janela_fim_hora"] },
  )
  .refine((a) => !a.numerosExtras.includes(a.numeroId), {
    message: "O número principal não entra como extra.",
    path: ["numerosExtras"],
  });
export type Assistente = z.infer<typeof assistenteSchema>;

/** O assistente vira as colunas da campanha (o original e as `escale_*`). */
export function colunasDoAssistente(a: Assistente): Record<string, unknown> {
  return {
    name: a.nome,
    channel_session_id: a.numeroId,
    message_body: a.mensagem.tipo === "texto" ? a.mensagem.texto : a.mensagem.corpo,
    base_legal: a.baseLegal,
    lia_ref: a.baseLegal === "legitimate_interest" ? a.lia : null,
    // O público da casca mora em `escale_publico`; o filtro antigo fica vazio.
    audience_filter: FILTRO_VAZIO,
    // N12: com origem, quem responde antes da conclusão já nasce nela.
    pipeline_id: a.posEnvio.origemId,
    stage_id: a.posEnvio.etapaId,
    agent_id: a.agenteId,
    intervalo_segundos: a.ritmo.intervalo_segundos ?? null,
    janela_inicio_hora: a.ritmo.janela_inicio_hora ?? null,
    janela_fim_hora: a.ritmo.janela_fim_hora ?? null,
    teto_diario: a.ritmo.teto_diario ?? null,
    teto_horario: a.ritmo.teto_horario ?? null,
    escale_mensagem: a.mensagem,
    escale_publico: a.publico,
    escale_pos_envio: a.posEnvio,
    escale_quando: a.quando.modo === "agendar" ? a.quando.em : null,
  };
}

export const COLUNAS_DO_ASSISTENTE =
  "id, status, name, channel_session_id, message_body, base_legal, lia_ref, agent_id, " +
  "intervalo_segundos, janela_inicio_hora, janela_fim_hora, teto_diario, teto_horario, " +
  "escale_mensagem, escale_publico, escale_pos_envio, escale_quando";

export interface LinhaDoAssistente {
  id: string;
  status: string;
  name: string;
  channel_session_id: string;
  message_body: string | null;
  base_legal: string;
  lia_ref: string | null;
  agent_id: string | null;
  intervalo_segundos: number | null;
  janela_inicio_hora: number | null;
  janela_fim_hora: number | null;
  teto_diario: number | null;
  teto_horario: number | null;
  escale_mensagem: unknown;
  escale_publico: unknown;
  escale_pos_envio: unknown;
  escale_quando: string | null;
}

/**
 * A campanha volta para o assistente (N18). O rascunho do formulário antigo
 * traz nome, número, texto, base legal e ritmo; o público por filtro antigo não
 * tem tela na casca e começa vazio (`publicoAntigo` liga o aviso).
 */
export function assistenteDaLinha(
  l: LinhaDoAssistente,
  extras: string[],
): { assistente: Assistente; publicoAntigo: boolean } {
  const mensagem = mensagemSchema.safeParse(l.escale_mensagem);
  const publico = publicoSchema.safeParse(l.escale_publico);
  const posEnvio = posEnvioSchema.safeParse(l.escale_pos_envio);
  return {
    assistente: {
      nome: l.name.slice(0, NOME_MAX),
      numeroId: l.channel_session_id,
      mensagem: mensagem.success ? mensagem.data : { tipo: "texto", texto: l.message_body ?? "" },
      quando: l.escale_quando
        ? { modo: "agendar", em: new Date(l.escale_quando).toISOString() }
        : { modo: "agora" },
      baseLegal: l.base_legal === "legitimate_interest" ? "legitimate_interest" : "consent",
      lia: l.lia_ref,
      publico: publico.success ? publico.data : PUBLICO_VAZIO,
      posEnvio: posEnvio.success ? posEnvio.data : POS_ENVIO_PADRAO,
      agenteId: l.agent_id,
      ritmo: {
        intervalo_segundos: l.intervalo_segundos,
        janela_inicio_hora: l.janela_inicio_hora,
        janela_fim_hora: l.janela_fim_hora,
        teto_diario: l.teto_diario,
        teto_horario: l.teto_horario,
      },
      numerosExtras: extras.filter((id) => id !== l.channel_session_id),
    },
    publicoAntigo: !publico.success,
  };
}
