import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * FICHA DO CONTATO E MESCLA (fork Escale, migration 9106) — prova contra Postgres
 * real: a chave do telefone com o nono dígito, as chaves que repetem (só da
 * organização de quem pede), a mescla com as escolhas (só gerente+; o telefone do
 * secundário vai para o principal) e a nota solta do contato (organização vê;
 * agente+ escreve; sem negócio nem contato, recusa). Roda via `pnpm test:db`.
 */
const C1 = "e5ca1e00-9106-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9106-4000-8000-0000000000c2";
const C3 = "e5ca1e00-9106-4000-8000-0000000000c3";
const C4 = "e5ca1e00-9106-4000-8000-0000000000c4";
const C5 = "e5ca1e00-9106-4000-8000-0000000000c5";

const chaves = (quem: string, filtro: string) =>
  countAs(quem, `select count(*) from public.fn_escale_chaves_de_mescla('${GOV_ORG}') k where k.contato_id::text like 'e5ca1e00-9106-%' and ${filtro}`);

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_notas_do_negocio where contact_id::text like 'e5ca1e00-9106-%';
    delete from public.contacts where id::text like 'e5ca1e00-9106-%';
    insert into public.contacts (id, organization_id, display_name, phone_number, email, custom_fields, created_at) values
      ('${C1}', '${GOV_ORG}', 'Mescla Um', '+5543998031566', null, '{}'::jsonb, now() - interval '3 days'),
      ('${C2}', '${GOV_ORG}', 'Mescla Dois', '+554398031566', 'mescla9106@x.com', '{"link_instagram":"https://instagram.com/mescla9106"}'::jsonb, now() - interval '2 days'),
      ('${C3}', '${GOV_ORG}', 'Mescla Tres', null, 'mescla9106@x.com', '{"link_instagram":"https://www.instagram.com/Mescla9106/"}'::jsonb, now() - interval '1 day'),
      ('${C4}', '${GOV_ORG}', 'Mescla Quatro', '+5521988887777', null, '{}'::jsonb, now()),
      ('${C5}', '${GOV_ORG}', 'Mescla Cinco', '+5521977776666', null, '{}'::jsonb, now());
  `);
});

describe("fn_escale_chave_do_telefone", () => {
  it("põe o nono no celular de 12 dígitos e mantém o resto", () => {
    expect(sql(`select public.fn_escale_chave_do_telefone('+554398031566');`)).toBe("5543998031566");
    expect(sql(`select public.fn_escale_chave_do_telefone('+5543998031566');`)).toBe("5543998031566");
    expect(sql(`select public.fn_escale_chave_do_telefone('+554332345678');`)).toBe("554332345678");
    expect(sql(`select public.fn_escale_chave_do_telefone('+14155550000');`)).toBe("14155550000");
    expect(sql(`select coalesce(public.fn_escale_chave_do_telefone(''), 'nulo');`)).toBe("nulo");
  });
});

describe("fn_escale_chaves_de_mescla", () => {
  it("telefone com e sem o nono, e-mail e Instagram repetidos; o sozinho fica fora", () => {
    expect(chaves(GOV_VIEWER, `k.regra = 'telefone'`)).toBe(2);
    expect(chaves(GOV_VIEWER, `k.regra = 'email'`)).toBe(2);
    expect(chaves(GOV_VIEWER, `k.regra = 'instagram' and k.chave = 'mescla9106'`)).toBe(2);
    expect(chaves(GOV_VIEWER, `k.contato_id = '${C4}'`)).toBe(0);
  });
});

describe("fn_escale_mesclar_contatos", () => {
  it("atendente não mescla", () => {
    expect(() =>
      countAs(GOV_AGENT_A, `select count(*) from (select public.fn_escale_mesclar_contatos('${GOV_ORG}', '${C1}', array['${C2}']::uuid[], '{}'::jsonb)) x`),
    ).toThrow(/insufficient_role/);
  });

  it("gerente mescla e o principal fica com o e-mail escolhido do secundário", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from (select public.fn_escale_mesclar_contatos('${GOV_ORG}', '${C1}', array['${C2}']::uuid[], '{"email":"escolhido9106@x.com","nome":"Mescla Final"}'::jsonb)) x`,
      ),
    ).toBe(1);
    expect(sql(`select is_merged_into from public.contacts where id = '${C2}';`)).toBe(C1);
    expect(sql(`select name || '|' || email from public.contacts where id = '${C1}';`)).toBe("Mescla Final|escolhido9106@x.com");
  });

  it("o telefone de um terceiro contato vivo volta tudo, com identidade_em_uso", () => {
    expect(() =>
      countAs(
        GOV_MANAGER,
        `select count(*) from (select public.fn_escale_mesclar_contatos('${GOV_ORG}', '${C4}', array['${C3}']::uuid[], '{"telefone":"+5521977776666"}'::jsonb)) x`,
      ),
    ).toThrow(/identidade_em_uso/);
    expect(sql(`select coalesce(is_merged_into::text, 'vivo') from public.contacts where id = '${C3}';`)).toBe("vivo");
  });
});

describe("a nota do contato (lead_id nulo)", () => {
  it("atendente grava; a organização vê; sem dono, recusa", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', null, '${C4}', '${GOV_AGENT_A}', 'nota solta 9106')`,
      ),
    ).toBe(1);
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_notas_do_negocio where contact_id = '${C4}'`)).toBe(1);
    expect(writeCountAs(GOV_VIEWER, `insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', null, '${C4}', '${GOV_VIEWER}', 'leitor não')`)).toBe(0);
    expect(() =>
      sql(`insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', null, null, '${GOV_AGENT_A}', 'sem dono');`),
    ).toThrow(/crm_notas_do_negocio_tem_dono/);
  });
});
