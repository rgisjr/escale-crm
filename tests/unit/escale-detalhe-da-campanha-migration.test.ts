import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261120120000_9310_detalhe_da_campanha.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

const FUNCOES = [
  "fn_escale_situacao_do_destinatario(public.campaign_recipients)",
  "fn_escale_sumario_da_campanha(uuid, uuid)",
  "fn_escale_ritmo_da_campanha(uuid, uuid, text)",
  "fn_escale_motivos_do_erro(uuid, uuid)",
  "fn_escale_resultado_da_campanha(uuid, uuid)",
  "fn_escale_negocios_da_campanha(uuid, uuid, text, integer)",
  "fn_escale_destinatario_passa(public.campaign_recipients, public.contacts, jsonb)",
  "fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer)",
  "fn_escale_selecao_da_campanha(uuid, uuid, jsonb, uuid[], uuid[])",
];

describe("migration 9310 (detalhe da campanha da casca)", () => {
  it("existe, começa pela linha do manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe(
      "-- ---- FORK ESCALE · detalhe da campanha da casca (migration 9310) ----",
    );
  });

  it("as nove são invoker, fechadas ao anon e abertas ao authenticated; nenhuma definer", () => {
    expect(MIGRATION).not.toMatch(/security definer/);
    for (const f of FUNCOES) {
      const nome = f.split("(")[0];
      expect(MIGRATION).toMatch(
        new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`),
      );
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon;`);
      expect(MIGRATION).toContain(
        `grant execute on function public.${f} to authenticated, service_role;`,
      );
    }
  });

  it("as sete que leem dados só respondem a gerente", () => {
    expect(MIGRATION.match(/fn_role_at_least\(p_org, 'manager'\)/g)?.length).toBe(7);
  });

  it("as amostras da Clint (1.000) e o benchmark de 5", () => {
    expect(MIGRATION.match(/limit 1000\b/g)?.length).toBe(3);
    expect(MIGRATION).toContain("limit 5");
  });

  it("os dois índices", () => {
    expect(MIGRATION).toContain("idx_campaign_recipients_ordem");
    expect(MIGRATION).toContain("idx_crm_leads_da_campanha");
    expect(MIGRATION).toContain("where source = 'campanha'");
  });

  it("o baseline traz o bloco (sem a linha do manifesto) depois do da 9301 e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf(
      "-- ---- FORK ESCALE · detalhe da campanha da casca (migration 9310) ----",
    );
    const i9301 = BASELINE.indexOf(
      "-- ---- FORK ESCALE · lista de campanhas da casca (migration 9301) ----",
    );
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(i9301).toBeGreaterThan(-1);
    expect(iBloco).toBeGreaterThan(i9301);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
