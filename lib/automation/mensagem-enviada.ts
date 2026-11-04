import { z } from "zod";

import { foiEnviadaPorPessoa } from "@/lib/automation/palavra-chave";
import { MAXIMO_DE_PALAVRAS, OPERADORES_DO_FILTRO, ROTULO_DO_OPERADOR } from "@/lib/escale/comentarios/constantes";
import { casaComFiltro, lerFiltro } from "@/lib/escale/comentarios/filtro";

/**
 * FORK ESCALE · automações: o gatilho "Equipe envia uma mensagem" (`message.sent`), à moda do
 * "Mensagem enviada" do Datacrazy. Fonte única da configuração: o motor, o schema da API e a tela
 * leem por aqui. Não importa `lib/schemas/webhooks.ts` (é ele quem importa este arquivo).
 */
export const GATILHO_DE_MENSAGEM_ENVIADA = "message.sent";
/** Frase de atendente é longa; no filtro do direct são 60. */
export const MAXIMO_DA_PALAVRA_ENVIADA = 200;
/** A chave que o envio agendado grava em `messages.metadata` (`lib/escale/conversas/envio-agendado.ts`). */
export const CHAVE_DO_AGENDAMENTO = "agendamento_id";

/** O formato antigo (paridade Datacrazy, fase 3): uma palavra só. A API, o MCP e o editor em formulário gravam assim. */
export const configDaPalavraChaveSchema = z.object({
  palavra_chave: z.string().trim().min(1).max(200),
  modo: z.enum(["contem", "igual"]).default("contem"),
  channel_session_id: z.string().uuid().optional(),
});

const condicaoSchema = z.object({
  operador: z.enum(OPERADORES_DO_FILTRO),
  /** Vazio é aceito (a linha recém-adicionada na tela); `problemasDaMensagemEnviada` recusa salvar sem palavra. */
  valor: z.string().max(MAXIMO_DA_PALAVRA_ENVIADA),
});
/** Mesma forma do filtro dos gatilhos de direct (`lib/escale/comentarios/schema.ts`), com palavra maior. */
const filtroSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("qualquer") }),
  z.object({
    modo: z.literal("palavras"),
    palavras: z.array(z.string().trim().min(1).max(MAXIMO_DA_PALAVRA_ENVIADA)).max(MAXIMO_DE_PALAVRAS).optional(),
    condicoes: z.array(condicaoSchema).max(MAXIMO_DE_PALAVRAS).optional(),
    combinar: z.enum(["qualquer", "todas"]),
  }),
]);

export const configDaMensagemEnviadaSchema = z.object({
  /** "" = qualquer número. */
  channel_session_id: z.union([z.literal(""), z.string().uuid()]).default(""),
  filtro: filtroSchema,
  /** Mensagem enviada em conversa de grupo. Desligado, como no Datacrazy. */
  em_grupos: z.boolean().default(false),
  /** Mensagem que saiu de um agendamento. Ligado (é o comportamento de antes). */
  agendadas: z.boolean().default(true),
});
export type ConfigDaMensagemEnviada = z.infer<typeof configDaMensagemEnviadaSchema>;

export function configInicialDaMensagemEnviada(): ConfigDaMensagemEnviada {
  return {
    channel_session_id: "",
    filtro: { modo: "palavras", condicoes: [{ operador: "contem", valor: "" }], combinar: "qualquer" },
    em_grupos: false,
    agendadas: true,
  };
}

/** O formato novo; o antigo vira uma condição. Nada reconhecível → null (a regra nunca dispara). */
export function lerConfigDaMensagemEnviada(config: unknown): ConfigDaMensagemEnviada | null {
  const nova = configDaMensagemEnviadaSchema.safeParse(config);
  if (nova.success) return nova.data;
  const antiga = configDaPalavraChaveSchema.safeParse(config);
  if (!antiga.success) return null;
  return {
    channel_session_id: antiga.data.channel_session_id ?? "",
    filtro: {
      modo: "palavras",
      condicoes: [{ operador: antiga.data.modo === "igual" ? "igual" : "contem", valor: antiga.data.palavra_chave }],
      combinar: "qualquer",
    },
    em_grupos: false,
    agendadas: true,
  };
}

/** O que impede salvar. Sem palavra a regra dispararia sempre; para isso existe "Qualquer mensagem". */
export function problemasDaMensagemEnviada(config: unknown): string[] {
  const lida = lerConfigDaMensagemEnviada(config);
  if (!lida) return ["Informe a palavra-chave (palavra_chave) da mensagem enviada."];
  const filtro = lerFiltro(lida.filtro);
  if (filtro.modo === "palavras" && !filtro.condicoes.some((c) => c.operador !== "nao_contem")) {
    return ['Preencha a palavra do filtro ou use "Qualquer mensagem".'];
  }
  return [];
}

export interface MensagemParaOGatilho {
  body: string | null;
  sent_via: string | null;
  channel_session_id: string | null;
  metadata: Record<string, unknown> | null;
}

export function veioDeAgendamento(metadata: Record<string, unknown> | null | undefined): boolean {
  return typeof metadata?.[CHAVE_DO_AGENDAMENTO] === "string";
}

/**
 * Só mensagem que uma PESSOA enviou (anti-laço), que não falhou, do número escolhido, fora de grupo
 * (a menos que a regra peça), agendada só se a regra aceitar, e que passa no filtro.
 */
export function mensagemEnviadaCasa(
  config: unknown,
  msg: MensagemParaOGatilho | undefined,
  ehGrupo: boolean,
  statusDoEvento: unknown,
): boolean {
  const cfg = lerConfigDaMensagemEnviada(config);
  if (!cfg || !msg || statusDoEvento === "failed") return false;
  if (!foiEnviadaPorPessoa(msg.sent_via)) return false;
  if (cfg.channel_session_id && cfg.channel_session_id !== msg.channel_session_id) return false;
  if (ehGrupo && !cfg.em_grupos) return false;
  if (!cfg.agendadas && veioDeAgendamento(msg.metadata)) return false;
  return casaComFiltro(msg.body ?? "", cfg.filtro);
}

/** O chip do nó: "Contém “x” · É “y”", "Qualquer mensagem" ou o pedido da palavra. */
export function resumoDaMensagemEnviada(config: unknown, t: (s: string) => string): string {
  const lida = lerConfigDaMensagemEnviada(config);
  if (!lida) return t("Escolha a palavra-chave");
  const filtro = lerFiltro(lida.filtro);
  if (filtro.modo === "qualquer") return t("Qualquer mensagem");
  if (filtro.condicoes.length === 0) return t("Escolha a palavra-chave");
  return filtro.condicoes.map((c) => `${t(ROTULO_DO_OPERADOR[c.operador])} “${c.valor}”`).join(" · ");
}
