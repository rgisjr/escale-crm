import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261105120000_9105_empresas.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

const DEFINER = [
  "fn_escale_pessoa_do_contato(uuid, uuid)",
  "fn_escale_criar_empresa(uuid, uuid, text, text, text, text, uuid)",
  "fn_escale_vincular_contato_a_empresa(uuid, uuid, uuid, boolean)",
  "fn_escale_desvincular_contato_da_empresa(uuid, uuid, uuid, uuid)",
  "fn_escale_tornar_principal(uuid, uuid, uuid)",
  "fn_escale_excluir_empresa(uuid, uuid)",
];
const INVOKER = [
  "fn_escale_empresa_passa(public.companies, jsonb)",
  "fn_escale_grupo_da_empresa_passa(public.companies, jsonb)",
  "fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer)",
];

describe("migration 9105 (empresas)", () => {
  it("existe e começa pela linha do manifesto", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
  });

  it("liga o módulo e garante um principal por empresa", () => {
    expect(MIGRATION).toContain("'MODULO_CRM_B2B', 'ligado'");
    expect(MIGRATION).toContain("create unique index if not exists uq_company_people_um_principal");
  });

  it("as definer ficam fechadas ao authenticated e abertas ao service_role", () => {
    for (const f of DEFINER) {
      const nome = f.split("(")[0];
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security definer`));
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon, authenticated;`);
      expect(MIGRATION).toContain(`grant execute on function public.${f} to service_role;`);
    }
  });

  it("as invoker ficam fechadas ao anon", () => {
    for (const f of INVOKER) {
      const nome = f.split("(")[0];
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon;`);
    }
  });

  it("recria as duas funções da 9102 com a empresa", () => {
    expect(MIGRATION).toMatch(/create or replace function public\.fn_escale_contato_passa[\s\S]*?when 'empresa'/);
    expect(MIGRATION).toMatch(/create or replace function public\.fn_escale_contatos_do_filtro[\s\S]*?co\.trade_name ~\* p_padrao/);
  });

  it("o baseline traz o mesmo bloco no FIM do arquivo (companies e people só existem depois do bloco B2B do original)", () => {
    const i9104 = BASELINE.indexOf("FORK ESCALE · campos por objeto (migration 9104)");
    const i9105 = BASELINE.indexOf("FORK ESCALE · empresas da casca (migration 9105)");
    const iCompanies = BASELINE.indexOf("create table if not exists public.companies (");
    expect(i9104).toBeGreaterThan(-1);
    expect(i9105).toBeGreaterThan(i9104);
    expect(i9105).toBeGreaterThan(iCompanies);
    expect(BASELINE.trimEnd().endsWith(MIGRATION.trimEnd())).toBe(true);
  });

  it("companies.custom_fields nasce aqui, com a trava de objeto", () => {
    expect(MIGRATION).toContain("alter table public.companies add column if not exists custom_fields jsonb not null default '{}'::jsonb");
    expect(MIGRATION).toContain("companies_custom_fields_object");
  });
});
