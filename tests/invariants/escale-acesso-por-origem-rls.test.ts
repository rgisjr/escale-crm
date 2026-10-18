import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
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
 * ACESSO POR ORIGEM E POR GRUPO (fork Escale, migration 9010) — prova contra
 * Postgres real. Uma organização própria (namespace e5ca1e00-9010), com os
 * membros do seedGov (A e B agentes, um viewer, um gerente, um admin), dois
 * grupos e seis origens:
 *   grupo ABERTO (sem lista):
 *     - ABERTA: sem regra nem lista → vale a regra da organização (own_and_unassigned);
 *     - TODOS:  regra 'all';
 *     - SOS:    regra 'own' + lista [A, viewer];
 *     - LISTA:  só a lista [A];
 *   grupo FECHADO (lista [A]):
 *     - SEGUE:   sem lista → segue a do grupo;
 *     - PROPRIA: lista [B] → a dela vence a do grupo.
 * Em cada origem, três negócios: da A, do B e sem dono.
 *
 * É também a defesa contra a sincronização com o original (N7 do plano): uma
 * migration futura que recrie crm_leads_select com fn_can_view_lead derruba
 * "agente A vê o do B na origem TODOS".
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG = "e5ca1e00-9010-4000-8000-000000000001";
const G_ABERTO = "e5ca1e00-9010-4000-8000-000000000002";
const G_FECHADO = "e5ca1e00-9010-4000-8000-000000000003";
const P_ABERTA = "e5ca1e00-9010-4000-8000-000000000011";
const P_TODOS = "e5ca1e00-9010-4000-8000-000000000012";
const P_SOS = "e5ca1e00-9010-4000-8000-000000000013";
const P_LISTA = "e5ca1e00-9010-4000-8000-000000000014";
const P_SEGUE = "e5ca1e00-9010-4000-8000-000000000015";
const P_PROPRIA = "e5ca1e00-9010-4000-8000-000000000016";
const ETAPA = (p: string) => p.replace("-0000000000", "-0000000001");
const LEAD = (p: string, dono: "a" | "b" | "n") =>
  p.replace("-0000000000", `-00000000${dono === "a" ? "2" : dono === "b" ? "3" : "4"}0`);
const ATIVIDADE_LISTA = "e5ca1e00-9010-4000-8000-000000000099";

function comoUsuario(userId: string, script: string): string {
  return lastLine(
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
      ${script}
    `),
  );
}

const ORIGENS = [P_ABERTA, P_TODOS, P_SOS, P_LISTA, P_SEGUE, P_PROPRIA];

beforeAll(() => {
  seedGov();
  const origem = (id: string, grupo: string, nome: string, settings: string) =>
    `('${id}', '${ORG}', '${grupo}', '${nome}', 'escale-acesso-${nome}', '${settings}'::jsonb)`;
  const etapa = (p: string) => `('${ETAPA(p)}', '${ORG}', '${p}', 'Novo', 'novo', 1000)`;
  const negocios = (p: string) =>
    `('${LEAD(p, "a")}', '${ORG}', '${p}', '${ETAPA(p)}', 'da A', '${GOV_AGENT_A}'),
     ('${LEAD(p, "b")}', '${ORG}', '${p}', '${ETAPA(p)}', 'do B', '${GOV_AGENT_B}'),
     ('${LEAD(p, "n")}', '${ORG}', '${p}', '${ETAPA(p)}', 'sem dono', null)`;
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name, settings)
      values ('${ORG}', 'escale-acesso', 'Escale Acesso Org', 'Escale Acesso',
              jsonb_build_object('visibility_mode', 'own_and_unassigned'))
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${GOV_AGENT_A}', '${ORG}', 'agent', now()),
      ('${GOV_AGENT_B}', '${ORG}', 'agent', now()),
      ('${GOV_VIEWER}', '${ORG}', 'viewer', now()),
      ('${GOV_MANAGER}', '${ORG}', 'manager', now()),
      ('${GOV_ADMIN}', '${ORG}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipeline_groups (id, organization_id, name, settings) values
      ('${G_ABERTO}', '${ORG}', 'Aberto', '{}'::jsonb),
      ('${G_FECHADO}', '${ORG}', 'Fechado', '{"escale_pessoas":["${GOV_AGENT_A}"]}'::jsonb)
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, group_id, name, slug, settings) values
      ${origem(P_ABERTA, G_ABERTO, "aberta", "{}")},
      ${origem(P_TODOS, G_ABERTO, "todos", '{"escale_visualizacao":"all"}')},
      ${origem(P_SOS, G_ABERTO, "sos", `{"escale_visualizacao":"own","escale_pessoas":["${GOV_AGENT_A}","${GOV_VIEWER}"]}`)},
      ${origem(P_LISTA, G_ABERTO, "lista", `{"escale_pessoas":["${GOV_AGENT_A}"]}`)},
      ${origem(P_SEGUE, G_FECHADO, "segue", "{}")},
      ${origem(P_PROPRIA, G_FECHADO, "propria", `{"escale_pessoas":["${GOV_AGENT_B}"]}`)}
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values
      ${ORIGENS.map(etapa).join(",\n      ")}
      on conflict do nothing;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, owner_user_id) values
      ${ORIGENS.map(negocios).join(",\n      ")}
      on conflict (id) do nothing;
    insert into public.crm_lead_activities (id, organization_id, lead_id, source_module, type, payload)
      values ('${ATIVIDADE_LISTA}', '${ORG}', '${LEAD(P_LISTA, "n")}', 'invariant', 'note', '{"note":"prova 9010"}'::jsonb)
      on conflict do nothing;
  `);
});

const ve = (user: string, lead: string) =>
  countAs(user, `select count(*) from public.crm_leads where id = '${lead}';`);
const origensVisiveis = (user: string) =>
  countAs(
    user,
    `select count(*) from public.crm_pipelines where organization_id = '${ORG}' and slug like 'escale-acesso-%';`,
  );

describe("a regra em vigor por origem", () => {
  it("sem valor na origem, vale a da organização (own_and_unassigned): A vê o seu e o sem dono, não o do B", () => {
    expect(ve(GOV_AGENT_A, LEAD(P_ABERTA, "a"))).toBe(1);
    expect(ve(GOV_AGENT_A, LEAD(P_ABERTA, "n"))).toBe(1);
    expect(ve(GOV_AGENT_A, LEAD(P_ABERTA, "b"))).toBe(0);
  });

  it("'todos' na origem vence a regra da organização: A vê o do B", () => {
    expect(ve(GOV_AGENT_A, LEAD(P_TODOS, "b"))).toBe(1);
  });

  it("'só os seus' na origem: A vê o seu, não o sem dono nem o do B", () => {
    expect(ve(GOV_AGENT_A, LEAD(P_SOS, "a"))).toBe(1);
    expect(ve(GOV_AGENT_A, LEAD(P_SOS, "n"))).toBe(0);
    expect(ve(GOV_AGENT_A, LEAD(P_SOS, "b"))).toBe(0);
  });

  it("a função devolve o padrão quando nem a origem nem a organização têm valor", () => {
    expect(
      sql(`select public.fn_escale_visualizacao_da_origem('${GOV_ORG}', '${GOV_PIPELINE}');`),
    ).toBe("own_and_unassigned");
  });
});

describe("a lista de pessoas da origem (Q4: só admin passa por cima)", () => {
  it("quem não está na lista não vê NENHUM negócio da origem, nem o próprio; gerente e viewer também não", () => {
    expect(ve(GOV_AGENT_B, LEAD(P_LISTA, "n"))).toBe(0);
    expect(ve(GOV_AGENT_B, LEAD(P_LISTA, "b"))).toBe(0);
    expect(ve(GOV_VIEWER, LEAD(P_LISTA, "n"))).toBe(0);
    expect(ve(GOV_MANAGER, LEAD(P_LISTA, "n"))).toBe(0);
  });

  it("quem está na lista vê conforme a regra; admin vê tudo", () => {
    expect(ve(GOV_AGENT_A, LEAD(P_LISTA, "n"))).toBe(1);
    expect(ve(GOV_AGENT_A, LEAD(P_LISTA, "a"))).toBe(1);
    expect(
      countAs(GOV_ADMIN, `select count(*) from public.crm_leads where pipeline_id = '${P_LISTA}';`),
    ).toBe(3);
  });

  it("a origem e as etapas somem para quem não tem acesso; cada um vê as suas", () => {
    expect(
      countAs(GOV_AGENT_B, `select count(*) from public.crm_pipelines where id = '${P_LISTA}';`),
    ).toBe(0);
    expect(
      countAs(
        GOV_AGENT_B,
        `select count(*) from public.crm_stages where pipeline_id = '${P_LISTA}';`,
      ),
    ).toBe(0);
    expect(origensVisiveis(GOV_ADMIN)).toBe(6);
    expect(origensVisiveis(GOV_AGENT_A)).toBe(5); // tudo menos PROPRIA
    expect(origensVisiveis(GOV_AGENT_B)).toBe(3); // ABERTA, TODOS, PROPRIA
    expect(origensVisiveis(GOV_MANAGER)).toBe(2); // ABERTA, TODOS
    expect(origensVisiveis(GOV_VIEWER)).toBe(3); // ABERTA, TODOS, SOS
  });

  it("a linha do tempo segue o negócio", () => {
    expect(
      countAs(
        GOV_AGENT_B,
        `select count(*) from public.crm_lead_activities where id = '${ATIVIDADE_LISTA}';`,
      ),
    ).toBe(0);
    expect(
      countAs(
        GOV_AGENT_A,
        `select count(*) from public.crm_lead_activities where id = '${ATIVIDADE_LISTA}';`,
      ),
    ).toBe(1);
  });
});

describe("a lista do grupo (Q6: a origem sem lista segue o grupo; a própria vence)", () => {
  it("SEGUE: B e o gerente não veem a origem nem os negócios; A vê", () => {
    expect(
      countAs(GOV_AGENT_B, `select count(*) from public.crm_pipelines where id = '${P_SEGUE}';`),
    ).toBe(0);
    expect(ve(GOV_AGENT_B, LEAD(P_SEGUE, "b"))).toBe(0);
    expect(ve(GOV_MANAGER, LEAD(P_SEGUE, "n"))).toBe(0);
    expect(ve(GOV_AGENT_A, LEAD(P_SEGUE, "n"))).toBe(1);
  });

  it("PROPRIA: a lista da origem vence a do grupo: B vê, A não", () => {
    expect(
      countAs(GOV_AGENT_B, `select count(*) from public.crm_pipelines where id = '${P_PROPRIA}';`),
    ).toBe(1);
    expect(ve(GOV_AGENT_B, LEAD(P_PROPRIA, "n"))).toBe(1);
    expect(
      countAs(GOV_AGENT_A, `select count(*) from public.crm_pipelines where id = '${P_PROPRIA}';`),
    ).toBe(0);
  });

  it("o grupo aparece para quem a lista dele inclui, para quem alguma origem dele inclui, e para o admin; não para os outros", () => {
    const veGrupo = (u: string) =>
      countAs(u, `select count(*) from public.crm_pipeline_groups where id = '${G_FECHADO}';`);
    expect(veGrupo(GOV_AGENT_A)).toBe(1);
    expect(veGrupo(GOV_AGENT_B)).toBe(1); // por PROPRIA
    expect(veGrupo(GOV_ADMIN)).toBe(1);
    expect(veGrupo(GOV_MANAGER)).toBe(0);
    expect(veGrupo(GOV_VIEWER)).toBe(0);
    expect(
      countAs(
        GOV_VIEWER,
        `select count(*) from public.crm_pipeline_groups where id = '${G_ABERTO}';`,
      ),
    ).toBe(1);
  });
});

describe("escrita", () => {
  it("quem não está na lista não move o negócio da origem", () => {
    expect(
      writeCountAs(
        GOV_AGENT_B,
        `update public.crm_leads set title = 'x' where id = '${LEAD(P_LISTA, "b")}'`,
      ),
    ).toBe(0);
  });

  it("sob 'só os seus', o agente move o seu, mas não o passa a outra pessoa (deixaria de vê-lo)", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `update public.crm_leads set title = 'meu' where id = '${LEAD(P_SOS, "a")}'`,
      ),
    ).toBe(1);
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `update public.crm_leads set owner_user_id = '${GOV_AGENT_B}', owner_kind = 'user' where id = '${LEAD(P_SOS, "a")}'`,
      ),
    ).toBe(0);
  });

  it("admin passa o negócio a quem quiser", () => {
    expect(
      writeCountAs(
        GOV_ADMIN,
        `update public.crm_leads set owner_user_id = '${GOV_AGENT_B}', owner_kind = 'user' where id = '${LEAD(P_SOS, "n")}'`,
      ),
    ).toBe(1);
  });
});

describe("o gerente fora da lista não passa por cima (as policies FOR ALL de escrita também decidem a leitura)", () => {
  it("não esvazia a lista da origem nem a do grupo, nem mexe nas etapas, nem insere negócio nela", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `update public.crm_pipelines set settings = '{}'::jsonb where id = '${P_LISTA}'`,
      ),
    ).toBe(0);
    expect(
      writeCountAs(
        GOV_MANAGER,
        `update public.crm_pipeline_groups set settings = '{}'::jsonb where id = '${G_FECHADO}'`,
      ),
    ).toBe(0);
    expect(
      writeCountAs(
        GOV_MANAGER,
        `update public.crm_stages set name = 'x' where pipeline_id = '${P_LISTA}'`,
      ),
    ).toBe(0);
    expect(
      writeCountAs(GOV_MANAGER, `delete from public.crm_leads where pipeline_id = '${P_LISTA}'`),
    ).toBe(0);
  });

  it("o gerente continua gerindo as origens a que tem acesso", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `update public.crm_pipelines set name = 'Aberta' where id = '${P_ABERTA}'`,
      ),
    ).toBe(1);
  });
});

describe("o dono padrão em origem 'só os seus' (gatilho, Q8)", () => {
  it("o vendedor que cria sem dono vira o dono, e por isso continua vendo o negócio", () => {
    const criado = comoUsuario(
      GOV_AGENT_A,
      `with criado as (
         insert into public.crm_leads (organization_id, pipeline_id, stage_id, title)
         values ('${ORG}', '${P_SOS}', '${ETAPA(P_SOS)}', 'novo da A') returning owner_user_id
       ) select owner_user_id from criado;`,
    );
    expect(criado).toBe(GOV_AGENT_A);
  });

  it("em origem que não é 'só os seus', o negócio nasce sem dono, como hoje", () => {
    const criado = comoUsuario(
      GOV_AGENT_A,
      `with criado as (
         insert into public.crm_leads (organization_id, pipeline_id, stage_id, title)
         values ('${ORG}', '${P_ABERTA}', '${ETAPA(P_ABERTA)}', 'novo sem dono') returning owner_user_id
       ) select coalesce(owner_user_id::text, 'nulo') from criado;`,
    );
    expect(criado).toBe("nulo");
  });
});
