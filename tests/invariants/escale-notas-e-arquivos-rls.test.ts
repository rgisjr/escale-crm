import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_CONTACT_1,
  GOV_LEAD,
  GOV_MANAGER,
  GOV_ORG,
  GOV_PIPELINE,
  GOV_STAGE,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * NOTAS E ARQUIVOS DA FICHA (fork Escale, migration 9008) — prova contra Postgres
 * real: zero linhas do vizinho nos dois sentidos, viewer não escreve, agent
 * escreve só como autor, o autor apaga o que é seu, gerente apaga o dos outros,
 * e a FK composta recusa nota de negócio de outra organização.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG_B = "e5ca1e00-9008-4000-8000-000000000001";
const USER_B = "e5ca1e00-9008-4000-8000-000000000002";
const CONTATO_B = "e5ca1e00-9008-4000-8000-000000000003";
const FUNIL_B = "e5ca1e00-9008-4000-8000-000000000004";
const ETAPA_B = "e5ca1e00-9008-4000-8000-000000000005";
const LEAD_B = "e5ca1e00-9008-4000-8000-000000000006";
const LEAD_DO_B_AGENT = "e5ca1e00-9008-4000-8000-000000000007";
const NOTA_A = "e5ca1e00-9008-4000-8000-000000000011";
const NOTA_DO_B_AGENT = "e5ca1e00-9008-4000-8000-000000000012";
const NOTA_B = "e5ca1e00-9008-4000-8000-000000000013";
const ARQ_A = "e5ca1e00-9008-4000-8000-000000000021";
const ARQ_B = "e5ca1e00-9008-4000-8000-000000000022";

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'escale-notas-b@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-notas-b', 'Escale Notas Org B', 'Escale NB') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    insert into public.contacts (id, organization_id, name) values ('${CONTATO_B}', '${ORG_B}', 'Contato B') on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug) values ('${FUNIL_B}', '${ORG_B}', 'Funil B', 'escale-notas-funil-b') on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position)
      values ('${ETAPA_B}', '${ORG_B}', '${FUNIL_B}', 'Etapa B', 'etapa-b', 0) on conflict do nothing;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, contact_id, title)
      values ('${LEAD_B}', '${ORG_B}', '${FUNIL_B}', '${ETAPA_B}', '${CONTATO_B}', 'Negócio B') on conflict do nothing;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, owner_user_id, title)
      values ('${LEAD_DO_B_AGENT}', '${GOV_ORG}', '${GOV_PIPELINE}', '${GOV_STAGE}', '${GOV_AGENT_B}', 'Negócio do agent B') on conflict do nothing;
    insert into public.crm_notas_do_negocio (id, organization_id, lead_id, contact_id, user_id, user_nome, texto) values
      ('${NOTA_A}', '${GOV_ORG}', '${GOV_LEAD}', '${GOV_CONTACT_1}', '${GOV_AGENT_A}', 'Agent A', 'nota da A'),
      ('${NOTA_DO_B_AGENT}', '${GOV_ORG}', '${GOV_LEAD}', '${GOV_CONTACT_1}', '${GOV_AGENT_B}', 'Agent B', 'nota do agent B'),
      ('${NOTA_B}', '${ORG_B}', '${LEAD_B}', '${CONTATO_B}', '${USER_B}', 'B', 'nota da B')
      on conflict do nothing;
    insert into public.crm_arquivos_do_contato (id, organization_id, contact_id, lead_id, user_id, user_nome, nome, extensao, mime, tamanho, storage_path) values
      ('${ARQ_A}', '${GOV_ORG}', '${GOV_CONTACT_1}', '${GOV_LEAD}', '${GOV_AGENT_A}', 'Agent A', 'contrato.pdf', 'pdf', 'application/pdf', 1234, '${GOV_ORG}/${GOV_CONTACT_1}/a.pdf'),
      ('${ARQ_B}', '${ORG_B}', '${CONTATO_B}', null, '${USER_B}', 'B', 'foto.png', 'png', 'image/png', 99, '${ORG_B}/${CONTATO_B}/b.png')
      on conflict do nothing;
  `);
});

describe("notas: isolamento e papéis", () => {
  it("a organização vê as suas e ZERO do vizinho, nos dois sentidos", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_notas_do_negocio where organization_id = '${GOV_ORG}'`,
      ),
    ).toBe(2);
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_notas_do_negocio where organization_id = '${ORG_B}'`,
      ),
    ).toBe(0);
    expect(
      countAs(
        USER_B,
        `select count(*) from public.crm_notas_do_negocio where organization_id = '${GOV_ORG}'`,
      ),
    ).toBe(0);
    expect(
      countAs(
        USER_B,
        `select count(*) from public.crm_notas_do_negocio where organization_id = '${ORG_B}'`,
      ),
    ).toBe(1);
  });

  it("viewer não escreve; agent escreve só como autor", () => {
    const linha = (autor: string) =>
      `insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', '${GOV_LEAD}', '${GOV_CONTACT_1}', '${autor}', 'x')`;
    expect(writeCountAs(GOV_VIEWER, linha(GOV_VIEWER))).toBe(0);
    expect(writeCountAs(GOV_AGENT_A, linha(GOV_AGENT_B))).toBe(0);
    expect(writeCountAs(GOV_AGENT_A, linha(GOV_AGENT_A))).toBe(1);
  });

  it("o autor apaga a sua, não a do outro; gerente apaga a dos outros", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `delete from public.crm_notas_do_negocio where id = '${NOTA_DO_B_AGENT}'`,
      ),
    ).toBe(0);
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `update public.crm_notas_do_negocio set texto = 'editada' where id = '${NOTA_A}'`,
      ),
    ).toBe(1);
    expect(
      writeCountAs(
        GOV_MANAGER,
        `delete from public.crm_notas_do_negocio where id = '${NOTA_DO_B_AGENT}'`,
      ),
    ).toBe(1);
  });

  it("agent não escreve nem lê nota de negócio que não enxerga (de outro dono)", () => {
    const linha = `insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, texto) values ('${GOV_ORG}', '${LEAD_DO_B_AGENT}', '${GOV_AGENT_A}', 'x')`;
    expect(writeCountAs(GOV_AGENT_A, linha)).toBe(0);
    expect(writeCountAs(GOV_AGENT_B, linha.replace(GOV_AGENT_A, GOV_AGENT_B))).toBe(1);
    expect(
      countAs(
        GOV_AGENT_A,
        `select count(*) from public.crm_notas_do_negocio where lead_id = '${LEAD_DO_B_AGENT}'`,
      ),
    ).toBe(0);
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_notas_do_negocio where lead_id = '${LEAD_DO_B_AGENT}'`,
      ),
    ).toBe(1);
  });

  it("gerente não assina como outro autor; ninguém move a nota nem troca o autor (só o texto edita)", () => {
    const linha = `insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, texto) values ('${GOV_ORG}', '${GOV_LEAD}', '${GOV_AGENT_A}', 'x')`;
    expect(writeCountAs(GOV_MANAGER, linha)).toBe(0);
    for (const coluna of [
      `lead_id = '${GOV_LEAD}'`,
      `user_id = '${GOV_MANAGER}'`,
      `organization_id = '${ORG_B}'`,
    ]) {
      expect(() =>
        writeCountAs(
          GOV_MANAGER,
          `update public.crm_notas_do_negocio set ${coluna} where id = '${NOTA_A}'`,
        ),
      ).toThrow();
    }
  });

  it("a FK composta recusa nota apontando para contato de outra organização", () => {
    expect(() =>
      sql(
        `insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', '${GOV_LEAD}', '${CONTATO_B}', '${GOV_AGENT_A}', 'x')`,
      ),
    ).toThrow();
  });

  it("a FK composta recusa nota apontando para negócio de outra organização", () => {
    expect(() =>
      sql(
        `insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, texto) values ('${GOV_ORG}', '${LEAD_B}', '${GOV_AGENT_A}', 'x')`,
      ),
    ).toThrow();
  });
});

describe("arquivos: isolamento e papéis", () => {
  it("a organização vê os seus e ZERO do vizinho", () => {
    expect(
      countAs(
        GOV_VIEWER,
        `select count(*) from public.crm_arquivos_do_contato where organization_id = '${GOV_ORG}'`,
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_VIEWER,
        `select count(*) from public.crm_arquivos_do_contato where organization_id = '${ORG_B}'`,
      ),
    ).toBe(0);
    expect(
      countAs(
        USER_B,
        `select count(*) from public.crm_arquivos_do_contato where organization_id = '${GOV_ORG}'`,
      ),
    ).toBe(0);
  });

  it("viewer não envia; agent envia como autor; apaga o autor ou gerente", () => {
    const linha = (autor: string, path: string) =>
      `insert into public.crm_arquivos_do_contato (organization_id, contact_id, user_id, nome, extensao, mime, tamanho, storage_path) values ('${GOV_ORG}', '${GOV_CONTACT_1}', '${autor}', 'n.pdf', 'pdf', 'application/pdf', 1, '${path}')`;
    expect(writeCountAs(GOV_VIEWER, linha(GOV_VIEWER, "v.pdf"))).toBe(0);
    expect(writeCountAs(GOV_AGENT_B, linha(GOV_AGENT_B, "b1.pdf"))).toBe(1);
    expect(
      writeCountAs(GOV_AGENT_B, `delete from public.crm_arquivos_do_contato where id = '${ARQ_A}'`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_MANAGER, `delete from public.crm_arquivos_do_contato where id = '${ARQ_A}'`),
    ).toBe(1);
  });
});
