import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_CONV_AGENT_B,
  GOV_CONV_UNASSIGNED,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  countAs,
  seedGov,
  sql,
  tableExists,
  writeCountAs,
} from "./gov-helpers";

/**
 * MIGRATION 9203 (fork Escale, Fase 3C) — prova contra Postgres real:
 * setores (quem grava), a leitura pelo setor (só amplia, e só para o
 * atendente com a chave), o fim da transferência no gatilho, as permissões por
 * pessoa e as respostas rápidas. Roda via `pnpm test:db` no fim da Frente C.
 */
const SETOR = "e5ca1e00-9203-4000-8000-000000000001";
const VIZINHO = "e5ca1e00-9203-4000-8000-0000000000b2";
const OUTRA_ORG = "e5ca1e00-9203-4000-8000-0000000000b1";
const TPL_A = "e5ca1e00-9203-4000-8000-0000000000c1";
const TPL_B = "e5ca1e00-9203-4000-8000-0000000000c2";
const verConvB = (quem: string) =>
  countAs(quem, `select count(*) from public.conversations where id = '${GOV_CONV_AGENT_B}'`);

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_setor_da_conversa where organization_id = '${GOV_ORG}';
    delete from public.crm_setor_do_dispositivo where organization_id = '${GOV_ORG}';
    delete from public.crm_setores where organization_id = '${GOV_ORG}';
    delete from public.crm_permissoes_de_atendimento where organization_id = '${GOV_ORG}';
    delete from public.message_templates where id in ('${TPL_A}', '${TPL_B}');
    update public.organizations set settings = coalesce(settings, '{}'::jsonb) || '{"visibility_mode":"own_and_unassigned"}' where id = '${GOV_ORG}';
    insert into auth.users (id, email) values ('${VIZINHO}', '9203-vizinho@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name) values ('${OUTRA_ORG}', '9203-vizinha', '9203 Vizinha', 'Vizinha') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values ('${VIZINHO}', '${OUTRA_ORG}', 'admin', now()) on conflict do nothing;
    insert into public.message_templates (id, organization_id, owner_user_id, title, body) values
      ('${TPL_A}', '${GOV_ORG}', '${GOV_AGENT_A}', 'oi', 'Oi'),
      ('${TPL_B}', '${GOV_ORG}', '${GOV_AGENT_B}', 'tchau', 'Tchau');
  `);
});

describe("crm_setores e membros", () => {
  it("existem; admin cria; agente e gerente não (padrão); gerente com exceção sim; vizinho zero", () => {
    for (const t of [
      "crm_setores",
      "crm_setores_membros",
      "crm_setor_do_dispositivo",
      "crm_setor_da_conversa",
      "crm_permissoes_de_atendimento",
      "crm_respostas_rapidas_extras",
      "crm_respostas_rapidas_setores",
    ]) {
      expect(tableExists(t)).toBe(true);
    }
    const criar = `insert into public.crm_setores (id, organization_id, nome, cor) values ('${SETOR}', '${GOV_ORG}', 'Atendimento', '#0EA5C6')`;
    expect(() => writeCountAs(GOV_AGENT_A, criar)).toThrow();
    expect(() => writeCountAs(GOV_MANAGER, criar)).toThrow();
    sql(
      `insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_MANAGER}', 'CHAT_EDIT_TEAMS', true);`,
    );
    expect(writeCountAs(GOV_MANAGER, criar)).toBe(1);
    sql(`delete from public.crm_permissoes_de_atendimento where user_id = '${GOV_MANAGER}';`);
    expect(() =>
      sql(
        `insert into public.crm_setores (organization_id, nome) values ('${GOV_ORG}', ' atendimento ');`,
      ),
    ).toThrow(/crm_setores_nome_unico/);
    expect(
      writeCountAs(
        GOV_ADMIN,
        `insert into public.crm_setores_membros (organization_id, setor_id, user_id) values ('${GOV_ORG}', '${SETOR}', '${GOV_AGENT_A}')`,
      ),
    ).toBe(1);
    expect(countAs(GOV_AGENT_B, "select count(*) from public.crm_setores")).toBe(1);
    expect(countAs(VIZINHO, "select count(*) from public.crm_setores")).toBe(0);
  });
});

describe("leitura pelo setor (policy permissiva)", () => {
  it("o agente A só vê a conversa do B depois que o dispositivo entra no setor dele; a exceção desliga; o B continua vendo a sua", () => {
    expect(verConvB(GOV_AGENT_A)).toBe(0);
    expect(() =>
      writeCountAs(
        GOV_AGENT_A,
        `insert into public.crm_setor_do_dispositivo (channel_session_id, organization_id, setor_id) values ('${GOV_SESSION}', '${GOV_ORG}', '${SETOR}')`,
      ),
    ).toThrow();
    expect(
      writeCountAs(
        GOV_ADMIN,
        `insert into public.crm_setor_do_dispositivo (channel_session_id, organization_id, setor_id) values ('${GOV_SESSION}', '${GOV_ORG}', '${SETOR}')`,
      ),
    ).toBe(1);
    expect(verConvB(GOV_AGENT_A)).toBe(1);
    expect(
      countAs(
        GOV_AGENT_A,
        `select count(*) from public.messages where conversation_id = '${GOV_CONV_AGENT_B}'`,
      ),
    ).toBeGreaterThanOrEqual(0);
    sql(
      `insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'CHAT_VIEW_TEAM', false);`,
    );
    expect(verConvB(GOV_AGENT_A)).toBe(0);
    sql(`delete from public.crm_permissoes_de_atendimento where user_id = '${GOV_AGENT_A}';`);
    expect(verConvB(GOV_AGENT_B)).toBe(1);
    expect(verConvB(GOV_MANAGER)).toBe(1);
    expect(
      countAs(
        VIZINHO,
        `select count(*) from public.conversations where id = '${GOV_CONV_AGENT_B}'`,
      ),
    ).toBe(0);
  });
});

describe("Em transferência e o gatilho", () => {
  it("assumir a conversa conclui a transferência", () => {
    sql(`insert into public.crm_setor_da_conversa (conversation_id, organization_id, setor_id, em_transferencia, atendente_anterior_id)
         values ('${GOV_CONV_UNASSIGNED}', '${GOV_ORG}', '${SETOR}', true, '${GOV_AGENT_B}')
         on conflict (conversation_id) do update set em_transferencia = true, setor_id = excluded.setor_id;`);
    sql(
      `update public.conversations set assigned_to_user_id = '${GOV_AGENT_A}', assigned_at = now() where id = '${GOV_CONV_UNASSIGNED}';`,
    );
    expect(
      sql(
        `select em_transferencia from public.crm_setor_da_conversa where conversation_id = '${GOV_CONV_UNASSIGNED}';`,
      ).trim(),
    ).toBe("f");
    sql(
      `update public.conversations set assigned_to_user_id = null, assigned_at = null where id = '${GOV_CONV_UNASSIGNED}';`,
    );
    expect(() =>
      sql(
        `update public.crm_setor_da_conversa set setor_id = null, em_transferencia = true where conversation_id = '${GOV_CONV_UNASSIGNED}';`,
      ),
    ).toThrow(/transferencia_tem_setor/);
  });
});

describe("permissões por pessoa e fn_crm_pode", () => {
  it("a pessoa lê as suas; admin grava; agente não; o padrão vem do papel", () => {
    expect(() =>
      writeCountAs(
        GOV_AGENT_A,
        `insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'CHAT_BULK_ACTIONS', true)`,
      ),
    ).toThrow();
    expect(
      writeCountAs(
        GOV_ADMIN,
        `insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'CHAT_BULK_ACTIONS', true)`,
      ),
    ).toBe(1);
    expect(countAs(GOV_AGENT_A, "select count(*) from public.crm_permissoes_de_atendimento")).toBe(
      1,
    );
    expect(countAs(GOV_AGENT_B, "select count(*) from public.crm_permissoes_de_atendimento")).toBe(
      0,
    );
    expect(
      countAs(
        GOV_AGENT_A,
        `select count(*) from (select 1 where public.fn_crm_pode('${GOV_ORG}', 'CHAT_BULK_ACTIONS')) x`,
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_AGENT_B,
        `select count(*) from (select 1 where public.fn_crm_pode('${GOV_ORG}', 'CHAT_BULK_ACTIONS')) x`,
      ),
    ).toBe(0);
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from (select 1 where public.fn_crm_pode('${GOV_ORG}', 'CHAT_BULK_ACTIONS')) x`,
      ),
    ).toBe(1);
    expect(
      countAs(
        VIZINHO,
        `select count(*) from (select 1 where public.fn_crm_pode('${GOV_ORG}', 'CHAT_VIEW_TEAM')) x`,
      ),
    ).toBe(0);
    expect(() =>
      sql(
        `insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_AGENT_B}', 'CHAT_VIEW_ALL', true);`,
      ),
    ).toThrow(/chave_valida/);
  });
});

describe("respostas rápidas: extras e setores", () => {
  it("o dono grava os extras da sua; outro agente não; a vizinha não lê", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `insert into public.crm_respostas_rapidas_extras (template_id, organization_id, canais, todos_os_setores) values ('${TPL_A}', '${GOV_ORG}', array['whatsapp'], false)`,
      ),
    ).toBe(1);
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `insert into public.crm_respostas_rapidas_setores (template_id, setor_id, organization_id) values ('${TPL_A}', '${SETOR}', '${GOV_ORG}')`,
      ),
    ).toBe(1);
    expect(() =>
      writeCountAs(
        GOV_AGENT_A,
        `insert into public.crm_respostas_rapidas_extras (template_id, organization_id) values ('${TPL_B}', '${GOV_ORG}')`,
      ),
    ).toThrow();
    expect(() =>
      sql(
        `update public.crm_respostas_rapidas_extras set canais = array['email'] where template_id = '${TPL_A}';`,
      ),
    ).toThrow(/canais_validos/);
    expect(countAs(GOV_AGENT_B, "select count(*) from public.crm_respostas_rapidas_extras")).toBe(
      0,
    );
    expect(countAs(VIZINHO, "select count(*) from public.crm_respostas_rapidas_setores")).toBe(0);
  });
});
