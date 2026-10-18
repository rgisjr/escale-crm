import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ACESSO POR ORIGEM (fork Escale, migration 9010): a migration e o bloco do
 * baseline são o MESMO SQL, e o bloco mora depois do bloco 9007 e antes do da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261025120000_9010_acesso_por_origem.sql";
const MIGRATION_9007 = "supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql";
const CABECALHO = "-- ---- FORK ESCALE · acesso por origem (migration 9010) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");
const compacto = () => ler(MIGRATION).replace(/\s+/g, " ");

describe("acesso por origem: migration 9010 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença, depois da 9007 e antes da 0323", () => {
    const migration = ler(MIGRATION);
    const baseline = ler("supabase/baseline.sql");
    expect(migration.length).toBeGreaterThan(3000);
    const de9007 = baseline.indexOf(ler(MIGRATION_9007));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(migration);
    const ancora = baseline.indexOf(
      "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
    );
    expect(de9007).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9007);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("o grupo ganha settings; as funções são definer, estáveis, com search_path fechado e executáveis só por authenticated e service_role", () => {
    const sql = compacto();
    expect(sql).toContain(
      "alter table public.crm_pipeline_groups add column if not exists settings jsonb not null default '{}'::jsonb;",
    );
    for (const f of [
      "fn_escale_lista_permite(p_lista jsonb)",
      "fn_escale_visualizacao_da_origem(p_org uuid, p_pipeline uuid)",
      "fn_escale_tem_acesso_a_origem(p_org uuid, p_pipeline uuid)",
      "fn_escale_tem_acesso_ao_grupo(p_org uuid, p_grupo uuid)",
      "fn_escale_pode_ver_negocio(p_org uuid, p_owner_user_id uuid, p_pipeline uuid)",
    ]) {
      expect(sql).toContain(`create or replace function public.${f}`);
    }
    expect(
      (sql.match(/language sql stable security definer set search_path = public, pg_temp/g) ?? [])
        .length,
    ).toBe(5);
    for (const assinatura of [
      "fn_escale_lista_permite(jsonb)",
      "fn_escale_visualizacao_da_origem(uuid, uuid)",
      "fn_escale_tem_acesso_a_origem(uuid, uuid)",
      "fn_escale_tem_acesso_ao_grupo(uuid, uuid)",
      "fn_escale_pode_ver_negocio(uuid, uuid, uuid)",
    ]) {
      expect(sql).toContain(`revoke all on function public.${assinatura} from public;`);
      expect(sql).toContain(`revoke execute on function public.${assinatura} from anon;`);
      expect(sql).toContain(
        `grant execute on function public.${assinatura} to authenticated, service_role;`,
      );
    }
  });

  it("a regra em vigor é a da origem, senão a da organização, senão own_and_unassigned", () => {
    const sql = compacto();
    expect(sql).toContain("p.settings->>'escale_visualizacao'");
    expect(sql).toContain("o.settings->>'visibility_mode'");
    expect(sql).toContain("'own_and_unassigned')");
  });

  it("só admin passa por cima; a lista da origem vence a do grupo; o grupo aparece se alguma origem dele me inclui", () => {
    const sql = compacto();
    expect(sql).not.toContain("in ('manager','admin') then true");
    expect(sql).toContain("when public.fn_user_role_in_org(p_org) = 'admin' then true");
    expect(sql).toContain(
      "then (p.settings->'escale_pessoas') ? auth.uid()::text else public.fn_escale_lista_permite(g.settings->'escale_pessoas')",
    );
    expect(sql).toContain(
      "left join public.crm_pipeline_groups g on g.id = p.group_id and g.organization_id = p.organization_id",
    );
    expect(sql).toContain(
      "exists ( select 1 from public.crm_pipelines p where p.group_id = p_grupo",
    );
  });

  it("as nove policies são recriadas com a função nova, e fn_can_view_lead não é tocada", () => {
    const sql = compacto();
    for (const [policy, tabela] of [
      ["crm_leads_select", "crm_leads"],
      ["crm_leads_insert", "crm_leads"],
      ["crm_leads_update", "crm_leads"],
      ["crm_leads_delete", "crm_leads"],
      ["crm_lead_activities_select", "crm_lead_activities"],
      ["crm_lead_links_select", "crm_lead_links"],
      ["crm_pipelines_select", "crm_pipelines"],
      ["crm_stages_select", "crm_stages"],
      ["crm_pipeline_groups_select", "crm_pipeline_groups"],
    ]) {
      expect(sql).toContain(`drop policy if exists "${policy}" on public.${tabela};`);
      expect(sql).toContain(`create policy "${policy}" on public.${tabela}`);
    }
    expect(sql).not.toContain("fn_can_view_lead(organization_id, owner_user_id)");
    expect(sql).not.toContain("create or replace function public.fn_can_view_lead");
    expect(sql).toContain(
      "public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)",
    );
    expect(sql).toContain(
      "public.fn_escale_pode_ver_negocio(l.organization_id, l.owner_user_id, l.pipeline_id)",
    );
    expect(sql).toContain("public.fn_escale_tem_acesso_a_origem(organization_id, id)");
    expect(sql).toContain("public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)");
    expect(sql).toContain("public.fn_escale_tem_acesso_ao_grupo(organization_id, id)");
  });

  it("as três policies de escrita de manager+ (FOR ALL) também exigem acesso à origem/grupo; a do grupo só pela lista dele", () => {
    const sql = compacto();
    for (const [policy, termo] of [
      ["crm_pipelines_manager_write", "public.fn_escale_tem_acesso_a_origem(organization_id, id))"],
      [
        "crm_stages_manager_write",
        "public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id))",
      ],
      [
        "crm_pipeline_groups_manager_write",
        "public.fn_escale_lista_permite(settings->'escale_pessoas')))",
      ],
    ]) {
      const i = sql.indexOf(`create policy "${policy}"`);
      expect(i).toBeGreaterThan(-1);
      expect(sql.slice(i, i + 700)).toContain(termo);
    }
  });

  it("o gatilho do dono padrão é before insert, definer, fechado e nunca derruba a inserção", () => {
    const sql = compacto();
    expect(sql).toContain(
      "create trigger trg_escale_dono_padrao_na_origem before insert on public.crm_leads",
    );
    expect(sql).toContain(
      "revoke all on function public.fn_escale_dono_padrao_na_origem() from public, anon, authenticated;",
    );
    expect(sql).toContain("is distinct from 'agent'");
    expect(sql).toContain("exception when others then");
  });

  it("a nota da 1H (9008) ganha a função nova (policy simples: o awk do update.sh não lê dollar-quote aninhado)", () => {
    const sql = compacto();
    expect(sql).not.toContain("to_regclass");
    expect(sql).not.toContain("$p$");
    expect(sql).toContain(
      "create policy crm_notas_do_negocio_select on public.crm_notas_do_negocio",
    );
    expect(sql).toContain("notify pgrst, 'reload schema';");
  });
});
