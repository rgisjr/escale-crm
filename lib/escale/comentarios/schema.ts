import { z } from "zod";

import {
  GATILHO_DE_COMENTARIO,
  MAXIMO_DA_PALAVRA,
  MAXIMO_DE_BOTOES,
  MAXIMO_DE_CAMINHOS,
  MAXIMO_DE_PALAVRAS,
  MAXIMO_DE_PUBLICACOES,
  MAXIMO_DE_VARIACOES,
  MAXIMO_DO_TEXTO,
  MAXIMO_DO_TEXTO_COM_BOTAO,
  MAXIMO_DO_TITULO_DO_BOTAO,
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
const filtroSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("qualquer") }),
  z.object({
    modo: z.literal("palavras"),
    palavras: z.array(z.string().trim().min(1).max(MAXIMO_DA_PALAVRA)).max(MAXIMO_DE_PALAVRAS),
    combinar: z.enum(["qualquer", "todas"]),
  }),
]);
const respostaSchema = z.object({ variacoes: z.array(z.string()).max(MAXIMO_DE_VARIACOES) });
const caminhoSchema = z.object({
  id: z.string().min(1).max(40),
  publicacoes: z.array(publicacaoSchema).max(MAXIMO_DE_PUBLICACOES),
  filtro: filtroSchema,
  resposta: respostaSchema.nullable(),
});
export const configDoComentarioSchema = z.object({
  /** Vazio = conta não escolhida (a recusa sai em `problemasDoGatilho`). */
  channel_session_id: z.string(),
  escopo: z.enum(["todos", "especificos"]),
  caminhos: z.array(caminhoSchema).max(MAXIMO_DE_CAMINHOS + 1),
});
export type ConfigDoComentario = z.infer<typeof configDoComentarioSchema>;
export type CaminhoDoGatilho = ConfigDoComentario["caminhos"][number];
export type FiltroDoCaminho = CaminhoDoGatilho["filtro"];
export type PublicacaoDoCaminho = CaminhoDoGatilho["publicacoes"][number];

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

/** superRefine: o passo Instagram só com o gatilho de comentário (D9). Só olha quando a regra traz gatilho E ações. */
export function exigirGatilhoDoPassoDoInstagram(
  regra: { trigger_event?: string; actions?: readonly { type: string }[] },
  ctx: z.RefinementCtx,
): void {
  if (!regra.trigger_event || !regra.actions) return;
  if (regra.trigger_event === GATILHO_DE_COMENTARIO) return;
  if (regra.actions.some((a) => a.type === PASSO_DO_INSTAGRAM)) {
    ctx.addIssue({
      code: "custom",
      path: ["actions"],
      message: "O passo Instagram funciona com o gatilho “Alguém comenta em um post”.",
    });
  }
}
