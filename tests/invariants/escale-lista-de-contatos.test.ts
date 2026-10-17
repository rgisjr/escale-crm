import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_MANAGER,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * LISTA DE CONTATOS DA CASCA (fork Escale, migration 9101) — prova contra
 * Postgres real: a função conta o total e os negócios com a RLS de quem olha
 * (o agent vê os seus e os sem dono), ignora origem arquivada, separa os
 * pessoais, busca pelo padrão, pelos dígitos e pelo Instagram, e pagina; a
 * tabela de colunas só deixa a pessoa ler e gravar a sua. Roda via `pnpm test:db`.
 */
const P = "e5ca1e00-9101-4000-8000-0000000000a1";
const P_ARQ = "e5ca1e00-9101-4000-8000-0000000000a2";
const S = "e5ca1e00-9101-4000-8000-0000000000b1";
const S_ARQ = "e5ca1e00-9101-4000-8000-0000000000b2";
const C_DOIS = "e5ca1e00-9101-4000-8000-0000000000c1"; // 1 negócio do agent B + 1 sem dono
const C_UM = "e5ca1e00-9101-4000-8000-0000000000c2"; // 1 negócio sem dono
const C_NADA = "e5ca1e00-9101-4000-8000-0000000000c3"; // só negócio em origem arquivada
const C_PESSOAL = "e5ca1e00-9101-4000-8000-0000000000c4";
const L_UM = "e5ca1e00-9101-4000-8000-0000000000d3";

const lista = (visao: string, padrao: string | null, extra = "") =>
  `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', '${visao}', ${
    padrao === null ? "null" : `'${padrao}'`
  }, null, null, 100, 0) ${extra}`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_leads where id::text like 'e5ca1e00-9101-%';
    delete from public.contacts where id::text like 'e5ca1e00-9101-%';
    delete from public.crm_stages where id::text like 'e5ca1e00-9101-%';
    delete from public.crm_pipelines where id::text like 'e5ca1e00-9101-%';
    insert into public.crm_pipelines (id, organization_id, name, slug) values
      ('${P}', '${GOV_ORG}', 'Lista 2A', 'escale-lista-2a'),
      ('${P_ARQ}', '${GOV_ORG}', 'Lista 2A arquivada', 'escale-lista-2a-arq');
    update public.crm_pipelines set is_archived = true where id = '${P_ARQ}';
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values
      ('${S}', '${GOV_ORG}', '${P}', 'Entrada', 'entrada', 0),
      ('${S_ARQ}', '${GOV_ORG}', '${P_ARQ}', 'Entrada', 'entrada', 0);
    insert into public.contacts (id, organization_id, display_name, phone_number, custom_fields, is_personal, last_activity_at) values
      ('${C_DOIS}', '${GOV_ORG}', 'Listadois Ana', '+5564999446816', '{}'::jsonb, false, now()),
      ('${C_UM}', '${GOV_ORG}', 'Listadois Bruno', null, '{"link_instagram":"https://instagram.com/listadoisbruno"}'::jsonb, false, now() - interval '1 day'),
      ('${C_NADA}', '${GOV_ORG}', 'Listadois Carla', null, '{}'::jsonb, false, now() - interval '2 days'),
      ('${C_PESSOAL}', '${GOV_ORG}', 'Listadois Pessoal', null, '{}'::jsonb, true, now());
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, owner_user_id) values
      ('e5ca1e00-9101-4000-8000-0000000000d1', '${GOV_ORG}', '${P}', '${S}', 'Do B', '${C_DOIS}', '${GOV_AGENT_B}'),
      ('e5ca1e00-9101-4000-8000-0000000000d2', '${GOV_ORG}', '${P}', '${S}', 'Sem dono', '${C_DOIS}', null),
      ('${L_UM}', '${GOV_ORG}', '${P}', '${S}', 'Do Bruno', '${C_UM}', null),
      ('e5ca1e00-9101-4000-8000-0000000000d4', '${GOV_ORG}', '${P_ARQ}', '${S_ARQ}', 'Arquivada', '${C_NADA}', null);
  `);
});

describe("fn_escale_lista_de_contatos", () => {
  it("o gerente vê os dois negócios da Ana; o agent A vê só o sem dono (RLS de crm_leads)", () => {
    expect(
      countAs(
        GOV_MANAGER,
        lista("todos", "listadois", `where contact_id = '${C_DOIS}' and negocios = 2`),
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_AGENT_A,
        lista("todos", "listadois", `where contact_id = '${C_DOIS}' and negocios = 1`),
      ),
    ).toBe(1);
  });

  it("negócio de origem arquivada não conta", () => {
    expect(
      countAs(
        GOV_MANAGER,
        lista("todos", "listadois", `where contact_id = '${C_NADA}' and negocios = 0`),
      ),
    ).toBe(1);
  });

  it("com um negócio só, devolve o id dele", () => {
    expect(
      countAs(
        GOV_MANAGER,
        lista("todos", "listadois", `where contact_id = '${C_UM}' and negocio_unico = '${L_UM}'`),
      ),
    ).toBe(1);
  });

  it("visões: todos (sem o pessoal), com negócio, sem negócio, pessoais", () => {
    expect(countAs(GOV_MANAGER, lista("todos", "listadois"))).toBe(3);
    expect(countAs(GOV_MANAGER, lista("com_negocio", "listadois"))).toBe(2);
    expect(countAs(GOV_MANAGER, lista("sem_negocio", "listadois"))).toBe(1);
    expect(countAs(GOV_MANAGER, lista("pessoais", "listadois"))).toBe(1);
  });

  it("o total vem em toda linha e não depende do limite", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', 'listadois', null, null, 1, 0) where total = 3`,
      ),
    ).toBe(1);
  });

  it("pagina: a segunda página de 2 tem 1 contato, na ordem da última atividade", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', 'listadois', null, null, 2, 2) where contact_id = '${C_NADA}'`,
      ),
    ).toBe(1);
  });

  it("acha pelos dígitos do telefone e pelo Instagram", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', null, array['64999446816'], null, 100, 0) where contact_id = '${C_DOIS}'`,
      ),
    ).toBe(1);
    expect(
      countAs(GOV_MANAGER, lista("todos", "listadoisbruno", `where contact_id = '${C_UM}'`)),
    ).toBe(1);
  });

  it("é invoker e o anon não executa", () => {
    expect(
      sql(`select prosecdef from pg_proc where proname = 'fn_escale_lista_de_contatos';`),
    ).toBe("f");
    expect(
      sql(
        `select has_function_privilege('anon', 'public.fn_escale_lista_de_contatos(uuid,text,text,text[],text,integer,integer)', 'execute');`,
      ),
    ).toBe("f");
  });
});

describe("crm_colunas_das_listas", () => {
  const COLUNAS = `'{"itens":[]}'::jsonb`;
  const ORG_B = "e5ca1e00-9101-4000-8000-0000000000e1";
  const USER_B = "e5ca1e00-9101-4000-8000-0000000000e2";

  it("o vizinho (outra organização) não lê a preferência de ninguém daqui (controle positivo: a dona lê)", () => {
    sql(`
      insert into auth.users (id, email) values ('${USER_B}', 'escale-colunas-b@invariant.test') on conflict do nothing;
      insert into public.organizations (id, slug, legal_name, display_name)
        values ('${ORG_B}', 'escale-colunas-b', 'Escale Colunas Org B', 'Escale CLB') on conflict do nothing;
      insert into public.user_organizations (user_id, organization_id, role, accepted_at)
        values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
      delete from public.crm_colunas_das_listas where organization_id = '${GOV_ORG}';
      insert into public.crm_colunas_das_listas (organization_id, user_id, lista, colunas)
        values ('${GOV_ORG}', '${GOV_AGENT_A}', 'contatos', ${COLUNAS});
    `);
    const q = `select count(*) from public.crm_colunas_das_listas where organization_id = '${GOV_ORG}'`;
    expect(countAs(GOV_AGENT_A, q)).toBe(1);
    expect(countAs(USER_B, q)).toBe(0);
    expect(countAs(GOV_MANAGER, q)).toBe(0);
  });

  it("a pessoa grava e lê a sua; outra pessoa não lê nem muda", () => {
    sql(`delete from public.crm_colunas_das_listas where organization_id = '${GOV_ORG}';`);
    expect(
      writeCountAs(
        GOV_VIEWER,
        `insert into public.crm_colunas_das_listas (organization_id, user_id, lista, colunas) values ('${GOV_ORG}', '${GOV_VIEWER}', 'contatos', ${COLUNAS})`,
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_VIEWER,
        `select count(*) from public.crm_colunas_das_listas where user_id = '${GOV_VIEWER}'`,
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_colunas_das_listas where user_id = '${GOV_VIEWER}'`,
      ),
    ).toBe(0);
    expect(
      writeCountAs(
        GOV_MANAGER,
        `update public.crm_colunas_das_listas set colunas = '{}'::jsonb where user_id = '${GOV_VIEWER}'`,
      ),
    ).toBe(0);
  });

  it("uma por pessoa e lista; nome de lista e tamanho validados; FK em cascata", () => {
    expect(() =>
      sql(
        `insert into public.crm_colunas_das_listas (organization_id, user_id, lista, colunas) values ('${GOV_ORG}', '${GOV_VIEWER}', 'contatos', ${COLUNAS});`,
      ),
    ).toThrow(/uq_crm_colunas_das_listas_pessoa/);
    expect(() =>
      sql(
        `insert into public.crm_colunas_das_listas (organization_id, user_id, lista, colunas) values ('${GOV_ORG}', '${GOV_VIEWER}', 'Contatos!', ${COLUNAS});`,
      ),
    ).toThrow(/crm_colunas_das_listas_lista_valida/);
    expect(() =>
      sql(
        `insert into public.crm_colunas_das_listas (organization_id, user_id, lista, colunas) values ('${GOV_ORG}', '${GOV_VIEWER}', 'empresas', jsonb_build_object('x', repeat('a', 5000)));`,
      ),
    ).toThrow(/crm_colunas_das_listas_colunas_tamanho/);
    expect(
      sql(
        `select confdeltype from pg_constraint where conname = 'crm_colunas_das_listas_pessoa_fk';`,
      ),
    ).toBe("c");
  });
});
