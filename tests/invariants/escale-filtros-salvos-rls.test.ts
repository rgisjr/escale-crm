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
const F_TEMP_EDITAR = "e5ca1e00-9004-4000-8000-000000000041";
const F_TEMP_APAGAR = "e5ca1e00-9004-4000-8000-000000000042";
const F_TEMP_TROCAR = "e5ca1e00-9004-4000-8000-000000000043";
const V_TEMP = "e5ca1e00-9004-4000-8000-000000000051";
const F_NA_V_TEMP = "e5ca1e00-9004-4000-8000-000000000052";
const P_TEMP = "e5ca1e00-9004-4000-8000-000000000053";
const F_NA_P_TEMP = "e5ca1e00-9004-4000-8000-000000000054";
const U_TEMP = "e5ca1e00-9004-4000-8000-000000000055";
const F_DO_U_TEMP = "e5ca1e00-9004-4000-8000-000000000056";
const F_TEMP_REAPONTAR = "e5ca1e00-9004-4000-8000-000000000044";
const P_LIMITE = "e5ca1e00-9004-4000-8000-000000000061";
const P_OUTRO = "e5ca1e00-9004-4000-8000-000000000062";
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
    -- Os nomes fixos dos controles positivos de escrita: apagar antes, para a
    -- prova repetir contra um banco que já a rodou (o índice único recusaria).
    delete from public.crm_filtros_salvos
      where organization_id = '${GOV_ORG}'
        and user_id in ('${GOV_AGENT_B}', '${GOV_VIEWER}')
        and nome in ('Do agent B', 'Do viewer');
  `);
});

/** Recria, como superusuário, um filtro descartável do próprio teste (sempre limpo, repetível). */
function recriarFiltroDescartavel(id: string, nome: string): void {
  sql(`
    delete from public.crm_filtros_salvos where id = '${id}';
    insert into public.crm_filtros_salvos (id, organization_id, user_id, pipeline_id, nome, criterios)
      values ('${id}', '${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', '${nome}', '{"status":["open"]}');
  `);
}

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

  it("o dono muda e apaga o próprio filtro (controles positivos da policy de escrita)", () => {
    recriarFiltroDescartavel(F_TEMP_EDITAR, "Descartavel editar");
    recriarFiltroDescartavel(F_TEMP_APAGAR, "Descartavel apagar");

    expect(
      writeCountAs(GOV_AGENT_A, `update public.crm_filtros_salvos set nome = 'Renomeado pelo dono' where id = '${F_TEMP_EDITAR}'`),
    ).toBe(1);
    expect(sql(`select nome from public.crm_filtros_salvos where id = '${F_TEMP_EDITAR}';`)).toBe("Renomeado pelo dono");

    expect(writeCountAs(GOV_AGENT_A, `delete from public.crm_filtros_salvos where id = '${F_TEMP_APAGAR}'`)).toBe(1);
    expect(sql(`select count(*) from public.crm_filtros_salvos where id = '${F_TEMP_APAGAR}';`)).toBe("0");
    sql(`delete from public.crm_filtros_salvos where id = '${F_TEMP_EDITAR}';`);
  });

  it("o dono não passa o filtro para outra pessoa nem para outra organização (WITH CHECK)", () => {
    recriarFiltroDescartavel(F_TEMP_TROCAR, "Descartavel trocar");

    expect(
      writeCountAs(GOV_AGENT_A, `update public.crm_filtros_salvos set user_id = '${GOV_AGENT_B}' where id = '${F_TEMP_TROCAR}'`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_AGENT_A, `update public.crm_filtros_salvos set organization_id = '${ORG_B}' where id = '${F_TEMP_TROCAR}'`),
    ).toBe(0);
    expect(
      sql(`select user_id || '|' || organization_id from public.crm_filtros_salvos where id = '${F_TEMP_TROCAR}';`),
    ).toBe(`${GOV_AGENT_A}|${GOV_ORG}`);
    sql(`delete from public.crm_filtros_salvos where id = '${F_TEMP_TROCAR}';`);
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

describe("crm_filtros_salvos — o alvo precisa ser visível para quem grava (WITH CHECK)", () => {
  const nomeUnico = (rotulo: string) => `${rotulo} ${Date.now()}`;

  it("quem não vê a visualização 'escolhidos' não grava filtro nela, nem pessoal nem compartilhado", () => {
    // Controle: a visualização existe e a Ana a vê; o viewer não.
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_pipeline_views where id = '${V_ESCOLHIDOS}';`)).toBe(1);
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_pipeline_views where id = '${V_ESCOLHIDOS}';`)).toBe(0);
    for (const compartilhado of ["false", "true"]) {
      expect(
        writeCountAs(
          GOV_VIEWER,
          `insert into public.crm_filtros_salvos (organization_id, user_id, view_id, nome, compartilhado)
             values ('${GOV_ORG}', '${GOV_VIEWER}', '${V_ESCOLHIDOS}', '${nomeUnico("Plantado")}', ${compartilhado})`,
        ),
      ).toBe(0);
    }
    expect(
      sql(`select count(*) from public.crm_filtros_salvos where user_id = '${GOV_VIEWER}' and view_id = '${V_ESCOLHIDOS}';`),
    ).toBe("0");
  });

  it("controle positivo: quem VÊ a visualização grava nela (a Ana) e quem vê a origem grava na origem (o viewer)", () => {
    const nome = nomeUnico("Da Ana na visualizacao");
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `insert into public.crm_filtros_salvos (organization_id, user_id, view_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${V_ESCOLHIDOS}', '${nome}')`,
      ),
    ).toBe(1);
    sql(`delete from public.crm_filtros_salvos where user_id = '${GOV_AGENT_A}' and nome = '${nome}';`);
    const nomeViewer = nomeUnico("Do viewer na origem");
    expect(
      writeCountAs(
        GOV_VIEWER,
        `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_VIEWER}', '${GOV_PIPELINE}', '${nomeViewer}')`,
      ),
    ).toBe(1);
    sql(`delete from public.crm_filtros_salvos where user_id = '${GOV_VIEWER}' and nome = '${nomeViewer}';`);
  });

  it("o dono não reaponta o próprio filtro para um alvo que não vê (UPDATE de view_id), e o filtro fica onde estava", () => {
    sql(`
      delete from public.crm_filtros_salvos where id = '${F_TEMP_REAPONTAR}';
      insert into public.crm_filtros_salvos (id, organization_id, user_id, pipeline_id, nome, compartilhado)
        values ('${F_TEMP_REAPONTAR}', '${GOV_ORG}', '${GOV_AGENT_B}', '${GOV_PIPELINE}', 'Descartavel reapontar', true);
    `);
    expect(
      writeCountAs(
        GOV_AGENT_B,
        `update public.crm_filtros_salvos set pipeline_id = null, view_id = '${V_ESCOLHIDOS}' where id = '${F_TEMP_REAPONTAR}'`,
      ),
    ).toBe(0);
    expect(
      sql(`select coalesce(pipeline_id::text, 'nulo') || '|' || coalesce(view_id::text, 'nulo') from public.crm_filtros_salvos where id = '${F_TEMP_REAPONTAR}';`),
    ).toBe(`${GOV_PIPELINE}|nulo`);
    // Controle: um UPDATE que mantém o alvo visível passa.
    expect(
      writeCountAs(GOV_AGENT_B, `update public.crm_filtros_salvos set nome = 'Descartavel reapontado' where id = '${F_TEMP_REAPONTAR}'`),
    ).toBe(1);
    sql(`delete from public.crm_filtros_salvos where id = '${F_TEMP_REAPONTAR}';`);
  });

  it("quem perdeu a visibilidade do alvo ainda apaga o filtro que é seu (USING só do dono)", () => {
    sql(`
      delete from public.crm_filtros_salvos where id = '${F_TEMP_REAPONTAR}';
      insert into public.crm_filtros_salvos (id, organization_id, user_id, view_id, nome)
        values ('${F_TEMP_REAPONTAR}', '${GOV_ORG}', '${GOV_VIEWER}', '${V_ESCOLHIDOS}', 'Descartavel orfao de visibilidade');
    `);
    expect(writeCountAs(GOV_VIEWER, `delete from public.crm_filtros_salvos where id = '${F_TEMP_REAPONTAR}'`)).toBe(1);
  });
});

describe("crm_filtros_salvos — o limite de 20 por pessoa e alvo mora no banco", () => {
  const inserir = (userId: string, pipelineId: string, nome: string) =>
    `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${userId}', '${pipelineId}', '${nome}')`;

  const recriarAlvos = () =>
    sql(`
      delete from public.crm_pipelines where id in ('${P_LIMITE}', '${P_OUTRO}');
      insert into public.crm_pipelines (id, organization_id, name, slug)
        values ('${P_LIMITE}', '${GOV_ORG}', 'Limite filtros', 'escale-filtros-limite'),
               ('${P_OUTRO}', '${GOV_ORG}', 'Limite filtros outro', 'escale-filtros-limite-outro');
      -- 19 com critérios válidos e 1 que o schema da rota não aceita: todas contam.
      insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome, criterios)
        select '${GOV_ORG}', '${GOV_AGENT_B}', '${P_LIMITE}', 'Limite ' || n,
               case when n = 20 then '{"status":[]}'::jsonb else '{"status":["open"]}'::jsonb end
          from generate_series(1, 20) n;
    `);

  const total = (userId: string, pipelineId: string) =>
    sql(`select count(*) from public.crm_filtros_salvos where user_id = '${userId}' and pipeline_id = '${pipelineId}';`);

  it("a 21ª gravação da mesma pessoa no mesmo alvo é recusada com o erro do limite (a linha de critério inválido conta)", () => {
    recriarAlvos();
    expect(total(GOV_AGENT_B, P_LIMITE)).toBe("20");
    expect(() => writeCountAs(GOV_AGENT_B, inserir(GOV_AGENT_B, P_LIMITE, "Limite 21"))).toThrow(/crm_filtros_salvos_limite/);
    expect(total(GOV_AGENT_B, P_LIMITE)).toBe("20");
    // O erro é mapeável pela rota: SQLSTATE 23514 (check_violation) com a constraint nomeada.
    const erro = lastLine(sql(`
      do $t$ declare c text; begin
        begin
          insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome)
            values ('${GOV_ORG}', '${GOV_AGENT_B}', '${P_LIMITE}', 'Limite 22');
        exception when check_violation then
          get stacked diagnostics c = constraint_name;
          perform set_config('escale.limite', c, false);
        end;
      end $t$;
      select current_setting('escale.limite', true);
    `));
    expect(erro).toBe("crm_filtros_salvos_limite");
  });

  it("outro alvo da mesma pessoa e o mesmo alvo de outra pessoa não são afetados", () => {
    recriarAlvos();
    expect(writeCountAs(GOV_AGENT_B, inserir(GOV_AGENT_B, P_OUTRO, "No outro alvo"))).toBe(1);
    expect(writeCountAs(GOV_MANAGER, inserir(GOV_MANAGER, P_LIMITE, "Do gerente no alvo cheio"))).toBe(1);
  });

  it("reapontar um filtro para um alvo cheio (UPDATE de pipeline_id) também bate no limite; renomear quem já está no alvo cheio não", () => {
    recriarAlvos();
    sql(`delete from public.crm_filtros_salvos where id = '${F_TEMP_REAPONTAR}';`);
    sql(`insert into public.crm_filtros_salvos (id, organization_id, user_id, pipeline_id, nome)
            values ('${F_TEMP_REAPONTAR}', '${GOV_ORG}', '${GOV_AGENT_B}', '${P_OUTRO}', 'Reapontar para o cheio');`);
    expect(() =>
      writeCountAs(GOV_AGENT_B, `update public.crm_filtros_salvos set pipeline_id = '${P_LIMITE}' where id = '${F_TEMP_REAPONTAR}'`),
    ).toThrow(/crm_filtros_salvos_limite/);
    expect(
      writeCountAs(
        GOV_AGENT_B,
        `update public.crm_filtros_salvos set nome = 'Limite 1 renomeado' where nome = 'Limite 1' and pipeline_id = '${P_LIMITE}' and user_id = '${GOV_AGENT_B}'`,
      ),
    ).toBe(1);
    sql(`delete from public.crm_filtros_salvos where id = '${F_TEMP_REAPONTAR}';`);
  });

  it("reapontar sem trocar de alvo, num alvo que já tem 20 filtros da pessoa, passa: a própria linha não conta contra o limite", () => {
    recriarAlvos();
    expect(total(GOV_AGENT_B, P_LIMITE)).toBe("20");
    expect(
      writeCountAs(
        GOV_AGENT_B,
        `update public.crm_filtros_salvos set pipeline_id = '${P_LIMITE}' where nome = 'Limite 2' and pipeline_id = '${P_LIMITE}' and user_id = '${GOV_AGENT_B}'`,
      ),
    ).toBe(1);
    expect(total(GOV_AGENT_B, P_LIMITE)).toBe("20");
  });

  it("limpa os alvos descartáveis (a prova repete)", () => {
    sql(`delete from public.crm_pipelines where id in ('${P_LIMITE}', '${P_OUTRO}');`);
    expect(sql(`select count(*) from public.crm_filtros_salvos where pipeline_id in ('${P_LIMITE}', '${P_OUTRO}');`)).toBe("0");
  });
});

describe("fn_crm_filtros_salvos_limite", () => {
  it("é invoker, com search_path fixo, e anon não a executa", () => {
    expect(sql(`select prosecdef from pg_proc where proname = 'fn_crm_filtros_salvos_limite';`)).toBe("f");
    expect(sql(`select proconfig::text from pg_proc where proname = 'fn_crm_filtros_salvos_limite';`)).toContain("search_path=public, pg_temp");
    expect(sql(`select has_function_privilege('anon', 'public.fn_crm_filtros_salvos_limite()', 'execute');`)).toBe("f");
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

  it("o banco recusa nome em branco e nome com 61 caracteres (crm_filtros_salvos_nome_valido)", () => {
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', '   ');`),
    ).toThrow(/crm_filtros_salvos_nome_valido/);
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', '${"x".repeat(61)}');`),
    ).toThrow(/crm_filtros_salvos_nome_valido/);
  });

  it("o banco recusa origem de outra organização e nome repetido (sem olhar caixa) da mesma pessoa no mesmo alvo", () => {
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${FUNIL_B}', 'Fora');`),
    ).toThrow(/crm_filtros_salvos_origem_fk/);
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', ' MEUS QUENTES ');`),
    ).toThrow(/uq_crm_filtros_salvos_nome/);
  });

  it("as três FKs declaram ON DELETE CASCADE (metadado do catálogo)", () => {
    expect(
      sql(`select string_agg(conname || '=' || confdeltype::text,',' order by conname) from pg_constraint
            where conname in ('crm_filtros_salvos_dono_fk', 'crm_filtros_salvos_origem_fk', 'crm_filtros_salvos_visualizacao_fk');`),
    ).toBe("crm_filtros_salvos_dono_fk=c,crm_filtros_salvos_origem_fk=c,crm_filtros_salvos_visualizacao_fk=c");
  });

  it("apagar a visualização, a origem ou a pessoa da organização leva o filtro junto (cascata real, com pais descartáveis)", () => {
    // Pais descartáveis do próprio teste: o seed compartilhado não é tocado.
    sql(`
      delete from public.crm_pipeline_views where id = '${V_TEMP}';
      delete from public.crm_pipelines where id = '${P_TEMP}';
      delete from public.user_organizations where user_id = '${U_TEMP}';
      delete from auth.users where id = '${U_TEMP}';
      insert into public.crm_pipeline_views (id, organization_id, name) values ('${V_TEMP}', '${GOV_ORG}', 'Descartavel (filtros)');
      insert into public.crm_pipelines (id, organization_id, name, slug) values ('${P_TEMP}', '${GOV_ORG}', 'Descartavel filtros', 'escale-filtros-descartavel');
      insert into auth.users (id, email) values ('${U_TEMP}', 'escale-filtros-descartavel@invariant.test');
      insert into public.user_organizations (user_id, organization_id, role, accepted_at) values ('${U_TEMP}', '${GOV_ORG}', 'agent', now());
      insert into public.crm_filtros_salvos (id, organization_id, user_id, pipeline_id, view_id, nome)
        values ('${F_NA_V_TEMP}', '${GOV_ORG}', '${GOV_AGENT_A}', null, '${V_TEMP}', 'Na visualizacao descartavel'),
               ('${F_NA_P_TEMP}', '${GOV_ORG}', '${GOV_AGENT_A}', '${P_TEMP}', null, 'Na origem descartavel');
      insert into public.crm_filtros_salvos (id, organization_id, user_id, pipeline_id, nome)
        values ('${F_DO_U_TEMP}', '${GOV_ORG}', '${U_TEMP}', '${GOV_PIPELINE}', 'Da pessoa descartavel');
    `);
    const existe = (id: string) => sql(`select count(*) from public.crm_filtros_salvos where id = '${id}';`);
    expect([F_NA_V_TEMP, F_NA_P_TEMP, F_DO_U_TEMP].map(existe)).toEqual(["1", "1", "1"]);

    sql(`delete from public.crm_pipeline_views where id = '${V_TEMP}';`);
    expect(existe(F_NA_V_TEMP)).toBe("0");
    sql(`delete from public.crm_pipelines where id = '${P_TEMP}';`);
    expect(existe(F_NA_P_TEMP)).toBe("0");
    sql(`delete from public.user_organizations where user_id = '${U_TEMP}' and organization_id = '${GOV_ORG}';`);
    expect(existe(F_DO_U_TEMP)).toBe("0");

    sql(`delete from auth.users where id = '${U_TEMP}';`);
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
