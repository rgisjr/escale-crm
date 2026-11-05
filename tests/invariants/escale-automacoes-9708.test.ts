import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * RASCUNHO DE AUTOMAÇÃO (fork Escale, migration 9708) — prova contra Postgres real: só gerente ou acima
 * lê e grava, cada organização vê só o seu, o rascunho sai junto com a regra e o desenho precisa ser objeto.
 * Roda via `pnpm test:db`.
 */
const OUTRA_ORG = "e5ca1e00-9708-4000-8000-0000000000f1";
const R1 = "e5ca1e00-9708-4000-8000-0000000000a1";
const R_OUTRA = "e5ca1e00-9708-4000-8000-0000000000a2";
const R_APAGAR = "e5ca1e00-9708-4000-8000-0000000000a3";
const DESENHO = `{"caixas":[],"ligacoes":[]}`;

const erroDe = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as { stderr?: string }).stderr ?? String(e);
  }
  return "";
};

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', 'org-9708', 'Org 9708', 'Org 9708') on conflict (id) do nothing;
    delete from public.automation_rules where id::text like 'e5ca1e00-9708-%';
    insert into public.automation_rules (id, organization_id, name, trigger_event, actions, is_active) values
      ('${R1}', '${GOV_ORG}', 'Regra 9708', 'lead.created', '[]', false),
      ('${R_OUTRA}', '${OUTRA_ORG}', 'Regra outra org', 'lead.created', '[]', false),
      ('${R_APAGAR}', '${GOV_ORG}', 'Regra a apagar', 'lead.created', '[]', false);
    insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, nome, desenho) values
      ('${R_OUTRA}', '${OUTRA_ORG}', 'Outra', '${DESENHO}'),
      ('${R_APAGAR}', '${GOV_ORG}', 'Apagar', '${DESENHO}');
  `);
});

describe("estrutura", () => {
  it("RLS ligada, trava do suporte e anon sem acesso", () => {
    expect(sql(`select relrowsecurity from pg_class where oid = 'public.crm_rascunhos_de_automacao'::regclass;`)).toBe("t");
    expect(
      sql(`select count(*) from pg_policies where tablename = 'crm_rascunhos_de_automacao' and policyname like 'support_write_%';`),
    ).not.toBe("0");
    expect(sql(`select has_table_privilege('anon', 'public.crm_rascunhos_de_automacao', 'select');`)).toBe("f");
  });

  it("o desenho precisa ser um objeto", () => {
    expect(
      erroDe(() =>
        sql(`insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, desenho) values ('${R1}', '${GOV_ORG}', '[]');`),
      ),
    ).toMatch(/check/i);
  });
});

describe("quem lê e grava", () => {
  it("gerente grava, lê, atualiza e apaga o da própria organização", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, nome, desenho) values ('${R1}', '${GOV_ORG}', 'Meu', '${DESENHO}')`,
      ),
    ).toBe(1);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_rascunhos_de_automacao where rule_id = '${R1}';`)).toBe(1);
    expect(writeCountAs(GOV_MANAGER, `update public.crm_rascunhos_de_automacao set nome = 'Outro' where rule_id = '${R1}'`)).toBe(1);
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_rascunhos_de_automacao where rule_id = '${R1}'`)).toBe(1);
  });

  it("agente e leitor não leem nem gravam", () => {
    for (const quem of [GOV_AGENT_A, GOV_VIEWER]) {
      expect(countAs(quem, `select count(*) from public.crm_rascunhos_de_automacao where rule_id = '${R_APAGAR}';`)).toBe(0);
      expect(
        writeCountAs(
          quem,
          `insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, desenho) values ('${R1}', '${GOV_ORG}', '${DESENHO}')`,
        ),
      ).toBe(0);
    }
  });

  it("gerente não vê o rascunho de outra organização", () => {
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_rascunhos_de_automacao where rule_id = '${R_OUTRA}';`)).toBe(0);
  });
});

describe("integridade", () => {
  it("o gatilho recusa rascunho com organização diferente da regra", () => {
    expect(
      erroDe(() =>
        sql(`insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, desenho) values ('${R1}', '${OUTRA_ORG}', '${DESENHO}');`),
      ),
    ).toMatch(/automacao_de_outra_organizacao/);
  });

  it("apagar a regra apaga o rascunho", () => {
    sql(`delete from public.automation_rules where id = '${R_APAGAR}';`);
    expect(sql(`select count(*) from public.crm_rascunhos_de_automacao where rule_id = '${R_APAGAR}';`)).toBe("0");
  });
});
