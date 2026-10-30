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
  writeCountAs,
} from "./gov-helpers";

/**
 * PASTAS, ORGANIZAÇÃO E FAVORITOS DE AUTOMAÇÃO (fork Escale, migration 9701) — prova contra Postgres real:
 * RLS por papel, FK composta da pasta (set null), gatilho da mesma organização, favoritos por pessoa
 * e a função de duplicar. Roda via `pnpm test:db`.
 */
const OUTRA_ORG = "e5ca1e00-9701-4000-8000-0000000000f1";
const R1 = "e5ca1e00-9701-4000-8000-0000000000a1";
const R2 = "e5ca1e00-9701-4000-8000-0000000000a2";
const R_OUTRA = "e5ca1e00-9701-4000-8000-0000000000a3";
const R_APAGAR = "e5ca1e00-9701-4000-8000-0000000000a4";
const P_GOV = "e5ca1e00-9701-4000-8000-0000000000b1";
const P_OUTRA = "e5ca1e00-9701-4000-8000-0000000000b2";
const P_EXCLUIR = "e5ca1e00-9701-4000-8000-0000000000b3";
const ACOES = `[{"type":"add_tag","config":{"tag":"x"}},{"type":"add_tag","config":{"tag":"y"}}]`;

const como = (userId: string, consulta: string): string =>
  sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${userId}"}', false); ${consulta}`);

const erroDe = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as { stderr?: string }).stderr ?? String(e);
  }
  return "";
};

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', 'org-9701', 'Org 9701', 'Org 9701') on conflict (id) do nothing;
    delete from public.crm_pastas_de_automacao where id::text like 'e5ca1e00-9701-%';
    delete from public.automation_rules where id::text like 'e5ca1e00-9701-%' or name like 'Cópia 9701%';
    insert into public.automation_rules (id, organization_id, name, trigger_event, trigger_config, conditions, actions, is_active) values
      ('${R1}', '${GOV_ORG}', 'Regra 1', 'lead.created', '{"tag":"a"}', '[]', '${ACOES}', true),
      ('${R2}', '${GOV_ORG}', 'Regra 2', 'lead.created', '{}', '[]', '${ACOES}', true),
      ('${R_OUTRA}', '${OUTRA_ORG}', 'Regra outra org', 'lead.created', '{}', '[]', '${ACOES}', true),
      ('${R_APAGAR}', '${GOV_ORG}', 'Regra a apagar', 'lead.created', '{}', '[]', '${ACOES}', true);
    insert into public.crm_pastas_de_automacao (id, organization_id, nome) values
      ('${P_GOV}', '${GOV_ORG}', 'Pasta GOV'),
      ('${P_OUTRA}', '${OUTRA_ORG}', 'Pasta outra'),
      ('${P_EXCLUIR}', '${GOV_ORG}', 'Pasta a excluir');
  `);
});

describe("estrutura", () => {
  it("as três tabelas têm RLS e a trava do suporte", () => {
    for (const t of ["crm_pastas_de_automacao", "crm_automacoes_da_casca", "crm_automacoes_favoritas"]) {
      expect(sql(`select relrowsecurity from pg_class where oid = 'public.${t}'::regclass;`), t).toBe("t");
      expect(sql(`select count(*) from pg_policies where tablename = '${t}' and policyname like 'support_write_%';`), t).not.toBe("0");
    }
  });

  it("anon não lê as tabelas nem executa as funções", () => {
    for (const t of ["crm_pastas_de_automacao", "crm_automacoes_da_casca", "crm_automacoes_favoritas"]) {
      expect(sql(`select has_table_privilege('anon', 'public.${t}', 'select');`), t).toBe("f");
    }
    for (const f of ["fn_escale_duplicar_automacao(uuid,text)", "fn_escale_automacao_da_mesma_org()"]) {
      expect(sql(`select has_function_privilege('anon', 'public.${f}', 'execute');`), f).toBe("f");
    }
  });
});

describe("pastas", () => {
  it("gerente cria, renomeia e exclui", () => {
    const id = "e5ca1e00-9701-4000-8000-0000000000b9";
    expect(writeCountAs(GOV_MANAGER, `insert into public.crm_pastas_de_automacao (id, organization_id, nome) values ('${id}', '${GOV_ORG}', 'Nova')`)).toBe(1);
    expect(writeCountAs(GOV_MANAGER, `update public.crm_pastas_de_automacao set nome = 'Renomeada' where id = '${id}'`)).toBe(1);
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_pastas_de_automacao where id = '${id}'`)).toBe(1);
  });

  it("agente não cria", () => {
    expect(
      writeCountAs(GOV_AGENT_A, `insert into public.crm_pastas_de_automacao (organization_id, nome) values ('${GOV_ORG}', 'Do agente')`),
    ).toBe(0);
    expect(sql(`select count(*) from public.crm_pastas_de_automacao where nome = 'Do agente';`)).toBe("0");
  });

  it("a outra organização não vê a pasta da GOV_ORG", () => {
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_pastas_de_automacao where id = '${P_OUTRA}';`)).toBe(0);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_pastas_de_automacao where id = '${P_GOV}';`)).toBe(1);
  });

  it("recusa cor e ícone fora da lista", () => {
    expect(erroDe(() => sql(`insert into public.crm_pastas_de_automacao (organization_id, nome, cor) values ('${GOV_ORG}', 'x', 'purple');`))).toMatch(/check/);
    expect(erroDe(() => sql(`insert into public.crm_pastas_de_automacao (organization_id, nome, icone) values ('${GOV_ORG}', 'x', 'x');`))).toMatch(/check/);
  });
});

describe("organização da regra", () => {
  it("gerente grava pasta e forma; forma inválida é recusada", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `insert into public.crm_automacoes_da_casca (rule_id, organization_id, pasta_id, forma) values ('${R1}', '${GOV_ORG}', '${P_GOV}', 'editor')`,
      ),
    ).toBe(1);
    expect(erroDe(() => sql(`update public.crm_automacoes_da_casca set forma = 'lista' where rule_id = '${R1}';`))).toMatch(/check/);
  });

  it("linha com organização diferente da regra é recusada pelo gatilho", () => {
    expect(
      erroDe(() =>
        sql(`insert into public.crm_automacoes_da_casca (rule_id, organization_id) values ('${R2}', '${OUTRA_ORG}');`),
      ),
    ).toMatch(/automacao_de_outra_organizacao/);
  });

  it("pasta de outra organização viola a FK composta", () => {
    expect(
      erroDe(() =>
        sql(`insert into public.crm_automacoes_da_casca (rule_id, organization_id, pasta_id) values ('${R2}', '${GOV_ORG}', '${P_OUTRA}');`),
      ),
    ).toMatch(/foreign key|violates/);
  });

  it("excluir a pasta solta a regra, mantendo a linha e a forma; excluir a regra apaga a linha", () => {
    sql(`
      insert into public.crm_automacoes_da_casca (rule_id, organization_id, pasta_id, forma) values ('${R2}', '${GOV_ORG}', '${P_EXCLUIR}', 'fluxo');
      delete from public.crm_pastas_de_automacao where id = '${P_EXCLUIR}';
    `);
    expect(sql(`select coalesce(pasta_id::text, 'nulo') || '|' || forma from public.crm_automacoes_da_casca where rule_id = '${R2}';`)).toBe("nulo|fluxo");
    sql(`
      insert into public.crm_automacoes_da_casca (rule_id, organization_id) values ('${R_APAGAR}', '${GOV_ORG}');
      delete from public.automation_rules where id = '${R_APAGAR}';
    `);
    expect(sql(`select count(*) from public.crm_automacoes_da_casca where rule_id = '${R_APAGAR}';`)).toBe("0");
  });
});

describe("favoritos", () => {
  it("cada pessoa vê só os seus", () => {
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_automacoes_favoritas (user_id, rule_id, organization_id) values ('${GOV_MANAGER}', '${R1}', '${GOV_ORG}')`),
    ).toBe(1);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_automacoes_favoritas where rule_id = '${R1}';`)).toBe(1);
    expect(countAs(GOV_ADMIN, `select count(*) from public.crm_automacoes_favoritas where rule_id = '${R1}';`)).toBe(0);
  });

  it("agente não grava favorito", () => {
    expect(
      writeCountAs(GOV_AGENT_A, `insert into public.crm_automacoes_favoritas (user_id, rule_id, organization_id) values ('${GOV_AGENT_A}', '${R1}', '${GOV_ORG}')`),
    ).toBe(0);
  });

  it("excluir a regra apaga o favorito", () => {
    sql(`
      insert into public.automation_rules (id, organization_id, name, trigger_event, conditions, actions) values
        ('e5ca1e00-9701-4000-8000-0000000000a5', '${GOV_ORG}', 'Efêmera', 'lead.created', '[]', '${ACOES}');
      insert into public.crm_automacoes_favoritas (user_id, rule_id, organization_id) values ('${GOV_MANAGER}', 'e5ca1e00-9701-4000-8000-0000000000a5', '${GOV_ORG}');
      delete from public.automation_rules where id = 'e5ca1e00-9701-4000-8000-0000000000a5';
    `);
    expect(sql(`select count(*) from public.crm_automacoes_favoritas where rule_id = 'e5ca1e00-9701-4000-8000-0000000000a5';`)).toBe("0");
  });
});

describe("duplicar", () => {
  it("gerente copia pausada, com a pasta e a forma", () => {
    sql(`
      insert into public.crm_automacoes_da_casca (rule_id, organization_id, pasta_id, forma) values ('${R1}', '${GOV_ORG}', '${P_GOV}', 'editor')
        on conflict (rule_id) do update set pasta_id = excluded.pasta_id, forma = excluded.forma;
    `);
    const nova = lastLine(como(GOV_MANAGER, `select public.fn_escale_duplicar_automacao('${R1}', 'Cópia 9701 A');`));
    expect(nova).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      sql(`select name, is_active, trigger_event, trigger_config::text, conditions::text, last_change_actor_kind from public.automation_rules where id = '${nova}';`),
    ).toBe(`Cópia 9701 A|f|lead.created|{"tag": "a"}|[]|user`);
    expect(sql(`select actions = (select actions from public.automation_rules where id = '${R1}') from public.automation_rules where id = '${nova}';`)).toBe("t");
    expect(sql(`select pasta_id::text || '|' || forma from public.crm_automacoes_da_casca where rule_id = '${nova}';`)).toBe(`${P_GOV}|editor`);
  });

  it("regra sem linha na 9701 gera cópia com pasta e forma nulas", () => {
    sql(`delete from public.crm_automacoes_da_casca where rule_id = '${R2}';`);
    const nova = lastLine(como(GOV_MANAGER, `select public.fn_escale_duplicar_automacao('${R2}', 'Cópia 9701 B');`));
    expect(sql(`select coalesce(pasta_id::text, 'nulo') || '|' || coalesce(forma, 'nulo') from public.crm_automacoes_da_casca where rule_id = '${nova}';`)).toBe("nulo|nulo");
  });

  it("agente não duplica", () => {
    expect(erroDe(() => como(GOV_AGENT_A, `select public.fn_escale_duplicar_automacao('${R1}', 'Cópia 9701 C');`))).toMatch(/row-level security|automacao_nao_encontrada/);
  });

  it("regra da outra organização não é encontrada", () => {
    expect(erroDe(() => como(GOV_MANAGER, `select public.fn_escale_duplicar_automacao('${R_OUTRA}', 'Cópia 9701 D');`))).toMatch(/automacao_nao_encontrada/);
  });

  it("nome de 200 letras vira 120", () => {
    const nova = lastLine(como(GOV_MANAGER, `select public.fn_escale_duplicar_automacao('${R1}', '${"a".repeat(200)}');`));
    expect(sql(`select char_length(name) from public.automation_rules where id = '${nova}';`)).toBe("120");
    sql(`delete from public.automation_rules where id = '${nova}';`);
  });
});
