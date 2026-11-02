import { z } from "zod";

import {
  GATILHO_DE_COMENTARIO,
  GATILHOS_DE_DIRECT,
  GATILHOS_DO_PASSO_DO_INSTAGRAM,
  MAXIMO_DA_PALAVRA,
  MAXIMO_DE_BOTOES,
  MAXIMO_DE_CAMINHOS,
  MAXIMO_DE_HORAS_DA_REPETICAO,
  MAXIMO_DE_PALAVRAS,
  MAXIMO_DE_PUBLICACOES,
  MAXIMO_DE_VARIACOES,
  MAXIMO_DO_TEXTO,
  MAXIMO_DO_TEXTO_COM_BOTAO,
  MAXIMO_DO_TITULO_DO_BOTAO,
  OPERADORES_DO_FILTRO,
  PASSO_DO_INSTAGRAM,
} from "./constantes";
import { problemasDoGatilho } from "./problemas";

/**
 * FORK ESCALE · Fase 10B: a configuração do gatilho de comentário e do passo Instagram.
 * Importa só `zod` e arquivos do fork: `lib/schemas/webhooks.ts` importa este arquivo.
 */
const publicacaoSchema = z.object({
  /** O id da publicação NA PLATAFORMA (o `platformPostId` do webhook, o `id` de `accounts/{id}/posts`). */
  id: z.string().trim().min(1).max(64),
  legenda: z.string().max(300).nullable(),
  miniatura: z.string().url().max(2000).nullable(),
  tipo: z.string().max(30).nullable(),
});
const condicaoSchema = z.object({
  operador: z.enum(OPERADORES_DO_FILTRO),
  valor: z.string().trim().min(1).max(MAXIMO_DA_PALAVRA),
});
/** FORK ESCALE · Fase 10D (D3): o filtro novo. O formato da 10B (`palavras`) continua aceito e é lido por `lerFiltro`. */
const filtroSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("qualquer") }),
  z.object({
    modo: z.literal("palavras"),
    palavras: z.array(z.string().trim().min(1).max(MAXIMO_DA_PALAVRA)).max(MAXIMO_DE_PALAVRAS).optional(),
    condicoes: z.array(condicaoSchema).max(MAXIMO_DE_PALAVRAS).optional(),
    combinar: z.enum(["qualquer", "todas"]),
  }),
]);
const respostaSchema = z.object({ variacoes: z.array(z.string()).max(MAXIMO_DE_VARIACOES) });
const caminhoSchema = z.object({
  id: z.string().min(1).max(40),
  publicacoes: z.array(publicacaoSchema).max(MAXIMO_DE_PUBLICACOES),
  filtro: filtroSchema,
  resposta: respostaSchema.nullable(),
  /** D14 */
  ocultar_depois: z.boolean().default(false),
  curtir: z.boolean().default(false),
});

const publicoSchema = z.object({
  quem: z.enum(["todos", "seguidores", "nao_seguidores"]),
  quando_nao_informado: z.enum(["enviar", "nao_enviar", "pedir_para_seguir"]),
  liberar: z.object({
    texto: z.string().trim().min(1).max(MAXIMO_DO_TEXTO_COM_BOTAO),
    titulo: z.string().trim().min(1).max(MAXIMO_DO_TITULO_DO_BOTAO),
    texto_de_quem_nao_segue: z.string().trim().min(1).max(MAXIMO_DO_TEXTO_COM_BOTAO),
  }),
});
const repeticaoSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("uma_vez") }),
  z.object({ modo: z.literal("intervalo"), horas: z.number().int().min(1).max(MAXIMO_DE_HORAS_DA_REPETICAO) }),
]);
const proximaSchema = z.object({
  armada_em: z.string(),
  conhecidas: z.array(z.string().min(1).max(64)).max(50),
  resolvida: publicacaoSchema.extend({ publicada_em: z.string().nullable() }).nullable(),
});

export const configDoComentarioSchema = z.object({
  /** Vazio = conta não escolhida (a recusa sai em `problemasDoGatilho`). */
  channel_session_id: z.string(),
  escopo: z.enum(["todos", "especificos", "proxima"]),
  caminhos: z.array(caminhoSchema).max(MAXIMO_DE_CAMINHOS + 1),
  /** null = "Todos" (10B). */
  publico: publicoSchema.nullable().default(null),
  repeticao: repeticaoSchema.default({ modo: "uma_vez" }),
  proxima: proximaSchema.nullable().default(null),
});
/** `input`: os campos com padrão (10D) são opcionais para quem monta a configuração à mão. */
export type ConfigDoComentario = z.input<typeof configDoComentarioSchema>;
export type CaminhoDoGatilho = ConfigDoComentario["caminhos"][number];
export type FiltroDoCaminho = CaminhoDoGatilho["filtro"];
export type PublicacaoDoCaminho = CaminhoDoGatilho["publicacoes"][number];
export type PublicoDoComentario = z.infer<typeof publicoSchema>;
export type RepeticaoDoComentario = z.infer<typeof repeticaoSchema>;
export type ProximaDoComentario = z.infer<typeof proximaSchema>;

/** D1, D2, D7: a configuração dos gatilhos de direct (mention: sempre `{ modo: "qualquer" }`). */
export const configDoDirectSchema = z.object({
  channel_session_id: z.string(),
  filtro: filtroSchema,
});
export type ConfigDoDirect = z.infer<typeof configDoDirectSchema>;

export const anexoSchema = z.object({
  tipo: z.enum(["image", "video", "audio", "file"]),
  url: z
    .string()
    .url()
    .max(2000)
    .refine((u) => u.startsWith("https://"), "O anexo precisa de um endereço https://."),
  nome: z.string().max(200).nullable(),
});
export type AnexoDoInstagram = z.infer<typeof anexoSchema>;

export const botaoDoInstagramSchema = z.object({
  titulo: z.string().trim().min(1).max(MAXIMO_DO_TITULO_DO_BOTAO),
  url: z
    .string()
    .url()
    .max(2000)
    .refine((u) => u.startsWith("https://"), "O link do botão começa com https://."),
});
export const configDoPassoDoInstagramSchema = z
  .object({
    texto: z.string().trim().min(1).max(MAXIMO_DO_TEXTO),
    botoes: z.array(botaoDoInstagramSchema).max(MAXIMO_DE_BOTOES),
    /** D8: só nos gatilhos de direct. */
    anexo: anexoSchema.nullable().default(null),
  })
  .refine((c) => c.botoes.length === 0 || c.texto.length <= MAXIMO_DO_TEXTO_COM_BOTAO, {
    message: "Com botão, a mensagem aceita até 640 caracteres.",
    path: ["texto"],
  });
export type ConfigDoPassoDoInstagram = z.infer<typeof configDoPassoDoInstagramSchema>;
export const acaoDoInstagramSchema = z.object({
  type: z.literal(PASSO_DO_INSTAGRAM),
  config: configDoPassoDoInstagramSchema,
});

/** superRefine do create/update do motor: o gatilho de comentário com a configuração dele (mensagens da Clint). */
export function exigirConfigDoComentario(
  regra: { trigger_event?: string; trigger_config?: Record<string, unknown> },
  ctx: z.RefinementCtx,
): void {
  if (regra.trigger_event !== GATILHO_DE_COMENTARIO) return;
  const lida = configDoComentarioSchema.safeParse(regra.trigger_config);
  if (!lida.success) {
    ctx.addIssue({ code: "custom", path: ["trigger_config"], message: "Revise a configuração do gatilho." });
    return;
  }
  for (const message of problemasDoGatilho(lida.data)) {
    ctx.addIssue({ code: "custom", path: ["trigger_config"], message });
  }
}

/** FORK ESCALE · Fase 10D: os gatilhos de direct com a configuração deles. */
export function exigirConfigDoDirect(
  regra: { trigger_event?: string; trigger_config?: Record<string, unknown> },
  ctx: z.RefinementCtx,
): void {
  if (!regra.trigger_event || !(GATILHOS_DE_DIRECT as readonly string[]).includes(regra.trigger_event)) return;
  const lida = configDoDirectSchema.safeParse(regra.trigger_config);
  const recusar = (message: string) => ctx.addIssue({ code: "custom", path: ["trigger_config"], message });
  if (!lida.success) return recusar("Revise a configuração do gatilho.");
  if (lida.data.channel_session_id.trim() === "") return recusar("Selecione um dispositivo Instagram.");
  const { filtro } = lida.data;
  if (filtro.modo === "palavras") {
    const positivas =
      (filtro.palavras ?? []).length + (filtro.condicoes ?? []).filter((c) => c.operador !== "nao_contem").length;
    if (positivas === 0) recusar('Preencha a palavra do filtro ou use "Qualquer mensagem".');
  }
}

/** superRefine: o passo Instagram só com os gatilhos do Instagram (D9 da 10B, D8 da 10D). */
export function exigirGatilhoDoPassoDoInstagram(
  regra: { trigger_event?: string; actions?: readonly { type: string }[] },
  ctx: z.RefinementCtx,
): void {
  if (!regra.trigger_event || !regra.actions) return;
  if ((GATILHOS_DO_PASSO_DO_INSTAGRAM as readonly string[]).includes(regra.trigger_event)) return;
  if (regra.actions.some((a) => a.type === PASSO_DO_INSTAGRAM)) {
    ctx.addIssue({
      code: "custom",
      path: ["actions"],
      message: "O passo Instagram funciona com os gatilhos do Instagram.",
    });
  }
}

/** superRefine (D9): anexo no passo só com gatilho de direct; no comentário a resposta privada não aceita. */
export function exigirAnexoSoNoDirect(
  regra: { trigger_event?: string; actions?: readonly { type: string; config?: unknown }[] },
  ctx: z.RefinementCtx,
): void {
  if (regra.trigger_event !== GATILHO_DE_COMENTARIO || !regra.actions) return;
  const comAnexo = regra.actions.some((a) => {
    if (a.type !== PASSO_DO_INSTAGRAM) return false;
    const anexo = (a.config as { anexo?: unknown } | undefined)?.anexo;
    return anexo !== undefined && anexo !== null;
  });
  if (comAnexo) {
    ctx.addIssue({
      code: "custom",
      path: ["actions"],
      message: "No comentário, a primeira mensagem aceita só texto e botões (regra do Instagram).",
    });
  }
}
