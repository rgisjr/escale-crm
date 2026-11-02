import { beforeAll, describe, expect, it } from "vitest";

import { GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * ORIGEM DO COMENTÁRIO (fork Escale, migration 9802) — prova contra Postgres real: o filtro
 * `comentario` de `fn_escale_contatos_do_filtro`, o gatilho que leva os disparos para o vencedor
 * da mescla e os limites das colunas da publicação. Roda via `pnpm test:db`.
 */
const ID = (sufixo: string) => `e5ca1e00-9802-4000-8000-${sufixo.padStart(12, "0")}`;
const REGRA = ID("a1");
const ANA = ID("c1"); // com disparo
const BRUNO = ID("c2"); // só com disparo repetido
const CARLA = ID("c3"); // sem disparo
const DAVI = ID("c4"); // com disparo
const EVA = ID("c5"); // sem disparo
const FRED = ID("c6"); // com disparo, mesclado em Eva depois
const ACOES = `[{"type":"send_instagram_message","config":{}}]`;

const filtro = (f: object) => `'${JSON.stringify({ fuso: "America/Sao_Paulo", ...f })}'::jsonb`;
const contar = (f: object) =>
  `select count(*) from public.fn_escale_contatos_do_filtro('${GOV_ORG}', 'todos', 'comentdois', null, null, ${filtro(f)})`;

const tentar = (consulta: string): string => {
  try {
    return sql(consulta);
  } catch (e) {
    return String((e as Error).message);
  }
};

const gravar = (contato: string, campos: Record<string, string | boolean>): string => {
  const base: Record<string, string | boolean> = {
    caminho_id: "qualquer",
    plataforma: "instagram",
    publicacao_id: "p-1",
    texto: "oi",
    ...campos,
  };
  const colunas = Object.keys(base).join(", ");
  const valores = Object.values(base)
    .map((v) => (typeof v === "boolean" ? String(v) : `'${v}'`))
    .join(", ");
  return tentar(
    `set role service_role; insert into public.escale_disparos_de_comentario (organization_id, rule_id, contact_id, comentado_em, ${colunas})
     values ('${GOV_ORG}', '${REGRA}', '${contato}', now(), ${valores});`,
  );
};

const donoDoDisparo = (comentarioId: string): string =>
  lastLine(
    sql(
      `select contact_id from public.escale_disparos_de_comentario where rule_id = '${REGRA}' and comentario_id = '${comentarioId}';`,
    ),
  );

const atualizadoEm = (comentarioId: string): string =>
  lastLine(
    sql(
      `select updated_at from public.escale_disparos_de_comentario where rule_id = '${REGRA}' and comentario_id = '${comentarioId}';`,
    ),
  );

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.escale_disparos_de_comentario where rule_id = '${REGRA}';
    delete from public.automation_rules where id = '${REGRA}';
    update public.contacts set is_merged_into = null where id::text like 'e5ca1e00-9802-%';
    delete from public.contacts where id::text like 'e5ca1e00-9802-%';
    insert into public.automation_rules (id, organization_id, name, trigger_event, trigger_config, conditions, actions, is_active)
      values ('${REGRA}', '${GOV_ORG}', 'Regra 9802', 'comment.received', '{}', '[]', '${ACOES}', true);
    insert into public.contacts (id, organization_id, display_name, phone_number, tags, custom_fields, last_activity_at) values
      ('${ANA}', '${GOV_ORG}', 'Comentdois Ana', '+5564999446816', '{}', '{}'::jsonb, now()),
      ('${BRUNO}', '${GOV_ORG}', 'Comentdois Bruno', null, '{}', '{}'::jsonb, now()),
      ('${CARLA}', '${GOV_ORG}', 'Comentdois Carla', null, '{}', '{}'::jsonb, now()),
      ('${DAVI}', '${GOV_ORG}', 'Comentdois Davi', null, '{}', '{}'::jsonb, now()),
      ('${EVA}', '${GOV_ORG}', 'Comentdois Eva', null, '{}', '{}'::jsonb, now()),
      ('${FRED}', '${GOV_ORG}', 'Comentdois Fred', null, '{}', '{}'::jsonb, now());
  `);
  gravar(ANA, { comentario_id: "c-ana", autor_id: "a-ana" });
  gravar(BRUNO, { comentario_id: "c-bruno", autor_id: "a-bruno", repetido: true });
  gravar(DAVI, { comentario_id: "c-davi", autor_id: "a-davi" });
  gravar(FRED, { comentario_id: "c-fred", autor_id: "a-fred" });
});

describe("filtro `comentario`", () => {
  it("com conta quem tem disparo (repetido incluído); sem conta o resto", () => {
    expect(countAs(GOV_MANAGER, contar({}))).toBe(6);
    expect(countAs(GOV_MANAGER, contar({ comentario: "com" }))).toBe(4);
    expect(countAs(GOV_MANAGER, contar({ comentario: "sem" }))).toBe(2);
  });

  it("combina com o telefone por E", () => {
    expect(countAs(GOV_MANAGER, contar({ comentario: "com", telefone: "com" }))).toBe(1);
    expect(countAs(GOV_MANAGER, contar({ comentario: "sem", telefone: "com" }))).toBe(0);
  });

  it("quem só olha vê os mesmos números; quem não é da organização vê 0", () => {
    expect(countAs(GOV_VIEWER, contar({ comentario: "com" }))).toBe(4);
    expect(countAs("e5ca1e00-9802-4000-8000-0000000000ff", contar({ comentario: "com" }))).toBe(0);
  });
});

describe("a mescla leva os disparos", () => {
  it("o disparo do contato mesclado passa ao vencedor", () => {
    const antes = atualizadoEm("c-davi");
    sql(`update public.contacts set is_merged_into = '${EVA}' where id = '${DAVI}';`);
    expect(donoDoDisparo("c-davi")).toBe(EVA);
    expect(atualizadoEm("c-davi")).not.toBe(antes);
    expect(donoDoDisparo("c-ana")).toBe(ANA);
    // Davi virou lápide e saiu da lista; Eva ganhou o disparo dele: Ana, Bruno, Eva e Fred.
    expect(countAs(GOV_MANAGER, contar({ comentario: "com" }))).toBe(4);
  });

  it("um terceiro mesclado em Eva depois também leva os dele", () => {
    sql(`update public.contacts set is_merged_into = '${EVA}' where id = '${FRED}';`);
    expect(donoDoDisparo("c-fred")).toBe(EVA);
    expect(countAs(GOV_MANAGER, contar({ comentario: "com" }))).toBe(3);
  });

  it("mudar outro campo do contato não mexe nos disparos", () => {
    const antes = atualizadoEm("c-ana");
    sql(`update public.contacts set display_name = 'Comentdois Ana Maria' where id = '${ANA}';`);
    expect(donoDoDisparo("c-ana")).toBe(ANA);
    expect(atualizadoEm("c-ana")).toBe(antes);
  });
});

describe("a função do gatilho", () => {
  it("ninguém logado executa; é definer com search_path vazio", () => {
    expect(tentar(`set role authenticated; select public.fn_escale_disparos_seguem_a_mescla();`)).toMatch(
      /permission denied/i,
    );
    expect(
      lastLine(sql(`select prosecdef from pg_proc where proname = 'fn_escale_disparos_seguem_a_mescla';`)),
    ).toBe("t");
    const config = sql(`select proconfig from pg_proc where proname = 'fn_escale_disparos_seguem_a_mescla';`);
    expect(config).toContain("search_path=");
    expect(config).not.toMatch(/public|pg_temp/);
  });
});

describe("colunas da publicação", () => {
  it("legenda de 301 e link de 2.001 caracteres são recusados; nulos entram", () => {
    expect(
      gravar(ANA, { comentario_id: "c-l", autor_id: "a-l", repetido: true, publicacao_legenda: "a".repeat(301) }),
    ).toMatch(/23514|check constraint/i);
    expect(
      gravar(ANA, { comentario_id: "c-k", autor_id: "a-k", repetido: true, publicacao_link: "a".repeat(2001) }),
    ).toMatch(/23514|check constraint/i);
    expect(gravar(ANA, { comentario_id: "c-n", autor_id: "a-n", repetido: true })).not.toMatch(/error/i);
  });
});
