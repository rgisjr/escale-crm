import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261110120000_9301_lista_de_campanhas.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

const INVOKER = [
  "fn_escale_campanha_passa(public.campaigns, jsonb)",
  "fn_escale_contagem_de_campanhas(uuid, uuid[])",
  "fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer)",
  "fn_escale_resumo_das_campanhas(uuid, jsonb)",
];

describe("migration 9301 (lista de campanhas da casca)", () => {
  it("existe, começa pela linha do manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe(
      "-- ---- FORK ESCALE · lista de campanhas da casca (migration 9301) ----",
    );
  });

  it("campaigns entra na publicação do tempo real, com a guarda", () => {
    expect(MIGRATION).toContain("tablename = 'campaigns'");
    expect(MIGRATION).toContain("alter publication supabase_realtime add table public.campaigns");
    expect(MIGRATION).not.toContain("add table public.campaign_recipients");
  });

  it("as quatro são invoker, fechadas ao anon e abertas ao authenticated; nenhuma definer", () => {
    expect(MIGRATION).not.toMatch(/security definer/);
    for (const f of INVOKER) {
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

  it("a lista e o resumo só respondem a gerente; o resumo tira rascunho e cancelada", () => {
    expect(MIGRATION.match(/fn_role_at_least\(p_org, 'manager'\)/g)?.length).toBe(2);
    expect(MIGRATION).toContain("c.status not in ('draft', 'cancelled')");
    expect(MIGRATION).toContain("order by c.created_at desc, c.id desc");
  });

  it("o baseline traz o bloco (sem a linha do manifesto) depois das tabelas de campanha e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf(
      "-- ---- FORK ESCALE · lista de campanhas da casca (migration 9301) ----",
    );
    const iTabela = BASELINE.indexOf("create table if not exists public.campaign_recipients (");
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(iTabela).toBeGreaterThan(-1);
    expect(iBloco).toBeGreaterThan(iTabela);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
