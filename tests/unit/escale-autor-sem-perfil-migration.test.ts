import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * NOME DO AUTOR SEM PERFIL (fork Escale, Fase 1H-C, migration 9011): a migration só
 * redefine o carimbo da 9008, o bloco do baseline é o MESMO SQL e mora depois do da 9008
 * (a função precisa existir antes) e antes do da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261026120000_9011_autor_sem_perfil.sql";
const MIGRATION_9008 = "supabase/migrations/20261023120000_9008_notas_e_arquivos.sql";
const CABECALHO = "-- ---- FORK ESCALE · nome do autor sem perfil (migration 9011) ----";
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("autor sem perfil: migration 9011 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o bloco do baseline é idêntico, depois da 9008 e antes da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9008 = baseline.indexOf(ler(MIGRATION_9008));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf(
      "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
    );
    expect(de9008).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9008);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("o nome vem do perfil ou do e-mail da sessão, nunca do INSERT; a função segue fechada", () => {
    const sql = ler(MIGRATION).replace(/\s+/g, " ");
    expect(sql).toContain("create or replace function public.fn_escale_carimbar_autoria()");
    expect(sql).toContain("nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')");
    expect(sql).toContain("nullif(split_part(coalesce(u.email, ''), '@', 1), '')");
    expect(sql).toContain("where u.id = auth.uid()");
    expect(sql).not.toMatch(/coalesce\([^)]*new\.user_nome/);
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain(
      "revoke execute on function public.fn_escale_carimbar_autoria() from public, anon, authenticated;",
    );
  });
});
