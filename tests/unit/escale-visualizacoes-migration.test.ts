import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * VISUALIZAÇÕES DE ORIGENS (fork Escale, migration 9003): a migration e o bloco
 * do baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork — depois
 * do bloco 9002 e antes do bloco da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql";
const MIGRATION_9002 = "supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql";
const CABECALHO = "-- ---- FORK ESCALE · visualizações de origens (migration 9003) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("visualizações de origens: migration 9003 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(3000);
    expect(ler("supabase/baseline.sql").includes(migration)).toBe(true);
  });

  it("o bloco mora depois do bloco 9002 e antes do bloco da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9002 = baseline.indexOf(ler(MIGRATION_9002));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9002).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9002);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("as três tabelas têm RLS e só gerente ou admin escreve", () => {
    const sql = ler(MIGRATION);
    for (const tabela of ["crm_pipeline_views", "crm_pipeline_view_origens", "crm_pipeline_view_pessoas"]) {
      expect(sql).toContain(`alter table public.${tabela} enable row level security;`);
      expect(sql).toContain(`create policy ${tabela}_manager_write on public.${tabela}`);
      expect(sql).toContain(`revoke all on public.${tabela} from anon;`);
    }
    expect(sql).toContain("acesso = 'todos'");
  });

  it("as FKs são compostas e apagam junto, sem cruzar organização", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("references public.crm_pipelines (organization_id, id) on delete cascade");
    expect(sql).toContain("references public.user_organizations (user_id, organization_id) on delete cascade");
    expect(sql).toContain("references public.crm_pipeline_views (organization_id, id) on delete cascade");
  });

  it("o alvo da FK do funil é criado só se ainda não existe um índice único igual", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("and i.indisunique");
    expect(sql).toContain("create unique index uq_crm_pipelines_org_id on public.crm_pipelines (organization_id, id);");
  });

  it("a função de gravação roda como quem chama, com search_path fixo e fechada a anon", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("security invoker");
    expect(sql).not.toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain(
      "revoke all on function public.fn_escale_salvar_visualizacao(uuid, uuid, text, text, uuid[], uuid[]) from public, anon;",
    );
    expect(sql).toContain("do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;");
  });
});
