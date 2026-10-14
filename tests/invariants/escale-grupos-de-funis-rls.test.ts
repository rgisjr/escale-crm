import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_PIPELINE,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * GRUPOS DE FUNIS (fork Escale, migration 9001) — prova contra Postgres real.
 *
 * RLS ligada e policy presente não é isolamento (ver o cabeçalho de
 * `rls-completude-varredura.test.ts`): aqui dois tenants reais leem por JWT e
 * contam o que veem; a escrita é medida por papel; e a FK composta é medida
 * tentando o cruzamento que ela existe para impedir.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG_B = "e5ca1e00-9001-4000-8000-000000000001";
const USER_B = "e5ca1e00-9001-4000-8000-000000000002";
const FUNIL_B = "e5ca1e00-9001-4000-8000-000000000003";
const FUNIL_SOLTO = "e5ca1e00-9001-4000-8000-000000000004";
const GRUPO_A = "e5ca1e00-9001-4000-8000-000000000011";
const GRUPO_B = "e5ca1e00-9001-4000-8000-000000000012";
const GRUPO_TEMPORARIO = "e5ca1e00-9001-4000-8000-000000000013";

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email)
      values ('${USER_B}', 'escale-grupos-b@invariant.test')
      on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-grupos-b', 'Escale Grupos Org B', 'Escale B')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${FUNIL_B}', '${ORG_B}', 'Funil da B', 'escale-funil-da-b')
      on conflict do nothing;
    insert into public.crm_pipeline_groups (id, organization_id, name)
      values ('${GRUPO_A}', '${GOV_ORG}', 'INSS de obras'),
             ('${GRUPO_B}', '${ORG_B}', 'INSS de obras')
      on conflict do nothing;
    update public.crm_pipelines set group_id = '${GRUPO_A}' where id = '${GOV_PIPELINE}';
  `);
});

describe("crm_pipeline_groups — isolamento entre organizações (RLS)", () => {
  it("o mesmo nome pode existir em duas organizações: o único é por organização", () => {
    expect(
      sql(`select count(*) from public.crm_pipeline_groups where id in ('${GRUPO_A}', '${GRUPO_B}');`),
    ).toBe("2");
  });

  it("cada organização vê o próprio grupo e nenhum do vizinho, nos dois sentidos", () => {
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_pipeline_groups where id = '${GRUPO_A}';`)).toBe(1);
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_pipeline_groups where id = '${GRUPO_B}';`)).toBe(0);
    expect(countAs(USER_B, `select count(*) from public.crm_pipeline_groups where id = '${GRUPO_B}';`)).toBe(1);
    expect(countAs(USER_B, `select count(*) from public.crm_pipeline_groups where id = '${GRUPO_A}';`)).toBe(0);
  });
});

describe("crm_pipeline_groups — quem escreve", () => {
  it("viewer e agent não criam grupo", () => {
    expect(
      writeCountAs(GOV_VIEWER, `insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', 'Do viewer')`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_AGENT_A, `insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', 'Do agent')`),
    ).toBe(0);
  });

  it("manager cria grupo na própria organização (controle positivo), e não na do vizinho", () => {
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', 'Do gestor')`),
    ).toBe(1);
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_pipeline_groups (organization_id, name) values ('${ORG_B}', 'Invasão')`),
    ).toBe(0);
    sql(`delete from public.crm_pipeline_groups where name in ('Do gestor', 'Invasão');`);
  });
});

describe("crm_pipeline_groups — o que o banco recusa", () => {
  it("nome repetido na mesma organização, com outra caixa, é recusado", () => {
    expect(() =>
      sql(`insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', 'inss DE OBRAS');`),
    ).toThrow(/uq_crm_pipeline_groups_org_nome/);
  });

  it("nome em branco é recusado", () => {
    expect(() =>
      sql(`insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', '   ');`),
    ).toThrow(/crm_pipeline_groups_nome_valido/);
  });

  it("funil não se liga a grupo de outra organização (FK composta)", () => {
    expect(() =>
      sql(`update public.crm_pipelines set group_id = '${GRUPO_B}' where id = '${GOV_PIPELINE}';`),
    ).toThrow(/crm_pipelines_group_fk/);
  });

  it("excluir o grupo solta os funis e não apaga nenhum", () => {
    const out = sql(`
      insert into public.crm_pipelines (id, organization_id, name, slug)
        values ('${FUNIL_SOLTO}', '${GOV_ORG}', 'Funil solto', 'escale-funil-solto')
        on conflict do nothing;
      insert into public.crm_pipeline_groups (id, organization_id, name)
        values ('${GRUPO_TEMPORARIO}', '${GOV_ORG}', 'Grupo temporário')
        on conflict do nothing;
      update public.crm_pipelines set group_id = '${GRUPO_TEMPORARIO}' where id = '${FUNIL_SOLTO}';
      delete from public.crm_pipeline_groups where id = '${GRUPO_TEMPORARIO}';
      select coalesce(group_id::text, 'nulo') from public.crm_pipelines where id = '${FUNIL_SOLTO}';
    `);
    expect(lastLine(out)).toBe("nulo");
  });
});
