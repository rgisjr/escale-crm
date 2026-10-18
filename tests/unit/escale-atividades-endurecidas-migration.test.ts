import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ATIVIDADES DO PLAYBOOK ENDURECIDAS (fork Escale, migration 9012): a migration e o bloco
 * do baseline são o MESMO SQL, depois do bloco da 9009 (as tabelas precisam existir) e antes
 * do da 0323; sem `for all` na atividade do negócio e sem coluna de conclusão no GRANT.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261027120000_9012_atividades_endurecidas.sql";
const MIGRATION_9009 = "supabase/migrations/20261024120000_9009_playbook_de_etapas.sql";
const CABECALHO = "-- ---- FORK ESCALE · atividades do playbook endurecidas (migration 9012) ----";
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("atividades endurecidas: migration 9012 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o bloco do baseline é idêntico, depois da 9009 e antes da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9009 = baseline.indexOf(ler(MIGRATION_9009));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf(
      "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
    );
    expect(de9009).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9009);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("a atividade do negócio só recebe INSERT nas colunas da rota; nada de quem concluiu", () => {
    const sql = ler(MIGRATION).replace(/\s+/g, " ");
    expect(sql).toContain(
      "drop policy if exists crm_atividades_do_negocio_agent_write on public.crm_atividades_do_negocio;",
    );
    expect(sql).toContain(
      "create policy crm_atividades_do_negocio_insert on public.crm_atividades_do_negocio for insert with check",
    );
    expect(sql).toContain(
      "revoke insert, update, delete, truncate, references, trigger on public.crm_atividades_do_negocio from authenticated;",
    );
    expect(sql).toContain(
      "grant insert (tarefa_id, organization_id, lead_id, stage_id, tipo, visibilidade) on public.crm_atividades_do_negocio to authenticated;",
    );
    expect(sql).not.toMatch(/grant [^;]*concluida_/);
    expect(sql).toContain("and t.lead_id = crm_atividades_do_negocio.lead_id");
  });

  it("o playbook exige a etapa da própria origem", () => {
    const sql = ler(MIGRATION).replace(/\s+/g, " ");
    expect(sql).toContain("and s.pipeline_id = crm_atividades_da_etapa.pipeline_id");
  });
});
