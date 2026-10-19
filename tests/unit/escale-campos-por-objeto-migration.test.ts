import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261102120000_9104_campos_por_objeto.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

describe("migration 9104 (campos por objeto)", () => {
  it("existe e começa pela linha do manifesto", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
  });

  it("cria as duas tabelas com RLS, policies de leitura e de admin", () => {
    for (const tabela of ["crm_grupos_de_campos", "crm_campos_do_crm"]) {
      expect(MIGRATION).toContain(`create table if not exists public.${tabela}`);
      expect(MIGRATION).toContain(`alter table public.${tabela} enable row level security;`);
      expect(MIGRATION).toContain(`create policy ${tabela}_select`);
      expect(MIGRATION).toContain(`create policy ${tabela}_admin_write`);
      expect(MIGRATION).toContain(`revoke all on public.${tabela} from anon;`);
    }
  });

  it("o negócio ganha grupo e papel (o custom_fields da empresa está na 9105)", () => {
    expect(MIGRATION).toContain("alter table public.crm_campos_do_negocio add column if not exists grupo_id uuid");
    expect(MIGRATION).toContain("alter table public.crm_campos_do_negocio add column if not exists papel_minimo text");
    expect(MIGRATION).not.toContain("public.companies");
  });

  it("a semente é definer fechada e a validação aceita datetime", () => {
    expect(MIGRATION).toMatch(/function public\.fn_escale_semear_campos_padrao\(p_org uuid\)[\s\S]*?security definer/);
    expect(MIGRATION).toContain("revoke all on function public.fn_escale_semear_campos_padrao(uuid) from public, anon, authenticated;");
    expect(MIGRATION).toContain("grant execute on function public.fn_escale_semear_campos_padrao(uuid) to service_role;");
    expect(MIGRATION).toMatch(/fn_escale_campo_valido[\s\S]*?'datetime'/);
  });

  it("a check das ações em massa ganha alterar_campo e limpar_campo", () => {
    expect(MIGRATION).toContain("drop constraint if exists crm_acoes_em_massa_acao_valida");
    expect(MIGRATION).toMatch(/acao in \('criar_negocios', ?'incluir_tag', ?'remover_tag', ?'exportar', ?'excluir', ?'alterar_campo', ?'limpar_campo'\)/);
  });

  it("o baseline traz o mesmo bloco, depois do da 9103 e antes da 0323", () => {
    const i9103 = BASELINE.indexOf("FORK ESCALE · ações em massa das listas (migration 9103)");
    const i9104 = BASELINE.indexOf("FORK ESCALE · campos por objeto (migration 9104)");
    const i0323 = BASELINE.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(i9103).toBeGreaterThan(-1);
    expect(i9104).toBeGreaterThan(i9103);
    expect(i0323).toBeGreaterThan(i9104);
    // Outro bloco do fork pode ter entrado entre o corpo e o fecho (a chamada das travas): confere o corpo.
    expect(BASELINE).toContain(MIGRATION.slice(0, MIGRATION.lastIndexOf("do $f$")).trimEnd());
  });
});
