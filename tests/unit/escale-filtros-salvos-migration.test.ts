import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * FILTROS SALVOS DO QUADRO (fork Escale, migration 9004): a migration e o bloco
 * do baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork — depois
 * do bloco 9003 e antes do bloco da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261019120000_9004_filtros_salvos.sql";
const MIGRATION_9003 = "supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql";
const CABECALHO = "-- ---- FORK ESCALE · filtros salvos do quadro (migration 9004) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("filtros salvos: migration 9004 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(3000);
    expect(ler("supabase/baseline.sql").includes(migration)).toBe(true);
  });

  it("o bloco mora depois do bloco 9003 e antes do bloco da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9003 = baseline.indexOf(ler(MIGRATION_9003));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9003).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9003);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("RLS: escreve só quem criou; o compartilhado lê a origem e a visualização com a sessão de quem olha", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("alter table public.crm_filtros_salvos enable row level security;");
    expect(sql).toContain("create policy crm_filtros_salvos_select on public.crm_filtros_salvos");
    expect(sql).toContain("create policy crm_filtros_salvos_dono_write on public.crm_filtros_salvos");
    expect(sql).toContain("and user_id = auth.uid()");
    expect(sql).toContain("select 1 from public.crm_pipelines p where p.id = crm_filtros_salvos.pipeline_id");
    expect(sql).toContain("select 1 from public.crm_pipeline_views v where v.id = crm_filtros_salvos.view_id");
    expect(sql).toContain("revoke all on public.crm_filtros_salvos from anon;");
  });

  it("escrever exige o alvo VISÍVEL sob a RLS de quem grava; o USING segue só do dono", () => {
    const sql = ler(MIGRATION);
    const policy = sql.slice(sql.indexOf("create policy crm_filtros_salvos_dono_write"), sql.indexOf("revoke all on public.crm_filtros_salvos from anon;"));
    const [using, withCheck] = policy.split("with check (");
    const usingCompacto = using.replace(/\s+/g, " ");
    expect(usingCompacto).toContain("organization_id in (select public.fn_user_org_ids())");
    expect(usingCompacto).toContain("and user_id = auth.uid()");
    expect(using).not.toContain("crm_pipelines");
    const compacto = (withCheck ?? "").replace(/\s+/g, " ");
    expect(compacto).toContain("organization_id in (select public.fn_user_org_ids())");
    expect(compacto).toContain("user_id = auth.uid()");
    expect(compacto).toContain(
      "crm_filtros_salvos.pipeline_id is null or exists (select 1 from public.crm_pipelines p where p.id = crm_filtros_salvos.pipeline_id)",
    );
    expect(compacto).toContain(
      "crm_filtros_salvos.view_id is null or exists (select 1 from public.crm_pipeline_views v where v.id = crm_filtros_salvos.view_id)",
    );
  });

  it("escrever exige papel (viewer ou acima) no USING e no WITH CHECK — cerca de RBAC da 0150", () => {
    const sql = ler(MIGRATION);
    const policy = sql.slice(sql.indexOf("create policy crm_filtros_salvos_dono_write"), sql.indexOf("revoke all on public.crm_filtros_salvos from anon;"));
    const [using, withCheck] = policy.split("with check (");
    expect(using).toContain("public.fn_role_at_least(organization_id, 'viewer')");
    expect(withCheck ?? "").toContain("public.fn_role_at_least(organization_id, 'viewer')");
  });

  it("o limite de 20 mora no banco: trigger invoker com advisory lock, search_path fixo e fechado a anon", () => {
    const sql = ler(MIGRATION);
    const funcao = sql.slice(sql.indexOf("create or replace function public.fn_crm_filtros_salvos_limite()"), sql.indexOf("revoke all on function public.fn_crm_filtros_salvos_limite()"));
    expect(funcao).toContain("language plpgsql");
    expect(funcao).toContain("security invoker");
    expect(funcao).not.toContain("security definer");
    expect(funcao).toContain("set search_path = public, pg_temp");
    expect(funcao).toContain("pg_advisory_xact_lock(");
    expect(funcao).toContain("if v_total >= 20 then");
    expect(funcao).toContain("errcode = 'check_violation', constraint = 'crm_filtros_salvos_limite'");
    expect(sql).toContain("revoke all on function public.fn_crm_filtros_salvos_limite() from public, anon;");
    expect(sql).toContain("drop trigger if exists trg_crm_filtros_salvos_limite on public.crm_filtros_salvos;");
    expect(sql).toMatch(/create trigger trg_crm_filtros_salvos_limite\s+before insert or update of [^\n]+ on public\.crm_filtros_salvos\s+for each row execute function public\.fn_crm_filtros_salvos_limite\(\);/);
    expect(sql).toContain("comment on function public.fn_crm_filtros_salvos_limite() is");
    expect(sql.split("\n")[0]).toContain("trg_crm_filtros_salvos_limite");
  });

  it("um alvo só, e as FKs compostas apagam junto sem cruzar organização", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("check ((pipeline_id is null) <> (view_id is null))");
    expect(sql).toContain("references public.crm_pipelines (organization_id, id) on delete cascade");
    expect(sql).toContain("references public.crm_pipeline_views (organization_id, id) on delete cascade");
    expect(sql).toContain("references public.user_organizations (user_id, organization_id) on delete cascade");
  });

  it("a contagem de atividades roda como quem chama, com search_path fixo e fechada a anon", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("create or replace function public.fn_escale_atividades_concluidas(p_org uuid, p_leads uuid[])");
    expect(sql).toContain("security invoker");
    expect(sql).not.toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain("revoke all on function public.fn_escale_atividades_concluidas(uuid, uuid[]) from public, anon;");
    expect(sql).toContain("do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;");
  });
});
