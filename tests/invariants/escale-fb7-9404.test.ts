import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_CONTACT_1, GOV_ORG, GOV_SESSION, seedGov, sql } from "./gov-helpers";

/**
 * MIGRATION 9404 (Faixa B · FB7) — prova contra Postgres real: FK composta do
 * grupo do campo, itens da massa apagados ao terminar, aviso ambíguo único e a
 * conversa mais recente por contato. Roda via `pnpm test:db`.
 */
const OUTRA_ORG = "e5ca1e00-9404-4000-8000-0000000000b1";
const GRUPO_DE_FORA = "e5ca1e00-9404-4000-8000-0000000000e1";
const ACAO = "e5ca1e00-9404-4000-8000-0000000000f1";
const CONV_VELHA = "e5ca1e00-9404-4000-8000-0000000000a1";
const CONV_NOVA = "e5ca1e00-9404-4000-8000-0000000000a2";
const REF = "e5ca1e00-9404-4000-8000-0000000000a3";
const GRUPO_DE_DENTRO = "e5ca1e00-9404-4000-8000-0000000000e2";
const DEFINICAO = `'{"key":"cp9404","label":"x","type":"text"}'`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', '9404-vizinha', '9404 Vizinha', 'Vizinha') on conflict do nothing;
    insert into public.crm_grupos_de_campos (id, organization_id, objeto, chave, nome)
      values ('${GRUPO_DE_FORA}', '${OUTRA_ORG}', 'contato', 'fora9404', 'Fora 9404') on conflict do nothing;
    delete from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and chave = 'cp9404';
    delete from public.crm_acoes_em_massa_conversas where id = '${ACAO}';
    delete from public.agent_inbox_items where kind = 'next_action_ambiguous' and ref_id = '${REF}';
    delete from public.conversations where id in ('${CONV_VELHA}', '${CONV_NOVA}');
  `);
});

describe("grupo do campo só da própria organização (B7-5)", () => {
  it("campo do contato não aceita grupo de outra organização", () => {
    expect(() =>
      sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao, grupo_id)
           values ('${GOV_ORG}', 'contato', 'cp9404', ${DEFINICAO}, '${GRUPO_DE_FORA}');`),
    ).toThrow(/foreign key|grupo_da_org/);
  });

  it("apagar o grupo zera só o grupo_id, não a organização do campo", () => {
    sql(`
      insert into public.crm_grupos_de_campos (id, organization_id, objeto, chave, nome)
        values ('${GRUPO_DE_DENTRO}', '${GOV_ORG}', 'contato', 'dentro9404', 'Dentro 9404') on conflict do nothing;
      insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao, grupo_id)
        values ('${GOV_ORG}', 'contato', 'cp9404', ${DEFINICAO}, '${GRUPO_DE_DENTRO}');
      delete from public.crm_grupos_de_campos where id = '${GRUPO_DE_DENTRO}';
    `);
    const linha = sql(
      `select organization_id || '|' || coalesce(grupo_id::text, 'nulo') from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and chave = 'cp9404';`,
    ).trim();
    expect(linha).toBe(`${GOV_ORG}|nulo`);
  });
});

describe("itens da ação em massa de conversas saem quando a ação termina (G7-11)", () => {
  it("o gatilho apaga os itens ao virar concluida", () => {
    sql(`
      insert into public.crm_acoes_em_massa_conversas (id, organization_id, user_id, acao, status, total)
        values ('${ACAO}', '${GOV_ORG}', '${GOV_AGENT_A}', 'incluir_tag', 'processando', 1);
      insert into public.crm_acoes_em_massa_conversas_itens (acao_id, organization_id, conversation_id, posicao)
        values ('${ACAO}', '${GOV_ORG}', '${CONV_VELHA}', 1);
    `);
    expect(sql(`select count(*) from public.crm_acoes_em_massa_conversas_itens where acao_id = '${ACAO}';`).trim()).toBe("1");
    sql(`update public.crm_acoes_em_massa_conversas set status = 'concluida' where id = '${ACAO}';`);
    expect(sql(`select count(*) from public.crm_acoes_em_massa_conversas_itens where acao_id = '${ACAO}';`).trim()).toBe("0");
  });
});

describe("um aviso aberto por contato ambíguo (B2-14)", () => {
  it("o segundo aviso aberto do mesmo contato é recusado; resolvido o primeiro, entra outro", () => {
    const inserir = `insert into public.agent_inbox_items (organization_id, kind, severity, title, ref_kind, ref_id, status)
                     values ('${GOV_ORG}', 'next_action_ambiguous', 'warn', 'x', 'contact', '${REF}', 'open')`;
    sql(`${inserir};`);
    expect(() => sql(`${inserir};`)).toThrow(/uidx|duplicate/);
    sql(`update public.agent_inbox_items set status = 'resolved' where kind = 'next_action_ambiguous' and ref_id = '${REF}';`);
    sql(`${inserir};`);
  });
});

describe("a conversa mais recente por contato (G3-11)", () => {
  it("devolve uma linha por contato, a de last_message_at mais novo", () => {
    sql(`
      insert into public.conversations (id, organization_id, contact_id, channel_session_id, status, last_message_at)
        values ('${CONV_VELHA}', '${GOV_ORG}', '${GOV_CONTACT_1}', '${GOV_SESSION}', 'open', now() - interval '2 days'),
               ('${CONV_NOVA}', '${GOV_ORG}', '${GOV_CONTACT_1}', '${GOV_SESSION}', 'open', now() + interval '1 day');
    `);
    const linhas = sql(
      `select conversation_id from public.fn_escale_conversa_mais_recente_por_contato('${GOV_ORG}', array['${GOV_CONTACT_1}']::uuid[]);`,
    ).trim();
    expect(linhas).toBe(CONV_NOVA);
  });
});
