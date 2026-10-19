import { z } from "zod";

import { lerEstadoDoCanal } from "@/lib/channels/estado";
import { estadoDaJanela } from "@/lib/channels/janela";
import { fonteDeTemplates } from "@/lib/channels/templates-fonte";

/**
 * MENSAGENS AGENDADAS (fork Escale, Fase 3B; C9; migration 9202). Texto para
 * dentro da janela, template para fora (c08); o cron envia na hora e grava o
 * que aconteceu.
 */
export const STATUS_DA_AGENDADA = [
  "pendente",
  "processando",
  "enviada",
  "falhou",
  "removida",
] as const;
export type StatusDaAgendada = (typeof STATUS_DA_AGENDADA)[number];
export const MENSAGENS_POR_AGENDAMENTO_MAX = 5;
export const AGENDADAS_POR_PAGINA = [10, 25, 50] as const;

const templateSchema = z.object({
  name: z.string().min(1).max(512),
  language: z.string().min(2).max(16),
  values: z.record(z.string(), z.string()).default({}),
});
export const mensagemAgendadaSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("texto"), corpo: z.string().trim().min(1).max(4096) }),
  z.object({ tipo: z.literal("template"), template: templateSchema }),
]);
export type MensagemAgendada = z.infer<typeof mensagemAgendadaSchema>;

export const novaAgendadaSchema = z.object({
  conversation_id: z.string().uuid(),
  enviar_em: z.string().datetime(),
  mensagens: z.array(mensagemAgendadaSchema).min(1).max(MENSAGENS_POR_AGENDAMENTO_MAX),
});
export type NovaAgendada = z.infer<typeof novaAgendadaSchema>;

export const listaDeAgendadasSchema = z.object({
  busca: z.string().trim().max(100).optional(),
  criacao_de: z.string().date().optional(),
  criacao_ate: z.string().date().optional(),
  envio_de: z.string().date().optional(),
  envio_ate: z.string().date().optional(),
  channel_session_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  por_pagina: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListaDeAgendadas = z.infer<typeof listaDeAgendadasSchema>;

export const dataNoPassado = (iso: string, agora: Date): boolean =>
  Date.parse(iso) <= agora.getTime();

export type MotivoDaFalha = "dispositivo" | "janela" | "envio";

export function decidirEnvio(e: {
  canal: { status: string; provider: string | null };
  lastInboundAt: string | null;
  tipo: MensagemAgendada["tipo"];
  agora: Date;
}): { ok: true } | { ok: false; motivo: MotivoDaFalha; erro: string } {
  if (!lerEstadoDoCanal(e.canal.status).utilizavel) {
    return { ok: false, motivo: "dispositivo", erro: "Dispositivo desconectado" };
  }
  const janela = estadoDaJanela(e.canal.provider, e.lastInboundAt, e.agora);
  if (
    e.tipo === "texto" &&
    janela.tipo === "fechada" &&
    fonteDeTemplates(e.canal.provider) !== null
  ) {
    return { ok: false, motivo: "janela", erro: "Fora da janela de 24h" };
  }
  return { ok: true };
}

export interface AgendadaLida {
  id: string;
  conversation_id: string;
  contact_id: string;
  channel_session_id: string;
  tipo: MensagemAgendada["tipo"];
  corpo: string | null;
  template: { name: string; language: string; values: Record<string, string> } | null;
  enviar_em: string;
  criado_por: string;
  status: StatusDaAgendada;
  erro: string | null;
  created_at: string;
  contato: { nome: string; telefone: string | null; tem_foto: boolean };
  dispositivo: { nome: string; provider: string | null; status: string };
}
