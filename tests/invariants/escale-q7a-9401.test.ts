import { readFileSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  countAs,
  indexExists,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * REVISÃO Q7a (fork Escale, migration 9401) — prova contra Postgres real: os
 * índices das FKs e o da fila existem; o único admin ativo exporta direto mesmo
 * com um convite de admin pendente (B7-2); o público numa chamada só é o mesmo,
 * na mesma ordem, que as páginas da 9302 (G7-2); e a fila reescrita devolve,
 * página a página e com o cursor, EXATAMENTE o que a definição da 9204 devolvia,
 * nas duas ordens, com filtros e com a RLS do gerente e do atendente (G7-3).
 * Roda via `pnpm test:db`.
 */
const P = "e5ca1e00-9401-4000-8000-";
const ORG_SO = `${P}0000000000e1`;
const ADMIN_SO = `${P}0000000000e2`;
const CONVIDADO = `${P}0000000000e3`;
const C_SO = `${P}0000000000e4`;
const N = 30;
const hex = (i: number, prefixo: string) => `${P}${prefixo}${String(i).padStart(10, "0")}`;
const contato = (i: number) => hex(i, "c0");
const conversa = (i: number) => hex(i, "d0");

/** A definição da 9204, renomeada: a régua contra a qual a nova é comparada. */
function filaDa9204(): string {
  const m = readFileSync(
    "supabase/migrations/20261108120000_9204_filtros_e_acoes_em_massa_da_fila.sql",
    "utf8",
  );
  const inicio = m.indexOf("create or replace function public.fn_escale_fila_da_casca(");
  const fim = m.indexOf("$$;", inicio) + 3;
  if (inicio < 0 || fim < 3) throw new Error("definição da 9204 não encontrada");
  return m
    .slice(inicio, fim)
    .replace("public.fn_escale_fila_da_casca(", "public.tst_fila_da_9204(");
}

/** Roda como `authenticated` com o JWT da pessoa; devolve a última linha. */
const comoPessoa = (quem: string, consulta: string) =>
  lastLine(
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${quem}"}', false);
      ${consulta}
    `),
  );

type Cursor = { sort: string | null; id: string } | null;
type Linha = { id: string; sort: string | null };

function pagina(
  quem: string,
  funcao: string,
  filtro: string,
  ordem: "interacao" | "espera",
  cursor: Cursor,
  limite: number,
): Linha[] {
  const coluna = ordem === "espera" ? "awaiting_since" : "last_message_at";
  const depois = cursor
    ? `${cursor.sort === null ? "null" : `'${cursor.sort}'`}::timestamptz, '${cursor.id}'::uuid, ${cursor.sort === null}`
    : "null, null, false";
  const saida = comoPessoa(
    quem,
    `select coalesce(string_agg(x.id::text || '|' || coalesce(x.${coluna}::text, '~'), ',' order by x.n), '')
       from public.${funcao}('${GOV_ORG}', '${filtro}'::jsonb, '${ordem}', ${depois}, ${limite})
            with ordinality as x(${COLUNAS_DE_CONVERSAS}, n);`,
  );
  if (saida === "") return [];
  return saida.split(",").map((par) => {
    const [id, sort] = par.split("|");
    return { id: id!, sort: sort === "~" ? null : sort! };
  });
}

/** Percorre a fila inteira pelo cursor, como a tela faz. */
function percorrer(
  quem: string,
  funcao: string,
  filtro: string,
  ordem: "interacao" | "espera",
  limite: number,
): Linha[][] {
  const paginas: Linha[][] = [];
  let cursor: Cursor = null;
  for (let i = 0; i < 50; i++) {
    const p = pagina(quem, funcao, filtro, ordem, cursor, limite);
    paginas.push(p);
    if (p.length < limite) return paginas;
    const ultima = p[p.length - 1]!;
    cursor = { sort: ultima.sort, id: ultima.id };
  }
  throw new Error("a fila não terminou em 50 páginas");
}

let COLUNAS_DE_CONVERSAS = "";

beforeAll(() => {
  seedGov();
  COLUNAS_DE_CONVERSAS = sql(
    `select string_agg(quote_ident(attname), ', ' order by attnum) from pg_attribute
      where attrelid = 'public.conversations'::regclass and attnum > 0 and not attisdropped;`,
  ).trim();
  const contatos = Array.from(
    { length: N },
    (_, i) => `('${contato(i)}', '${GOV_ORG}', 'Filaquatro ${i}')`,
  ).join(",\n");
  const conversas = Array.from({ length: N }, (_, i) => {
    const dono = [GOV_AGENT_A, "null", GOV_AGENT_B][i % 3]!;
    const status = dono === "null" ? (i % 2 ? "open" : "closed") : "claimed";
    return `('${conversa(i)}', '${GOV_ORG}', '${contato(i)}', '${GOV_SESSION}', '${status}', ${
      dono === "null" ? "null" : `'${dono}'`
    }, ${dono === "null" ? "null" : "now()"})`;
  }).join(",\n");
  // Empates de propósito (grupos de 3 no mesmo instante) e nulos nas duas ordens.
  const ajustes = Array.from({ length: N }, (_, i) => {
    const ultima =
      i % 5 === 0
        ? "null"
        : `'2026-10-01T12:00:00Z'::timestamptz - interval '${Math.floor(i / 3)} minutes'`;
    const espera =
      i % 4 === 0 ? "null" : `'2026-10-01T10:00:00Z'::timestamptz + interval '${i % 7} minutes'`;
    return `update public.conversations set last_message_at = ${ultima}, awaiting_since = ${espera},
              unread_count_for_assignee = ${i % 2} where id = '${conversa(i)}';`;
  }).join("\n");
  sql(`
    delete from public.conversations where id::text like '${P}%';
    delete from public.contacts where id::text like '${P}%';
    insert into public.contacts (id, organization_id, display_name) values ${contatos};
    insert into public.conversations
      (id, organization_id, contact_id, channel_session_id, status, assigned_to_user_id, assigned_at)
      values ${conversas};
    ${ajustes}
    ${filaDa9204()}
    grant execute on function public.tst_fila_da_9204(uuid, jsonb, text, timestamptz, uuid, boolean, integer) to authenticated;
    insert into auth.users (id, email) values
      ('${ADMIN_SO}', 'q7a-admin-so@invariant.test'),
      ('${CONVIDADO}', 'q7a-convidado@invariant.test')
      on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_SO}', 'q7a-admin-unico', 'Q7a Admin Unico', 'Q7a SO') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${ADMIN_SO}', '${ORG_SO}', 'admin', now()),
             ('${CONVIDADO}', '${ORG_SO}', 'admin', null)
      on conflict do nothing;
    insert into public.contacts (id, organization_id, display_name) values ('${C_SO}', '${ORG_SO}', 'Q7a Sozinho');
  `);
});

afterAll(() => {
  sql(
    `drop function if exists public.tst_fila_da_9204(uuid, jsonb, text, timestamptz, uuid, boolean, integer);`,
  );
});

describe("índices da 9401 (G7-1, G7-7, G7-14, G7-3)", () => {
  it.each([
    "idx_crm_atividades_do_negocio_lead_id",
    "idx_crm_atividades_do_negocio_atividade",
    "idx_crm_mensagens_agendadas_contato",
    "idx_crm_mensagens_agendadas_conversa_fk",
    "idx_crm_mensagens_agendadas_dispositivo",
    "idx_crm_arquivos_do_contato_negocio",
    "idx_crm_setor_da_conversa_setor_anterior",
    "idx_crm_atividades_da_etapa_stage",
    "idx_conversations_org_fila_interacao",
  ])("%s existe", (indice) => {
    expect(indexExists(indice)).toBe(true);
  });

  it("cada FK coberta começa pela coluna da FK (o que a cascata procura)", () => {
    const def = (i: string) =>
      sql(
        `select indexdef from pg_indexes where schemaname = 'public' and indexname = '${i}';`,
      ).trim();
    expect(def("idx_crm_atividades_do_negocio_lead_id")).toMatch(/\(lead_id\)$/);
    expect(def("idx_crm_atividades_do_negocio_atividade")).toMatch(
      /\(atividade_id\) WHERE \(atividade_id IS NOT NULL\)$/,
    );
    expect(def("idx_crm_arquivos_do_contato_negocio")).toMatch(
      /\(organization_id, lead_id\) WHERE \(lead_id IS NOT NULL\)$/,
    );
    expect(def("idx_crm_setor_da_conversa_setor_anterior")).toMatch(
      /\(organization_id, setor_anterior_id\) WHERE \(setor_anterior_id IS NOT NULL\)$/,
    );
    expect(def("idx_conversations_org_fila_interacao")).toMatch(
      /\(organization_id, last_message_at DESC NULLS LAST, id DESC\)$/,
    );
  });
});

describe("fn_escale_admin_unico conta só admin que aceitou (B7-2)", () => {
  it("único admin ativo + convite de admin pendente: é o único, e a exportação não espera", () => {
    expect(comoPessoa(ADMIN_SO, `select public.fn_escale_admin_unico('${ORG_SO}');`)).toBe("t");
    expect(
      countAs(
        ADMIN_SO,
        `select quantidade from public.fn_escale_criar_acao_em_massa('${ORG_SO}', 'exportar', '{}'::jsonb,
           array['${C_SO}']::uuid[], 'todos', null, null, null, '{"fuso":"UTC"}'::jsonb, null, null)`,
      ),
    ).toBe(1);
    expect(
      sql(
        `select status from public.crm_acoes_em_massa where organization_id = '${ORG_SO}' order by created_at desc, id desc limit 1;`,
      ).trim(),
    ).toBe("na_fila");
  });

  it("o convite aceito vira segundo admin: deixa de ser único", () => {
    sql(
      `update public.user_organizations set accepted_at = now() where user_id = '${CONVIDADO}' and organization_id = '${ORG_SO}';`,
    );
    try {
      expect(comoPessoa(ADMIN_SO, `select public.fn_escale_admin_unico('${ORG_SO}');`)).toBe("f");
    } finally {
      sql(
        `update public.user_organizations set accepted_at = null where user_id = '${CONVIDADO}' and organization_id = '${ORG_SO}';`,
      );
    }
  });

  it("invoker e fechada ao anon", () => {
    expect(
      sql(`select prosecdef from pg_proc where proname = 'fn_escale_admin_unico';`).trim(),
    ).toBe("f");
    expect(
      sql(
        `select has_function_privilege('anon', 'public.fn_escale_admin_unico(uuid)', 'execute');`,
      ).trim(),
    ).toBe("f");
  });
});

describe("fn_escale_ids_do_publico (G7-2)", () => {
  const filtro = {
    selecao: {
      tipo: "filtro",
      visao: "todos",
      padrao: "filaquatro",
      digitos: null,
      cpf_hash: null,
      filtros: {},
      quantidade: null,
      excluidos: [contato(3)],
    },
    avulsos: [contato(1), contato(29)],
    removidos: [contato(5)],
  };
  const json = `'${JSON.stringify(filtro)}'::jsonb`;

  it("os mesmos ids, na mesma ordem, que a página da 9302", () => {
    const umaChamada = comoPessoa(
      GOV_MANAGER,
      `select array_to_string(public.fn_escale_ids_do_publico('${GOV_ORG}', ${json}), ',');`,
    );
    const paginas = comoPessoa(
      GOV_MANAGER,
      `select string_agg(contact_id::text, ',' order by posicao)
         from public.fn_escale_pagina_do_publico('${GOV_ORG}', ${json}, 1000, 0);`,
    );
    expect(umaChamada.split(",").length).toBeGreaterThan(20);
    expect(umaChamada).toBe(paginas);
    expect(umaChamada).not.toContain(contato(3));
    expect(umaChamada).not.toContain(contato(5));
  });

  it("vazio é array vazio; atendente não recebe ninguém", () => {
    const vazio = `'{"selecao":null,"avulsos":[],"removidos":[]}'::jsonb`;
    expect(
      comoPessoa(
        GOV_MANAGER,
        `select cardinality(public.fn_escale_ids_do_publico('${GOV_ORG}', ${vazio}));`,
      ),
    ).toBe("0");
    expect(
      comoPessoa(
        GOV_AGENT_A,
        `select cardinality(public.fn_escale_ids_do_publico('${GOV_ORG}', ${json}));`,
      ),
    ).toBe("0");
  });

  it("invoker, fechada ao anon e aberta ao authenticated", () => {
    expect(
      sql(`select prosecdef from pg_proc where proname = 'fn_escale_ids_do_publico';`).trim(),
    ).toBe("f");
    const pode = (papel: string) =>
      sql(
        `select has_function_privilege('${papel}', 'public.fn_escale_ids_do_publico(uuid, jsonb)', 'execute');`,
      ).trim();
    expect(pode("anon")).toBe("f");
    expect(pode("authenticated")).toBe("t");
  });
});

describe("fn_escale_fila_da_casca reescrita devolve o mesmo que a 9204 (G7-3)", () => {
  const filtros = [
    '{"fuso":"UTC"}',
    '{"fuso":"UTC","status":["em_aberto"]}',
    '{"fuso":"UTC","marcas":["nao_atribuidas"]}',
    '{"fuso":"UTC","marcas":["nao_lidas"],"busca":{"padrao":"%filaquatro%","digitos":null}}',
  ];
  const pessoas = [
    ["gerente", GOV_MANAGER],
    ["atendente", GOV_AGENT_A],
  ] as const;
  const casos = pessoas.flatMap(([rotulo, quem]) =>
    (["interacao", "espera"] as const).flatMap((ordem) =>
      filtros.map((filtro) => [rotulo, quem, ordem, filtro] as const),
    ),
  );

  it.each(casos)(
    "%s, ordem %s, filtro %s: página a página e pelo cursor",
    (_r, quem, ordem, filtro) => {
      const nova = percorrer(quem, "fn_escale_fila_da_casca", filtro, ordem, 7);
      const antiga = percorrer(quem, "tst_fila_da_9204", filtro, ordem, 7);
      expect(nova).toEqual(antiga);
      // A régua anda: o caso sem filtro do gerente vê as 30 e passa de uma página.
      if (quem === GOV_MANAGER && filtro === '{"fuso":"UTC"}') {
        expect(nova.flat().filter((l) => l.id.startsWith(P)).length).toBe(N);
        expect(nova.length).toBeGreaterThan(3);
      }
    },
  );

  it("o cursor numa linha de ordem nula (a cauda) também bate", () => {
    for (const ordem of ["interacao", "espera"] as const) {
      const cursor = { sort: null, id: conversa(ordem === "espera" ? 8 : 10) };
      expect(
        pagina(GOV_MANAGER, "fn_escale_fila_da_casca", '{"fuso":"UTC"}', ordem, cursor, 51),
      ).toEqual(pagina(GOV_MANAGER, "tst_fila_da_9204", '{"fuso":"UTC"}', ordem, cursor, 51));
    }
  });

  it("o total segue o mesmo da lista", () => {
    const filtro = '{"fuso":"UTC","busca":{"padrao":"%filaquatro%","digitos":null}}';
    const total = countAs(
      GOV_MANAGER,
      `select public.fn_escale_contar_fila_da_casca('${GOV_ORG}', '${filtro}'::jsonb)`,
    );
    expect(total).toBe(
      percorrer(GOV_MANAGER, "fn_escale_fila_da_casca", filtro, "interacao", 7).flat().length,
    );
  });

  it("invoker e fechada ao anon", () => {
    expect(
      sql(`select prosecdef from pg_proc where proname = 'fn_escale_fila_da_casca';`).trim(),
    ).toBe("f");
    expect(
      sql(
        `select has_function_privilege('anon', 'public.fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer)', 'execute');`,
      ).trim(),
    ).toBe("f");
  });
});
