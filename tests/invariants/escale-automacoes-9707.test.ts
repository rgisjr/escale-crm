import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, GOV_PIPELINE, GOV_STAGE, countAs, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * INSIGHTS DE AUTOMAÇÃO (fork Escale, migration 9707) — prova contra Postgres real: as contagens do
 * resumo (por status e por passo, sem a espera pela janela), a listagem com o contato e o negócio do
 * evento de origem, os filtros, a busca sem acento, a paginação com teto e a RLS de quem olha.
 * Roda via `pnpm test:db`.
 */
const ID = (sufixo: string) => `e5ca1e00-9707-4000-8000-${sufixo.padStart(12, "0")}`;
const OUTRA_ORG = ID("f1");
const REGRA = ID("a1");
const REGRA_TIPOS = ID("a2");
const REGRA_OUTRA = ID("a3");
const C1 = ID("c1");
const C2 = ID("c2");
const NEGOCIO = ID("d1");
const COMPROMISSO = ID("e1");
const EV_LEAD = ID("b1");
const EV_CONTATO = ID("b2");
const EV_MENSAGEM = ID("b3");
const EV_COMPROMISSO = ID("b4");
const ACOES = `[{"type":"send_whatsapp_message","config":{}},{"type":"call_webhook","config":{}}]`;

const como = (userId: string, consulta: string): string =>
  sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${userId}"}', false); ${consulta}`);

const resumo = (userId: string, regra: string, desde: string): Record<string, unknown> =>
  JSON.parse(lastLine(como(userId, `select public.fn_escale_resumo_da_automacao('${regra}', ${desde});`)));

interface Listagem {
  total: number;
  linhas: Array<Record<string, unknown>>;
}

function execucoes(
  userId: string,
  opcoes: {
    regra?: string;
    desde?: string;
    situacoes?: string;
    passos?: string;
    tipos?: string;
    resultados?: string;
    busca?: string;
    limite?: number;
    deslocamento?: number;
  } = {},
): Listagem {
  const q = (v: string | undefined) => (v === undefined ? "null" : `'${v}'`);
  const consulta = `select public.fn_escale_execucoes_da_automacao(
    '${opcoes.regra ?? REGRA}', ${opcoes.desde ?? "now() - interval '30 days'"},
    ${q(opcoes.situacoes)}::text[], ${q(opcoes.passos)}::int[], ${q(opcoes.tipos)}::text[],
    ${q(opcoes.resultados)}::text[], ${q(opcoes.busca)}, ${opcoes.limite ?? 10}, ${opcoes.deslocamento ?? 0});`;
  return JSON.parse(lastLine(como(userId, consulta))) as Listagem;
}

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', 'org-9707', 'Org 9707', 'Org 9707') on conflict (id) do nothing;
    delete from public.automation_rules where id::text like 'e5ca1e00-9707-%';
    delete from public.event_log where id::text like 'e5ca1e00-9707-%';
    delete from public.calendar_appointments where id::text like 'e5ca1e00-9707-%';
    delete from public.crm_leads where id::text like 'e5ca1e00-9707-%';
    delete from public.contacts where id::text like 'e5ca1e00-9707-%';
    insert into public.contacts (id, organization_id, name, display_name, phone_number, email) values
      ('${C1}', '${GOV_ORG}', 'Joao Acentuação Teste', 'Joao', '+5553984555965', 'joao@exemplo.com'),
      ('${C2}', '${GOV_ORG}', 'Maria Segunda', 'Maria', null, null);
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, owner_user_id)
      values ('${NEGOCIO}', '${GOV_ORG}', '${GOV_PIPELINE}', '${GOV_STAGE}', 'Negócio 9707', '${C1}', '${GOV_MANAGER}');
    insert into public.calendar_appointments (id, organization_id, contact_id, title, starts_at, ends_at)
      values ('${COMPROMISSO}', '${GOV_ORG}', '${C1}', 'Reunião 9707', now(), now() + interval '30 minutes');
    insert into public.automation_rules (id, organization_id, name, trigger_event, trigger_config, conditions, actions, is_active) values
      ('${REGRA}', '${GOV_ORG}', 'Regra 9707', 'lead.created', '{}', '[]', '${ACOES}', true),
      ('${REGRA_TIPOS}', '${GOV_ORG}', 'Regra 9707 tipos', 'lead.created', '{}', '[]', '${ACOES}', true),
      ('${REGRA_OUTRA}', '${OUTRA_ORG}', 'Regra 9707 outra', 'lead.created', '{}', '[]', '${ACOES}', true);
    insert into public.event_log (id, organization_id, event_type, entity_kind, entity_id, payload, status) values
      ('${EV_LEAD}', '${GOV_ORG}', 'lead.created', 'crm_lead', '${NEGOCIO}', '{}', 'done'),
      ('${EV_CONTATO}', '${GOV_ORG}', 'contact.tag_added', 'contact', '${C2}', '{}', 'done'),
      ('${EV_MENSAGEM}', '${GOV_ORG}', 'message.received', 'message', null, '{"contact_id":"${C1}"}', 'done'),
      ('${EV_COMPROMISSO}', '${GOV_ORG}', 'appointment.created', 'calendar_appointment', '${COMPROMISSO}', '{}', 'done');
    insert into public.automation_rule_runs (id, organization_id, rule_id, event_id, status, actions_result, created_at) values
      ('${ID("11")}', '${GOV_ORG}', '${REGRA}', '${EV_LEAD}', 'success',
        '[{"type":"send_whatsapp_message","status":"success"},{"type":"call_webhook","status":"success"}]', now() - interval '2 days'),
      ('${ID("12")}', '${GOV_ORG}', '${REGRA}', '${EV_CONTATO}', 'failed',
        '[{"type":"send_whatsapp_message","status":"failed"},{"type":"call_webhook","status":"skipped"}]', now() - interval '2 days 1 hour'),
      ('${ID("13")}', '${GOV_ORG}', '${REGRA}', '${EV_MENSAGEM}', 'adiado',
        '[{"type":"send_whatsapp_message","status":"postponed","detail":{"reason":"fora_da_janela_de_envio"}}]', now() - interval '1 day'),
      ('${ID("14")}', '${GOV_ORG}', '${REGRA}', '${EV_COMPROMISSO}', 'adiado',
        '[{"type":"send_whatsapp_message","status":"postponed"},{"type":"call_webhook","status":"success"}]', now() - interval '1 day 1 hour'),
      ('${ID("15")}', '${GOV_ORG}', '${REGRA}', '${EV_LEAD}', 'partial',
        '[{"type":"send_whatsapp_message","status":"success"},{"type":"call_webhook","status":"failed"}]', now() - interval '40 days'),
      ('${ID("16")}', '${GOV_ORG}', '${REGRA}', null, 'success',
        '[{"type":"send_whatsapp_message","status":"success"},{"type":"call_webhook","status":"success"}]', now() - interval '45 days'),
      ('${ID("17")}', '${GOV_ORG}', '${REGRA_TIPOS}', null, 'success', '[{"type":"send_whatsapp_message","status":"success"}]', now()),
      ('${ID("18")}', '${GOV_ORG}', '${REGRA_TIPOS}', null, 'success', '[{"type":"send_email","status":"success"}]', now()),
      ('${ID("19")}', '${OUTRA_ORG}', '${REGRA_OUTRA}', null, 'success', '[]', now());
  `);
});

describe("funções", () => {
  it("anon não executa nenhuma; authenticated executa", () => {
    for (const f of [
      "fn_escale_execucao_e_espera(text,jsonb)",
      "fn_escale_uuid_ou_nulo(text)",
      "fn_escale_sem_acento(text)",
      "fn_escale_resumo_da_automacao(uuid,timestamptz)",
      "fn_escale_execucoes_da_automacao(uuid,timestamptz,text[],int[],text[],text[],text,int,int)",
    ]) {
      expect(sql(`select has_function_privilege('anon', 'public.${f}', 'execute');`), f).toBe("f");
      expect(sql(`select has_function_privilege('authenticated', 'public.${f}', 'execute');`), f).toBe("t");
    }
  });

  it("ajudantes", () => {
    expect(sql(`select coalesce(public.fn_escale_uuid_ou_nulo('x')::text, 'nulo');`)).toBe("nulo");
    expect(sql(`select public.fn_escale_uuid_ou_nulo('${C1}')::text;`)).toBe(C1);
    expect(sql(`select public.fn_escale_sem_acento('ÁÇÃO');`)).toBe("acao");
    expect(sql(`select public.fn_escale_execucao_e_espera(status, actions_result) from public.automation_rule_runs where id = '${ID("13")}';`)).toBe("t");
    expect(sql(`select public.fn_escale_execucao_e_espera(status, actions_result) from public.automation_rule_runs where id = '${ID("14")}';`)).toBe("f");
  });
});

describe("resumo", () => {
  it("30 dias: status e passos, sem a espera", () => {
    const r = resumo(GOV_MANAGER, REGRA, "now() - interval '30 days'");
    expect(r).toMatchObject({ total: 4, sucesso: 1, falhou: 1, parcial: 0, adiado: 2 });
    expect(new Date(r.ultima as string).getTime()).toBeGreaterThan(Date.now() - 2 * 86_400_000);
    expect(r.passos).toEqual([
      { indice: 0, tipo: "send_whatsapp_message", sucesso: 1, erro: 1, esperando: 1 },
      { indice: 1, tipo: "call_webhook", sucesso: 2, erro: 1, esperando: 0 },
    ]);
  });

  it("todo o período", () => {
    const r = resumo(GOV_MANAGER, REGRA, "null");
    expect(r).toMatchObject({ total: 6, sucesso: 2, parcial: 1 });
  });

  it("tipos diferentes no mesmo índice saem em linhas separadas", () => {
    const r = resumo(GOV_MANAGER, REGRA_TIPOS, "null");
    expect(r.passos).toEqual([
      { indice: 0, tipo: "send_email", sucesso: 1, erro: 0, esperando: 0 },
      { indice: 0, tipo: "send_whatsapp_message", sucesso: 1, erro: 0, esperando: 0 },
    ]);
  });

  it("regra de outra organização dá zero", () => {
    expect(resumo(GOV_MANAGER, REGRA_OUTRA, "null")).toMatchObject({ total: 0, ultima: null, passos: [] });
  });
});

describe("listagem", () => {
  it("30 dias, sem filtro, em ordem decrescente e com contato e negócio do evento", () => {
    const l = execucoes(GOV_MANAGER);
    expect(l.total).toBe(4);
    expect(l.linhas.map((x) => x.id)).toEqual([ID("13"), ID("14"), ID("11"), ID("12")]);
    const porId = Object.fromEntries(l.linhas.map((x) => [x.id, x]));
    expect(porId[ID("11")]).toMatchObject({ negocio_id: NEGOCIO, negocio_titulo: "Negócio 9707", contato_id: C1, contato_telefone: "+5553984555965" });
    expect(porId[ID("12")]).toMatchObject({ contato_id: C2, negocio_id: null });
    expect(porId[ID("13")]).toMatchObject({ contato_id: C1, negocio_id: null });
    expect(porId[ID("14")]).toMatchObject({ contato_id: C1 });
  });

  it("todo o período inclui a execução sem evento", () => {
    const l = execucoes(GOV_MANAGER, { desde: "null", limite: 50 });
    expect(l.total).toBe(6);
    expect(l.linhas.find((x) => x.id === ID("16"))).toMatchObject({ contato_id: null, negocio_id: null });
  });

  it("filtros por status e por passo", () => {
    expect(execucoes(GOV_MANAGER, { situacoes: "{failed}" }).total).toBe(1);
    expect(execucoes(GOV_MANAGER, { passos: "{1}", tipos: "{call_webhook}", resultados: "{erro}" }).total).toBe(1);
    expect(execucoes(GOV_MANAGER, { passos: "{0}", tipos: "{call_webhook}" }).total).toBe(0);
    expect(execucoes(GOV_MANAGER, { passos: "{0}", tipos: "{send_whatsapp_message}" }).total).toBe(3);
    // Vários passos (o passo "Ações"): entra se algum deles bate.
    expect(execucoes(GOV_MANAGER, { passos: "{0,1}", tipos: "{send_whatsapp_message,call_webhook}", resultados: "{erro}" }).total).toBe(1);
    expect(execucoes(GOV_MANAGER, { passos: "{0,1}", tipos: "{send_whatsapp_message,call_webhook}", resultados: "{esperando}" }).total).toBe(1);
  });

  it("busca sem acento e sem caixa, sem curinga", () => {
    expect(execucoes(GOV_MANAGER, { busca: "ACENTUACAO" }).total).toBe(3);
    expect(execucoes(GOV_MANAGER, { busca: "%" }).total).toBe(0);
  });

  it("paginação e teto", () => {
    const l = execucoes(GOV_MANAGER, { limite: 2, deslocamento: 2 });
    expect(l.total).toBe(4);
    expect(l.linhas).toHaveLength(2);
    expect(sql(`select pg_get_functiondef('public.fn_escale_execucoes_da_automacao(uuid,timestamptz,text[],int[],text[],text[],text,int,int)'::regprocedure) like '%5001%';`)).toBe("t");
  });

  it("regra de outra organização não aparece", () => {
    expect(execucoes(GOV_MANAGER, { regra: REGRA_OUTRA, desde: "null" }).total).toBe(0);
  });

  it("agente: a função roda, e o negócio que ele não vê sai nulo", () => {
    const l = execucoes(GOV_AGENT_A);
    expect(l.total).toBe(4);
    const r1 = l.linhas.find((x) => x.id === ID("11"));
    const agenteVe = countAs(GOV_AGENT_A, `select count(*) from public.crm_leads where id = '${NEGOCIO}';`) === 1;
    expect(r1?.negocio_id ?? null).toBe(agenteVe ? NEGOCIO : null);
  });
});
