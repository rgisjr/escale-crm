import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_AGENT_B, GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * EMPRESAS DA CASCA (fork Escale, migration 9105) — prova contra Postgres real:
 * módulo ligado, um principal por empresa, as definer fechadas e o que fazem
 * (criar, vincular tirando das outras, remover com o novo principal, último
 * contato exclui a empresa, excluir mantém os contatos), a lista com contatos,
 * negócios e valor em aberto pela RLS de quem olha, e a empresa na busca e no
 * filtro da lista de contatos. Roda via `pnpm test:db`.
 */
const P = "e5ca1e00-9105-4000-8000-0000000000a1";
const S = "e5ca1e00-9105-4000-8000-0000000000a2";
const C1 = "e5ca1e00-9105-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9105-4000-8000-0000000000c2";
const C3 = "e5ca1e00-9105-4000-8000-0000000000c3";

const svc = (q: string) => lastLine(sql(`set role service_role; ${q}`));
const empresaDe = (contato: string) =>
  lastLine(sql(`select cp.company_id from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${contato}'`));

let E1 = "";

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_leads where id::text like 'e5ca1e00-9105-%';
    delete from public.companies where organization_id = '${GOV_ORG}' and trade_name like 'Atlas%';
    delete from public.contacts where id::text like 'e5ca1e00-9105-%';
    delete from public.crm_stages where id::text like 'e5ca1e00-9105-%';
    delete from public.crm_pipelines where id::text like 'e5ca1e00-9105-%';
    insert into public.crm_pipelines (id, organization_id, name, slug) values ('${P}', '${GOV_ORG}', 'Empresas 2D', 'escale-empresas-2d');
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values ('${S}', '${GOV_ORG}', '${P}', 'Entrada', 'entrada', 0);
    insert into public.contacts (id, organization_id, name, phone_number) values
      ('${C1}', '${GOV_ORG}', 'Alex Atlas', '+5553999998393'),
      ('${C2}', '${GOV_ORG}', 'Celise Atlas', '+5516992998777'),
      ('${C3}', '${GOV_ORG}', 'Davi Fora', '+5511987654321');
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, owner_user_id, value_cents, status) values
      ('e5ca1e00-9105-4000-8000-0000000000d1', '${GOV_ORG}', '${P}', '${S}', 'Do Alex', '${C1}', '${GOV_AGENT_A}', 150000, 'open'),
      ('e5ca1e00-9105-4000-8000-0000000000d2', '${GOV_ORG}', '${P}', '${S}', 'Da Celise', '${C2}', '${GOV_AGENT_B}', 50000, 'open');
  `);
  E1 = svc(`select public.fn_escale_criar_empresa('${GOV_ORG}', '${GOV_MANAGER}', 'Atlas Distribuidora', '11.222.333/0001-81', '11222333000181', 'atlas.com.br', '${C1}')`);
  svc(`select public.fn_escale_vincular_contato_a_empresa('${GOV_ORG}', '${C2}', '${E1}', false)`);
});

describe("módulo e travas", () => {
  it("MODULO_CRM_B2B ligado", () => {
    expect(lastLine(sql(`select valor from public.platform_config where chave = 'MODULO_CRM_B2B'`))).toBe("ligado");
  });

  it("as definer não abrem para o authenticated", () => {
    expect(lastLine(sql(`select has_function_privilege('authenticated', 'public.fn_escale_criar_empresa(uuid, uuid, text, text, text, text, uuid)', 'execute')`))).toBe("f");
  });

  it("um principal por empresa", () => {
    expect(() => sql(`update public.company_people set is_primary = true where company_id = '${E1}'`)).toThrow(/uq_company_people_um_principal/);
  });
});

describe("criar e vincular", () => {
  it("cria com o site no custom_fields, o CNPJ formatado e o contato principal", () => {
    expect(lastLine(sql(`select custom_fields->>'site' || '|' || cnpj || '|' || normalized_cnpj from public.companies where id = '${E1}'`))).toBe(
      "atlas.com.br|11.222.333/0001-81|11222333000181",
    );
    expect(lastLine(sql(`select cp.is_primary from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${C1}'`))).toBe("t");
    expect(lastLine(sql(`select cp.is_primary from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${C2}'`))).toBe("f");
  });

  it("vincular a outra empresa tira da primeira", () => {
    const E2 = svc(`select public.fn_escale_criar_empresa('${GOV_ORG}', '${GOV_MANAGER}', 'Atlas Filial', '', '', '', '${C3}')`);
    svc(`select public.fn_escale_vincular_contato_a_empresa('${GOV_ORG}', '${C3}', '${E1}', false)`);
    expect(empresaDe(C3)).toBe(E1);
    expect(lastLine(sql(`select count(*) from public.companies where id = '${E2}'`))).toBe("1");
  });
});

describe("a lista com a RLS de quem olha", () => {
  const lista = `select contatos || '|' || negocios || '|' || valor_aberto_cents from public.fn_escale_lista_de_empresas('${GOV_ORG}', 'com_nome', 'Atlas Distribuidora', null, '{}'::jsonb, 10, 0)`;
  it("gerente vê os 3 contatos, os 2 negócios e R$ 2.000,00", () => {
    expect(lastLine(sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', false); ${lista}`))).toBe("3|2|200000");
  });
  it("o agente A só soma o negócio que enxerga", () => {
    expect(lastLine(sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_AGENT_A}"}', false); ${lista}`))).toBe("3|1|150000");
  });
  it("busca pelo CNPJ e escopo sem nome", () => {
    expect(countAs(GOV_VIEWER, `select count(*) from public.fn_escale_lista_de_empresas('${GOV_ORG}', 'todas', null, '222333', '{}'::jsonb, 10, 0)`)).toBe(1);
    expect(countAs(GOV_VIEWER, `select count(*) from public.fn_escale_lista_de_empresas('${GOV_ORG}', 'sem_nome', 'Atlas', null, '{}'::jsonb, 10, 0)`)).toBe(0);
  });
  it("filtro por campo da empresa", () => {
    const f = `'{"campos":{"combinar":"ou","grupos":[{"modo":"e","condicoes":[{"alvo":"empresa","chave":"site","tipo":"texto","op":"contem","valor":"atlas","padrao":"atlas"}]}]}}'::jsonb`;
    expect(countAs(GOV_VIEWER, `select count(*) from public.fn_escale_lista_de_empresas('${GOV_ORG}', 'todas', null, null, ${f}, 10, 0)`)).toBe(1);
  });
});

describe("a empresa na lista de contatos", () => {
  it("a busca pelo nome da empresa acha os contatos dela", () => {
    expect(countAs(GOV_MANAGER, `select count(*) from public.fn_escale_contatos_do_filtro('${GOV_ORG}', 'todos', 'distribuidora', null, null, '{}'::jsonb)`)).toBe(3);
  });
  it("o filtro com alvo empresa", () => {
    const f = `'{"fuso":"America/Sao_Paulo","campos":{"combinar":"ou","grupos":[{"modo":"e","condicoes":[{"alvo":"empresa","chave":"nome","tipo":"texto","op":"contem","valor":"Atlas","padrao":"atlas"}]}]}}'::jsonb`;
    expect(countAs(GOV_MANAGER, `select count(*) from public.fn_escale_contatos_do_filtro('${GOV_ORG}', 'todos', null, null, null, ${f}) where contact_id::text like 'e5ca1e00-9105-%'`)).toBe(3);
  });
});

describe("remover e excluir", () => {
  it("remover o principal exige o novo; com ele, troca", () => {
    expect(() => svc(`select public.fn_escale_desvincular_contato_da_empresa('${GOV_ORG}', '${C1}', '${E1}', null)`)).toThrow(/escolha_o_principal/);
    expect(svc(`select public.fn_escale_desvincular_contato_da_empresa('${GOV_ORG}', '${C1}', '${E1}', '${C2}')`)).toBe("removido");
    expect(lastLine(sql(`select cp.is_primary from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${C2}'`))).toBe("t");
  });

  it("excluir mantém os contatos e as pessoas", () => {
    svc(`select public.fn_escale_excluir_empresa('${GOV_ORG}', '${E1}')`);
    expect(lastLine(sql(`select count(*) from public.contacts where id in ('${C2}', '${C3}')`))).toBe("2");
    expect(lastLine(sql(`select count(*) from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id in ('${C2}', '${C3}')`))).toBe("0");
  });

  it("remover o último contato exclui a empresa", () => {
    const E3 = svc(`select public.fn_escale_criar_empresa('${GOV_ORG}', '${GOV_MANAGER}', 'Atlas Sozinha', '', '', '', '${C1}')`);
    expect(svc(`select public.fn_escale_desvincular_contato_da_empresa('${GOV_ORG}', '${C1}', '${E3}', null)`)).toBe("empresa_excluida");
    expect(lastLine(sql(`select count(*) from public.companies where id = '${E3}'`))).toBe("0");
  });
});
