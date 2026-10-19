import type { AgendadaLida } from "@/lib/escale/conversas/agendadas";

export const COLUNAS_DA_AGENDADA =
  "id, conversation_id, contact_id, channel_session_id, tipo, corpo, template, enviar_em, criado_por, status, erro, created_at, " +
  "contacts:contact_id ( name, display_name, phone_number, avatar_storage_path ), " +
  "channel_sessions:channel_session_id ( display_name, phone_number, provider, status )";

interface LinhaCrua {
  id: string;
  conversation_id: string;
  contact_id: string;
  channel_session_id: string;
  tipo: AgendadaLida["tipo"];
  corpo: string | null;
  template: AgendadaLida["template"];
  enviar_em: string;
  criado_por: string;
  status: AgendadaLida["status"];
  erro: string | null;
  created_at: string;
  contacts: {
    name: string | null;
    display_name: string | null;
    phone_number: string | null;
    avatar_storage_path: string | null;
  } | null;
  channel_sessions: {
    display_name: string | null;
    phone_number: string | null;
    provider: string | null;
    status: string;
  } | null;
}

/** A linha do banco com o contato e o dispositivo achatados do jeito que a tela lê. */
export function agendadaLida(linha: unknown): AgendadaLida {
  const l = linha as LinhaCrua;
  return {
    id: l.id,
    conversation_id: l.conversation_id,
    contact_id: l.contact_id,
    channel_session_id: l.channel_session_id,
    tipo: l.tipo,
    corpo: l.corpo,
    template: l.template,
    enviar_em: l.enviar_em,
    criado_por: l.criado_por,
    status: l.status,
    erro: l.erro,
    created_at: l.created_at,
    contato: {
      nome:
        l.contacts?.name?.trim() ||
        l.contacts?.display_name?.trim() ||
        l.contacts?.phone_number ||
        "",
      telefone: l.contacts?.phone_number ?? null,
      tem_foto: !!l.contacts?.avatar_storage_path,
    },
    dispositivo: {
      nome: l.channel_sessions?.display_name?.trim() || l.channel_sessions?.phone_number || "",
      provider: l.channel_sessions?.provider ?? null,
      status: l.channel_sessions?.status ?? "STOPPED",
    },
  };
}
