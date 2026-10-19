import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, countAs, seedGov, sql } from "./gov-helpers";

/**
 * FILA E AÇÕES EM MASSA (fork Escale, migration 9204) — prova contra Postgres
 * real: o filtro do painel na função (status pelo mapa, toggles, canais, busca,
 * negócio do contato), a página com cursor, o total, a criação da ação com a
 * RLS de quem pede (ids, filtro, vazia, sem permissão) e o evento só acima do
 * limite imediato. Roda via `pnpm test:db`.
 */
const SESSAO = "e5ca1e00-9204-4000-8000-0000000000a1";
const SESSAO_OFF = "e5ca1e00-9204-4000-8000-0000000000a2";
const CT1 = "e5ca1e00-9204-4000-8000-0000000000c1";
const CT2 = "e5ca1e00-9204-4000-8000-0000000000c2";
const CT3 = "e5ca1e00-9204-4000-8000-0000000000c3";
const CV_ABERTA = "e5ca1e00-9204-4000-8000-0000000000d1";
const CV_ESPERA = "e5ca1e00-9204-4000-8000-0000000000d2";
const CV_FECHADA = "e5ca1e00-9204-4000-8000-0000000000d3";
const CV_OFF = "e5ca1e00-9204-4000-8000-0000000000d4";
const ORIGEM = "e5ca1e00-9204-4000-8000-0000000000e1";
const ETAPA = "e5ca1e00-9204-4000-8000-0000000000e2";
const LEAD = "e5ca1e00-9204-4000-8000-0000000000e3";

const fila = (filtro: string, extra = "") =>
  `select count(*) from public.fn_escale_fila_da_casca('${GOV_ORG}', '${filtro}'::jsonb${extra}) x where x.id::text like 'e5ca1e00-9204-%'`;
const ids = (filtro: string) =>
  sql(
    `select string_agg(x.id::text, ',' order by x.last_message_at desc nulls last) from public.fn_escale_fila_da_casca('${GOV_ORG}', '${filtro}'::jsonb) x where x.id::text like 'e5ca1e00-9204-%';`,
  ).trim();
const criar = (filtroOuIds: string, imediato = 50) =>
  `select quantidade from public.fn_escale_criar_acao_em_massa_de_conversas('${GOV_ORG}', 'status', '{"status":"fechado"}'::jsonb, ${filtroOuIds}, null, null, ${imediato})`;
const ultima = () =>
  sql(
    `select id from public.crm_acoes_em_massa_conversas where organization_id = '${GOV_ORG}' order by created_at desc, id desc limit 1;`,
  ).trim();
const eventosDe = (id: string) =>
  Number(
    sql(
      `select count(*) from public.event_log where event_type = 'conversas.acao_em_massa_requested' and entity_id = '${id}';`,
    ).trim(),
  );

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_acoes_em_massa_conversas where organization_id = '${GOV_ORG}';
    delete from public.crm_leads where id = '${LEAD}';
    delete from public.conversations where id::text like 'e5ca1e00-9204-%';
    delete from public.contacts where id::text like 'e5ca1e00-9204-%';
    insert into public.channel_sessions (id, organization_id, waha_session_name, webhook_secret_encrypted, metadata)
      values ('${SESSAO}', '${GOV_ORG}', 'fila-9204', '\\x00'::bytea, '{}'::jsonb),
             ('${SESSAO_OFF}', '${GOV_ORG}', 'fila-9204-off', '\\x00'::bytea, '{"disabled": true}'::jsonb)
      on conflict (id) do update set metadata = excluded.metadata;
    insert into public.contacts (id, organization_id, display_name, phone_number, tags) values
      ('${CT1}', '${GOV_ORG}', 'Filanove Um', '+5562999991111', array['vip']),
      ('${CT2}', '${GOV_ORG}', 'Filanove Dois', '+5562999992222', '{}'),
      ('${CT3}', '${GOV_ORG}', 'Filanove Tres', '+5562999993333', '{}');
    insert into public.conversations (id, organization_id, contact_id, channel_session_id, status, last_message_at, unread_count_for_assignee, snooze_until) values
      ('${CV_ABERTA}', '${GOV_ORG}', '${CT1}', '${SESSAO}', 'open', now(), 2, null),
      ('${CV_ESPERA}', '${GOV_ORG}', '${CT2}', '${SESSAO}', 'open', now() - interval '1 hour', 0, '9999-12-31T00:00:00Z'),
      ('${CV_FECHADA}', '${GOV_ORG}', '${CT3}', '${SESSAO}', 'closed', now() - interval '2 hours', 0, null),
      ('${CV_OFF}', '${GOV_ORG}', '${CT3}', '${SESSAO_OFF}', 'open', now() - interval '3 hours', 0, null);
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${ORIGEM}', '${GOV_ORG}', 'Fila 9204', 'fila-9204') on conflict (id) do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position)
      values ('${ETAPA}', '${GOV_ORG}', '${ORIGEM}', 'Entrada', 'entrada', 1000) on conflict (id) do nothing;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, contact_id, title)
      values ('${LEAD}', '${GOV_ORG}', '${ORIGEM}', '${ETAPA}', '${CT1}', 'Negócio do Um');
  `);
});

describe("fn_escale_fila_da_casca", () => {
  it("o canal desativado nunca aparece; sem filtro vêm as três", () => {
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC"}'))).toBe(3);
  });

  it("o mapa de status: em aberto sem espera, em espera, fechado", () => {
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","status":["em_aberto"]}'))).toBe(1);
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","status":["em_espera"]}'))).toBe(1);
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","status":["em_espera","fechado"]}'))).toBe(2);
  });

  it("toggles, busca, tags e negócio", () => {
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","marcas":["nao_lidas"]}'))).toBe(1);
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","marcas":["lidas","nao_lidas"]}'))).toBe(3);
    expect(
      countAs(
        GOV_MANAGER,
        fila('{"fuso":"UTC","busca":{"padrao":"%filanove dois%","digitos":null}}'),
      ),
    ).toBe(1);
    expect(
      countAs(GOV_MANAGER, fila('{"fuso":"UTC","busca":{"padrao":"%zzz%","digitos":"99993333"}}')),
    ).toBe(1);
    expect(
      countAs(
        GOV_MANAGER,
        fila(
          '{"fuso":"UTC","tags":{"combinar":"ou","grupos":[{"modo":"e","condicoes":[{"op":"possui","tag":"vip"}]}]}}',
        ),
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_MANAGER,
        fila(
          `{"fuso":"UTC","negocio":{"fuso":"UTC","tem":"com","status":["open"],"motivos":[],"donos_usuarios":[],"donos_agentes":[],"sem_dono":false,"grupos":[],"origens":["${ORIGEM}"],"etapas":[]}}`,
        ),
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_MANAGER,
        fila(
          `{"fuso":"UTC","negocio":{"fuso":"UTC","tem":"sem","status":[],"motivos":[],"donos_usuarios":[],"donos_agentes":[],"sem_dono":false,"grupos":[],"origens":[],"etapas":[]}}`,
        ),
      ),
    ).toBe(2);
  });

  it("a ordem e o cursor", () => {
    expect(ids('{"fuso":"UTC"}')).toBe([CV_ABERTA, CV_ESPERA, CV_FECHADA].join(","));
    const depois = sql(
      `select last_message_at from public.conversations where id = '${CV_ABERTA}';`,
    ).trim();
    expect(
      countAs(
        GOV_MANAGER,
        fila(
          '{"fuso":"UTC"}',
          `, 'interacao', '${depois}'::timestamptz, '${CV_ABERTA}'::uuid, false, 51`,
        ),
      ),
    ).toBe(2);
  });

  it("o total conta o mesmo que a lista", () => {
    const filtro = '{"fuso":"UTC","busca":{"padrao":"%filanove%","digitos":null}}';
    expect(
      countAs(
        GOV_MANAGER,
        `select public.fn_escale_contar_fila_da_casca('${GOV_ORG}', '${filtro}'::jsonb)`,
      ),
    ).toBe(3);
    expect(countAs(GOV_MANAGER, fila(filtro))).toBe(3);
  });
});

describe("fn_escale_criar_acao_em_massa_de_conversas", () => {
  it("pelos ids: os itens, na fila, e sem evento abaixo do limite", () => {
    expect(countAs(GOV_MANAGER, criar(`array['${CV_ABERTA}', '${CV_ESPERA}']::uuid[], null`))).toBe(
      2,
    );
    const id = ultima();
    expect(
      sql(`select status from public.crm_acoes_em_massa_conversas where id = '${id}';`).trim(),
    ).toBe("na_fila");
    expect(
      Number(
        sql(
          `select count(*) from public.crm_acoes_em_massa_conversas_itens where acao_id = '${id}';`,
        ).trim(),
      ),
    ).toBe(2);
    expect(eventosDe(id)).toBe(0);
  });

  it("acima do limite imediato, emite o evento", () => {
    expect(
      countAs(GOV_MANAGER, criar(`array['${CV_ABERTA}', '${CV_ESPERA}']::uuid[], null`, 1)),
    ).toBe(2);
    expect(eventosDe(ultima())).toBe(1);
  });

  it("pelo filtro, menos os desmarcados", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select quantidade from public.fn_escale_criar_acao_em_massa_de_conversas('${GOV_ORG}', 'status', '{"status":"fechado"}'::jsonb, null, '{"fuso":"UTC"}'::jsonb, null, array['${CV_FECHADA}']::uuid[], 50)`,
      ),
    ).toBeGreaterThanOrEqual(2);
  });

  it("vazia é recusada; atendente sem a permissão não cria", () => {
    expect(() =>
      countAs(GOV_MANAGER, criar(`array['e5ca1e00-9204-4000-8000-0000000000ff']::uuid[], null`)),
    ).toThrow(/acao_em_massa_vazia/);
    expect(() => countAs(GOV_AGENT_A, criar(`array['${CV_ABERTA}']::uuid[], null`))).toThrow(
      /acao_em_massa_sem_permissao/,
    );
  });

  it("cada um só vê as suas", () => {
    expect(
      countAs(
        GOV_AGENT_A,
        `select count(*) from public.crm_acoes_em_massa_conversas where organization_id = '${GOV_ORG}'`,
      ),
    ).toBe(0);
  });

  it("nenhuma função nova é definer", () => {
    expect(
      sql(
        `select count(*) from pg_proc where proname in ('fn_escale_negocio_da_fila_passa','fn_escale_conversa_passa','fn_escale_fila_da_casca','fn_escale_contar_fila_da_casca','fn_escale_criar_acao_em_massa_de_conversas') and prosecdef;`,
      ).trim(),
    ).toBe("0");
  });
});
