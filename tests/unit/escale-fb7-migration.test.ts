import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261124120000_9404_fb7_banco_da_faixa_b.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";
const CABECALHO = "-- ---- FORK ESCALE · Faixa B FB7: banco da Faixa B (migration 9404) ----";

describe("migration 9404 (FB7: banco da Faixa B)", () => {
  it("existe, começa pelo manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe(CABECALHO);
  });

  it("idempotente e sem transação explícita", () => {
    expect(MIGRATION).not.toMatch(/^\s*(begin|commit)\s*;/im);
    expect(MIGRATION).not.toMatch(/create (table|policy)/i);
  });

  it("a FK do grupo do campo é composta com a organização (B7-5)", () => {
    expect(MIGRATION).toContain("foreign key (organization_id, grupo_id)");
    expect(MIGRATION).toContain("on delete set null (grupo_id)");
    expect(MIGRATION).toContain("unique (organization_id, id)");
  });

  it("função definer nova fechada a anon e authenticated; a de leitura só a anon", () => {
    expect(MIGRATION).toContain(
      "revoke all on function public.fn_escale_descartar_itens_da_massa() from public, anon, authenticated;",
    );
    expect(MIGRATION).toContain(
      "revoke all on function public.fn_escale_conversa_mais_recente_por_contato(uuid, uuid[]) from public, anon;",
    );
    expect(MIGRATION).toContain(
      "grant execute on function public.fn_escale_conversa_mais_recente_por_contato(uuid, uuid[]) to authenticated, service_role;",
    );
  });

  it("o baseline traz o bloco depois do da 9403 e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf(CABECALHO);
    const i9403 = BASELINE.indexOf("-- ---- FORK ESCALE · Faixa B FB0: agendada só do mesmo tenant (migration 9403) ----");
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(iBloco).toBeGreaterThan(i9403);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
