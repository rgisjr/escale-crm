import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  "supabase/migrations/20261126120000_9406_q7d_paginacao_de_contatos_e_empresas.sql",
  "utf8",
);
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");

const FUNCOES = [
  "fn_escale_contato_do_filtro_passa(public.contacts, text, text, text[], text, jsonb)",
  "fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb)",
  "fn_escale_total_de_contatos(uuid, text, text, text[], text, jsonb)",
  "fn_escale_empresa_do_filtro_passa(public.companies, text, text, text, jsonb)",
  "fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer)",
  "fn_escale_total_de_empresas(uuid, text, text, text, jsonb)",
];

describe("migration 9406 (paginação de contatos e empresas, Q7d)", () => {
  it.each(FUNCOES)("%s: fechada ao anon, aberta ao authenticated e ao service_role", (assinatura) => {
    expect(MIGRATION).toContain(`revoke all on function public.${assinatura} from public, anon;`);
    expect(MIGRATION).toContain(
      `grant execute on function public.${assinatura} to authenticated, service_role;`,
    );
  });

  it("nenhuma função é definer e todas fixam o search_path", () => {
    expect(MIGRATION).not.toMatch(/security definer/i);
    const criadas = MIGRATION.match(/create or replace function/g)?.length ?? 0;
    expect(criadas).toBe(6);
    expect(MIGRATION.match(/security invoker/g)?.length).toBe(criadas);
    expect(MIGRATION.match(/set search_path = public, pg_temp/g)?.length).toBe(criadas);
  });

  it("a página sai sem o total: sem count(*) over () e sem a coluna total", () => {
    const codigo = MIGRATION.split("\n")
      .filter((l) => !l.startsWith("--"))
      .join("\n");
    expect(codigo).not.toMatch(/count\(\*\)\s+over\s*\(/i);
    expect(codigo).not.toMatch(/\btotal bigint\b/);
    expect(MIGRATION).toContain("returns table (contact_id uuid, negocios integer, negocio_unico uuid)");
    expect(MIGRATION).toContain(
      "returns table (company_id uuid, contatos integer, negocios integer, negocio_unico uuid, valor_aberto_cents bigint, principal uuid)",
    );
  });

  it("a página ordena nas colunas do índice, com desempate pelo id", () => {
    expect(MIGRATION).toContain("order by c.last_activity_at desc nulls last, c.id desc");
    expect(MIGRATION).toContain("order by co.updated_at desc, co.id desc");
    expect(MIGRATION).toContain("(organization_id, last_activity_at desc nulls last, id desc)");
    expect(MIGRATION).toContain("(organization_id, updated_at desc, id desc)");
  });

  it("derruba a lista de retorno antigo antes de recriar (muda o retorno)", () => {
    expect(MIGRATION).toContain(
      "drop function if exists public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb);",
    );
    expect(MIGRATION).toContain(
      "drop function if exists public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer);",
    );
  });

  it("o baseline traz o bloco antes da varredura de anon, e derruba a lista antiga antes de reaplicar a história", () => {
    const bloco = MIGRATION.slice(MIGRATION.indexOf("-- ---- FORK ESCALE · revisão Q7d: paginação de contatos e empresas (migration 9406) ----"));
    expect(BASELINE).toContain(bloco);
    expect(BASELINE.indexOf(bloco)).toBeLessThan(BASELINE.indexOf("VARREDURA anon: função nova nasce exposta"));
    for (const [marca, drop] of [
      ["FORK ESCALE · filtros da lista de contatos (migration 9102)", "drop function if exists public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb);"],
      ["FORK ESCALE · empresas da casca (migration 9105)", "drop function if exists public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer);"],
    ] as const) {
      const i = BASELINE.indexOf(marca);
      expect(i).toBeGreaterThan(-1);
      expect(BASELINE.slice(i, i + 600)).toContain(drop);
    }
  });
});
