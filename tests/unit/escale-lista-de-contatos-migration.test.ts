import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  "supabase/migrations/20261030120000_9101_lista_de_contatos.sql",
  "utf8",
);
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");

describe("migration 9101 (lista de contatos da casca)", () => {
  it("a função é invoker, com search_path, e fechada ao anon", () => {
    expect(MIGRATION).toMatch(
      /fn_escale_lista_de_contatos[\s\S]*security invoker[\s\S]*set search_path = public, pg_temp/,
    );
    expect(MIGRATION).toMatch(
      /revoke all on function public\.fn_escale_lista_de_contatos\([^)]*\) from public, anon;/,
    );
  });

  it("a tabela tem RLS, as duas policies e as travas do suporte", () => {
    expect(MIGRATION).toContain(
      "alter table public.crm_colunas_das_listas enable row level security;",
    );
    expect(MIGRATION).toContain("create policy crm_colunas_das_listas_select");
    expect(MIGRATION).toContain("create policy crm_colunas_das_listas_pessoa_write");
    expect(MIGRATION).toContain("fn_aplicar_travas_de_suporte");
  });

  it("o baseline traz o mesmo bloco, depois do da 9007", () => {
    const i9007 = BASELINE.indexOf("FORK ESCALE · configurações da origem (migration 9007)");
    const i9101 = BASELINE.indexOf("FORK ESCALE · lista de contatos da casca (migration 9101)");
    expect(i9007).toBeGreaterThan(-1);
    expect(i9101).toBeGreaterThan(i9007);
    expect(BASELINE).toContain("create or replace function public.fn_escale_lista_de_contatos(");
    expect(BASELINE).toContain("create table if not exists public.crm_colunas_das_listas (");
  });
});
