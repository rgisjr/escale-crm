import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * MODELOS DE PAINEL (fork Escale, Fase 7F, sem migration) — prova contra Postgres real de que a 9601/9602 sustentam
 * os templates da organização: painel `modelo = true` com listas vazias é visível à organização, a lista (`modelo = false`)
 * não o traz, a criação com gráficos é um `insert` só (31 gráficos não entram nenhum), o `delete` de template é
 * recusado pela policy e a exclusão do template (U9) passa por `modelo = false` + `fn_escale_excluir_painel`.
 * Roda via `pnpm test:db` (na bateria da frente).
 */
const P_TEMPLATE = "e5ca1e00-7f00-4000-8000-0000000000a1";
const P_EXCLUIR = "e5ca1e00-7f00-4000-8000-0000000000a2";
const P_NOVO = "e5ca1e00-7f00-4000-8000-0000000000a3";
const P_LIMITE = "e5ca1e00-7f00-4000-8000-0000000000a4";
const P_COMPENSA = "e5ca1e00-7f00-4000-8000-0000000000a5";
const PERGUNTA = '{"indicadores":["negocio.ganhos"]}';

const como = (userId: string, consulta: string): string =>
  sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${userId}"}', false); ${consulta}`);
const vistos = (userId: string, where: string): number =>
  countAs(userId, `select count(*) from public.crm_paineis where ${where};`);
const gerarGraficos = (n: number, painel: string): string =>
  Array.from({ length: n }, (_, i) => `('${GOV_ORG}', '${painel}', 'G${i}', '${PERGUNTA}')`).join(", ");

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_graficos where painel_id::text like 'e5ca1e00-7f00-%';
    delete from public.crm_paineis where id::text like 'e5ca1e00-7f00-%';
    insert into public.crm_paineis (id, organization_id, nome, cor, icone, permissoes_usuarios, permissoes_papeis, padrao, modelo) values
      ('${P_TEMPLATE}', '${GOV_ORG}', 'Template 7F', 'marca', 'star', '{}', '{}', false, true),
      ('${P_EXCLUIR}', '${GOV_ORG}', 'Template a excluir 7F', 'marca', 'star', '{}', '{}', false, true);
    insert into public.crm_graficos (organization_id, painel_id, nome, pergunta) values
      ('${GOV_ORG}', '${P_TEMPLATE}', 'G1', '${PERGUNTA}'),
      ('${GOV_ORG}', '${P_TEMPLATE}', 'G2', '${PERGUNTA}');
  `);
});

describe("template da organização (modelo = true, listas vazias)", () => {
  it("agente e gerente leem o template e os gráficos; viewer não", () => {
    expect(vistos(GOV_AGENT_A, `id = '${P_TEMPLATE}'`)).toBe(1);
    expect(vistos(GOV_MANAGER, `id = '${P_TEMPLATE}'`)).toBe(1);
    expect(vistos(GOV_VIEWER, `id = '${P_TEMPLATE}'`)).toBe(0);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_graficos where painel_id = '${P_TEMPLATE}';`)).toBe(2);
  });

  it("a lista de painéis (modelo = false) não traz o template", () => {
    expect(vistos(GOV_MANAGER, `id = '${P_TEMPLATE}' and modelo = false`)).toBe(0);
  });

  it("agente não cria painel; gerente cria", () => {
    expect(() =>
      como(
        GOV_AGENT_A,
        `insert into public.crm_paineis (organization_id, nome) values ('${GOV_ORG}', 'Agente 7F');`,
      ),
    ).toThrow(/row-level security/);
    como(
      GOV_MANAGER,
      `insert into public.crm_paineis (id, organization_id, nome, modelo) values ('${P_NOVO}', '${GOV_ORG}', 'Novo 7F', false);`,
    );
    expect(vistos(GOV_MANAGER, `id = '${P_NOVO}'`)).toBe(1);
  });

  it("gerente vira o painel recém-criado em template (update modelo = true)", () => {
    como(GOV_MANAGER, `update public.crm_paineis set modelo = true where id = '${P_NOVO}';`);
    expect(sql(`select modelo from public.crm_paineis where id = '${P_NOVO}';`)).toBe("t");
  });
});

describe("criação com gráficos num insert só (U2)", () => {
  it("31 gráficos num insert de array falham com limite_de_graficos e nenhum fica", () => {
    como(GOV_MANAGER, `insert into public.crm_paineis (id, organization_id, nome) values ('${P_LIMITE}', '${GOV_ORG}', 'Limite 7F');`);
    expect(() =>
      como(
        GOV_MANAGER,
        `insert into public.crm_graficos (organization_id, painel_id, nome, pergunta) values ${gerarGraficos(31, P_LIMITE)};`,
      ),
    ).toThrow(/limite_de_graficos/);
    expect(sql(`select count(*) from public.crm_graficos where painel_id = '${P_LIMITE}';`)).toBe("0");
  });

  it("30 gráficos entram", () => {
    como(
      GOV_MANAGER,
      `insert into public.crm_graficos (organization_id, painel_id, nome, pergunta) values ${gerarGraficos(30, P_LIMITE)};`,
    );
    expect(sql(`select count(*) from public.crm_graficos where painel_id = '${P_LIMITE}';`)).toBe("30");
  });

  it("a compensação: o gerente apaga o painel recém-criado e os gráficos saem em cascata", () => {
    como(GOV_MANAGER, `insert into public.crm_paineis (id, organization_id, nome) values ('${P_COMPENSA}', '${GOV_ORG}', 'Compensa 7F');`);
    como(
      GOV_MANAGER,
      `insert into public.crm_graficos (organization_id, painel_id, nome, pergunta) values ${gerarGraficos(2, P_COMPENSA)};`,
    );
    como(GOV_MANAGER, `delete from public.crm_paineis where id = '${P_COMPENSA}';`);
    expect(sql(`select count(*) from public.crm_paineis where id = '${P_COMPENSA}';`)).toBe("0");
    expect(sql(`select count(*) from public.crm_graficos where painel_id = '${P_COMPENSA}';`)).toBe("0");
  });
});

describe("excluir template (U9)", () => {
  it("o delete direto de um template é recusado pela policy (nada é apagado)", () => {
    como(GOV_MANAGER, `delete from public.crm_paineis where id = '${P_EXCLUIR}';`);
    expect(sql(`select count(*) from public.crm_paineis where id = '${P_EXCLUIR}';`)).toBe("1");
  });

  it("a função recusa excluir enquanto é modelo; com modelo = false o gerente exclui", () => {
    expect(() => como(GOV_MANAGER, `select public.fn_escale_excluir_painel('${P_EXCLUIR}');`)).toThrow(/painel_protegido/);
    como(GOV_MANAGER, `update public.crm_paineis set modelo = false where id = '${P_EXCLUIR}';`);
    como(GOV_MANAGER, `select public.fn_escale_excluir_painel('${P_EXCLUIR}');`);
    expect(sql(`select deleted_at is not null from public.crm_paineis where id = '${P_EXCLUIR}';`)).toBe("t");
  });

  it("agente não exclui template", () => {
    expect(() => como(GOV_AGENT_A, `select public.fn_escale_excluir_painel('${P_TEMPLATE}');`)).toThrow(/sem_permissao/);
  });

  it("admin vê o template", () => {
    expect(vistos(GOV_ADMIN, `id = '${P_TEMPLATE}'`)).toBe(1);
  });
});
