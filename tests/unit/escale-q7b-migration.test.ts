import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261122120000_9402_q7b_rls_de_acesso.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";
const CABECALHO = "-- ---- FORK ESCALE · revisão Q7b: regras de acesso (migration 9402) ----";

const FUNCOES = [
  "fn_escale_tem_acesso_a_origem(uuid, uuid)",
  "fn_escale_tem_acesso_ao_grupo(uuid, uuid)",
  "fn_escale_pode_ver_negocio(uuid, uuid, uuid)",
  "fn_crm_pode(uuid, text)",
  "fn_escale_meus_papeis()",
  "fn_escale_origens_que_vejo()",
  "fn_crm_orgs_que_veem_pelo_setor()",
  "fn_crm_conversa_no_meu_setor(uuid, uuid, uuid)",
];

describe("migration 9402 (revisão Q7b: regras de acesso)", () => {
  it("existe, começa pela linha do manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe(CABECALHO);
  });

  it("idempotente e sem transação explícita: só create or replace e alter policy", () => {
    expect(MIGRATION).not.toMatch(/^\s*(begin|commit)\s*;/im);
    expect(MIGRATION).not.toMatch(/create function/i);
    expect(MIGRATION).not.toMatch(/create policy/i);
    expect(MIGRATION).not.toMatch(/drop policy/i);
  });

  it("cada função recriada ou nova é fechada a PUBLIC e anon e aberta só a authenticated e service_role", () => {
    for (const f of FUNCOES) {
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon;`);
      expect(MIGRATION).toContain(
        `grant execute on function public.${f} to authenticated, service_role;`,
      );
    }
  });

  it("as policies de crm_leads não chamam mais a regra por linha (G7-4)", () => {
    const leads = MIGRATION.slice(
      MIGRATION.indexOf('alter policy "crm_leads_select"'),
      MIGRATION.indexOf('alter policy "crm_lead_activities_select"'),
    );
    expect(leads).not.toContain("fn_escale_pode_ver_negocio(");
    expect(leads).not.toContain("fn_escale_tem_acesso_a_origem(");
    expect(leads).toContain("public.fn_escale_origens_que_vejo()");
  });

  it("o baseline traz o bloco (sem a linha do manifesto) depois do da 9401 e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf(CABECALHO);
    const i9401 = BASELINE.indexOf(
      "-- ---- FORK ESCALE · revisão Q7a: índices, fila e público (migration 9401) ----",
    );
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(i9401).toBeGreaterThan(-1);
    expect(iBloco).toBeGreaterThan(i9401);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
