import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_AGENT_A, GOV_MANAGER, GOV_ORG, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * IMPORTAÇÕES (fork Escale, migration 9107) — prova contra Postgres real: gerente+
 * lê as importações da organização e o atendente não; ninguém escreve pela sessão;
 * enfileirar conta e emite o evento; contar fecha; reabrir devolve à fila; cancelar
 * pula a fila; a empresa da linha é achada, criada e vinculada. Roda via `pnpm test:db`.
 */
const IMP = "e5ca1e00-9107-4000-8000-000000000001";
const IMP_2 = "e5ca1e00-9107-4000-8000-000000000002";
const C1 = "e5ca1e00-9107-4000-8000-0000000000c1";

const tentar = (fn: () => number) => {
  try {
    return fn();
  } catch {
    return -1;
  }
};
const statusDe = (id: string) => sql(`select status from public.crm_importacoes where id = '${id}';`).trim();
const linha = (imp: string, numero: number, status = "na_fila", motivo: string | null = null) =>
  `insert into public.crm_importacoes_linhas (importacao_id, organization_id, numero, bruto, status, motivo)
   values ('${imp}', '${GOV_ORG}', ${numero}, '["x"]'::jsonb, '${status}', ${motivo ? `'${motivo}'` : "null"});`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_importacoes where organization_id = '${GOV_ORG}';
    delete from public.contacts where id = '${C1}';
    insert into public.contacts (id, organization_id, display_name) values ('${C1}', '${GOV_ORG}', 'Importado Um');
    insert into public.crm_importacoes (id, organization_id, user_id, tipo, arquivo)
      values ('${IMP}', '${GOV_ORG}', '${GOV_MANAGER}', 'contato', 'a.csv'),
             ('${IMP_2}', '${GOV_ORG}', '${GOV_ADMIN}', 'negocio', 'b.csv');
    ${linha(IMP, 2)}
    ${linha(IMP, 3)}
  `);
});

describe("crm_importacoes (9107)", () => {
  it("gerente e admin leem; atendente não", () => {
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_importacoes where organization_id = '${GOV_ORG}'`)).toBe(2);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_importacoes where organization_id = '${GOV_ORG}'`)).toBe(0);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_importacoes_linhas where importacao_id = '${IMP}'`)).toBe(0);
  });

  it("ninguém escreve pela sessão", () => {
    expect(
      tentar(() =>
        writeCountAs(
          GOV_ADMIN,
          `insert into public.crm_importacoes (organization_id, user_id, tipo, arquivo) values ('${GOV_ORG}', '${GOV_ADMIN}', 'contato', 'x.csv')`,
        ),
      ),
    ).toBeLessThanOrEqual(0);
    expect(tentar(() => writeCountAs(GOV_ADMIN, `update public.crm_importacoes set status = 'concluida' where id = '${IMP}'`))).toBeLessThanOrEqual(0);
    expect(tentar(() => countAs(GOV_ADMIN, `select count(*) from (select public.fn_escale_enfileirar_importacao('${IMP}')) x`))).toBe(-1);
  });

  it("enfileirar conta as linhas e emite o evento", () => {
    expect(sql(`select public.fn_escale_enfileirar_importacao('${IMP}');`).trim()).toBe("2");
    expect(statusDe(IMP)).toBe("na_fila");
    expect(
      Number(sql(`select count(*) from public.event_log where event_type = 'contatos.importacao_requested' and entity_id = '${IMP}';`).trim()),
    ).toBe(1);
  });

  it("contar fecha: revisão sobrando aguarda; zerada conclui", () => {
    sql(`
      update public.crm_importacoes set status = 'importando' where id = '${IMP}';
      update public.crm_importacoes_linhas set status = 'importada' where importacao_id = '${IMP}' and numero = 2;
      update public.crm_importacoes_linhas set status = 'revisar', motivo = 'MATCH_PHONE_DIFFERS' where importacao_id = '${IMP}' and numero = 3;
    `);
    expect(sql(`select public.fn_escale_contar_importacao('${IMP}');`).trim()).toBe("aguardando_revisao");
    expect(sql(`select importadas || '/' || revisar from public.crm_importacoes where id = '${IMP}';`).trim()).toBe("1/1");
  });

  it("reabrir devolve as linhas do motivo à fila com a escolha", () => {
    expect(sql(`select public.fn_escale_reabrir_importacao('${IMP}', 'MATCH_PHONE_DIFFERS', '{"acao":"OVERWRITE"}'::jsonb);`).trim()).toBe("1");
    expect(statusDe(IMP)).toBe("importando");
    expect(sql(`select resolucoes->'MATCH_PHONE_DIFFERS'->>'acao' from public.crm_importacoes_linhas where importacao_id = '${IMP}' and numero = 3;`).trim()).toBe(
      "OVERWRITE",
    );
  });

  it("cancelar pula o que estava na fila", () => {
    expect(sql(`select public.fn_escale_cancelar_importacao('${IMP}');`).trim()).toBe("cancelada");
    expect(sql(`select status from public.crm_importacoes_linhas where importacao_id = '${IMP}' and numero = 3;`).trim()).toBe("pulada");
  });

  it("a empresa da linha: cria sem nome, acha pelo nome e vincula", () => {
    const nova = sql(`select public.fn_escale_empresa_da_importacao('${GOV_ORG}', '${GOV_ADMIN}', '${C1}', 'Acme Importada', null, null);`).trim();
    expect(nova).toMatch(/^[0-9a-f-]{36}$/);
    const achada = sql(`select public.fn_escale_empresa_da_importacao('${GOV_ORG}', '${GOV_ADMIN}', '${C1}', 'ACME importada', null, null);`).trim();
    expect(achada).toBe(nova);
    const atual = sql(`select public.fn_escale_empresa_da_importacao('${GOV_ORG}', '${GOV_ADMIN}', '${C1}', null, null, null);`).trim();
    expect(atual).toBe(nova);
    expect(
      Number(
        sql(`select count(*) from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${C1}';`).trim(),
      ),
    ).toBe(1);
  });
});
