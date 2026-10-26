import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_AGENT_A, GOV_ORG, columnExists, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * MIGRATION 9501 (fork Escale, Frente V) — prova contra Postgres real: as
 * colunas do mapeamento em `meta_templates`, a trava de administrador e o
 * sync (as colunas da plataforma) sem apagar o mapeamento. Roda via
 * `pnpm test:db` na bateria da frente.
 */
const MODELO = "e5ca1e00-9501-4000-8000-000000000001";
const VIZINHA = "e5ca1e00-9501-4000-8000-0000000000b1";
const VIZINHO = "e5ca1e00-9501-4000-8000-0000000000b2";
const MAPA = `'{"1":{"fonte":"campo","campo":"[CONTACT.FIRST_NAME]","alternativo":null}}'::jsonb`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.meta_templates where id = '${MODELO}';
    insert into auth.users (id, email) values ('${VIZINHO}', '9501-vizinho@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name) values ('${VIZINHA}', '9501-vizinha', '9501 Vizinha', 'Vizinha') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values ('${VIZINHO}', '${VIZINHA}', 'admin', now()) on conflict do nothing;
    insert into public.meta_templates (id, organization_id, waba_id, name, language, status, components, contract_hash, variaveis, variaveis_contrato)
      values ('${MODELO}', '${GOV_ORG}', 'waba-9501', 'oi_9501', 'pt_BR', 'APPROVED', '[]'::jsonb, 'h1', ${MAPA}, 'h1');
  `);
});

describe("meta_templates.variaveis (9501)", () => {
  it("as colunas existem e o CHECK recusa o que não é objeto", () => {
    expect(columnExists("meta_templates", "variaveis")).toBe(true);
    expect(columnExists("meta_templates", "variaveis_contrato")).toBe(true);
    expect(() => sql(`update public.meta_templates set variaveis = '[]'::jsonb where id = '${MODELO}';`)).toThrow(
      /meta_templates_variaveis_objeto/,
    );
  });

  it("outra organização não lê o mapeamento", () => {
    expect(countAs(VIZINHO, `select count(*) from public.meta_templates where id = '${MODELO}'`)).toBe(0);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.meta_templates where id = '${MODELO}'`)).toBe(1);
  });

  it("o atendente não muda o mapeamento direto; o administrador muda", () => {
    expect(() =>
      writeCountAs(GOV_AGENT_A, `update public.meta_templates set variaveis = '{}'::jsonb where id = '${MODELO}'`),
    ).toThrow(/só o administrador/);
    expect(writeCountAs(GOV_ADMIN, `update public.meta_templates set variaveis_contrato = 'h2' where id = '${MODELO}'`)).toBe(1);
    expect(writeCountAs(VIZINHO, `update public.meta_templates set variaveis = '{}'::jsonb where id = '${MODELO}'`)).toBe(0);
  });

  it("o atendente segue mexendo no resto da linha (a trava é só do mapeamento)", () => {
    expect(writeCountAs(GOV_AGENT_A, `update public.meta_templates set quality_score = 'GREEN' where id = '${MODELO}'`)).toBe(1);
  });

  it("o upsert do sync (só as colunas da plataforma) não apaga o mapeamento", () => {
    sql(`
      insert into public.meta_templates (organization_id, waba_id, name, language, status, components, contract_hash)
        values ('${GOV_ORG}', 'waba-9501', 'oi_9501', 'pt_BR', 'APPROVED', '[]'::jsonb, 'h3')
      on conflict (organization_id, waba_id, name, language)
      do update set status = excluded.status, components = excluded.components, contract_hash = excluded.contract_hash;
    `);
    expect(sql(`select variaveis->'1'->>'campo' from public.meta_templates where id = '${MODELO}';`)).toBe(
      "[CONTACT.FIRST_NAME]",
    );
  });
});
