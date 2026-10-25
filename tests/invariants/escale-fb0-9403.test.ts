import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_CONTACT_1,
  GOV_CONV_UNASSIGNED,
  GOV_ORG,
  GOV_SESSION,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * MIGRATION 9403 (Faixa B · FB0) — a mensagem agendada só aponta para contato e
 * dispositivo da própria organização. Roda via `pnpm test:db`.
 */
const AG = "public.crm_mensagens_agendadas";
const OUTRA_ORG = "e5ca1e00-9403-4000-8000-0000000000b1";
const CONTATO_DE_FORA = "e5ca1e00-9403-4000-8000-0000000000c1";
const SESSAO_DE_FORA = "e5ca1e00-9403-4000-8000-0000000000d1";
const agendar = (contato: string, sessao: string) =>
  `insert into ${AG} (organization_id, conversation_id, contact_id, channel_session_id, tipo, corpo, enviar_em, criado_por)
   values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', '${contato}', '${sessao}', 'texto', 'Oi', now() + interval '1 hour', '${GOV_AGENT_A}')`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from ${AG} where organization_id = '${GOV_ORG}';
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', '9403-vizinha', '9403 Vizinha', 'Vizinha') on conflict do nothing;
    insert into public.contacts (id, organization_id, display_name)
      values ('${CONTATO_DE_FORA}', '${OUTRA_ORG}', '9403 contato de fora') on conflict do nothing;
    insert into public.channel_sessions (id, organization_id, waha_session_name, webhook_secret_encrypted)
      values ('${SESSAO_DE_FORA}', '${OUTRA_ORG}', '9403-fora', '\x00'::bytea) on conflict do nothing;
  `);
});

describe("crm_mensagens_agendadas · insert (9403)", () => {
  it("contato e dispositivo da própria organização entram", () => {
    expect(writeCountAs(GOV_AGENT_A, agendar(GOV_CONTACT_1, GOV_SESSION))).toBe(1);
  });

  it("contato de outra organização é recusado pela RLS", () => {
    expect(writeCountAs(GOV_AGENT_A, agendar(CONTATO_DE_FORA, GOV_SESSION))).toBe(0);
  });

  it("dispositivo de outra organização é recusado pela RLS", () => {
    expect(writeCountAs(GOV_AGENT_A, agendar(GOV_CONTACT_1, SESSAO_DE_FORA))).toBe(0);
  });
});
