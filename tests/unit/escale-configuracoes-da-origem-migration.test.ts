import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * CONFIGURAÇÕES DA ORIGEM (fork Escale, migration 9007): a migration e o bloco
 * do baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork — depois
 * do bloco 9006 e antes do bloco da 0323. Os dois gatilhos são definer, fechados
 * a anon/authenticated, e o das tags nunca derruba a criação do negócio.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql";
const MIGRATION_9006 = "supabase/migrations/20261021120000_9006_campos_do_crm.sql";
const CABECALHO = "-- ---- FORK ESCALE · configurações da origem (migration 9007) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

function funcao(sql: string, nome: string): string {
  const inicio = sql.indexOf(`create or replace function public.${nome}()`);
  const fim = sql.indexOf(`revoke all on function public.${nome}()`);
  expect(inicio).toBeGreaterThan(-1);
  expect(fim).toBeGreaterThan(inicio);
  return sql.slice(inicio, fim);
}

describe("configurações da origem: migration 9007 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(2500);
    expect(ler("supabase/baseline.sql").includes(migration)).toBe(true);
  });

  it("o bloco mora depois do bloco 9006 e antes do bloco da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9005 = baseline.indexOf(ler(MIGRATION_9006));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9005).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9005);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("os dois gatilhos são definer, com search_path fixo, e fechados a anon e authenticated", () => {
    const sql = ler(MIGRATION);
    for (const nome of ["fn_escale_lead_nasce_na_moeda_da_origem", "fn_escale_tags_padrao_no_contato"]) {
      const corpo = funcao(sql, nome);
      expect(corpo).toContain("security definer");
      expect(corpo).toContain("set search_path = public, pg_temp");
      expect(sql).toContain(`revoke all on function public.${nome}() from public, anon, authenticated;`);
    }
  });

  it("a moeda entra ANTES do insert; as tags, DEPOIS", () => {
    const sql = ler(MIGRATION).replace(/\s+/g, " ");
    expect(sql).toContain(
      "create trigger trg_escale_lead_nasce_na_moeda_da_origem before insert on public.crm_leads for each row execute function public.fn_escale_lead_nasce_na_moeda_da_origem();",
    );
    expect(sql).toContain(
      "create trigger trg_escale_tags_padrao_no_contato after insert on public.crm_leads for each row execute function public.fn_escale_tags_padrao_no_contato();",
    );
  });

  it("a moeda só troca a da organização (ou nada) e só aplica moeda na forma ISO", () => {
    const corpo = funcao(ler(MIGRATION), "fn_escale_lead_nasce_na_moeda_da_origem");
    expect(corpo).toContain("settings ->> 'escale_moeda'");
    expect(corpo).toContain("v_moeda !~ '^[A-Z]{3}$'");
    expect(corpo).toContain("new.currency is null or new.currency = coalesce(v_da_organizacao, 'BRL')");
  });

  it("as tags seguem a régua do contato, pulam `cliente`, anonimizado e mesclado, e se anunciam", () => {
    const corpo = funcao(ler(MIGRATION), "fn_escale_tags_padrao_no_contato");
    expect(corpo).toContain("settings -> 'escale_tags_padrao'");
    expect(corpo).toContain("left(lower(btrim(e.valor)), 40)");
    expect(corpo).toContain("t.tag <> 'cliente'");
    expect(corpo).toContain("c.is_anonymized = false");
    expect(corpo).toContain("c.is_merged_into is null");
    expect(corpo).toContain("for no key update");
    expect(corpo).toContain("'contact.tag_added'");
    expect(corpo).toContain("'actor_id', 'trg_escale_tags_padrao_no_contato'");
  });

  it("falhar ao etiquetar nunca derruba a criação do negócio", () => {
    const corpo = funcao(ler(MIGRATION), "fn_escale_tags_padrao_no_contato");
    expect(corpo).toContain("exception when others then");
    expect(corpo).toContain("raise warning");
    expect(corpo).not.toMatch(/raise exception/);
  });
});
