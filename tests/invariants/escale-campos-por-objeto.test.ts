import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * CAMPOS POR OBJETO (fork Escale, migration 9104) — prova contra Postgres real:
 * semente idempotente, leitura por todo membro, escrita só do administrador,
 * campo e grupo padrão protegidos, chave única por objeto, datetime válido,
 * custom_fields da empresa e as ações novas do lote. Roda via `pnpm test:db`.
 */
const ORG_B = "e5ca1e00-9104-4000-8000-0000000000b0";
const USER_B = "e5ca1e00-9104-4000-8000-0000000000b1";

const grupo = (objeto: string) =>
  `(select id from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and objeto = '${objeto}' and chave = 'informacoes_gerais')`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'vizinho-9104@x.test') on conflict (id) do nothing;
    insert into public.organizations (id, slug, legal_name, display_name) values ('${ORG_B}', 'org-b-9104', 'Org B 9104', 'Org B 9104') on conflict (id) do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    delete from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and padrao = false;
    delete from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and padrao = false;
    select public.fn_escale_semear_campos_padrao('${GOV_ORG}');
    select public.fn_escale_semear_campos_padrao('${GOV_ORG}');
  `);
});

describe("semente", () => {
  it("cria Informações Gerais nos três objetos e os quatro campos da empresa, uma vez só", () => {
    expect(lastLine(sql(`select count(*) from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and padrao`))).toBe("3");
    expect(
      lastLine(sql(`select string_agg(chave, ',' order by posicao) from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and objeto = 'empresa' and padrao`)),
    ).toBe("site,categoria,segmento,numero_de_funcionarios");
  });

  it("a semente é fechada ao authenticated", () => {
    expect(lastLine(sql(`select has_function_privilege('authenticated', 'public.fn_escale_semear_campos_padrao(uuid)', 'execute')`))).toBe("f");
  });
});

describe("leitura e escrita", () => {
  const q = `select count(*) from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and objeto = 'empresa'`;
  it("todo membro lê; o vizinho não", () => {
    expect(countAs(GOV_VIEWER, q)).toBe(4);
    expect(countAs(GOV_AGENT_A, q)).toBe(4);
    expect(countAs(USER_B, q)).toBe(0);
  });

  const insere = (quem: string, sufixo: string) =>
    writeCountAs(
      quem,
      `insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao, grupo_id)
       values ('${GOV_ORG}', 'contato', 'cargo_${sufixo}', '{"label":"Cargo ${sufixo}","type":"text"}'::jsonb, ${grupo("contato")})`,
    );
  it("só administrador escreve", () => {
    expect(insere(GOV_VIEWER, "v")).toBe(0);
    expect(insere(GOV_AGENT_A, "a")).toBe(0);
    expect(insere(GOV_MANAGER, "m")).toBe(0);
    expect(insere(GOV_ADMIN, "adm")).toBe(1);
  });

  it("o vizinho não grava no catálogo da outra organização", () => {
    expect(
      writeCountAs(
        USER_B,
        `insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'invasao', '{"label":"Invasão","type":"text"}'::jsonb)`,
      ),
    ).toBe(0);
  });
});

describe("travas", () => {
  it("chave única por objeto, mas a mesma chave vale em objetos diferentes", () => {
    sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'segmento', '{"label":"Segmento do contato","type":"text"}'::jsonb)`);
    expect(() =>
      sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'segmento', '{"label":"Outro","type":"text"}'::jsonb)`),
    ).toThrow(/uq_crm_campos_do_crm_chave/);
  });

  it("chave link_* é recusada no contato", () => {
    expect(() =>
      sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'link_x', '{"label":"X","type":"text"}'::jsonb)`),
    ).toThrow(/crm_campos_do_crm_chave/);
  });

  it("datetime é um tipo válido; um tipo inventado não", () => {
    sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'quando', '{"label":"Quando","type":"datetime"}'::jsonb)`);
    expect(() =>
      sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'ruim', '{"label":"Ruim","type":"rich"}'::jsonb)`),
    ).toThrow(/definição inválida/);
  });

  it("campo padrão não se apaga nem se renomeia; grupo padrão não se apaga", () => {
    expect(() => sql(`delete from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and objeto = 'empresa' and chave = 'site'`)).toThrow(/campo_padrao_nao_se_exclui/);
    expect(() =>
      sql(`update public.crm_campos_do_crm set definicao = definicao || '{"label":"Website"}' where organization_id = '${GOV_ORG}' and objeto = 'empresa' and chave = 'site'`),
    ).toThrow(/campo_padrao_nao_se_renomeia/);
    expect(() => sql(`delete from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and objeto = 'empresa' and padrao`)).toThrow(/grupo_padrao_nao_se_exclui/);
  });

  it("apagar um grupo solta os campos dele (grupo_id nulo), sem apagar os campos", () => {
    sql(`insert into public.crm_grupos_de_campos (organization_id, objeto, chave, nome, posicao) values ('${GOV_ORG}', 'contato', 'kaio_ia', 'Kaio IA', 1)`);
    sql(`update public.crm_campos_do_crm set grupo_id = (select id from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and chave = 'kaio_ia') where organization_id = '${GOV_ORG}' and chave = 'quando'`);
    sql(`delete from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and chave = 'kaio_ia'`);
    expect(lastLine(sql(`select grupo_id is null from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and chave = 'quando'`))).toBe("t");
  });

  it("o negócio ganhou grupo e papel; a empresa guarda custom_fields; papel inválido é recusado", () => {
    expect(lastLine(sql(`select count(*) from information_schema.columns where table_name = 'crm_campos_do_negocio' and column_name in ('grupo_id', 'papel_minimo')`))).toBe("2");
    expect(lastLine(sql(`select column_default from information_schema.columns where table_name = 'companies' and column_name = 'custom_fields'`))).toBe("'{}'::jsonb");
    expect(() => sql(`update public.crm_campos_do_crm set papel_minimo = 'viewer' where organization_id = '${GOV_ORG}' and chave = 'quando'`)).toThrow(/crm_campos_do_crm_papel/);
  });

  it("as ações alterar_campo e limpar_campo passam na check do lote", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `insert into public.crm_acoes_em_massa (organization_id, user_id, lista, acao, parametros) values ('${GOV_ORG}', '${GOV_MANAGER}', 'contatos', 'alterar_campo', '{"chave":"cargo","valor":"CEO"}'::jsonb)`,
      ),
    ).toBe(1);
  });
});
