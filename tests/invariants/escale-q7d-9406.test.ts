import { readFileSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_MANAGER,
  GOV_ORG,
  indexExists,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * REVISÃO Q7d (fork Escale, migration 9406, G7-12) — prova de EQUIVALÊNCIA contra Postgres real.
 * A régua são as definições ANTIGAS (9102/9105), lidas das migrations e renomeadas `tst_*`: a
 * página nova tem de devolver, página a página, a MESMA sequência de ids, e o total novo tem de
 * ser o `total` antigo — com empate e nulo em `last_activity_at`, mesclados, pessoais, com e sem
 * negócio, nos quatro tamanhos de página, com filtros, e com a RLS de gerente e de atendente.
 * Roda via `pnpm test:db`.
 */
const P = "e5ca1e00-9406-4000-8000-";
const PIPE = `${P}0000000000a1`;
const STAGE = `${P}0000000000b1`;
const id = (n: number) => `${P}${String(1000 + n).padStart(12, "0")}`;
const idEmpresa = (n: number) => `${P}${String(5000 + n).padStart(12, "0")}`;
const CONTATOS = 70;
const EMPRESAS = 40;

function definicao(arquivo: string, assinatura: string): string {
  const m = readFileSync(`supabase/migrations/${arquivo}`, "utf8");
  const inicio = m.lastIndexOf(`create or replace function ${assinatura}(`);
  if (inicio < 0) throw new Error(`definição de ${assinatura} não encontrada em ${arquivo}`);
  return m.slice(inicio, m.indexOf("$$;", m.indexOf("as $$", inicio)) + 3);
}

/** As três funções ANTIGAS, com o nome trocado; a lista antiga chama o filtro antigo. */
function regua(): string {
  const filtroAntigo = definicao(
    "20261105120000_9105_empresas.sql",
    "public.fn_escale_contatos_do_filtro",
  ).replace("public.fn_escale_contatos_do_filtro(", "public.tst_contatos_9105(");
  const listaAntiga = definicao(
    "20261031120000_9102_filtros_de_contatos.sql",
    "public.fn_escale_lista_de_contatos",
  )
    .replace("public.fn_escale_lista_de_contatos(", "public.tst_lista_9102(")
    .replace("public.fn_escale_contatos_do_filtro(", "public.tst_contatos_9105(");
  const empresasAntiga = definicao(
    "20261105120000_9105_empresas.sql",
    "public.fn_escale_lista_de_empresas",
  ).replace("public.fn_escale_lista_de_empresas(", "public.tst_lista_empresas_9105(");
  return `${filtroAntigo}\n${listaAntiga}\n${empresasAntiga}`;
}

const comoPessoa = (quem: string, consulta: string) =>
  sql(`
    set role authenticated;
    select set_config('request.jwt.claims', '{"sub":"${quem}"}', false);
    ${consulta}
  `)
    .split("\n")
    .slice(-1)[0]!;

const fuso = (f: object) => `'${JSON.stringify({ fuso: "America/Sao_Paulo", ...f })}'::jsonb`;
const FILTROS_DE_CONTATOS = [
  "'{}'::jsonb",
  fuso({ telefone: "sem" }),
  fuso({ telefone: "com" }),
  fuso({
    tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "vip" }] }] },
  }),
  fuso({
    negocio: {
      tem: "com",
      origens: [],
      etapas: [],
      status: [],
      donos_usuarios: [],
      donos_agentes: [],
      sem_dono: false,
      com_dono: false,
      motivos: [],
    },
  }),
];

/**
 * Compara, para todas as combinações, a sequência de ids de cada página nova com a régua antiga.
 * A régua (definição da 9102 + filtro da 9105) roda UMA vez por combinação, numa página de 100 — o
 * conjunto cabe nela —, e a página nova de `tamanho` tem de ser a fatia exata dessa sequência.
 */
function compararContatos(quem: string, tamanho: number): string {
  const filtros = FILTROS_DE_CONTATOS.map((f) => `(${f})`).join(",");
  return comoPessoa(
    quem,
    `
    with combos as (
      select v, q, f from (values ('todos'),('pessoais'),('com_negocio'),('sem_negocio')) a(v)
        cross join (values (null::text),('q7d')) b(q)
        cross join (values ${filtros}) c(f)
    ),
    regua as (
      select combos.*,
        array(select contact_id from public.tst_lista_9102('${GOV_ORG}', v, q, null, null, 100, 0, f)) as velho100
      from combos
    ),
    pag as (
      select regua.*, g.p from regua cross join generate_series(0, ${Math.ceil((CONTATOS + 10) / tamanho)}) g(p)
    ),
    cmp as (
      select pag.*,
        array(select contact_id from public.fn_escale_lista_de_contatos('${GOV_ORG}', v, q, null, null, ${tamanho}, p * ${tamanho}, f)) as novo,
        velho100[p * ${tamanho} + 1 : p * ${tamanho} + ${tamanho}] as velho
      from pag
    )
    select count(*) filter (where novo is distinct from velho) || '|' || count(*) || '|' || coalesce(sum(cardinality(velho)), 0)
      from cmp;
  `,
  );
}

function compararTotais(quem: string): string {
  const filtros = FILTROS_DE_CONTATOS.map((f) => `(${f})`).join(",");
  return comoPessoa(
    quem,
    `
    with combos as (
      select v, q, null::text[] as d, f from (values ('todos'),('pessoais'),('com_negocio'),('sem_negocio')) a(v)
        cross join (values (null::text),('q7d')) b(q)
        cross join (values ${filtros}) c(f)
    ),
    cmp as (
      select combos.*,
        public.fn_escale_total_de_contatos('${GOV_ORG}', v, q, d, null, f) as novo,
        coalesce((select total from public.tst_lista_9102('${GOV_ORG}', v, q, d, null, 1, 0, f) limit 1), 0) as velho,
        (select count(*) from public.fn_escale_contatos_do_filtro('${GOV_ORG}', v, q, d, null, f)) as do_filtro,
        (select count(*) from public.tst_contatos_9105('${GOV_ORG}', v, q, d, null, f)) as do_filtro_antigo
      from combos
    )
    select count(*) filter (where novo is distinct from velho or do_filtro is distinct from do_filtro_antigo or do_filtro <> novo)
           || '|' || count(*) || '|' || max(novo) from cmp;
  `,
  );
}

const ESCOPOS = ["todas", "com_nome", "sem_nome"];
const FILTRO_DE_EMPRESA = `'{"campos":{"combinar":"ou","grupos":[{"modo":"e","condicoes":[{"alvo":"empresa","chave":"site","tipo":"texto","op":"contem","valor":"q7d","padrao":"q7d"}]}]}}'::jsonb`;

function compararEmpresas(quem: string, tamanho: number): string {
  return comoPessoa(
    quem,
    `
    with combos as (
      select e, q, d, f from (values ${ESCOPOS.map((e) => `('${e}')`).join(",")}) a(e)
        cross join (values (null::text),('q7d')) b(q)
        cross join (values (null::text),('0001')) c(d)
        cross join (values ('{}'::jsonb),(${FILTRO_DE_EMPRESA})) h(f)
    ),
    regua as (
      select combos.*,
        array(select row(company_id, contatos, negocios, negocio_unico, valor_aberto_cents, principal)::text
                from public.tst_lista_empresas_9105('${GOV_ORG}', e, q, d, f, 100, 0)) as velho100
      from combos
    ),
    pag as (select regua.*, g.p from regua cross join generate_series(0, ${Math.ceil((EMPRESAS + 10) / tamanho)}) g(p)),
    cmp as (
      select pag.*,
        array(select row(company_id, contatos, negocios, negocio_unico, valor_aberto_cents, principal)::text
                from public.fn_escale_lista_de_empresas('${GOV_ORG}', e, q, d, f, ${tamanho}, p * ${tamanho})) as novo,
        velho100[p * ${tamanho} + 1 : p * ${tamanho} + ${tamanho}] as velho
      from pag
    )
    select count(*) filter (where novo is distinct from velho)
           || '|' || count(*) || '|' || coalesce(sum(cardinality(velho)), 0) from cmp;
  `,
  );
}

function compararTotaisDeEmpresas(quem: string): string {
  return comoPessoa(
    quem,
    `
    with combos as (
      select e, q, d, f from (values ${ESCOPOS.map((e) => `('${e}')`).join(",")}) a(e)
        cross join (values (null::text),('q7d')) b(q)
        cross join (values (null::text),('0001')) c(d)
        cross join (values ('{}'::jsonb),(${FILTRO_DE_EMPRESA})) h(f)
    ),
    cmp as (
      select combos.*,
        public.fn_escale_total_de_empresas('${GOV_ORG}', e, q, d, f) as novo,
        coalesce((select total from public.tst_lista_empresas_9105('${GOV_ORG}', e, q, d, f, 1, 0) limit 1), 0) as velho
      from combos
    )
    select count(*) filter (where novo is distinct from velho) || '|' || count(*) || '|' || max(novo) from cmp;
  `,
  );
}

const limpar = () =>
  sql(`
    delete from public.crm_leads where id::text like '${P}%';
    delete from public.company_people where company_id::text like '${P}%';
    delete from public.companies where id::text like '${P}%';
    delete from public.contacts where id::text like '${P}%';
    delete from public.crm_stages where id::text like '${P}%';
    delete from public.crm_pipelines where id::text like '${P}%';
  `);

beforeAll(() => {
  seedGov();
  limpar();
  sql(`
    ${regua()}
    grant execute on function public.tst_contatos_9105(uuid, text, text, text[], text, jsonb) to authenticated;
    grant execute on function public.tst_lista_9102(uuid, text, text, text[], text, integer, integer, jsonb) to authenticated;
    grant execute on function public.tst_lista_empresas_9105(uuid, text, text, text, jsonb, integer, integer) to authenticated;
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${PIPE}', '${GOV_ORG}', 'Q7d', 'escale-q7d');
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position)
      values ('${STAGE}', '${GOV_ORG}', '${PIPE}', 'Entrada', 'entrada', 0);

    -- 70 contatos: nulo (i%7), EMPATE (i%5 → mesmo instante), distintos; 1 a cada 11 pessoal;
    -- 1 a cada 13 mesclado; telefone em 3 de 4; tag em metade.
    insert into public.contacts
      (id, organization_id, display_name, phone_number, tags, is_personal, last_activity_at, is_merged_into)
    select ('${P}' || lpad((1000 + i)::text, 12, '0'))::uuid,
           '${GOV_ORG}',
           'Q7d Pessoa ' || i,
           case when i % 4 = 0 then null else '+556499900' || lpad(i::text, 4, '0') end,
           case when i % 2 = 0 then array['vip'] else array[]::text[] end,
           i % 11 = 0,
           case when i % 7 = 0 then null
                when i % 5 = 0 then timestamptz '2026-01-01 12:00:00+00'
                else timestamptz '2026-06-01 12:00:00+00' - (i || ' hours')::interval end,
           null
      from generate_series(1, ${CONTATOS}) i;
    update public.contacts set is_merged_into = '${id(1)}'
     where id::text like '${P}%' and (right(id::text, 4)::int - 1000) % 13 = 0;

    -- negócios: um do atendente B em 1 de 3; um sem dono em 1 de 6 (alguns contatos com dois)
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, owner_user_id)
    select ('${P}' || lpad((2000 + i)::text, 12, '0'))::uuid, '${GOV_ORG}', '${PIPE}', '${STAGE}',
           'Q7d neg ' || i, ('${P}' || lpad((1000 + i)::text, 12, '0'))::uuid,
           case when i % 6 = 0 then null else '${GOV_AGENT_B}'::uuid end
      from generate_series(1, ${CONTATOS}) i where i % 3 = 0 or i % 6 = 0 or i % 10 = 0;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, owner_user_id)
    select ('${P}' || lpad((3000 + i)::text, 12, '0'))::uuid, '${GOV_ORG}', '${PIPE}', '${STAGE}',
           'Q7d neg2 ' || i, ('${P}' || lpad((1000 + i)::text, 12, '0'))::uuid, null
      from generate_series(1, ${CONTATOS}) i where i % 6 = 0;

    -- 40 empresas: nome fantasia, só razão social, sem nome; updated_at com EMPATE; CNPJ em parte
    insert into public.companies
      (id, organization_id, trade_name, legal_name, normalized_cnpj, custom_fields, updated_at)
    select ('${P}' || lpad((5000 + i)::text, 12, '0'))::uuid, '${GOV_ORG}',
           case when i % 3 = 0 then 'Q7d Fantasia ' || i else null end,
           case when i % 3 = 1 then 'Q7d Razao ' || i else null end,
           case when i % 2 = 0 then '1234567800' || lpad(i::text, 4, '0') else null end,
           case when i % 4 = 0 then '{"site":"q7d.com.br"}'::jsonb else '{}'::jsonb end,
           case when i % 5 = 0 then timestamptz '2026-02-01 12:00:00+00'
                else timestamptz '2026-06-01 12:00:00+00' - (i || ' hours')::interval end
      from generate_series(1, ${EMPRESAS}) i;
  `);
});

afterAll(() => {
  limpar();
  sql(`
    drop function if exists public.tst_lista_9102(uuid, text, text, text[], text, integer, integer, jsonb);
    drop function if exists public.tst_contatos_9105(uuid, text, text, text[], text, jsonb);
    drop function if exists public.tst_lista_empresas_9105(uuid, text, text, text, jsonb, integer, integer);
  `);
});

describe("contatos: a página nova é igual à antiga", () => {
  it.each([
    ["gerente", GOV_MANAGER],
    ["atendente A", GOV_AGENT_A],
    ["atendente B", GOV_AGENT_B],
  ])("%s: mesma sequência de ids em toda página, nos 4 tamanhos", (_nome, quem) => {
    for (const tamanho of [10, 25, 50, 100]) {
      const [divergentes, paginas, linhas] = compararContatos(quem, tamanho).split("|");
      expect(divergentes, `tamanho ${tamanho}`).toBe("0");
      expect(Number(paginas)).toBeGreaterThan(0);
      // a prova não é vazia: a régua devolveu linhas de verdade
      expect(Number(linhas), `tamanho ${tamanho}`).toBeGreaterThan(50);
    }
  }, 300_000);

  it.each([
    ["gerente", GOV_MANAGER],
    ["atendente A", GOV_AGENT_A],
  ])("%s: o total novo é o total antigo (e o contatos_do_filtro não mudou)", (_nome, quem) => {
    const [divergentes, combinacoes, maior] = compararTotais(quem).split("|");
    expect(divergentes).toBe("0");
    expect(Number(combinacoes)).toBe(4 * 2 * FILTROS_DE_CONTATOS.length);
    expect(Number(maior)).toBeGreaterThan(40);
  });

  it("a busca pelos dígitos do telefone devolve a mesma página e o mesmo total", () => {
    const r = comoPessoa(
      GOV_MANAGER,
      `select (array(select contact_id from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', null, array['6499900'], null, 100, 0, '{}'::jsonb))
              = array(select contact_id from public.tst_lista_9102('${GOV_ORG}', 'todos', null, array['6499900'], null, 100, 0, '{}'::jsonb)))
         || '|' || cardinality(array(select contact_id from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', null, array['6499900'], null, 100, 0, '{}'::jsonb)));`,
    );
    const [igual, quantos] = r.split("|");
    expect(igual).toBe("true");
    expect(Number(quantos)).toBeGreaterThan(20);
  });

  it("percorrer todas as páginas não repete nem perde ninguém", () => {
    const r = comoPessoa(
      GOV_MANAGER,
      `
      with todas as (
        select c.contact_id, g.p
          from generate_series(0, 9) g(p),
               lateral public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', 'q7d', null, null, 10, g.p * 10, '{}'::jsonb) c
      )
      select (select count(*) from todas) || '|' || (select count(distinct contact_id) from todas)
             || '|' || public.fn_escale_total_de_contatos('${GOV_ORG}', 'todos', 'q7d', null, null, '{}'::jsonb)
             || '|' || (select count(*) from (
                  select c.id from public.contacts c
                   where c.organization_id = '${GOV_ORG}' and c.kind = 'person' and c.is_merged_into is null
                     and not c.is_personal and c.display_name ~* 'q7d'
                  except select contact_id from todas) f);
    `,
    );
    const [linhas, distintas, total, faltando] = r.split("|").map(Number) as [
      number,
      number,
      number,
      number,
    ];
    expect(linhas).toBe(distintas); // ninguém repetido
    expect(linhas).toBe(total); // o total é o que as páginas somam
    expect(faltando).toBe(0); // ninguém sumiu
    expect(total).toBeGreaterThan(40);
  });

  it("o atendente enxerga menos negócios que o gerente, e a página nova respeita isso", () => {
    const negocios = (quem: string) =>
      comoPessoa(
        quem,
        `select coalesce(sum(negocios), 0) from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', 'q7d', null, null, 100, 0, '{}'::jsonb);`,
      );
    expect(Number(negocios(GOV_MANAGER))).toBeGreaterThan(Number(negocios(GOV_AGENT_A)));
  });
});

describe("empresas: a página nova é igual à antiga", () => {
  it.each([
    ["gerente", GOV_MANAGER],
    ["atendente A", GOV_AGENT_A],
  ])("%s: mesma sequência de ids e mesmas colunas, nos 4 tamanhos", (_nome, quem) => {
    for (const tamanho of [10, 25, 50, 100]) {
      const [divergentes, paginas, linhas] = compararEmpresas(quem, tamanho).split("|");
      expect(divergentes, `tamanho ${tamanho}`).toBe("0");
      expect(Number(paginas)).toBeGreaterThan(0);
      expect(Number(linhas), `tamanho ${tamanho}`).toBeGreaterThan(20);
    }
  }, 300_000);

  it("o total novo é o total antigo", () => {
    const [divergentes, combinacoes, maior] = compararTotaisDeEmpresas(GOV_MANAGER).split("|");
    expect(divergentes).toBe("0");
    expect(Number(combinacoes)).toBe(3 * 2 * 2 * 2);
    expect(Number(maior)).toBeGreaterThanOrEqual(EMPRESAS);
  });
});

describe("portas e índices", () => {
  it("as seis funções novas e as duas reescritas são invoker, e o anon não executa", () => {
    const nomes = [
      "fn_escale_contato_do_filtro_passa",
      "fn_escale_total_de_contatos",
      "fn_escale_lista_de_contatos",
      "fn_escale_contatos_do_filtro",
      "fn_escale_empresa_do_filtro_passa",
      "fn_escale_total_de_empresas",
      "fn_escale_lista_de_empresas",
    ];
    expect(
      sql(
        `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in (${nomes
          .map((n) => `'${n}'`)
          .join(",")}) and prosecdef;`,
      ),
    ).toBe("0");
    expect(
      sql(
        `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in (${nomes
          .map((n) => `'${n}'`)
          .join(",")}) and has_function_privilege('anon', oid, 'execute');`,
      ),
    ).toBe("0");
    expect(
      sql(
        `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in (${nomes
          .map((n) => `'${n}'`)
          .join(",")}) and has_function_privilege('authenticated', oid, 'execute');`,
      ),
    ).toBe(String(nomes.length));
  });

  it("a lista não devolve mais a coluna total", () => {
    expect(
      sql(
        `select count(*) from pg_proc where pronamespace = 'public'::regnamespace
           and proname in ('fn_escale_lista_de_contatos', 'fn_escale_lista_de_empresas')
           and 'total' = any(proargnames);`,
      ),
    ).toBe("0");
  });

  it("os dois índices existem e a ordem da lista vem do índice (sem Sort)", () => {
    expect(indexExists("idx_contacts_org_atividade")).toBe(true);
    expect(indexExists("idx_companies_org_atualizada")).toBe(true);
    const plano = (consulta: string) =>
      sql(`
        set enable_seqscan = off; set enable_bitmapscan = off;
        explain (costs off) ${consulta}
      `);
    const dosContatos = plano(`
      select c.id from public.contacts c
       where c.organization_id = '${GOV_ORG}' and c.kind = 'person' and c.is_merged_into is null
         and public.fn_escale_contato_do_filtro_passa(c, 'todos', null, null, null, '{}'::jsonb)
       order by c.last_activity_at desc nulls last, c.id desc limit 10 offset 10`);
    expect(dosContatos).toContain("idx_contacts_org_atividade");
    expect(dosContatos).not.toMatch(/Sort/);
    const dasEmpresas = plano(`
      select co.id from public.companies co
       where co.organization_id = '${GOV_ORG}'
         and public.fn_escale_empresa_do_filtro_passa(co, 'todas', null, null, '{}'::jsonb)
       order by co.updated_at desc, co.id desc limit 10 offset 10`);
    expect(dasEmpresas).toContain("idx_companies_org_atualizada");
    expect(dasEmpresas).not.toMatch(/Sort/);
  });
});
