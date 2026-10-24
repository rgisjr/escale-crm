import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_CONTACT_1,
  GOV_CONTACT_2,
  GOV_CONTACT_3,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * LISTA DE CAMPANHAS DA CASCA (fork Escale, migration 9301) — prova contra
 * Postgres real: campaigns na publicação, a lista com as contagens disjuntas, a
 * ordem e o total, os filtros (nome, status, data do disparo e de criação), o
 * resumo sem rascunho, e viewer/agente sem nada. Roda via `pnpm test:db`.
 */
const C1 = "e5ca1e00-9301-4000-8000-0000000000a1";
const C2 = "e5ca1e00-9301-4000-8000-0000000000a2";
const FUSO = `"fuso":"America/Sao_Paulo"`;
const comoGerente = (q: string) =>
  lastLine(
    sql(
      `set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', false); ${q}`,
    ),
  );
const lista = (filtros: string) =>
  `select count(*) from public.fn_escale_lista_de_campanhas('${GOV_ORG}', '{${FUSO},${filtros}}'::jsonb, 10, 0)`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.campaigns where id::text like 'e5ca1e00-9301-%';
    insert into public.campaigns (id, organization_id, name, status, channel_session_id, base_legal,
                                  snapshot_total, snapshot_eligible, started_at, created_at)
    values ('${C1}', '${GOV_ORG}', 'Reativação 8A', 'completed', '${GOV_SESSION}', 'consent', 3, 3,
            '2026-10-10 15:00:00+00', '2026-10-09 15:00:00+00'),
           ('${C2}', '${GOV_ORG}', 'Rascunho 8A', 'draft', '${GOV_SESSION}', 'consent', 0, 0,
            null, '2026-10-01 15:00:00+00');
    insert into public.campaign_recipients (organization_id, campaign_id, contact_id, status, eligibility_status,
                                            sent_at, delivered_at, read_at)
    values ('${GOV_ORG}', '${C1}', '${GOV_CONTACT_1}', 'read', 'eligible', now(), now(), now()),
           ('${GOV_ORG}', '${C1}', '${GOV_CONTACT_2}', 'delivered', 'eligible', now(), now(), null),
           ('${GOV_ORG}', '${C1}', '${GOV_CONTACT_3}', 'failed', 'eligible', null, null, null);
  `);
});

describe("tempo real e travas", () => {
  it("campaigns está na publicação; campaign_recipients não", () => {
    expect(
      lastLine(
        sql(
          `select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'campaigns'`,
        ),
      ),
    ).toBe("1");
    expect(
      lastLine(
        sql(
          `select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'campaign_recipients'`,
        ),
      ),
    ).toBe("0");
  });

  it("anon não executa a lista", () => {
    expect(
      lastLine(
        sql(
          `select has_function_privilege('anon', 'public.fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer)', 'execute')`,
        ),
      ),
    ).toBe("f");
  });

  it("viewer e agente recebem vazio", () => {
    expect(countAs(GOV_VIEWER, lista(`"padrao":"%8A"`))).toBe(0);
    expect(countAs(GOV_AGENT_A, lista(`"padrao":"%8A"`))).toBe(0);
  });
});

describe("a lista do gerente", () => {
  it("as contagens disjuntas: 3 adicionados, 2 enviados, 2 entregues, 1 lido, 1 erro", () => {
    expect(
      comoGerente(
        `select nome || '|' || solicitados || '|' || adicionados || '|' || enviados || '|' || entregues || '|' || lidos || '|' || erros from public.fn_escale_lista_de_campanhas('${GOV_ORG}', '{${FUSO},"padrao":"Reativação 8A"}'::jsonb, 10, 0)`,
      ),
    ).toBe("Reativação 8A|3|3|2|2|1|1");
  });

  it("mais recente primeiro, com o total em toda linha", () => {
    expect(
      comoGerente(
        `select string_agg(nome || ':' || total, ',' order by criada_em desc) from public.fn_escale_lista_de_campanhas('${GOV_ORG}', '{${FUSO},"padrao":"%8A"}'::jsonb, 10, 0)`,
      ),
    ).toBe("Reativação 8A:2,Rascunho 8A:2");
  });

  it("filtros: status, data do disparo e data de criação", () => {
    expect(countAs(GOV_MANAGER, lista(`"padrao":"%8A","status":["draft"]`))).toBe(1);
    expect(countAs(GOV_MANAGER, lista(`"padrao":"%8A","disparo_de":"2026-10-10"`))).toBe(1);
    expect(countAs(GOV_MANAGER, lista(`"padrao":"%8A","disparo_ate":"2026-10-09"`))).toBe(0);
    expect(countAs(GOV_MANAGER, lista(`"padrao":"%8A","criada_ate":"2026-10-05"`))).toBe(1);
  });
});

describe("o resumo", () => {
  it("soma sem o rascunho", () => {
    expect(
      comoGerente(
        `select adicionados || '|' || enviados || '|' || entregues || '|' || lidos || '|' || erros from public.fn_escale_resumo_das_campanhas('${GOV_ORG}', '{${FUSO},"padrao":"%8A"}'::jsonb)`,
      ),
    ).toBe("3|2|2|1|1");
  });
});
