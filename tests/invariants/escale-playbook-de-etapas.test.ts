import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * PLAYBOOK DE ETAPAS E ATIVIDADES (fork Escale, migration 9009) — prova contra
 * Postgres real: o negócio que entra na etapa ganha as atividades dela (sem
 * repetir), quem concluiu fica gravado, e a RLS das duas tabelas novas em dois
 * tenants por JWT, com a função de salvar rodando como quem chama.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const P = (n: number) => `e5ca1e00-9009-4000-8000-${String(n).padStart(12, "0")}`;
const FUNIL = P(1);
const E1 = P(2);
const E2 = P(3);
const EG = P(4);
const OUTRO_FUNIL = P(5);
const OUTRA_ETAPA = P(6);
const A_WHATS = P(11);
const A_TAREFA = P(12);
const A_LIGACAO = P(13);
const L1 = P(21);
const L2 = P(22);
const ORG_B = P(31);
const USER_B = P(32);
const FUNIL_B = P(33);
const ETAPA_B = P(34);
const A_B = P(35);

/** Roda o script como `authenticated` com o JWT do usuário e volta ao papel do teste. */
function comoUsuario(userId: string, script: string): string {
  try {
    return lastLine(
      sql(`
        set role authenticated;
        select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
        ${script}
      `),
    );
  } finally {
    sql(`reset role;`);
  }
}

/** O comando foi recusado por falta de privilégio (coluna ou tabela sem GRANT para `authenticated`)? */
function negado(userId: string, dml: string): boolean {
  try {
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
      ${dml};
    `);
    return false;
  } catch (err) {
    return ((err as { stderr?: string }).stderr ?? "").includes("permission denied");
  } finally {
    sql(`reset role;`);
  }
}

const tarefasDo = (lead: string) =>
  Number(lastLine(sql(`select count(*)::int from public.crm_tasks where lead_id = '${lead}';`)));

/** id | status | tipo | visibilidade | etapa | responsável | minutos até o prazo */
const tarefaDa = (lead: string, atividade: string) =>
  lastLine(
    sql(`
      select t.id || '|' || t.status || '|' || a.tipo || '|' || a.visibilidade || '|' || a.stage_id || '|' ||
             coalesce(t.assigned_to::text, '-') || '|' ||
             round(extract(epoch from (t.due_date - now())) / 60)::int
        from public.crm_atividades_do_negocio a
        join public.crm_tasks t on t.id = a.tarefa_id
       where a.lead_id = '${lead}' and a.atividade_id = '${atividade}';
    `),
  ).split("|");

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'escale-playbook-b@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-playbook-b', 'Escale Playbook Org B', 'Escale PB') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${FUNIL}', '${GOV_ORG}', 'Funil do playbook (9009)', 'escale-9009-funil'),
             ('${OUTRO_FUNIL}', '${GOV_ORG}', 'Outro funil (9009)', 'escale-9009-outro'),
             ('${FUNIL_B}', '${ORG_B}', 'Funil da B (9009)', 'escale-9009-funil-b')
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position, is_won)
      values ('${E1}', '${GOV_ORG}', '${FUNIL}', '1. Entrada', 'e9009-1', 1, false),
             ('${E2}', '${GOV_ORG}', '${FUNIL}', '2. Atendimento', 'e9009-2', 2, false),
             ('${EG}', '${GOV_ORG}', '${FUNIL}', 'Ganho', 'e9009-g', 3, true),
             ('${OUTRA_ETAPA}', '${GOV_ORG}', '${OUTRO_FUNIL}', 'Outra', 'e9009-o', 1, false),
             ('${ETAPA_B}', '${ORG_B}', '${FUNIL_B}', 'Entrada B', 'e9009-b', 1, false)
      on conflict do nothing;
    insert into public.crm_atividades_da_etapa
        (id, organization_id, pipeline_id, stage_id, titulo, tipo, visibilidade, prazo_minutos, ordem, conteudo)
      values ('${A_WHATS}', '${GOV_ORG}', '${FUNIL}', '${E1}', 'Entrada de Lead', 'whatsapp', 'padrao', 1440, 0, 'Olá [CONTACT.FIRST_NAME]'),
             ('${A_TAREFA}', '${GOV_ORG}', '${FUNIL}', '${E1}', 'Pré-qualificação', 'tarefa', 'nao_listada', 60, 1, null),
             ('${A_LIGACAO}', '${GOV_ORG}', '${FUNIL}', '${E2}', 'Ligação 1', 'ligacao', 'padrao', 0, 0, 'Roteiro'),
             ('${A_B}', '${ORG_B}', '${FUNIL_B}', '${ETAPA_B}', 'Da B', 'tarefa', 'padrao', 60, 0, null)
      on conflict do nothing;
  `);
});

describe("o negócio entra na etapa e ganha as atividades (9009)", () => {
  it("criar direto na etapa cria as tarefas dela, com tipo, visibilidade, etapa, dono e prazo", () => {
    sql(`
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, owner_user_id, owner_kind)
        values ('${L1}', '${GOV_ORG}', '${FUNIL}', '${E1}', 'Ana', '${GOV_AGENT_A}', 'user') on conflict do nothing;
    `);
    expect(tarefasDo(L1)).toBe(2);
    const [, status, tipo, vis, etapa, dono, minutos] = tarefaDa(L1, A_WHATS);
    expect([status, tipo, vis, etapa, dono]).toEqual([
      "pending",
      "whatsapp",
      "padrao",
      E1,
      GOV_AGENT_A,
    ]);
    expect(Math.abs(Number(minutos) - 1440)).toBeLessThanOrEqual(1);
    expect(tarefaDa(L1, A_TAREFA)[3]).toBe("nao_listada");
    expect(
      lastLine(
        sql(
          `select string_agg(distinct source_kind, ',') from public.crm_tasks where lead_id = '${L1}';`,
        ),
      ),
    ).toBe("playbook");
  });

  it("o texto da atividade vai para a descrição da tarefa", () => {
    expect(
      lastLine(
        sql(`select t.description from public.crm_tasks t join public.crm_atividades_do_negocio a on a.tarefa_id = t.id
              where a.lead_id = '${L1}' and a.atividade_id = '${A_WHATS}';`),
      ),
    ).toBe("Olá [CONTACT.FIRST_NAME]");
  });

  it("mudar de etapa cria as da nova; as da anterior ficam", () => {
    sql(`update public.crm_leads set stage_id = '${E2}' where id = '${L1}';`);
    expect(tarefasDo(L1)).toBe(3);
  });

  it("voltar não repete: a pendente ganha prazo novo, a concluída continua concluída", () => {
    const [whats] = tarefaDa(L1, A_WHATS);
    const [tarefa] = tarefaDa(L1, A_TAREFA);
    sql(`
      update public.crm_tasks set status = 'done' where id = '${tarefa}';
      update public.crm_tasks set due_date = now() - interval '3 days' where id = '${whats}';
      update public.crm_leads set stage_id = '${E1}' where id = '${L1}';
    `);
    expect(tarefasDo(L1)).toBe(3);
    expect(Number(tarefaDa(L1, A_WHATS)[6])).toBeGreaterThan(1430);
    expect(tarefaDa(L1, A_TAREFA)[1]).toBe("done");
  });

  it("mexer no negócio sem trocar de etapa não cria nada; o negócio ganho não ganha atividade", () => {
    sql(`update public.crm_leads set title = 'Ana Souza' where id = '${L1}';`);
    expect(tarefasDo(L1)).toBe(3);
    sql(`update public.crm_leads set stage_id = '${EG}', status = 'won' where id = '${L1}';`);
    expect(tarefasDo(L1)).toBe(3);
  });

  it("negócio sem dono: tarefa sem responsável; vale também pela sessão de um gerente (RLS ligada)", () => {
    comoUsuario(
      GOV_MANAGER,
      `insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title)
         values ('${L2}', '${GOV_ORG}', '${FUNIL}', '${E2}', 'Bruno') on conflict do nothing;
       select 1;`,
    );
    expect(tarefasDo(L2)).toBe(1);
    expect(tarefaDa(L2, A_LIGACAO)[5]).toBe("-");
  });
});

describe("quem concluiu (9009)", () => {
  const quem = (id: string) =>
    lastLine(
      sql(`select coalesce(concluida_por::text, '-') || '|' || (concluida_em is not null)::text
             from public.crm_atividades_do_negocio where tarefa_id = '${id}';`),
    );

  it("concluir pela sessão grava quem e quando; reabrir apaga", () => {
    const [id] = tarefaDa(L2, A_LIGACAO);
    comoUsuario(
      GOV_AGENT_A,
      `update public.crm_tasks set status = 'done' where id = '${id}'; select 1;`,
    );
    expect(quem(id!)).toBe(`${GOV_AGENT_A}|true`);
    sql(`update public.crm_tasks set status = 'pending' where id = '${id}';`);
    expect(quem(id!)).toBe("-|false");
  });
});

describe("RLS do playbook e das atividades do negócio (9009)", () => {
  it("todo membro lê a própria organização; ZERO da vizinha nos dois sentidos", () => {
    expect(
      countAs(
        GOV_VIEWER,
        `select count(*) from public.crm_atividades_da_etapa where pipeline_id = '${FUNIL}';`,
      ),
    ).toBe(3);
    expect(
      countAs(
        GOV_AGENT_A,
        `select count(*) from public.crm_atividades_do_negocio where lead_id = '${L1}';`,
      ),
    ).toBe(3);
    expect(
      countAs(
        USER_B,
        `select count(*) from public.crm_atividades_da_etapa where organization_id = '${GOV_ORG}';`,
      ),
    ).toBe(0);
    expect(
      countAs(
        USER_B,
        `select count(*) from public.crm_atividades_do_negocio where organization_id = '${GOV_ORG}';`,
      ),
    ).toBe(0);
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_atividades_da_etapa where organization_id = '${ORG_B}';`,
      ),
    ).toBe(0);
  });

  it("agente e viewer não escrevem o playbook; gerente escreve só na própria organização", () => {
    const novo = (org: string, funil: string, etapa: string, n: number) =>
      `insert into public.crm_atividades_da_etapa (id, organization_id, pipeline_id, stage_id, titulo, tipo)
         values ('${P(100 + n)}', '${org}', '${funil}', '${etapa}', 'X', 'tarefa')`;
    expect(writeCountAs(GOV_AGENT_A, novo(GOV_ORG, FUNIL, E1, 1))).toBe(0);
    expect(writeCountAs(GOV_VIEWER, novo(GOV_ORG, FUNIL, E1, 2))).toBe(0);
    expect(writeCountAs(GOV_MANAGER, novo(ORG_B, FUNIL_B, ETAPA_B, 3))).toBe(0);
    expect(writeCountAs(GOV_MANAGER, novo(GOV_ORG, FUNIL, E1, 4))).toBe(1);
    sql(`delete from public.crm_atividades_da_etapa where id = '${P(104)}';`);
  });

  it("ninguém atualiza a atividade do negócio direto (9012: só o gatilho grava tipo, etapa e quem concluiu)", () => {
    const [id] = tarefaDa(L2, A_LIGACAO);
    for (const quem of [GOV_VIEWER, GOV_AGENT_A, GOV_MANAGER]) {
      expect(
        negado(quem, `update public.crm_atividades_do_negocio set tipo = 'tarefa' where tarefa_id = '${id}'`),
      ).toBe(true);
    }
  });
});

describe("salvar o playbook (fn_escale_salvar_playbook)", () => {
  const salvar = (atividades: object[]) =>
    `select public.fn_escale_salvar_playbook('${GOV_ORG}', '${FUNIL}', '${JSON.stringify(atividades)}'::jsonb);`;
  const item = (id: string, etapa: string, titulo: string) => ({
    id,
    stage_id: etapa,
    titulo,
    tipo: "whatsapp",
    visibilidade: "padrao",
    prazo_minutos: 1440,
    ordem: 0,
    conteudo: null,
  });

  it("o gerente troca a lista: mantém o id, muda o título e apaga o que saiu", () => {
    comoUsuario(
      GOV_MANAGER,
      salvar([item(A_WHATS, E1, "Entrada de Lead 2"), item(A_LIGACAO, E2, "Ligação 1")]),
    );
    expect(
      lastLine(
        sql(
          `select string_agg(titulo, ',' order by titulo) from public.crm_atividades_da_etapa where pipeline_id = '${FUNIL}';`,
        ),
      ),
    ).toBe("Entrada de Lead 2,Ligação 1");
    // A tarefa continua ligada à atividade que ficou; a da que saiu perde o vínculo (set null).
    expect(tarefaDa(L1, A_WHATS)[2]).toBe("whatsapp");
    expect(
      lastLine(
        sql(
          `select count(*) from public.crm_atividades_do_negocio where atividade_id = '${A_TAREFA}';`,
        ),
      ),
    ).toBe("0");
  });

  it("recusa etapa de outra origem e a etapa de ganho (22023)", () => {
    expect(() => comoUsuario(GOV_MANAGER, salvar([item(P(201), OUTRA_ETAPA, "X")]))).toThrow();
    expect(() => comoUsuario(GOV_MANAGER, salvar([item(P(202), EG, "X")]))).toThrow();
    expect(
      lastLine(
        sql(
          `select count(*) from public.crm_atividades_da_etapa where id in ('${P(201)}', '${P(202)}');`,
        ),
      ),
    ).toBe("0");
  });

  it("agente não salva (a RLS de quem chama vale)", () => {
    expect(() => comoUsuario(GOV_AGENT_A, salvar([item(P(203), E1, "X")]))).toThrow();
    expect(
      lastLine(sql(`select count(*) from public.crm_atividades_da_etapa where id = '${P(203)}';`)),
    ).toBe("0");
  });
});

describe("endurecimento das atividades (9012)", () => {
  /** Uma tarefa nova do negócio, criada como o superusuário (a rota a cria pela sessão). */
  const novaTarefa = (n: number, lead: string, org = GOV_ORG) => {
    sql(`insert into public.crm_tasks (id, organization_id, title, status, lead_id)
           values ('${P(200 + n)}', '${org}', 'Tarefa ${n}', 'pending', ${lead ? `'${lead}'` : "null"})
           on conflict do nothing;`);
    return P(200 + n);
  };
  const linha = (tarefa: string, lead: string, extra = "", org = GOV_ORG) =>
    `insert into public.crm_atividades_do_negocio (tarefa_id, organization_id, lead_id, stage_id, tipo, visibilidade${extra ? ", " + extra.split("=")[0] : ""})
       values ('${tarefa}', '${org}', '${lead}', '${E1}', 'tarefa', 'padrao'${extra ? ", " + extra.split("=")[1] : ""})`;

  it("como o app grava (tarefa do próprio negócio, etapa da organização): passa", () => {
    const t = novaTarefa(1, L1);
    expect(writeCountAs(GOV_MANAGER, linha(t, L1))).toBe(1);
  });

  it("não se forja quem concluiu, a data da conclusão nem a atividade do playbook no INSERT", () => {
    const t = novaTarefa(2, L1);
    expect(negado(GOV_MANAGER, linha(t, L1, `concluida_por='${GOV_AGENT_A}'`))).toBe(true);
    expect(negado(GOV_MANAGER, linha(t, L1, "concluida_em=now()"))).toBe(true);
    expect(negado(GOV_MANAGER, linha(t, L1, `atividade_id='${A_WHATS}'`))).toBe(true);
  });

  it("a tarefa precisa ser do MESMO negócio e da mesma organização", () => {
    const deOutroNegocio = novaTarefa(3, L1);
    expect(writeCountAs(GOV_MANAGER, linha(deOutroNegocio, L2))).toBe(0);
    const daOutraOrg = novaTarefa(4, "", ORG_B);
    expect(writeCountAs(GOV_MANAGER, linha(daOutraOrg, L1))).toBe(0);
    expect(writeCountAs(USER_B, linha(novaTarefa(5, L1), L1, "", ORG_B))).toBe(0);
  });

  it("viewer não grava atividade do negócio", () => {
    expect(writeCountAs(GOV_VIEWER, linha(novaTarefa(6, L1), L1))).toBe(0);
  });

  it("o gerente não põe atividade do playbook numa etapa de OUTRA origem", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `insert into public.crm_atividades_da_etapa (id, organization_id, pipeline_id, stage_id, titulo, tipo)
           values ('${P(150)}', '${GOV_ORG}', '${FUNIL}', '${OUTRA_ETAPA}', 'X', 'tarefa')`,
      ),
    ).toBe(0);
  });
});
