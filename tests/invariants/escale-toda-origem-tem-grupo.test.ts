import { beforeAll, describe, expect, it } from "vitest";

import { lastLine, seedGov, sql } from "./gov-helpers";

/**
 * TODA ORIGEM TEM GRUPO (fork Escale, migration 9002) — prova contra Postgres
 * real: o gatilho do "Geral", a FK que recusa, o NOT NULL e os CHECKs de cor e
 * ícone. Roda via `pnpm test:db`.
 */
const ORG = "e5ca1e00-9002-4000-8000-000000000001";
const ORG_DESCARTE = "e5ca1e00-9002-4000-8000-000000000099";
const FUNIL_1 = "e5ca1e00-9002-4000-8000-000000000011";
const FUNIL_2 = "e5ca1e00-9002-4000-8000-000000000012";
const GRUPO_COM_FUNIL = "e5ca1e00-9002-4000-8000-000000000021";

const geralDe = (org: string) =>
  `select id from public.crm_pipeline_groups where organization_id = '${org}' and lower(btrim(name)) = 'geral'`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG}', 'escale-geral', 'Escale Geral Org', 'Escale Geral')
      on conflict do nothing;
  `);
});

describe("toda origem tem grupo (migration 9002)", () => {
  it("o funil semeado na organização nova já nasce num grupo", () => {
    expect(sql(`select count(*) from public.crm_pipelines where organization_id = '${ORG}' and group_id is null;`)).toBe("0");
  });

  it("funil criado sem grupo cai no grupo Geral da própria organização", () => {
    const out = sql(`
      insert into public.crm_pipelines (id, organization_id, name, slug)
        values ('${FUNIL_1}', '${ORG}', 'Funil sem grupo 1', 'escale-sem-grupo-1')
        on conflict do nothing;
      select g.name || '|' || (g.organization_id = '${ORG}')::text
        from public.crm_pipelines p join public.crm_pipeline_groups g on g.id = p.group_id
        where p.id = '${FUNIL_1}';
    `);
    expect(lastLine(out)).toBe("Geral|true");
  });

  it("o segundo funil sem grupo reaproveita o mesmo Geral", () => {
    const out = sql(`
      insert into public.crm_pipelines (id, organization_id, name, slug)
        values ('${FUNIL_2}', '${ORG}', 'Funil sem grupo 2', 'escale-sem-grupo-2')
        on conflict do nothing;
      select count(*) from (${geralDe(ORG)}) g;
    `);
    expect(lastLine(out)).toBe("1");
  });

  it("nenhum funil do banco está sem grupo, e a coluna não aceita nulo", () => {
    expect(sql(`select count(*) from public.crm_pipelines where group_id is null;`)).toBe("0");
    expect(
      sql(`select is_nullable from information_schema.columns
             where table_schema = 'public' and table_name = 'crm_pipelines' and column_name = 'group_id';`),
    ).toBe("NO");
  });

  it("pedir group_id nulo devolve o funil ao Geral", () => {
    const out = sql(`
      insert into public.crm_pipeline_groups (id, organization_id, name)
        values ('${GRUPO_COM_FUNIL}', '${ORG}', 'Com funil')
        on conflict do nothing;
      update public.crm_pipelines set group_id = '${GRUPO_COM_FUNIL}' where id = '${FUNIL_1}';
      update public.crm_pipelines set group_id = null where id = '${FUNIL_1}';
      select g.name from public.crm_pipelines p join public.crm_pipeline_groups g on g.id = p.group_id
        where p.id = '${FUNIL_1}';
    `);
    expect(lastLine(out)).toBe("Geral");
  });

  it("o banco recusa excluir grupo que ainda tem funil", () => {
    sql(`update public.crm_pipelines set group_id = '${GRUPO_COM_FUNIL}' where id = '${FUNIL_2}';`);
    expect(() => sql(`delete from public.crm_pipeline_groups where id = '${GRUPO_COM_FUNIL}';`)).toThrow(
      /crm_pipelines_group_fk/,
    );
  });

  it("o Geral arquivado volta a aparecer quando recebe funil", () => {
    const out = sql(`
      update public.crm_pipeline_groups set is_archived = true where id = (${geralDe(ORG)});
      update public.crm_pipelines set group_id = null where id = '${FUNIL_2}';
      select is_archived from public.crm_pipeline_groups where id = (${geralDe(ORG)});
    `);
    expect(lastLine(out)).toBe("f");
  });

  it("cor fora do formato e ícone fora da lista são recusados; tom da paleta passa", () => {
    expect(() => sql(`update public.crm_pipeline_groups set color = 'azul' where id = '${GRUPO_COM_FUNIL}';`)).toThrow(
      /crm_pipeline_groups_cor_valida/,
    );
    expect(() => sql(`update public.crm_pipeline_groups set icon = 'foguete' where id = '${GRUPO_COM_FUNIL}';`)).toThrow(
      /crm_pipeline_groups_icone_valido/,
    );
    expect(
      lastLine(
        sql(`update public.crm_pipeline_groups set color = '#0091ff', icon = 'pessoas' where id = '${GRUPO_COM_FUNIL}';
             select color || '|' || icon from public.crm_pipeline_groups where id = '${GRUPO_COM_FUNIL}';`),
      ),
    ).toBe("#0091ff|pessoas");
  });

  it("a função do gatilho não é executável por anon nem por authenticated", () => {
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_origem_sempre_em_grupo()', 'execute')::text
             || '|' || has_function_privilege('authenticated', 'public.fn_escale_origem_sempre_em_grupo()', 'execute')::text;`),
    ).toBe("false|false");
  });

  it("excluir a organização inteira não esbarra na FK dos grupos", () => {
    sql(`
      insert into public.organizations (id, slug, legal_name, display_name)
        values ('${ORG_DESCARTE}', 'escale-descarte', 'Escale Descarte', 'Descarte')
        on conflict do nothing;
    `);
    expect(sql(`select count(*) from public.crm_pipeline_groups where organization_id = '${ORG_DESCARTE}';`)).toBe("1");
    try {
      sql(`delete from public.organizations where id = '${ORG_DESCARTE}';`);
    } catch (err) {
      // Outra tabela do original pode segurar a exclusão; esta prova só cobra
      // que NÃO seja a FK dos grupos de funis.
      expect(String(err)).not.toMatch(/crm_pipelines_group_fk|crm_pipeline_groups/);
    }
  });
});
