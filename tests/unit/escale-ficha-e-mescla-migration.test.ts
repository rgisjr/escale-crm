import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261112120000_9106_ficha_do_contato_e_mescla.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

describe("migration 9106 (ficha do contato e mescla)", () => {
  it("existe, com a linha do manifesto, e está no baseline depois da 9105", () => {
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    const i9105 = BASELINE.indexOf("(migration 9105)");
    const i9106 = BASELINE.indexOf("-- ---- FORK ESCALE · ficha do contato e mescla (migration 9106) ----");
    expect(i9105).toBeGreaterThan(0);
    expect(i9106).toBeGreaterThan(i9105);
  });

  it("as três funções são invoker e fechadas ao anon; nenhuma definer", () => {
    for (const nome of ["fn_escale_chave_do_telefone", "fn_escale_chaves_de_mescla", "fn_escale_mesclar_contatos"]) {
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toMatch(new RegExp(`revoke all on function public\\.${nome}\\([^)]*\\) from public, anon;`));
      expect(MIGRATION).toMatch(new RegExp(`grant execute on function public\\.${nome}\\([^)]*\\) to authenticated, service_role;`));
    }
    expect(MIGRATION).not.toMatch(/security definer/);
    expect(MIGRATION).toContain("public.fn_mesclar_contatos(p_org, p_principal, p_secundarios)");
  });

  it("as chaves: telefone (e o parkado), e-mail, WhatsApp e Instagram, de 2 a 50 contatos vivos", () => {
    expect(MIGRATION).toContain("telefone_em_conflito");
    expect(MIGRATION).toContain("wa_lid");
    expect(MIGRATION).toContain("link_instagram");
    expect(MIGRATION).toContain("n between 2 and 50");
    expect(MIGRATION).toContain("is_merged_into is null");
  });

  it("a nota do contato: lead_id nulo, a regra do dono, o índice e as quatro policies", () => {
    expect(MIGRATION).toContain("alter column lead_id drop not null");
    expect(MIGRATION).toContain("crm_notas_do_negocio_tem_dono");
    expect(MIGRATION).toContain("idx_crm_notas_do_negocio_contato");
    for (const p of [
      "crm_notas_do_negocio_select",
      "crm_notas_do_negocio_insert",
      "crm_notas_do_negocio_dono_ou_gerente_write",
      "crm_notas_do_negocio_dono_ou_gerente_delete",
    ]) {
      expect(MIGRATION).toContain(`create policy ${p} on public.crm_notas_do_negocio`);
    }
  });
});
