/**
 * O RECORTE DO GATILHO PELA CONFIGURAÇÃO (fork Escale · automações: tag e "Negócio criado").
 *
 * O motor casa a regra pelo `event_type`; este arquivo diz se a configuração do gatilho aceita
 * AQUELE evento:
 *  - tag adicionada (negócio ou contato): `trigger_config.tags` escolhe as tags. Ausente ou vazia =
 *    qualquer tag, o comportamento das regras gravadas antes desta entrega. Sem diferenciar caixa,
 *    a mesma régua do `contains` em lista (#956).
 *  - negócio criado: `trigger_config.pipeline_id` (a origem) e `stage_id` (a etapa, opcional) dizem
 *    onde o negócio nasceu. Vem do payload do `lead.created` (o lugar do nascimento); sem ele, do
 *    negócio. Ausentes = qualquer origem/etapa.
 *
 * Configuração torta (só por SQL ou import: a porta do schema recusa) nunca dispara.
 */
import { z } from "zod";

import { tagSchema } from "@/lib/schemas/tags";

export const GATILHOS_DE_TAG = ["lead.tag_added", "contact.tag_added"] as const;
export const GATILHO_DE_NEGOCIO_CRIADO = "lead.created";
export const MAXIMO_DE_TAGS_NO_GATILHO = 20;

export const configDasTagsDoGatilhoSchema = z.object({
  tags: z.array(tagSchema).max(MAXIMO_DE_TAGS_NO_GATILHO).optional(),
});

export const configDoNegocioCriadoSchema = z
  .object({
    pipeline_id: z.string().uuid().nullish(),
    stage_id: z.string().uuid().nullish(),
  })
  .refine((c) => !c.stage_id || !!c.pipeline_id, {
    message: "Escolha a origem antes da etapa.",
    path: ["stage_id"],
  });

export function ehGatilhoDeTag(evento: string): boolean {
  return (GATILHOS_DE_TAG as readonly string[]).includes(evento);
}

/** As tags gravadas no gatilho, como a tela mostra. Ausente ou torta = []. */
export function tagsDoGatilho(config: unknown): string[] {
  const lido = configDasTagsDoGatilhoSchema.safeParse(config ?? {});
  return lido.success ? (lido.data.tags ?? []) : [];
}

const normalizar = (tag: unknown): string => String(tag).trim().toLowerCase();

function tagCasa(config: unknown, payload: Record<string, unknown> | null | undefined): boolean {
  const lido = configDasTagsDoGatilhoSchema.safeParse(config ?? {});
  if (!lido.success) return false;
  const escolhidas = (lido.data.tags ?? []).map(normalizar);
  if (escolhidas.length === 0) return true;
  const adicionadas = Array.isArray(payload?.added_tags) ? payload.added_tags.map(normalizar) : [];
  return adicionadas.some((tag) => escolhidas.includes(tag));
}

function negocioCriadoCasa(
  config: unknown,
  payload: Record<string, unknown> | null | undefined,
  lead: { pipeline_id?: unknown; stage_id?: unknown } | null | undefined,
): boolean {
  const lido = configDoNegocioCriadoSchema.safeParse(config ?? {});
  if (!lido.success) return false;
  const { pipeline_id, stage_id } = lido.data;
  const origem = payload?.pipeline_id ?? lead?.pipeline_id;
  const etapa = payload?.stage_id ?? lead?.stage_id;
  if (pipeline_id && origem !== pipeline_id) return false;
  if (stage_id && etapa !== stage_id) return false;
  return true;
}

/** A configuração do gatilho aceita este evento? Gatilhos sem recorte aqui: sempre sim. */
export function gatilhoCasaComAConfig(
  evento: string,
  config: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown> | null | undefined,
  lead?: { pipeline_id?: unknown; stage_id?: unknown } | null,
): boolean {
  if (ehGatilhoDeTag(evento)) return tagCasa(config, payload);
  if (evento === GATILHO_DE_NEGOCIO_CRIADO) return negocioCriadoCasa(config, payload, lead);
  return true;
}
