import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TIPOS_DE_ATIVIDADE, VISIBILIDADES_DA_ATIVIDADE } from "@/lib/escale/playbook/regras";

/**
 * PLAYBOOK DE ETAPAS E ATIVIDADES (fork Escale, migration 9009): a migration e o
 * bloco do baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork —
 * depois do bloco 9008 e antes do bloco da 0323. Os gatilhos são definer e
 * fechados; a função de salvar roda como quem chama; os CHECKs batem com o
 * vocabulário do TypeScript.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261024120000_9009_playbook_de_etapas.sql";
const CABECALHO = "-- ---- FORK ESCALE · playbook de etapas e atividades (migration 9009) ----";
const CABECALHO_9008 = "(migration 9008) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");
const plano = (sql: string) => sql.replace(/\s+/g, " ");

function trecho(sql: string, inicio: string, fim: string): string {
  const i = sql.indexOf(inicio);
  const f = sql.indexOf(fim, i);
  expect(i).toBeGreaterThan(-1);
  expect(f).toBeGreaterThan(i);
  return sql.slice(i, f);
}

describe("playbook: migration 9009 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo aparece no baseline sem uma única diferença, depois do bloco 9008 e antes da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(4000);
    const de9008 = baseline.indexOf(CABECALHO_9008);
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(migration);
    const ancora = baseline.indexOf(
      "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
    );
    expect(de9008).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9008);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("os CHECKs de tipo e visibilidade são o vocabulário do TypeScript", () => {
    const sql = plano(ler(MIGRATION));
    const lista = (xs: readonly string[]) => xs.map((x) => `'${x}'`).join(", ");
    expect(sql).toContain(`check (tipo in (${lista(TIPOS_DE_ATIVIDADE)}))`);
    expect(sql).toContain(`check (visibilidade in (${lista(VISIBILIDADES_DA_ATIVIDADE)}))`);
  });

  it("RLS ligada nas duas tabelas e sem anon (as políticas de escrita nascem na 9012)", () => {
    const sql = plano(ler(MIGRATION));
    for (const tabela of ["crm_atividades_da_etapa", "crm_atividades_do_negocio"]) {
      expect(sql).toContain(`alter table public.${tabela} enable row level security;`);
      expect(sql).toContain(`revoke all on public.${tabela} from anon;`);
    }
  });

  it("os dois gatilhos são definer, com search_path fixo, fechados e com o disparo certo", () => {
    const sql = ler(MIGRATION);
    for (const nome of [
      "fn_escale_atividades_ao_entrar_na_etapa",
      "fn_escale_quem_concluiu_a_atividade",
    ]) {
      const corpo = trecho(
        sql,
        `create or replace function public.${nome}()`,
        `revoke all on function public.${nome}()`,
      );
      expect(corpo).toContain("security definer");
      expect(corpo).toContain("set search_path = public, pg_temp");
      expect(sql).toContain(
        `revoke all on function public.${nome}() from public, anon, authenticated;`,
      );
    }
    const p = plano(sql);
    expect(p).toContain(
      "create trigger trg_escale_atividades_ao_entrar_na_etapa after insert or update of stage_id on public.crm_leads for each row execute function public.fn_escale_atividades_ao_entrar_na_etapa();",
    );
    expect(p).toContain(
      "create trigger trg_escale_quem_concluiu_a_atividade after update of status on public.crm_tasks for each row execute function public.fn_escale_quem_concluiu_a_atividade();",
    );
  });

  it("a entrada só vale para negócio aberto, não repete atividade e nunca derruba a mudança de etapa", () => {
    const corpo = plano(
      trecho(
        ler(MIGRATION),
        "create or replace function public.fn_escale_atividades_ao_entrar_na_etapa()",
        "revoke all on function public.fn_escale_atividades_ao_entrar_na_etapa()",
      ),
    );
    expect(corpo).toContain("new.stage_id is not distinct from old.stage_id");
    expect(corpo).toContain("new.status <> 'open'");
    expect(corpo).toContain("a.atividade_id = v_modelo.id");
    expect(corpo).toContain("'playbook'");
    expect(corpo).toContain("exception when others then raise warning");
  });

  it("salvar roda como quem chama e recusa etapa que não é aberta desta origem", () => {
    const sql = ler(MIGRATION);
    const corpo = plano(
      trecho(
        sql,
        "create or replace function public.fn_escale_salvar_playbook(",
        "revoke all on function public.fn_escale_salvar_playbook(",
      ),
    );
    expect(corpo).toContain("security invoker");
    expect(corpo).toContain("errcode = '22023'");
    expect(corpo).toContain("s.pipeline_id = p_pipeline");
    expect(plano(sql)).toContain(
      "grant execute on function public.fn_escale_salvar_playbook(uuid, uuid, jsonb) to authenticated, service_role;",
    );
  });
});
