import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261031120000_9102_filtros_de_contatos.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");

describe("migration 9102 (filtros da lista de contatos)", () => {
  it("existe e começa pela linha do manifesto", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(readFileSync(ARQUIVO, "utf8").startsWith("-- manifest:")).toBe(true);
  });

  const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

  it("toda função é invoker, com search_path, e fechada ao anon", () => {
    for (const nome of [
      "fn_escale_passa_condicao",
      "fn_escale_contato_passa",
      "fn_escale_grupo_passa",
      "fn_escale_negocio_passa",
      "fn_escale_tags_passam",
      "fn_escale_contatos_do_filtro",
      "fn_escale_lista_de_contatos",
      "fn_crm_filtros_das_listas_limite",
    ]) {
      expect(MIGRATION).toMatch(
        new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`),
      );
      expect(MIGRATION).toMatch(
        new RegExp(`revoke all on function public\\.${nome}\\([^)]*\\) from public, anon;`),
      );
    }
    expect(MIGRATION).not.toMatch(/security definer/);
  });

  it("a lista da 9101 é trocada pela de 8 parâmetros", () => {
    expect(MIGRATION).toContain(
      "drop function if exists public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer);",
    );
    expect(MIGRATION).toContain("p_filtros jsonb default '{}'::jsonb");
  });

  it("a tabela tem RLS, as duas policies, o limite e as travas do suporte", () => {
    expect(MIGRATION).toContain(
      "alter table public.crm_filtros_das_listas enable row level security;",
    );
    expect(MIGRATION).toContain("create policy crm_filtros_das_listas_select");
    expect(MIGRATION).toContain("create policy crm_filtros_das_listas_dono_write");
    expect(MIGRATION).toContain("create trigger trg_crm_filtros_das_listas_limite");
    expect(MIGRATION).toContain("fn_aplicar_travas_de_suporte");
  });

  it("o baseline traz o mesmo bloco, depois do da 9101", () => {
    const i9101 = BASELINE.indexOf("FORK ESCALE · lista de contatos da casca (migration 9101)");
    const i9102 = BASELINE.indexOf("FORK ESCALE · filtros da lista de contatos (migration 9102)");
    expect(i9101).toBeGreaterThan(-1);
    expect(i9102).toBeGreaterThan(i9101);
    expect(BASELINE).toContain(MIGRATION.trimEnd());
  });
});
