import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * AÇÕES EM MASSA (fork Escale, migration 9103) — prova contra Postgres real: a
 * função resolve os contatos (ids, filtro, os N primeiros, menos os desmarcados)
 * com a RLS de quem pede, emite o evento, recusa vazio, só gerente+ cria, e cada
 * um só vê e mexe nas suas. A exportação espera a aprovação de OUTRO admin (Q4),
 * vence em 7 dias, e o único admin ativo não espera. Roda via `pnpm test:db`.
 */
const C1 = "e5ca1e00-9103-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9103-4000-8000-0000000000c2";
const C3 = "e5ca1e00-9103-4000-8000-0000000000c3";
/** O 2º admin da GOV_ORG: só deste arquivo (sai no afterAll). */
const ADMIN_2 = "e5ca1e00-9103-4000-8000-0000000000a2";
/** Uma organização com um admin só, para a exportação que não espera. */
const ORG_SO = "e5ca1e00-9103-4000-8000-0000000000e1";
const ADMIN_SO = "e5ca1e00-9103-4000-8000-0000000000e2";
const C_SO = "e5ca1e00-9103-4000-8000-0000000000e3";
const FILTRO = `'{"fuso":"UTC"}'::jsonb`;

type Extra = { ids?: string; quantidade?: string; excluidos?: string; busca?: string; org?: string };
const criar = (acao: string, extra: Extra = {}) =>
  `select quantidade from public.fn_escale_criar_acao_em_massa('${extra.org ?? GOV_ORG}', '${acao}', '{}'::jsonb, ${
    extra.ids ?? "null"
  }, 'todos', '${extra.busca ?? "massadois"}', null, null, ${FILTRO}, ${extra.quantidade ?? "null"}, ${
    extra.excluidos ?? "null"
  })`;
const ultima = (org = GOV_ORG) =>
  sql(`select id from public.crm_acoes_em_massa where organization_id = '${org}' order by created_at desc, id desc limit 1;`).trim();
const statusDe = (id: string) => sql(`select status from public.crm_acoes_em_massa where id = '${id}';`).trim();
const decididoPor = (id: string) =>
  sql(`select decidido_por from public.crm_acoes_em_massa where id = '${id}';`).trim();
const eventosDe = (id: string) =>
  Number(
    sql(`select count(*) from public.event_log where event_type = 'contatos.acao_em_massa_requested' and entity_id = '${id}';`).trim(),
  );
const decidir = (id: string, aprovar: boolean) =>
  `select count(*) from (select public.fn_escale_decidir_exportacao('${id}', ${aprovar})) x`;
/** Pede a exportação de um contato e devolve o id da ação. */
const pedirExportacao = (quem: string, org = GOV_ORG, contato = C1) => {
  expect(countAs(quem, criar("exportar", { org, ids: `array['${contato}']::uuid[]` }))).toBe(1);
  return ultima(org);
};

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_acoes_em_massa where organization_id in ('${GOV_ORG}', '${ORG_SO}');
    delete from public.contacts where id::text like 'e5ca1e00-9103-%';
    insert into auth.users (id, email) values
      ('${ADMIN_2}', 'massa-admin-2@invariant.test'),
      ('${ADMIN_SO}', 'massa-admin-so@invariant.test')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${ADMIN_2}', '${GOV_ORG}', 'admin', now()) on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_SO}', 'massa-admin-unico', 'Massa Admin Unico', 'Massa SO') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${ADMIN_SO}', '${ORG_SO}', 'admin', now()) on conflict do nothing;
    insert into public.contacts (id, organization_id, display_name, last_activity_at) values
      ('${C1}', '${GOV_ORG}', 'Massadois Um', now()),
      ('${C2}', '${GOV_ORG}', 'Massadois Dois', now() - interval '1 day'),
      ('${C3}', '${GOV_ORG}', 'Massadois Tres', now() - interval '2 days'),
      ('${C_SO}', '${ORG_SO}', 'Massadois Sozinho', now());
  `);
});

afterAll(() => {
  // Os outros testes da GOV_ORG contam com um admin só.
  sql(`delete from public.user_organizations where user_id = '${ADMIN_2}' and organization_id = '${GOV_ORG}';`);
});

describe("fn_escale_criar_acao_em_massa", () => {
  it("pelo filtro: todos os da busca, com os itens e o evento", () => {
    expect(countAs(GOV_MANAGER, criar("incluir_tag"))).toBe(3);
    const id = ultima();
    expect(Number(sql(`select count(*) from public.crm_acoes_em_massa_itens where acao_id = '${id}';`).trim())).toBe(3);
    expect(statusDe(id)).toBe("na_fila");
    expect(eventosDe(id)).toBe(1);
  });

  it("os N primeiros menos os desmarcados", () => {
    expect(countAs(GOV_MANAGER, criar("remover_tag", { quantidade: "2", excluidos: `array['${C1}']::uuid[]` }))).toBe(1);
    const id = ultima();
    expect(sql(`select contact_id from public.crm_acoes_em_massa_itens where acao_id = '${id}';`).trim()).toBe(C2);
  });

  it("pelos ids: só os da organização", () => {
    expect(
      countAs(GOV_MANAGER, criar("excluir", { ids: `array['${C3}', 'e5ca1e00-9103-4000-8000-0000000000ff']::uuid[]` })),
    ).toBe(1);
  });

  it("vazia é recusada e não deixa nada gravado", () => {
    const antes = sql(`select count(*) from public.crm_acoes_em_massa where organization_id = '${GOV_ORG}';`).trim();
    expect(() => countAs(GOV_MANAGER, criar("incluir_tag", { busca: "ninguemtemessenome" }))).toThrow(/acao_em_massa_vazia/);
    expect(sql(`select count(*) from public.crm_acoes_em_massa where organization_id = '${GOV_ORG}';`).trim()).toBe(antes);
  });

  it("atendente não cria", () => {
    expect(() => countAs(GOV_AGENT_A, criar("incluir_tag"))).toThrow();
  });

  it("as funções são invoker e fechadas ao anon", () => {
    expect(
      sql(
        `select count(*) from pg_proc where proname in ('fn_escale_criar_acao_em_massa','fn_escale_decidir_exportacao','fn_escale_admin_unico','fn_crm_acoes_em_massa_trava_da_decisao') and prosecdef;`,
      ).trim(),
    ).toBe("0");
    expect(
      sql(
        `select has_function_privilege('anon', 'public.fn_escale_criar_acao_em_massa(uuid, text, jsonb, uuid[], text, text, text[], text, jsonb, integer, uuid[])', 'execute');`,
      ).trim(),
    ).toBe("f");
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_decidir_exportacao(uuid, boolean)', 'execute');`).trim(),
    ).toBe("f");
  });
});

describe("exportar com aprovação (Q4)", () => {
  it("o pedido do gerente espera aprovação, sem evento", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(statusDe(id)).toBe("aguardando_aprovacao");
    expect(eventosDe(id)).toBe(0);
  });

  it("gerente e atendente não aprovam", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(() => countAs(GOV_MANAGER, decidir(id, true))).toThrow(/acao_em_massa_sem_permissao/);
    expect(() => countAs(GOV_AGENT_A, decidir(id, true))).toThrow(/acao_em_massa_inexistente/);
    expect(statusDe(id)).toBe("aguardando_aprovacao");
  });

  it("um admin aprova: vai para a fila, com quem decidiu e UM evento; decidir de novo é recusado", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(countAs(GOV_ADMIN, decidir(id, true))).toBe(1);
    expect(statusDe(id)).toBe("na_fila");
    expect(decididoPor(id)).toBe(GOV_ADMIN);
    expect(eventosDe(id)).toBe(1);
    expect(() => countAs(ADMIN_2, decidir(id, true))).toThrow(/acao_em_massa_nao_aguarda/);
    expect(eventosDe(id)).toBe(1);
  });

  it("o pedido de um admin precisa de OUTRO admin", () => {
    const id = pedirExportacao(GOV_ADMIN);
    expect(statusDe(id)).toBe("aguardando_aprovacao");
    expect(() => countAs(GOV_ADMIN, decidir(id, true))).toThrow(/acao_em_massa_propria/);
    expect(countAs(ADMIN_2, decidir(id, true))).toBe(1);
    expect(statusDe(id)).toBe("na_fila");
    expect(eventosDe(id)).toBe(1);
  });

  it("recusar: fica 'recusada', com quem decidiu, sem evento", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(countAs(ADMIN_2, decidir(id, false))).toBe(1);
    expect(statusDe(id)).toBe("recusada");
    expect(decididoPor(id)).toBe(ADMIN_2);
    expect(eventosDe(id)).toBe(0);
  });

  it("vencido (mais de 7 dias) não se aprova", () => {
    const id = pedirExportacao(GOV_MANAGER);
    sql(`update public.crm_acoes_em_massa set created_at = now() - interval '8 days' where id = '${id}';`);
    expect(() => countAs(GOV_ADMIN, decidir(id, true))).toThrow(/acao_em_massa_expirada/);
    expect(statusDe(id)).toBe("aguardando_aprovacao");
    expect(eventosDe(id)).toBe(0);
  });

  it("o único admin ativo exporta sem esperar", () => {
    const id = pedirExportacao(ADMIN_SO, ORG_SO, C_SO);
    expect(statusDe(id)).toBe("na_fila");
    expect(eventosDe(id)).toBe(1);
  });

  it("o admin enxerga as exportações da organização que esperam ou foram decididas; o resto, não", () => {
    expect(
      countAs(
        GOV_ADMIN,
        `select count(*) from public.crm_acoes_em_massa where user_id = '${GOV_MANAGER}' and acao = 'exportar' and status = 'aguardando_aprovacao'`,
      ),
    ).toBeGreaterThan(0);
    expect(
      countAs(GOV_ADMIN, `select count(*) from public.crm_acoes_em_massa where user_id = '${GOV_MANAGER}' and acao <> 'exportar'`),
    ).toBe(0);
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_acoes_em_massa where user_id = '${GOV_MANAGER}'`)).toBe(0);
  });

  it("na decisão, nada além do status e de quem decidiu muda (a trava)", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(() => writeCountAs(GOV_ADMIN, `update public.crm_acoes_em_massa set total = 99 where id = '${id}'`)).toThrow(
      /crm_acoes_em_massa_trava_da_decisao/,
    );
    expect(statusDe(id)).toBe("aguardando_aprovacao");
  });

  it("pelo PostgREST, quem pede não pula a aprovação", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `insert into public.crm_acoes_em_massa (organization_id, user_id, lista, acao) values ('${GOV_ORG}', '${GOV_MANAGER}', 'contatos', 'exportar')`,
      ),
    ).toBe(1);
    expect(
      writeCountAs(
        GOV_MANAGER,
        `update public.crm_acoes_em_massa set status = 'na_fila' where user_id = '${GOV_MANAGER}' and acao = 'exportar' and status = 'preparando'`,
      ),
    ).toBe(0);
  });
});

describe("RLS das ações", () => {
  it("cada um vê só as suas; ninguém mexe em ação já na fila", () => {
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_acoes_em_massa`)).toBe(0);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_acoes_em_massa_itens`)).toBe(0);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_acoes_em_massa where organization_id = '${GOV_ORG}'`)).toBeGreaterThan(0);
    expect(
      writeCountAs(GOV_MANAGER, `update public.crm_acoes_em_massa set status = 'concluida' where organization_id = '${GOV_ORG}'`),
    ).toBe(0);
  });

  it("ninguém põe item na ação de outro", () => {
    const id = ultima();
    expect(
      writeCountAs(
        GOV_VIEWER,
        `insert into public.crm_acoes_em_massa_itens (acao_id, organization_id, contact_id, posicao) values ('${id}', '${GOV_ORG}', '${C1}', 9)`,
      ),
    ).toBe(0);
  });

  it("o bucket da exportação é privado", () => {
    expect(sql(`select public from storage.buckets where id = 'exportacoes-das-listas';`).trim()).toBe("f");
  });
});
