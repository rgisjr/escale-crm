import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { customFieldSchema } from "@/lib/schemas/settings";

/**
 * CAMPOS DO CRM (fork Escale, migration 9006): os campos personalizados do
 * negócio são da organização, como na Clint. `settings.fields` de cada origem
 * vira a projeção do catálogo. A migration e o bloco do baseline são o MESMO SQL,
 * no ponto fixo do fork (depois do 9005, antes da 0323).
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261021120000_9006_campos_do_crm.sql";
const MIGRATION_9005 = "supabase/migrations/20261020120000_9005_capas_do_card.sql";
const CABECALHO = "-- ---- FORK ESCALE · campos do CRM (migration 9006) ----";
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");
const compacto = (s: string) => s.replace(/\s+/g, " ");
const FUNCOES = [
  "public.fn_escale_campo_valido(jsonb)",
  "public.fn_escale_campos_projetados(uuid, jsonb)",
  "public.fn_escale_juntar_campos_do_crm()",
  "public.fn_escale_pipeline_campos_do_crm()",
  "public.fn_escale_campos_do_negocio_reprojeta()",
];

describe("campos do CRM: migration 9006 e bloco do baseline", () => {
  it("a migration existe, se descreve na primeira linha e aparece igual no baseline, no ponto fixo", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    const sql = ler(MIGRATION);
    expect(sql.startsWith("-- manifest: ")).toBe(true);
    expect(sql.split("\n")[1]).toBe("-- 9006: campos do CRM (fork Escale).");
    const baseline = ler("supabase/baseline.sql");
    const de9005 = baseline.indexOf(ler(MIGRATION_9005));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(sql);
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9005).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9005);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("um campo por chave em cada organização; a definição não guarda chave nem regra", () => {
    const sql = compacto(ler(MIGRATION));
    expect(sql).toContain(
      "create unique index if not exists uq_crm_campos_do_negocio_chave on public.crm_campos_do_negocio (organization_id, chave);",
    );
    expect(sql).toContain("not (definicao ?| array['key', 'obrigatorio_em'])");
    expect(sql).toContain("organization_id uuid not null references public.organizations(id) on delete cascade");
  });

  it("RLS: todo membro lê; escrever exige administrador (cerca de RBAC da 0150)", () => {
    const sql = compacto(ler(MIGRATION));
    expect(sql).toContain("alter table public.crm_campos_do_negocio enable row level security;");
    const escrita = sql.slice(
      sql.indexOf("create policy crm_campos_do_negocio_admin_write"),
      sql.indexOf("revoke all on public.crm_campos_do_negocio from anon;"),
    );
    const [using = "", check = ""] = escrita.split("with check (");
    for (const parte of [using, check]) {
      expect(parte).toContain("public.fn_role_at_least(organization_id, 'admin')");
      expect(parte).toContain("public.fn_is_platform_admin_full()");
    }
    expect(sql).toContain("do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;");
  });

  it("o tipo aceito pelo banco é o mesmo do customFieldSchema", () => {
    const sql = ler(MIGRATION);
    const lista = /\(p->>'type'\) in \(([^)]*)\)/.exec(sql)?.[1] ?? "";
    const tipos = lista.split(",").map((t) => t.trim().replace(/'/g, ""));
    expect([...tipos].sort()).toEqual([...customFieldSchema.shape.type.options].sort());
  });

  it("as funções não são executáveis pela sessão, e as definer fixam o search_path", () => {
    const sql = compacto(ler(MIGRATION));
    for (const f of FUNCOES) {
      expect(sql).toContain(`revoke all on function ${f} from public;`);
      expect(sql).toContain(`revoke execute on function ${f} from anon;`);
      expect(sql).toContain(`revoke execute on function ${f} from authenticated;`);
    }
    expect(sql.match(/security definer set search_path = public, pg_temp/g)?.length).toBe(3);
  });

  it("a junção roda antes dos gatilhos; a primeira projeção avisa que está projetando", () => {
    const sql = ler(MIGRATION);
    const juntar = sql.indexOf("select public.fn_escale_juntar_campos_do_crm();");
    // O mesmo par aparece dentro de `fn_escale_campos_do_negocio_reprojeta`: o que conta é o bloco `do`.
    const projetar = sql.indexOf("do $f$\nbegin\n  perform set_config('escale.campos_do_crm', 'projetando', true);");
    const gatilho = sql.indexOf("create trigger trg_escale_pipeline_campos_do_crm");
    expect(juntar).toBeGreaterThan(-1);
    expect(projetar).toBeGreaterThan(juntar);
    expect(gatilho).toBeGreaterThan(projetar);
    expect(sql).toContain("before insert or update of settings on public.crm_pipelines");
    expect(sql).toContain("after insert or update or delete on public.crm_campos_do_negocio");
  });
});
