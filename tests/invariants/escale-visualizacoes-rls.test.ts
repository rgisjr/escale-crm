import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
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
 * VISUALIZAÇÕES DE ORIGENS (fork Escale, migration 9003) — prova contra Postgres
 * real: dois tenants por JWT, o acesso "todos" e "escolhidos", quem escreve, as
 * FKs compostas e a função de gravação rodando como quem chama.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG_B = "e5ca1e00-9003-4000-8000-000000000001";
const USER_B = "e5ca1e00-9003-4000-8000-000000000002";
const FUNIL_B = "e5ca1e00-9003-4000-8000-000000000003";
const FUNIL_A2 = "e5ca1e00-9003-4000-8000-000000000004";
const V_TODOS = "e5ca1e00-9003-4000-8000-000000000011";
const V_ESCOLHIDOS = "e5ca1e00-9003-4000-8000-000000000012";
const V_B = "e5ca1e00-9003-4000-8000-000000000013";
const V_RPC = "e5ca1e00-9003-4000-8000-000000000014";
const V_RECUSADA = "e5ca1e00-9003-4000-8000-000000000015";

/** Roda o script como `authenticated` com o JWT do usuário; devolve a última linha. */
function comoUsuario(userId: string, script: string): string {
  return lastLine(
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
      ${script}
    `),
  );
}

const salvar = (id: string, nome: string, acesso: string, origens: string[], pessoas: string[]) =>
  `select public.fn_escale_salvar_visualizacao('${id}', '${GOV_ORG}', '${nome}', '${acesso}',
     array[${origens.map((o) => `'${o}'`).join(", ")}]::uuid[],
     array[${pessoas.map((p) => `'${p}'`).join(", ")}]::uuid[]);`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email)
      values ('${USER_B}', 'escale-visualizacoes-b@invariant.test')
      on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-visualizacoes-b', 'Escale Visualizações Org B', 'Escale VB')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${FUNIL_B}', '${ORG_B}', 'Funil da B', 'escale-vis-funil-b'),
             ('${FUNIL_A2}', '${GOV_ORG}', 'Segundo funil da A', 'escale-vis-funil-a2')
      on conflict do nothing;
    insert into public.crm_pipeline_views (id, organization_id, name, acesso)
      values ('${V_TODOS}', '${GOV_ORG}', 'Todos os funis', 'todos'),
             ('${V_ESCOLHIDOS}', '${GOV_ORG}', 'Só da Ana', 'escolhidos'),
             ('${V_B}', '${ORG_B}', 'Todos os funis', 'todos')
      on conflict do nothing;
    insert into public.crm_pipeline_view_origens (view_id, organization_id, pipeline_id, position)
      values ('${V_TODOS}', '${GOV_ORG}', '${GOV_PIPELINE}', 1),
             ('${V_TODOS}', '${GOV_ORG}', '${FUNIL_A2}', 2),
             ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${GOV_PIPELINE}', 1),
             ('${V_B}', '${ORG_B}', '${FUNIL_B}', 1)
      on conflict do nothing;
    insert into public.crm_pipeline_view_pessoas (view_id, organization_id, user_id)
      values ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${GOV_AGENT_A}')
      on conflict do nothing;
  `);
});

const vistas = (id: string) => `select count(*) from public.crm_pipeline_views where id = '${id}';`;

describe("crm_pipeline_views — isolamento entre organizações (RLS)", () => {
  it("o mesmo nome pode existir em duas organizações", () => {
    expect(sql(`select count(*) from public.crm_pipeline_views where id in ('${V_TODOS}', '${V_B}');`)).toBe("2");
  });

  it("cada organização vê a própria visualização e nenhuma do vizinho, nos dois sentidos", () => {
    expect(countAs(GOV_VIEWER, vistas(V_TODOS))).toBe(1);
    expect(countAs(GOV_VIEWER, vistas(V_B))).toBe(0);
    expect(countAs(USER_B, vistas(V_B))).toBe(1);
    expect(countAs(USER_B, vistas(V_TODOS))).toBe(0);
    expect(countAs(USER_B, `select count(*) from public.crm_pipeline_view_origens where view_id = '${V_TODOS}';`)).toBe(0);
  });
});

describe("crm_pipeline_views — o acesso", () => {
  it("acesso todos: a organização inteira vê a visualização e as origens dela", () => {
    expect(countAs(GOV_AGENT_B, vistas(V_TODOS))).toBe(1);
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_pipeline_view_origens where view_id = '${V_TODOS}';`)).toBe(2);
  });

  it("acesso escolhidos: veem o gerente e a pessoa escolhida (controles positivos)", () => {
    expect(countAs(GOV_MANAGER, vistas(V_ESCOLHIDOS))).toBe(1);
    expect(countAs(GOV_AGENT_A, vistas(V_ESCOLHIDOS))).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_pipeline_view_origens where view_id = '${V_ESCOLHIDOS}';`)).toBe(1);
  });

  it("acesso escolhidos: quem não foi escolhido não vê a visualização, as origens nem a lista", () => {
    expect(countAs(GOV_AGENT_B, vistas(V_ESCOLHIDOS))).toBe(0);
    expect(countAs(GOV_VIEWER, vistas(V_ESCOLHIDOS))).toBe(0);
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_pipeline_view_origens where view_id = '${V_ESCOLHIDOS}';`)).toBe(0);
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_ESCOLHIDOS}';`)).toBe(0);
  });

  it("a pessoa escolhida vê só a própria linha da lista; o gerente vê a lista inteira", () => {
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_ESCOLHIDOS}';`)).toBe(1);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_ESCOLHIDOS}';`)).toBe(1);
  });
});

describe("crm_pipeline_views — quem escreve", () => {
  it("viewer e agent não criam visualização", () => {
    expect(
      writeCountAs(GOV_VIEWER, `insert into public.crm_pipeline_views (organization_id, name) values ('${GOV_ORG}', 'Do viewer')`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_AGENT_A, `insert into public.crm_pipeline_views (organization_id, name) values ('${GOV_ORG}', 'Do agent')`),
    ).toBe(0);
  });

  it("manager cria na própria organização (controle positivo), e não na do vizinho", () => {
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_pipeline_views (organization_id, name) values ('${GOV_ORG}', 'Do gerente')`),
    ).toBe(1);
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_pipeline_views (organization_id, name) values ('${ORG_B}', 'Na casa do vizinho')`),
    ).toBe(0);
  });
});

describe("crm_pipeline_views — as FKs compostas", () => {
  it("o banco recusa origem de outra organização", () => {
    expect(() =>
      sql(`insert into public.crm_pipeline_view_origens (view_id, organization_id, pipeline_id, position)
             values ('${V_TODOS}', '${GOV_ORG}', '${FUNIL_B}', 9);`),
    ).toThrow(/crm_pipeline_view_origens_funil_fk/);
  });

  it("o banco recusa pessoa que não é da organização", () => {
    expect(() =>
      sql(`insert into public.crm_pipeline_view_pessoas (view_id, organization_id, user_id)
             values ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${USER_B}');`),
    ).toThrow(/crm_pipeline_view_pessoas_membro_fk/);
  });

  it("apagar a origem ou a visualização leva as linhas junto", () => {
    expect(
      sql(`select string_agg(conname || '=' || confdeltype::text, ',' order by conname) from pg_constraint
            where conname in ('crm_pipeline_view_origens_funil_fk', 'crm_pipeline_view_origens_view_fk',
                              'crm_pipeline_view_pessoas_membro_fk', 'crm_pipeline_view_pessoas_view_fk');`),
    ).toBe(
      "crm_pipeline_view_origens_funil_fk=c,crm_pipeline_view_origens_view_fk=c,crm_pipeline_view_pessoas_membro_fk=c,crm_pipeline_view_pessoas_view_fk=c",
    );
  });
});

describe("fn_escale_salvar_visualizacao", () => {
  it("o gerente cria com origens na ordem e pessoas escolhidas, e depois troca tudo", () => {
    comoUsuario(GOV_MANAGER, salvar(V_RPC, "Da função", "escolhidos", [FUNIL_A2, GOV_PIPELINE], [GOV_AGENT_B]));
    expect(
      sql(`select string_agg(pipeline_id::text || ':' || position, ',' order by position)
             from public.crm_pipeline_view_origens where view_id = '${V_RPC}';`),
    ).toBe(`${FUNIL_A2}:1,${GOV_PIPELINE}:2`);
    expect(sql(`select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_RPC}';`)).toBe("1");

    comoUsuario(GOV_MANAGER, salvar(V_RPC, "Da função 2", "todos", [GOV_PIPELINE], [GOV_AGENT_B]));
    expect(sql(`select name || '|' || acesso from public.crm_pipeline_views where id = '${V_RPC}';`)).toBe("Da função 2|todos");
    expect(sql(`select count(*) from public.crm_pipeline_view_origens where view_id = '${V_RPC}';`)).toBe("1");
    expect(sql(`select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_RPC}';`)).toBe("0");
  });

  it("o agent para na RLS e nada é gravado", () => {
    expect(() => comoUsuario(GOV_AGENT_A, salvar(V_RECUSADA, "Do agent", "todos", [GOV_PIPELINE], []))).toThrow(
      /row-level security/,
    );
    expect(sql(`select count(*) from public.crm_pipeline_views where id = '${V_RECUSADA}';`)).toBe("0");
  });

  it("sem origem nenhuma, a função recusa (22023)", () => {
    expect(() => comoUsuario(GOV_MANAGER, salvar(V_RECUSADA, "Vazia", "todos", [], []))).toThrow(/1 a 20 origens/);
  });
});
