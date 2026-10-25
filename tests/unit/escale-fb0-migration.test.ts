import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261123120000_9403_fb0_agendada_so_do_mesmo_tenant.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";
const CABECALHO = "-- ---- FORK ESCALE · Faixa B FB0: agendada só do mesmo tenant (migration 9403) ----";

describe("migration 9403 (FB0: mensagem agendada só do mesmo tenant)", () => {
  it("existe, começa pelo manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe(CABECALHO);
  });

  it("só altera a policy de insert, exigindo contato e dispositivo da mesma organização", () => {
    expect(MIGRATION).toContain("alter policy crm_mensagens_agendadas_insert on public.crm_mensagens_agendadas");
    expect(MIGRATION).toContain("ct.organization_id = crm_mensagens_agendadas.organization_id");
    expect(MIGRATION).toContain("cs.organization_id = crm_mensagens_agendadas.organization_id");
    expect(MIGRATION).toContain("criado_por = (select auth.uid())");
    expect(MIGRATION).not.toMatch(/^\s*(begin|commit)\s*;/im);
    expect(MIGRATION).not.toMatch(/create (function|policy)/i);
  });

  it("o baseline traz o bloco depois do da 9402 e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf(CABECALHO);
    const i9402 = BASELINE.indexOf("-- ---- FORK ESCALE · revisão Q7b: regras de acesso (migration 9402) ----");
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(iBloco).toBeGreaterThan(i9402);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
