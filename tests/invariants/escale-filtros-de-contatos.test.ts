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
 * FILTROS DA LISTA DE CONTATOS (fork Escale, migration 9102) — prova contra
 * Postgres real: cada seção do filtro compilado (telefone, data, negócio, tags,
 * campos em grupos E/OU) restringe a lista com a RLS de quem olha; a lista de
 * 8 parâmetros conta o total filtrado; as funções são invoker e fechadas ao
 * anon; e os filtros salvos seguem as regras da 1D. Roda via `pnpm test:db`.
 */
const P = "e5ca1e00-9102-4000-8000-0000000000a1";
const S1 = "e5ca1e00-9102-4000-8000-0000000000b1";
const S2 = "e5ca1e00-9102-4000-8000-0000000000b2";
const C_ANA = "e5ca1e00-9102-4000-8000-0000000000c1"; // celular BR, VIP, negócio aberto do agent B (R$ 2.000, renda gravada como texto "1.500,00")
const C_BRUNO = "e5ca1e00-9102-4000-8000-0000000000c2"; // Portugal, frio, negócio perdido por preço, sem dono
const C_CARLA = "e5ca1e00-9102-4000-8000-0000000000c3"; // sem telefone, Instagram, nasceu em 1990
const C_DAVI = "e5ca1e00-9102-4000-8000-0000000000c4"; // +55 com 7 dígitos locais: inválido

const filtro = (f: object) => `'${JSON.stringify({ fuso: "America/Sao_Paulo", ...f })}'::jsonb`;
const contar = (f: object) =>
  `select count(*) from public.fn_escale_contatos_do_filtro('${GOV_ORG}', 'todos', 'filtrodois', null, null, ${filtro(f)})`;
const cond = (c: object) => ({
  campos: { combinar: "ou", grupos: [{ modo: "e", condicoes: [c] }] },
});

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_filtros_das_listas where organization_id = '${GOV_ORG}';
    delete from public.crm_leads where id::text like 'e5ca1e00-9102-%';
    delete from public.contacts where id::text like 'e5ca1e00-9102-%';
    delete from public.crm_stages where id::text like 'e5ca1e00-9102-%';
    delete from public.crm_pipelines where id::text like 'e5ca1e00-9102-%';
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${P}', '${GOV_ORG}', 'Filtros 2B', 'escale-filtros-2b');
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values
      ('${S1}', '${GOV_ORG}', '${P}', 'Entrada', 'entrada', 0),
      ('${S2}', '${GOV_ORG}', '${P}', 'Proposta', 'proposta', 1);
    insert into public.contacts (id, organization_id, display_name, phone_number, tags, custom_fields, birthdate, created_at, last_activity_at) values
      ('${C_ANA}', '${GOV_ORG}', 'Filtrodois Ana', '+5564999446816', '{VIP}', '{}'::jsonb, null, '2026-10-10 12:00-03', now()),
      ('${C_BRUNO}', '${GOV_ORG}', 'Filtrodois Bruno', '+351912345678', '{frio}', '{}'::jsonb, null, '2026-09-01 12:00-03', now() - interval '1 day'),
      ('${C_CARLA}', '${GOV_ORG}', 'Filtrodois Carla', null, '{}', '{"link_instagram":"https://instagram.com/carla"}'::jsonb, '1990-05-01', '2026-10-05 12:00-03', now() - interval '2 days'),
      ('${C_DAVI}', '${GOV_ORG}', 'Filtrodois Davi', '+55111234567', '{}', '{}'::jsonb, null, '2026-10-12 12:00-03', now() - interval '3 days');
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, owner_user_id, value_cents, custom_fields) values
      ('e5ca1e00-9102-4000-8000-0000000000d1', '${GOV_ORG}', '${P}', '${S1}', 'Da Ana', '${C_ANA}', '${GOV_AGENT_B}', 200000, '{"renda":"1.500,00"}'::jsonb);
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, status, lost_reason, closed_at) values
      ('e5ca1e00-9102-4000-8000-0000000000d2', '${GOV_ORG}', '${P}', '${S2}', 'Do Bruno', '${C_BRUNO}', 'lost', 'price', now());
  `);
});

describe("fn_escale_contatos_do_filtro", () => {
  it("sem filtro, os quatro", () => {
    expect(countAs(GOV_MANAGER, contar({}))).toBe(4);
  });

  it("Telefone: com, sem, internacional e inválido", () => {
    expect(countAs(GOV_MANAGER, contar({ telefone: "com" }))).toBe(3);
    expect(countAs(GOV_MANAGER, contar({ telefone: "sem" }))).toBe(1);
    expect(countAs(GOV_MANAGER, contar({ telefone: "internacional" }))).toBe(1);
    expect(countAs(GOV_MANAGER, contar({ telefone: "invalido" }))).toBe(1);
  });

  it("Data de criação no fuso da organização", () => {
    expect(
      countAs(GOV_MANAGER, contar({ criado_de: "2026-10-01", criado_ate: "2026-10-11" })),
    ).toBe(2);
  });

  it("Negócio: com, sem, status, motivo, dono — e o agent A não enxerga o negócio do B", () => {
    const n = (x: object) => ({
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
        ...x,
      },
    });
    expect(countAs(GOV_MANAGER, contar(n({})))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(n({ tem: "sem" })))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(n({ status: ["lost"] })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ motivos: ["price"] })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ sem_dono: true })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ com_dono: true })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ donos_usuarios: [GOV_AGENT_B] })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ etapas: [S2] })))).toBe(1);
    expect(countAs(GOV_AGENT_A, contar(n({})))).toBe(1);
  });

  it("Tags: possui (sem caixa), não possui, qualquer e sem", () => {
    const tg = (...condicoes: object[]) => ({
      tags: { combinar: "ou", grupos: [{ modo: "e", condicoes }] },
    });
    expect(countAs(GOV_MANAGER, contar(tg({ op: "possui", tag: "vip" })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(tg({ op: "nao_possui", tag: "vip" })))).toBe(3);
    expect(countAs(GOV_MANAGER, contar(tg({ op: "qualquer", tag: null })))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(tg({ op: "sem", tag: null })))).toBe(2);
  });

  it("Tags em grupos: E e OU dentro do grupo; OU soma e E cruza entre grupos", () => {
    const g = (modo: string, ...condicoes: object[]) => ({ modo, condicoes });
    const tg = (combinar: string, ...grupos: object[]) => ({ tags: { combinar, grupos } });
    const vip = { op: "possui", tag: "vip" };
    const frio = { op: "possui", tag: "frio" };
    expect(countAs(GOV_MANAGER, contar(tg("ou", g("ou", vip, frio))))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(tg("ou", g("e", vip, frio))))).toBe(0);
    expect(
      countAs(GOV_MANAGER, contar(tg("ou", g("e", vip), g("e", { op: "sem", tag: null })))),
    ).toBe(3);
    expect(
      countAs(
        GOV_MANAGER,
        contar(
          tg("e", g("e", { op: "qualquer", tag: null }), g("e", { op: "nao_possui", tag: "frio" })),
        ),
      ),
    ).toBe(1);
  });

  it("Campos do contato: contém (padrão), preenchido, data antes de", () => {
    expect(
      countAs(
        GOV_MANAGER,
        contar(
          cond({
            alvo: "contato",
            chave: "nome",
            tipo: "texto",
            op: "contem",
            valor: "ana",
            padrao: "ana",
          }),
        ),
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_MANAGER,
        contar(
          cond({
            alvo: "contato",
            chave: "nome",
            tipo: "texto",
            op: "nao_contem",
            valor: "ana",
            padrao: "ana",
          }),
        ),
      ),
    ).toBe(3);
    expect(
      countAs(
        GOV_MANAGER,
        contar(
          cond({
            alvo: "contato",
            chave: "link_instagram",
            tipo: "texto",
            op: "preenchido",
            valor: null,
            padrao: null,
          }),
        ),
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_MANAGER,
        contar(
          cond({
            alvo: "contato",
            chave: "nascimento",
            tipo: "data",
            op: "antes",
            valor: "2000-01-01",
            padrao: null,
          }),
        ),
      ),
    ).toBe(1);
  });

  it("Campos do negócio: valor maior que e campo do CRM igual", () => {
    expect(
      countAs(
        GOV_MANAGER,
        contar(
          cond({
            alvo: "negocio",
            chave: "valor",
            tipo: "numero",
            op: "maior",
            valor: "1000",
            padrao: null,
          }),
        ),
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_MANAGER,
        contar(
          cond({
            alvo: "negocio",
            chave: "renda",
            tipo: "numero",
            op: "igual",
            valor: "1500",
            padrao: null,
          }),
        ),
      ),
    ).toBe(1);
  });

  it("grupos: OU entre grupos soma; E entre grupos cruza; OU dentro do grupo", () => {
    const ana = {
      alvo: "contato",
      chave: "nome",
      tipo: "texto",
      op: "contem",
      valor: "ana",
      padrao: "ana",
    };
    const insta = {
      alvo: "contato",
      chave: "link_instagram",
      tipo: "texto",
      op: "preenchido",
      valor: null,
      padrao: null,
    };
    const dois = (combinar: string) => ({
      campos: {
        combinar,
        grupos: [
          { modo: "e", condicoes: [ana] },
          { modo: "e", condicoes: [insta] },
        ],
      },
    });
    expect(countAs(GOV_MANAGER, contar(dois("ou")))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(dois("e")))).toBe(0);
    expect(
      countAs(
        GOV_MANAGER,
        contar({ campos: { combinar: "e", grupos: [{ modo: "ou", condicoes: [ana, insta] }] } }),
      ),
    ).toBe(2);
  });

  it("a lista de 8 parâmetros devolve o total filtrado", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', 'filtrodois', null, null, 100, 0, ${filtro({ telefone: "sem" })}) where total = 1`,
      ),
    ).toBe(1);
  });

  it("as funções são invoker e o anon não executa", () => {
    expect(
      Number(
        sql(
          `select count(*) from pg_proc where proname in ('fn_escale_contatos_do_filtro','fn_escale_passa_condicao','fn_escale_contato_passa','fn_escale_grupo_passa','fn_escale_negocio_passa','fn_escale_tags_passam','fn_escale_lista_de_contatos') and prosecdef;`,
        ).trim(),
      ),
    ).toBe(0);
    expect(
      sql(
        `select has_function_privilege('anon', 'public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb)', 'execute');`,
      ).trim(),
    ).toBe("f");
  });
});

describe("crm_filtros_das_listas", () => {
  const novo = (user: string, nome: string, compartilhado = false) =>
    `insert into public.crm_filtros_das_listas (organization_id, user_id, lista, nome, compartilhado, criterios) values ('${GOV_ORG}', '${user}', 'contatos', '${nome}', ${compartilhado}, '{}'::jsonb)`;

  it("cada um grava o seu; ninguém grava o de outro", () => {
    expect(writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, "Meu pessoal"))).toBe(1);
    expect(writeCountAs(GOV_VIEWER, novo(GOV_MANAGER, "Do gerente"))).toBe(0);
  });

  it("o pessoal só para quem criou; o compartilhado para a organização; só quem criou muda", () => {
    expect(writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, "Da equipe", true))).toBe(1);
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_filtros_das_listas where nome = 'Meu pessoal'`,
      ),
    ).toBe(0);
    expect(
      countAs(
        GOV_AGENT_A,
        `select count(*) from public.crm_filtros_das_listas where nome = 'Da equipe'`,
      ),
    ).toBe(1);
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `update public.crm_filtros_das_listas set nome = 'Tomado' where nome = 'Da equipe'`,
      ),
    ).toBe(0);
  });

  it("nome repetido (sem caixa) e lista inválida são recusados", () => {
    expect(() => writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, "MEU PESSOAL"))).toThrow();
    expect(() =>
      writeCountAs(
        GOV_VIEWER,
        `insert into public.crm_filtros_das_listas (organization_id, user_id, lista, nome) values ('${GOV_ORG}', '${GOV_VIEWER}', 'Contatos!', 'x')`,
      ),
    ).toThrow();
  });

  it("no máximo 20 por pessoa e lista", () => {
    for (let i = 3; i <= 20; i++)
      expect(writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, `F${i}`))).toBe(1);
    expect(() => writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, "F21"))).toThrow(
      /crm_filtros_das_listas_limite/,
    );
  });
});
