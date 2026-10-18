import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261101120000_9103_acoes_em_massa.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

describe("migration 9103 (ações em massa)", () => {
  it("existe, com a linha do manifesto", () => {
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
  });

  it("as funções são invoker e fechadas ao anon; criar e aprovar emitem o evento", () => {
    for (const nome of [
      "fn_escale_admin_unico",
      "fn_escale_criar_acao_em_massa",
      "fn_escale_decidir_exportacao",
      "fn_crm_acoes_em_massa_trava_da_decisao",
    ]) {
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toMatch(new RegExp(`revoke all on function public\\.${nome}\\([^)]*\\) from public, anon;`));
    }
    expect(MIGRATION.match(/'contatos\.acao_em_massa_requested'/g)?.length).toBe(2);
    expect(MIGRATION).not.toMatch(/security definer/);
  });

  it("a exportação espera aprovação: os status, as policies do admin, a trava e os 7 dias", () => {
    expect(MIGRATION).toContain("'aguardando_aprovacao'");
    expect(MIGRATION).toContain("'recusada'");
    expect(MIGRATION).toContain("create policy crm_acoes_em_massa_select_admin");
    expect(MIGRATION).toContain("create policy crm_acoes_em_massa_decisao");
    expect(MIGRATION).toContain("create trigger trg_crm_acoes_em_massa_trava_da_decisao");
    expect(MIGRATION).toContain("interval '7 days'");
  });

  it("as duas tabelas têm RLS e as travas do suporte; o bucket é privado", () => {
    expect(MIGRATION).toContain("alter table public.crm_acoes_em_massa enable row level security;");
    expect(MIGRATION).toContain("alter table public.crm_acoes_em_massa_itens enable row level security;");
    expect(MIGRATION).toContain("fn_aplicar_travas_de_suporte");
    expect(MIGRATION).toMatch(/'exportacoes-das-listas',\s*'exportacoes-das-listas',\s*false/);
  });

  it("o baseline traz o mesmo bloco, depois do da 9102", () => {
    const i9102 = BASELINE.indexOf("FORK ESCALE · filtros da lista de contatos (migration 9102)");
    const i9103 = BASELINE.indexOf("FORK ESCALE · ações em massa das listas (migration 9103)");
    expect(i9102).toBeGreaterThan(-1);
    expect(i9103).toBeGreaterThan(i9102);
    expect(BASELINE).toContain(MIGRATION.trimEnd());
  });
});
