import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_MANAGER,
  countAs,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * ATRIBUIÇÃO DE GANHO (fork Escale, migration 9014) — prova contra Postgres
 * real. Organização própria (e5ca1e00-9014), regra "todos veem" para a prova
 * da trava não depender da visibilidade. Origem TRAVADA (só admin ganha; regra:
 * 2 ligações) e LIVRE (sem nada). Cada origem com a etapa Novo e a etapa Ganho.
 *
 * Roda via `pnpm test:db`.
 */
const ORG = "e5ca1e00-9014-4000-8000-000000000001";
const P_TRAVADA = "e5ca1e00-9014-4000-8000-000000000011";
const P_LIVRE = "e5ca1e00-9014-4000-8000-000000000012";
const NOVO = (p: string) => p.replace("-0000000000", "-0000000001");
const GANHO = (p: string) => p.replace("-0000000000", "-0000000002");

let seq = 0;
const novoId = () => `e5ca1e00-9014-4000-9000-${String(++seq).padStart(12, "0")}`;
const n = (q: string) => Number(lastLine(sql(q)));
const texto = (q: string) => lastLine(sql(q));

function comoUsuario(userId: string, script: string): string {
  return sql(`
    set role authenticated;
    select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
    ${script}
  `);
}

function negocio(origem: string, dono: string): string {
  const id = novoId();
  sql(`insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, owner_user_id, created_by_user_id)
       values ('${id}', '${ORG}', '${origem}', '${NOVO(origem)}', 'prova 9014', '${dono}', '${dono}');`);
  return id;
}

/** Uma atividade concluída (a forma da 9009: a tarefa em crm_tasks e a linha tipada). */
function concluida(lead: string, quem: string, tipo: string) {
  const tarefa = novoId();
  sql(`insert into public.crm_tasks (id, organization_id, title, status, lead_id, created_by)
         values ('${tarefa}', '${ORG}', 'atividade', 'done', '${lead}', '${quem}');
       insert into public.crm_atividades_do_negocio (tarefa_id, organization_id, lead_id, tipo, concluida_por, concluida_em)
         values ('${tarefa}', '${ORG}', '${lead}', '${tipo}', '${quem}', now());`);
}

const ganhar = (lead: string, origem: string) =>
  `update public.crm_leads set stage_id = '${GANHO(origem)}' where id = '${lead}';`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name, settings)
      values ('${ORG}', 'escale-ganho', 'Escale Ganho Org', 'Escale Ganho', jsonb_build_object('visibility_mode', 'all'))
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${GOV_AGENT_A}', '${ORG}', 'agent', now()),
      ('${GOV_AGENT_B}', '${ORG}', 'agent', now()),
      ('${GOV_MANAGER}', '${ORG}', 'manager', now()),
      ('${GOV_ADMIN}', '${ORG}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug, settings) values
      ('${P_TRAVADA}', '${ORG}', 'Travada', 'escale-ganho-travada',
       '{"escale_so_admin_ganha": true, "escale_atribuicao_de_ganho": {"operador": "e", "condicoes": [{"tipo": "atividade", "vezes": 2, "atividade": "ligacao"}]}}'::jsonb),
      ('${P_LIVRE}', '${ORG}', 'Livre', 'escale-ganho-livre', '{}'::jsonb)
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position, is_won) values
      ('${NOVO(P_TRAVADA)}', '${ORG}', '${P_TRAVADA}', 'Novo', 'novo', 1000, false),
      ('${GANHO(P_TRAVADA)}', '${ORG}', '${P_TRAVADA}', 'Ganho', 'ganho', 2000, true),
      ('${NOVO(P_LIVRE)}', '${ORG}', '${P_LIVRE}', 'Novo', 'novo', 1000, false),
      ('${GANHO(P_LIVRE)}', '${ORG}', '${P_LIVRE}', 'Ganho', 'ganho', 2000, true)
      on conflict do nothing;
  `);
});

describe("só o administrador marca ganho (N15)", () => {
  it("agente e gerente com sessão são recusados na origem travada; o admin passa", () => {
    const l1 = negocio(P_TRAVADA, GOV_AGENT_A);
    expect(() => comoUsuario(GOV_AGENT_A, ganhar(l1, P_TRAVADA))).toThrow(
      /so_administrador_marca_ganho/,
    );
    expect(() => comoUsuario(GOV_MANAGER, ganhar(l1, P_TRAVADA))).toThrow(
      /so_administrador_marca_ganho/,
    );
    comoUsuario(GOV_ADMIN, ganhar(l1, P_TRAVADA));
    expect(texto(`select status from public.crm_leads where id = '${l1}';`)).toBe("won");
  });

  it("sem sessão (automação, IA, integração) passa", () => {
    const l = negocio(P_TRAVADA, GOV_AGENT_A);
    sql(ganhar(l, P_TRAVADA));
    expect(texto(`select status from public.crm_leads where id = '${l}';`)).toBe("won");
  });

  it("a origem livre deixa o agente ganhar", () => {
    const l = negocio(P_LIVRE, GOV_AGENT_A);
    comoUsuario(GOV_AGENT_A, ganhar(l, P_LIVRE));
    expect(texto(`select status from public.crm_leads where id = '${l}';`)).toBe("won");
  });

  it("ir e voltar de origem não driblou a trava: ganho que muda para a origem travada é recusado ao agente", () => {
    const l = negocio(P_TRAVADA, GOV_AGENT_A);
    // 1) o agente leva o negócio para a origem livre, já na etapa de ganho (a livre não recusa)
    comoUsuario(
      GOV_AGENT_A,
      `update public.crm_leads set pipeline_id = '${P_LIVRE}', stage_id = '${GANHO(P_LIVRE)}' where id = '${l}';`,
    );
    expect(texto(`select status from public.crm_leads where id = '${l}';`)).toBe("won");
    // 2) e de volta à travada, na etapa de ganho: o status já era ganho, mas a origem mudou
    expect(() =>
      comoUsuario(
        GOV_AGENT_A,
        `update public.crm_leads set pipeline_id = '${P_TRAVADA}', stage_id = '${GANHO(P_TRAVADA)}' where id = '${l}';`,
      ),
    ).toThrow(/so_administrador_marca_ganho/);
    // o administrador passa
    comoUsuario(
      GOV_ADMIN,
      `update public.crm_leads set pipeline_id = '${P_TRAVADA}', stage_id = '${GANHO(P_TRAVADA)}' where id = '${l}';`,
    );
    expect(texto(`select pipeline_id from public.crm_leads where id = '${l}';`)).toBe(P_TRAVADA);
  });
});

describe("só o administrador muda as regras do ganho, mesmo gravando settings direto", () => {
  const virar = (valor: string) =>
    `update public.crm_pipelines set settings = jsonb_set(settings, '{escale_so_admin_ganha}', '${valor}'::jsonb) where id = '${P_TRAVADA}';`;
  const lido = () =>
    texto(
      `select settings ->> 'escale_so_admin_ganha' from public.crm_pipelines where id = '${P_TRAVADA}';`,
    );

  it("o gerente (política de escrita do gerente) não desliga a trava nem troca a regra de crédito", () => {
    expect(() => comoUsuario(GOV_MANAGER, virar("false"))).toThrow(
      /so_administrador_muda_regras_do_ganho/,
    );
    expect(() =>
      comoUsuario(
        GOV_MANAGER,
        `update public.crm_pipelines set settings = settings - 'escale_atribuicao_de_ganho' where id = '${P_TRAVADA}';`,
      ),
    ).toThrow(/so_administrador_muda_regras_do_ganho/);
    expect(lido()).toBe("true");
  });

  it("o gerente segue gravando o resto das configurações da origem", () => {
    comoUsuario(
      GOV_MANAGER,
      `update public.crm_pipelines set settings = jsonb_set(settings, '{escale_prova_9014}', '1'::jsonb) where id = '${P_TRAVADA}';`,
    );
    expect(lido()).toBe("true");
  });

  it("o administrador muda; o sistema (sem sessão) também", () => {
    comoUsuario(GOV_ADMIN, virar("false"));
    expect(lido()).toBe("false");
    sql(virar("true"));
    expect(lido()).toBe("true");
  });
});

describe("o crédito do ganho (N17)", () => {
  it("quem cumpriu a regra leva o crédito; a regra aplicada fica gravada", () => {
    const l = negocio(P_TRAVADA, GOV_AGENT_A);
    concluida(l, GOV_AGENT_B, "ligacao");
    concluida(l, GOV_AGENT_B, "ligacao");
    sql(ganhar(l, P_TRAVADA));
    expect(
      texto(
        `select creditado_a || ':' || pela_regra from public.crm_ganho_do_negocio where lead_id = '${l}';`,
      ),
    ).toBe(`${GOV_AGENT_B}:true`);
    expect(
      texto(`select regras->>'operador' from public.crm_ganho_do_negocio where lead_id = '${l}';`),
    ).toBe("e");
  });

  it("o dono que também cumpre ganha de quem fez mais", () => {
    const l = negocio(P_TRAVADA, GOV_AGENT_A);
    concluida(l, GOV_AGENT_A, "ligacao");
    concluida(l, GOV_AGENT_A, "ligacao");
    for (let i = 0; i < 3; i++) concluida(l, GOV_AGENT_B, "ligacao");
    sql(ganhar(l, P_TRAVADA));
    expect(
      texto(`select creditado_a from public.crm_ganho_do_negocio where lead_id = '${l}';`),
    ).toBe(GOV_AGENT_A);
  });

  it("ninguém cumpre, ou origem sem regra: o dono, sem regra aplicada", () => {
    const semNada = negocio(P_TRAVADA, GOV_AGENT_A);
    concluida(semNada, GOV_AGENT_B, "email");
    sql(ganhar(semNada, P_TRAVADA));
    expect(
      texto(
        `select creditado_a || ':' || pela_regra from public.crm_ganho_do_negocio where lead_id = '${semNada}';`,
      ),
    ).toBe(`${GOV_AGENT_A}:false`);
    const livre = negocio(P_LIVRE, GOV_AGENT_B);
    sql(ganhar(livre, P_LIVRE));
    expect(
      texto(`select creditado_a from public.crm_ganho_do_negocio where lead_id = '${livre}';`),
    ).toBe(GOV_AGENT_B);
  });

  it("sair de ganho apaga a linha", () => {
    const l = negocio(P_LIVRE, GOV_AGENT_A);
    sql(ganhar(l, P_LIVRE));
    sql(`update public.crm_leads set stage_id = '${NOVO(P_LIVRE)}' where id = '${l}';`);
    expect(n(`select count(*) from public.crm_ganho_do_negocio where lead_id = '${l}';`)).toBe(0);
  });

  it("a correção troca pessoa e data e grava quem corrigiu; só pelo service role", () => {
    const l = negocio(P_LIVRE, GOV_AGENT_A);
    sql(ganhar(l, P_LIVRE));
    sql(
      `select public.fn_escale_corrigir_ganho('${ORG}', '${l}', '${GOV_ADMIN}', '${GOV_AGENT_B}', now() - interval '1 day');`,
    );
    expect(
      texto(
        `select creditado_a || ':' || corrigido_por from public.crm_ganho_do_negocio where lead_id = '${l}';`,
      ),
    ).toBe(`${GOV_AGENT_B}:${GOV_ADMIN}`);
    expect(() =>
      comoUsuario(
        GOV_ADMIN,
        `select public.fn_escale_corrigir_ganho('${ORG}', '${l}', '${GOV_ADMIN}', null, now());`,
      ),
    ).toThrow(/permission denied/);
    expect(() =>
      sql(
        `select public.fn_escale_corrigir_ganho('${ORG}', '${l}', '${GOV_ADMIN}', '${GOV_AGENT_A}', now() + interval '10 days');`,
      ),
    ).toThrow(/data_invalida/);
  });

  it("RLS: quem vê o negócio lê o crédito; ninguém com sessão escreve", () => {
    const l = negocio(P_LIVRE, GOV_AGENT_A);
    sql(ganhar(l, P_LIVRE));
    expect(
      countAs(
        GOV_AGENT_B,
        `select count(*) from public.crm_ganho_do_negocio where lead_id = '${l}'`,
      ),
    ).toBe(1);
    // Sem o privilégio de escrita (revoke da 9014), o banco recusa; nada muda.
    expect(() =>
      comoUsuario(
        GOV_ADMIN,
        `update public.crm_ganho_do_negocio set creditado_a = '${GOV_MANAGER}' where lead_id = '${l}';`,
      ),
    ).toThrow(/permission denied/);
    expect(
      texto(`select creditado_a from public.crm_ganho_do_negocio where lead_id = '${l}';`),
    ).toBe(GOV_AGENT_A);
  });
});
