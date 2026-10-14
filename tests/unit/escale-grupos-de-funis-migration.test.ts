import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * GRUPOS DE FUNIS (fork Escale, migration 9001): a migration e o apêndice do
 * baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork.
 *
 * O kit self-host (`install.sh` e `update.sh`) aplica SÓ o `baseline.sql`; a
 * migration é a fonte da verdade da cadeia. Divergir entre os dois entrega um
 * produto diferente do que o repositório diz.
 *
 * Ponto fixo: DEPOIS da definição de `fn_aplicar_travas_de_suporte()` (o bloco
 * chama a função, e a instalação nova aplica o arquivo em ordem, com
 * ON_ERROR_STOP) e ANTES do bloco da 0323 — no meio do arquivo, longe do fim,
 * onde o original acrescenta os blocos dele e o conflito de sincronização mora.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261013220000_9001_grupos_de_funis.sql";
const CABECALHO = "-- ---- FORK ESCALE · grupos de funis (migration 9001) ----";

/** O checkout do Windows traz CRLF; o do CI, LF. A comparação é de conteúdo. */
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("grupos de funis: migration 9001 e apêndice do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(1000);
    expect(ler("supabase/baseline.sql").includes(migration)).toBe(true);
  });

  it("o bloco mora no ponto fixo do fork: depois da função das travas, antes do bloco da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const migration = ler(MIGRATION);
    const travas = baseline.indexOf("create or replace function public.fn_aplicar_travas_de_suporte()");
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(migration);
    const ancora = baseline.indexOf(
      "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
    );
    expect(travas).toBeGreaterThan(-1);
    expect(ancora).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(travas);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("a tabela nova nasce com RLS, escrita de gerente, FK composta e travas do suporte", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("alter table public.crm_pipeline_groups enable row level security;");
    expect(sql).toContain("public.fn_role_at_least(organization_id, 'manager')");
    expect(sql).toContain("foreign key (organization_id, group_id)");
    expect(sql).toContain("on delete set null (group_id)");
    expect(sql).toContain("revoke all on public.crm_pipeline_groups from anon;");
    expect(sql).toContain("perform public.fn_aplicar_travas_de_suporte()");
  });
});
