import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_LEAD,
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
 * FILTROS SALVOS DO QUADRO (fork Escale, migration 9004) — prova contra Postgres
 * real: o filtro pessoal só para quem criou, o compartilhado herdando quem vê a
 * origem e a visualização (sem copiar permissão), só o dono escreve, as FKs
 * compostas e a contagem de atividades rodando como quem chama.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG_B = "e5ca1e00-9004-4000-8000-000000000001";
const USER_B = "e5ca1e00-9004-4000-8000-000000000002";
const FUNIL_B = "e5ca1e00-9004-4000-8000-000000000003";
const V_ESCOLHIDOS = "e5ca1e00-9004-4000-8000-000000000011";
const F_PRIVADO = "e5ca1e00-9004-4000-8000-000000000021";
const F_COMPARTILHADO = "e5ca1e00-9004-4000-8000-000000000022";
const F_NA_VISUALIZACAO = "e5ca1e00-9004-4000-8000-000000000023";
const F_B = "e5ca1e00-9004-4000-8000-000000000024";
const T_FEITA_1 = "e5ca1e00-9004-4000-8000-000000000031";
const T_FEITA_2 = "e5ca1e00-9004-4000-8000-000000000032";
const T_ABERTA = "e5ca1e00-9004-4000-8000-000000000033";

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

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email)
      values ('${USER_B}', 'escale-filtros-b@invariant.test')
      on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-filtros-b', 'Escale Filtros Org B', 'Escale FB')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${FUNIL_B}', '${ORG_B}', 'Funil da B', 'escale-filtros-funil-b')
      on conflict do nothing;
    insert into public.crm_pipeline_views (id, organization_id, name, acesso)
      values ('${V_ESCOLHIDOS}', '${GOV_ORG}', 'Só da Ana (filtros)', 'escolhidos')
      on conflict do nothing;
    insert into public.crm_pipeline_view_origens (view_id, organization_id, pipeline_id, position)
      values ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${GOV_PIPELINE}', 1)
      on conflict do nothing;
    insert into public.crm_pipeline_view_pessoas (view_id, organization_id, user_id)
      values ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${GOV_AGENT_A}')
      on conflict do nothing;
    insert into public.crm_filtros_salvos (id, organization_id, user_id, pipeline_id, view_id, nome, compartilhado, criterios)
      values ('${F_PRIVADO}', '${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', null, 'Meus quentes', false, '{"status":["open"]}'),
             ('${F_COMPARTILHADO}', '${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', null, 'Do time', true, '{"status":["open"]}'),
             ('${F_NA_VISUALIZACAO}', '${GOV_ORG}', '${GOV_AGENT_A}', null, '${V_ESCOLHIDOS}', 'Na visualização', true, '{"status":["open"]}'),
             ('${F_B}', '${ORG_B}', '${USER_B}', '${FUNIL_B}', null, 'Do time', true, '{"status":["open"]}')
      on conflict do nothing;
    insert into public.crm_tasks (id, organization_id, title, status, lead_id)
      values ('${T_FEITA_1}', '${GOV_ORG}', 'Ligar', 'done', '${GOV_LEAD}'),
             ('${T_FEITA_2}', '${GOV_ORG}', 'Mandar proposta', 'done', '${GOV_LEAD}'),
             ('${T_ABERTA}', '${GOV_ORG}', 'Cobrar', 'pending', '${GOV_LEAD}')
      on conflict do nothing;
  `);
});

const visto = (id: string) => `select count(*) from public.crm_filtros_salvos where id = '${id}';`;

describe("crm_filtros_salvos — o filtro pessoal", () => {
  it("quem criou vê (controle positivo); outra pessoa da organização não vê", () => {
    expect(countAs(GOV_AGENT_A, visto(F_PRIVADO))).toBe(1);
    expect(countAs(GOV_AGENT_B, visto(F_PRIVADO))).toBe(0);
    expect(countAs(GOV_MANAGER, visto(F_PRIVADO))).toBe(0);
  });
});

describe("crm_filtros_salvos — o compartilhado segue quem vê o alvo", () => {
  it("compartilhado numa origem: a organização vê; a vizinha não, nos dois sentidos", () => {
    expect(countAs(GOV_AGENT_B, visto(F_COMPARTILHADO))).toBe(1);
    expect(countAs(GOV_VIEWER, visto(F_COMPARTILHADO))).toBe(1);
    expect(countAs(USER_B, visto(F_COMPARTILHADO))).toBe(0);
    expect(countAs(GOV_VIEWER, visto(F_B))).toBe(0);
    expect(countAs(USER_B, visto(F_B))).toBe(1);
  });

  it("compartilhado numa visualização 'escolhidos': vê quem vê a visualização, e só", () => {
    expect(countAs(GOV_MANAGER, visto(F_NA_VISUALIZACAO))).toBe(1);
    expect(countAs(GOV_AGENT_A, visto(F_NA_VISUALIZACAO))).toBe(1);
    expect(countAs(GOV_AGENT_B, visto(F_NA_VISUALIZACAO))).toBe(0);
    expect(countAs(GOV_VIEWER, visto(F_NA_VISUALIZACAO))).toBe(0);
  });
});

describe("crm_filtros_salvos — quem escreve", () => {
  it("ninguém muda nem apaga o filtro de outra pessoa, nem o compartilhado", () => {
    expect(writeCountAs(GOV_AGENT_B, `update public.crm_filtros_salvos set nome = 'Tomado' where id = '${F_COMPARTILHADO}'`)).toBe(0);
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_filtros_salvos where id = '${F_COMPARTILHADO}'`)).toBe(0);
    expect(sql(`select nome from public.crm_filtros_salvos where id = '${F_COMPARTILHADO}';`)).toBe("Do time");
  });

  it("ninguém cria filtro em nome de outra pessoa nem em outra organização", () => {
    expect(
      writeCountAs(GOV_AGENT_B, `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', 'Em nome da Ana')`),
    ).toBe(0);
    expect(
      writeCountAs(USER_B, `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${USER_B}', '${GOV_PIPELINE}', 'Na casa do vizinho')`),
    ).toBe(0);
  });

  it("qualquer papel salva o próprio filtro (controles positivos: agent e viewer)", () => {
    expect(
      writeCountAs(GOV_AGENT_B, `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_B}', '${GOV_PIPELINE}', 'Do agent B')`),
    ).toBe(1);
    expect(
      writeCountAs(GOV_VIEWER, `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_VIEWER}', '${GOV_PIPELINE}', 'Do viewer')`),
    ).toBe(1);
  });
});

describe("crm_filtros_salvos — CHECKs, índice e FKs", () => {
  it("o banco recusa filtro sem alvo e com dois alvos", () => {
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'Sem alvo');`),
    ).toThrow(/crm_filtros_salvos_um_alvo/);
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, view_id, nome)
             values ('${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', '${V_ESCOLHIDOS}', 'Dois alvos');`),
    ).toThrow(/crm_filtros_salvos_um_alvo/);
  });

  it("o banco recusa origem de outra organização e nome repetido (sem olhar caixa) da mesma pessoa no mesmo alvo", () => {
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${FUNIL_B}', 'Fora');`),
    ).toThrow(/crm_filtros_salvos_origem_fk/);
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', ' MEUS QUENTES ');`),
    ).toThrow(/uq_crm_filtros_salvos_nome/);
  });

  it("apagar a origem, a visualização ou a pessoa da organização leva o filtro junto", () => {
    expect(
      sql(`select string_agg(conname || '=' || confdeltype::text,',' order by conname) from pg_constraint
            where conname in ('crm_filtros_salvos_dono_fk', 'crm_filtros_salvos_origem_fk', 'crm_filtros_salvos_visualizacao_fk');`),
    ).toBe("crm_filtros_salvos_dono_fk=c,crm_filtros_salvos_origem_fk=c,crm_filtros_salvos_visualizacao_fk=c");
  });
});

describe("fn_escale_atividades_concluidas", () => {
  it("conta só as concluídas, como quem chama", () => {
    expect(
      comoUsuario(GOV_MANAGER, `select total from public.fn_escale_atividades_concluidas('${GOV_ORG}', array['${GOV_LEAD}']::uuid[]);`),
    ).toBe("2");
  });

  it("quem é de outra organização não conta nada (a RLS de crm_tasks vale)", () => {
    expect(
      comoUsuario(USER_B, `select count(*) from public.fn_escale_atividades_concluidas('${GOV_ORG}', array['${GOV_LEAD}']::uuid[]);`),
    ).toBe("0");
  });

  it("é invoker", () => {
    expect(sql(`select prosecdef from pg_proc where proname = 'fn_escale_atividades_concluidas';`)).toBe("f");
  });
});
