import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * TODA ORIGEM TEM GRUPO (fork Escale, migration 9002): a migration e o bloco
 * do baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork — depois
 * do bloco 9001 (que cria a tabela que este altera) e antes do bloco da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql";
const MIGRATION_9001 = "supabase/migrations/20261013220000_9001_grupos_de_funis.sql";
const CABECALHO = "-- ---- FORK ESCALE · toda origem tem grupo (migration 9002) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("toda origem tem grupo: migration 9002 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(1000);
    expect(ler("supabase/baseline.sql").includes(migration)).toBe(true);
  });

  it("o bloco mora depois do bloco 9001 e antes do bloco da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9001 = baseline.indexOf(ler(MIGRATION_9001));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9001).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9001);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("o gatilho é definer com search_path fixo e fechado a anon e authenticated", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain(
      "revoke all on function public.fn_escale_origem_sempre_em_grupo() from public, anon, authenticated;",
    );
    expect(sql).toContain("on conflict (organization_id, (lower(btrim(name)))) do nothing");
  });

  it("a FK passa a recusar e a coluna deixa de aceitar nulo", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("alter table public.crm_pipelines drop constraint if exists crm_pipelines_group_fk;");
    expect(sql).not.toContain("on delete set null");
    expect(sql).toContain("alter table public.crm_pipelines alter column group_id set not null;");
  });
});
