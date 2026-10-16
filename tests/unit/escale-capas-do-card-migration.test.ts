import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * CAPA DO CARD (fork Escale, migration 9005): a preferência "Personalizar cards"
 * de cada pessoa, como na Clint. A migration e o bloco do baseline são o MESMO
 * SQL, no ponto fixo do fork (depois do 9004, antes da 0323).
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261020120000_9005_capas_do_card.sql";
const MIGRATION_9004 = "supabase/migrations/20261019120000_9004_filtros_salvos.sql";
const CABECALHO = "-- ---- FORK ESCALE · capa do card do quadro (migration 9005) ----";
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");
const compacto = (s: string) => s.replace(/\s+/g, " ");

describe("capa do card: migration 9005 e bloco do baseline", () => {
  it("a migration existe, se descreve na primeira linha e aparece igual no baseline, no ponto fixo", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    const sql = ler(MIGRATION);
    expect(sql.startsWith("-- manifest: ")).toBe(true);
    const baseline = ler("supabase/baseline.sql");
    const de9004 = baseline.indexOf(ler(MIGRATION_9004));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(sql);
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9004).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9004);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("uma capa por pessoa em cada organização, e a FK apaga junto com a pessoa", () => {
    const sql = compacto(ler(MIGRATION));
    expect(sql).toContain("user_id uuid not null");
    expect(sql).not.toContain("pipeline_id");
    expect(sql).toContain(
      "create unique index if not exists uq_crm_capas_do_card_pessoa on public.crm_capas_do_card (organization_id, user_id);",
    );
    expect(sql).toContain("references public.user_organizations (user_id, organization_id) on delete cascade");
  });

  it("RLS: a pessoa lê e escreve só a sua, e escrever exige papel (cerca de RBAC da 0150)", () => {
    const sql = compacto(ler(MIGRATION));
    expect(sql).toContain("alter table public.crm_capas_do_card enable row level security;");
    const escrita = sql.slice(sql.indexOf("create policy crm_capas_do_card_pessoa_write"), sql.indexOf("revoke all on public.crm_capas_do_card from anon;"));
    const [using = "", check = ""] = escrita.split("with check (");
    for (const parte of [using, check]) {
      expect(parte).toContain("user_id = auth.uid()");
      expect(parte).toContain("public.fn_role_at_least(organization_id, 'viewer')");
    }
    expect(sql).toContain("revoke all on public.crm_capas_do_card from anon;");
    expect(sql).toContain("do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;");
  });
});
