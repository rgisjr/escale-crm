import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const raiz = process.cwd();
const migration = readFileSync(join(raiz, "supabase/migrations/20261107120000_9107_importacoes.sql"), "utf8");
const baseline = readFileSync(join(raiz, "supabase/baseline.sql"), "utf8");

describe("migration 9107 — importações (Fase 2F)", () => {
  it("as duas tabelas, só leitura para gerente+", () => {
    expect(migration).toMatch(/create table if not exists public\.crm_importacoes \(/);
    expect(migration).toMatch(/create table if not exists public\.crm_importacoes_linhas \(/);
    expect(migration).toMatch(/fn_role_at_least\(organization_id, 'manager'\)/);
    expect(migration).toMatch(/revoke all on public\.crm_importacoes from anon, authenticated;/);
    expect(migration).not.toMatch(/grant (insert|update|delete)[^;]*to authenticated/);
  });

  it("as funções fechadas ao service role", () => {
    for (const assinatura of [
      "fn_escale_contar_importacao(uuid)",
      "fn_escale_enfileirar_importacao(uuid)",
      "fn_escale_cancelar_importacao(uuid)",
      "fn_escale_reabrir_importacao(uuid, text, jsonb)",
      "fn_escale_apagar_linhas_antigas(uuid)",
      "fn_escale_empresa_da_importacao(uuid, uuid, uuid, text, text, text)",
    ]) {
      expect(migration).toContain(`revoke all on function public.${assinatura} from public, anon, authenticated;`);
      expect(migration).toContain(`grant execute on function public.${assinatura} to service_role;`);
    }
  });

  it("o evento e o bloco no baseline", () => {
    expect(migration).toContain("'contatos.importacao_requested'");
    expect(baseline).toContain("-- ---- FORK ESCALE · importar contatos e negócios (migration 9107) ----");
    expect(baseline.indexOf("migration 9107")).toBeGreaterThan(baseline.indexOf("migration 9105"));
  });
});
