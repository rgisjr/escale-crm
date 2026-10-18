import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** FORK ESCALE · Fase 1K (D14): a forma da migration 9014. A prova é `tests/invariants/escale-atribuicao-de-ganho.test.ts`. */
const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261029120000_9014_atribuicao_de_ganho.sql"),
  "utf8",
);
const BASELINE = readFileSync(join(process.cwd(), "supabase/baseline.sql"), "utf8");

const FUNCOES = [
  "fn_escale_so_admin_marca_ganho()",
  "fn_escale_credito_do_ganho(uuid)",
  "fn_escale_registra_o_ganho()",
  "fn_escale_corrigir_ganho(uuid, uuid, uuid, uuid, timestamptz)",
];

describe("migration 9014 — atribuição de ganho", () => {
  it("abre com o manifesto e cria a tabela com RLS e só a leitura", () => {
    expect(MIGRATION.startsWith("-- manifest: **Atribuição de ganho por origem")).toBe(true);
    expect(MIGRATION).toContain("create table if not exists public.crm_ganho_do_negocio (");
    expect(MIGRATION).toContain(
      "alter table public.crm_ganho_do_negocio enable row level security;",
    );
    expect(MIGRATION).toContain(
      "create policy crm_ganho_do_negocio_select on public.crm_ganho_do_negocio",
    );
    expect(MIGRATION).not.toMatch(/for (insert|update|delete|all) to authenticated/);
  });

  it("toda função é definer, com search_path, fechada; só a correção abre ao service_role", () => {
    for (const f of FUNCOES) {
      expect(MIGRATION).toContain(
        `revoke all on function public.${f} from public, anon, authenticated;`,
      );
    }
    expect(MIGRATION.match(/security definer\s+set search_path = public, pg_temp/g)?.length).toBe(
      FUNCOES.length,
    );
    expect(MIGRATION).toContain(
      "grant execute on function public.fn_escale_corrigir_ganho(uuid, uuid, uuid, uuid, timestamptz) to service_role;",
    );
    expect(MIGRATION).not.toMatch(/grant execute on function [^;]+ to [^;]*authenticated/);
  });

  it("a trava roda depois de trg_crm_lead_close_on_stage (que põe o status) e só quando vira ganho", () => {
    expect(["trg_crm_lead_close_on_stage", "trg_escale_so_admin_marca_ganho"].sort()[0]).toBe(
      "trg_crm_lead_close_on_stage",
    );
    expect(MIGRATION).toContain("when (new.status = 'won' and old.status is distinct from 'won')");
    expect(MIGRATION).toContain("errcode = 'PT403'");
  });

  it("o baseline traz o bloco idêntico, antes da âncora", () => {
    const bloco = `-- ---- FORK ESCALE · atribuição de ganho (migration 9014) ----\n${MIGRATION}`;
    expect(BASELINE).toContain(bloco);
    expect(BASELINE.indexOf(bloco)).toBeLessThan(
      BASELINE.indexOf(
        "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
      ),
    );
  });
});
