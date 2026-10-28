import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  countAs,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * DUPLICAR E EXCLUIR PAINEL (fork Escale, migration 9602) — prova contra Postgres real:
 * a cópia leva os gráficos e respeita a RLS da 9601; a exclusão suave confere organização,
 * visibilidade, papel e a trava de padrão/modelo dentro da função definer. Roda via `pnpm test:db`.
 */
const P_ORIGEM = "e5ca1e00-9602-4000-8000-0000000000a1";
const P_AGENTE_A = "e5ca1e00-9602-4000-8000-0000000000a2";
const P_PADRAO = "e5ca1e00-9602-4000-8000-0000000000a3";
const P_MODELO = "e5ca1e00-9602-4000-8000-0000000000a4";
const P_EXCLUIR = "e5ca1e00-9602-4000-8000-0000000000a5";
const P_OUTRA_ORG = "e5ca1e00-9602-4000-8000-0000000000a6";
const P_TRANCAR = "e5ca1e00-9602-4000-8000-0000000000a7";
const P_AGENTE_EXCLUI = "e5ca1e00-9602-4000-8000-0000000000a8";
const OUTRA_ORG = "e5ca1e00-9602-4000-8000-0000000000f1";
const PERGUNTA = '{"indicadores":["negocio.ganhos"]}';

const como = (userId: string, consulta: string): string =>
  sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${userId}"}', false); ${consulta}`);

const contarVivos = (userId: string, id: string): number =>
  countAs(userId, `select count(*) from public.crm_paineis where id = '${id}';`);

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', 'org-9602', 'Org 9602', 'Org 9602') on conflict (id) do nothing;
    delete from public.crm_graficos where painel_id in (select id from public.crm_paineis where id::text like 'e5ca1e00-9602-%' or nome like 'Cópia 9602%');
    delete from public.crm_paineis where id::text like 'e5ca1e00-9602-%' or nome like 'Cópia 9602%';
    insert into public.crm_paineis (id, organization_id, nome, cor, icone, permissoes_usuarios, permissoes_papeis, padrao, modelo) values
      ('${P_ORIGEM}', '${GOV_ORG}', 'Origem', '#FF4062', 'star', '{}', '{manager}', false, false),
      ('${P_AGENTE_A}', '${GOV_ORG}', 'Só o agente A', 'marca', 'briefcase', '{${GOV_AGENT_A}}', '{}', false, false),
      ('${P_PADRAO}', '${GOV_ORG}', 'Padrão', 'marca', 'briefcase', '{}', '{}', true, false),
      ('${P_MODELO}', '${GOV_ORG}', 'Modelo', 'marca', 'briefcase', '{}', '{}', false, true),
      ('${P_EXCLUIR}', '${GOV_ORG}', 'Excluir', 'marca', 'briefcase', '{}', '{}', false, false),
      ('${P_OUTRA_ORG}', '${OUTRA_ORG}', 'Outra org', 'marca', 'briefcase', '{}', '{}', false, false),
      ('${P_TRANCAR}', '${GOV_ORG}', 'Trancar', 'marca', 'briefcase', '{}', '{}', false, false),
      ('${P_AGENTE_EXCLUI}', '${GOV_ORG}', 'Agente exclui', 'marca', 'briefcase', '{}', '{}', false, false);
    insert into public.crm_graficos (organization_id, painel_id, nome, pergunta) values
      ('${GOV_ORG}', '${P_ORIGEM}', 'G1', '${PERGUNTA}'),
      ('${GOV_ORG}', '${P_ORIGEM}', 'G2', '${PERGUNTA}');
  `);
});

describe("as funções", () => {
  it("existem e anon não as executa", () => {
    for (const assinatura of ["fn_escale_duplicar_painel(uuid,text)", "fn_escale_excluir_painel(uuid)"]) {
      expect(sql(`select has_function_privilege('anon', 'public.${assinatura}', 'execute');`), assinatura).toBe("f");
      expect(sql(`select has_function_privilege('authenticated', 'public.${assinatura}', 'execute');`), assinatura).toBe("t");
    }
  });
});

describe("duplicar", () => {
  it("gerente copia o painel e os gráficos com o nome pedido", () => {
    const novo = lastLine(como(GOV_MANAGER, `select public.fn_escale_duplicar_painel('${P_ORIGEM}', 'Cópia 9602 A');`));
    expect(novo).toMatch(/^[0-9a-f-]{36}$/);
    const linha = sql(
      `select nome, cor, icone, permissoes_papeis::text, padrao, modelo from public.crm_paineis where id = '${novo}';`,
    );
    expect(linha).toBe("Cópia 9602 A|#FF4062|star|{manager}|f|f");
    expect(sql(`select count(*) from public.crm_graficos where painel_id = '${novo}';`)).toBe("2");
  });

  it("agente não duplica (a RLS recusa o insert)", () => {
    expect(() => como(GOV_AGENT_A, `select public.fn_escale_duplicar_painel('${P_EXCLUIR}', 'Cópia 9602 B');`)).toThrow(
      /row-level security/,
    );
  });

  it("painel invisível ao gerente não é encontrado", () => {
    expect(() => como(GOV_MANAGER, `select public.fn_escale_duplicar_painel('${P_AGENTE_A}', 'Cópia 9602 C');`)).toThrow(
      /painel_nao_encontrado/,
    );
  });
});

describe("excluir", () => {
  it("gerente grava deleted_at e o painel some para gerente e admin", () => {
    como(GOV_MANAGER, `select public.fn_escale_excluir_painel('${P_EXCLUIR}');`);
    expect(sql(`select deleted_at is not null from public.crm_paineis where id = '${P_EXCLUIR}';`)).toBe("t");
    expect(contarVivos(GOV_MANAGER, P_EXCLUIR)).toBe(0);
    expect(contarVivos(GOV_ADMIN, P_EXCLUIR)).toBe(0);
  });

  it("agente não exclui", () => {
    expect(() => como(GOV_AGENT_A, `select public.fn_escale_excluir_painel('${P_AGENTE_EXCLUI}');`)).toThrow(/sem_permissao/);
    expect(sql(`select deleted_at is null from public.crm_paineis where id = '${P_AGENTE_EXCLUI}';`)).toBe("t");
  });

  it.each([
    ["padrão", P_PADRAO],
    ["modelo", P_MODELO],
  ])("painel %s é protegido", (_rotulo, id) => {
    expect(() => como(GOV_ADMIN, `select public.fn_escale_excluir_painel('${id}');`)).toThrow(/painel_protegido/);
  });

  it("painel de outra organização não é encontrado", () => {
    expect(() => como(GOV_ADMIN, `select public.fn_escale_excluir_painel('${P_OUTRA_ORG}');`)).toThrow(
      /painel_nao_encontrado/,
    );
    expect(sql(`select deleted_at is null from public.crm_paineis where id = '${P_OUTRA_ORG}';`)).toBe("t");
  });

  it("painel invisível ao gerente não é encontrado", () => {
    expect(() => como(GOV_MANAGER, `select public.fn_escale_excluir_painel('${P_AGENTE_A}');`)).toThrow(
      /painel_nao_encontrado/,
    );
  });
});

describe("editar sem se trancar (prova da Q5)", () => {
  it("o update que tira o gerente das listas, sem returning, é recusado pela RLS", () => {
    // A rota recusa antes (422); aqui fica registrado o que o Postgres faria sozinho.
    let erro = "";
    try {
      como(GOV_MANAGER, `update public.crm_paineis set permissoes_usuarios = array['${GOV_AGENT_A}']::uuid[] where id = '${P_TRANCAR}';`);
    } catch (e) {
      erro = (e as { stderr?: string }).stderr ?? String(e);
    }
    const gravou = sql(`select permissoes_usuarios::text from public.crm_paineis where id = '${P_TRANCAR}';`);
    expect({ recusado: /row-level security/.test(erro), gravou }).toEqual({ recusado: true, gravou: "{}" });
  });
});
