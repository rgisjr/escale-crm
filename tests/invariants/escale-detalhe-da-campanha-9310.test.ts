import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_CONTACT_1,
  GOV_CONTACT_2,
  GOV_CONTACT_3,
  GOV_CONTACT_PROBE,
  GOV_MANAGER,
  GOV_ORG,
  GOV_PIPELINE,
  GOV_SESSION,
  GOV_STAGE,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * DETALHE DA CAMPANHA DA CASCA (fork Escale, migration 9310) — prova contra
 * Postgres real: o sumário pela situação, o ritmo no fuso, os motivos, o
 * resultado (negócios, valores, mediana, benchmark), a gaveta, a página dos
 * Detalhes com busca e filtros, a seleção, e o viewer sem nada. Roda via
 * `pnpm test:db`.
 */
const C1 = "e5ca1e00-9310-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9310-4000-8000-0000000000c2";
const R1 = "e5ca1e00-9310-4000-8000-0000000000d1";
const R2 = "e5ca1e00-9310-4000-8000-0000000000d2";
const R3 = "e5ca1e00-9310-4000-8000-0000000000d3";
const R4 = "e5ca1e00-9310-4000-8000-0000000000d4";
const comoGerente = (q: string) =>
  lastLine(
    sql(
      `set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', false); ${q}`,
    ),
  );
const destinatarios = (filtros: string) =>
  `select count(*) from public.fn_escale_destinatarios_da_campanha('${GOV_ORG}', '${C1}', '${filtros}'::jsonb, 20, 0)`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_leads where source = 'campanha' and source_metadata ->> 'campaign_id' like 'e5ca1e00-9310-%';
    delete from public.campaigns where id::text like 'e5ca1e00-9310-%';
    insert into public.campaigns (id, organization_id, name, status, channel_session_id, base_legal,
                                  snapshot_total, snapshot_eligible, started_at, completed_at, created_at)
    values ('${C1}', '${GOV_ORG}', 'Detalhe 8C', 'running', '${GOV_SESSION}', 'consent', 4, 3,
            '2026-10-10 15:00:00+00', null, '2026-10-09 15:00:00+00'),
           ('${C2}', '${GOV_ORG}', 'Concluída 8C', 'completed', '${GOV_SESSION}', 'consent', 2, 2,
            '2026-10-01 15:00:00+00', '2026-10-02 15:00:00+00', '2026-10-01 12:00:00+00');
    insert into public.campaign_recipients (id, organization_id, campaign_id, contact_id, recipient_address, status,
                                            eligibility_status, exclusion_reason, last_error_code,
                                            sent_at, delivered_at, read_at, replied_at)
    values ('${R1}', '${GOV_ORG}', '${C1}', '${GOV_CONTACT_1}', '+5511999990001', 'replied', 'eligible', null, null,
            '2026-10-10 15:00:00+00', '2026-10-10 15:01:00+00', '2026-10-10 15:02:00+00', '2026-10-10 15:30:00+00'),
           ('${R2}', '${GOV_ORG}', '${C1}', '${GOV_CONTACT_2}', '+5511999990002', 'read', 'eligible', null, null,
            '2026-10-10 15:10:00+00', '2026-10-10 15:11:00+00', '2026-10-10 15:12:00+00', null),
           ('${R3}', '${GOV_ORG}', '${C1}', '${GOV_CONTACT_3}', '+5511999990003', 'failed', 'eligible', null, '131049',
            null, null, null, null),
           ('${R4}', '${GOV_ORG}', '${C1}', '${GOV_CONTACT_PROBE}', '+5511999990004', 'skipped', 'excluded', 'opt_out', null,
            null, null, null, null);
    insert into public.campaign_recipients (organization_id, campaign_id, contact_id, status, eligibility_status,
                                            sent_at, replied_at)
    values ('${GOV_ORG}', '${C2}', '${GOV_CONTACT_1}', 'replied', 'eligible', '2026-10-01 15:00:00+00', '2026-10-01 16:00:00+00'),
           ('${GOV_ORG}', '${C2}', '${GOV_CONTACT_2}', 'sent', 'eligible', '2026-10-01 15:00:00+00', null);
    insert into public.crm_leads (organization_id, pipeline_id, stage_id, contact_id, title, status, closed_at,
                                  value_cents, source, source_metadata)
    values ('${GOV_ORG}', '${GOV_PIPELINE}', '${GOV_STAGE}', '${GOV_CONTACT_1}', 'Negócio 8C aberto', 'open', null,
            150000, 'campanha', '{"campaign_id":"${C1}"}'),
           ('${GOV_ORG}', '${GOV_PIPELINE}', '${GOV_STAGE}', '${GOV_CONTACT_2}', 'Negócio 8C ganho', 'won', now(),
            50000, 'campanha', '{"campaign_id":"${C1}"}');
  `);
});

describe("travas", () => {
  it("anon não executa; viewer recebe vazio", () => {
    expect(
      lastLine(
        sql(
          `select has_function_privilege('anon', 'public.fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer)', 'execute')`,
        ),
      ),
    ).toBe("f");
    expect(countAs(GOV_VIEWER, destinatarios("{}"))).toBe(0);
  });
});

describe("sumário, ritmo e motivos", () => {
  it("as contagens pela situação", () => {
    expect(
      comoGerente(
        `select concat_ws('|', adicionados, enviados, entregues, lidas, respondidas, leu_sem_resposta, erros, nao_enviados, aguardando, fora_da_lista) from public.fn_escale_sumario_da_campanha('${GOV_ORG}', '${C1}')`,
      ),
    ).toBe("3|2|2|2|1|1|1|0|0|1");
  });

  it("o ritmo por hora no fuso da organização", () => {
    expect(
      comoGerente(
        `select string_agg(to_char(hora, 'YYYY-MM-DD HH24:MI') || '=' || envios, ',') from public.fn_escale_ritmo_da_campanha('${GOV_ORG}', '${C1}', 'America/Sao_Paulo')`,
      ),
    ).toBe("2026-10-10 12:00=2");
  });

  it("os motivos do erro", () => {
    expect(
      comoGerente(
        `select string_agg(codigo || '=' || quantidade, ',') from public.fn_escale_motivos_do_erro('${GOV_ORG}', '${C1}')`,
      ),
    ).toBe("131049=1");
  });
});

describe("resultado e gaveta", () => {
  it("negócios, valores, mediana, benchmark e a taxa desta", () => {
    expect(
      comoGerente(
        `select concat_ws('|', negocios, valor_aberto_centavos, valor_ganho_centavos, round(mediana_segundos), round(benchmark, 2), round(taxa_da_campanha, 2)) from public.fn_escale_resultado_da_campanha('${GOV_ORG}', '${C1}')`,
      ),
    ).toBe("2|150000|50000|1800|0.50|0.50");
  });

  it("a gaveta filtra abertos e ganhos", () => {
    const n = (situacao: string) =>
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_negocios_da_campanha('${GOV_ORG}', '${C1}', '${situacao}', 200)`,
      );
    expect(n("todos")).toBe(2);
    expect(n("abertos")).toBe(1);
    expect(n("ganhos")).toBe(1);
  });
});

describe("Detalhes e seleção", () => {
  it("a página traz todos, com a situação e o motivo", () => {
    expect(countAs(GOV_MANAGER, destinatarios("{}"))).toBe(4);
    expect(
      comoGerente(
        `select string_agg(situacao || ':' || coalesce(motivo, '-'), ',' order by destinatario_id) from public.fn_escale_destinatarios_da_campanha('${GOV_ORG}', '${C1}', '{}'::jsonb, 20, 0)`,
      ),
    ).toBe("respondido:-,lida:-,erro:131049,fora_da_lista:opt_out");
  });

  it("filtros: situações, motivo e os dígitos do telefone", () => {
    expect(countAs(GOV_MANAGER, destinatarios(`{"situacoes":["lida","respondido"]}`))).toBe(2);
    expect(countAs(GOV_MANAGER, destinatarios(`{"motivos":["131049"]}`))).toBe(1);
    expect(countAs(GOV_MANAGER, destinatarios(`{"digitos":"9990002"}`))).toBe(1);
  });

  it("a seleção: os marcados, ou o filtro menos os desmarcados", () => {
    const sel = (filtros: string, ids: string, excluidos: string) =>
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_selecao_da_campanha('${GOV_ORG}', '${C1}', '${filtros}'::jsonb, ${ids}, ${excluidos})`,
      );
    expect(sel("{}", `array['${R1}']::uuid[]`, "null")).toBe(1);
    expect(sel(`{"situacoes":["lida","respondido"]}`, "null", `array['${R1}']::uuid[]`)).toBe(1);
  });
});
