import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261111120000_9302_assistente_de_campanha.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";
const CABECALHO = "-- ---- FORK ESCALE · assistente de campanha da casca (migration 9302) ----";

const INVOKER = [
  "fn_escale_contatos_do_publico(uuid, jsonb)",
  "fn_escale_pagina_do_publico(uuid, jsonb, integer, integer)",
  "fn_escale_fora_da_lista(uuid, uuid)",
];

describe("migration 9302 (assistente de campanha da casca)", () => {
  it("existe, começa pela linha do manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe(CABECALHO);
  });

  it("as colunas novas, todas idempotentes", () => {
    for (const c of [
      "escale_mensagem jsonb",
      "escale_publico jsonb",
      "escale_pos_envio jsonb",
      "escale_quando timestamptz",
      "escale_pos_envio_feito_em timestamptz",
    ]) {
      expect(MIGRATION).toContain(`alter table public.campaigns add column if not exists ${c};`);
    }
    for (const c of [
      "escale_pos_envio_em timestamptz",
      "escale_numero_oficial boolean",
      "escale_categoria_do_modelo text",
    ]) {
      expect(MIGRATION).toContain(
        `alter table public.campaign_recipients add column if not exists ${c};`,
      );
    }
  });

  it("as três são invoker, fechadas ao anon e abertas ao authenticated; nenhuma definer", () => {
    expect(MIGRATION).not.toMatch(/security definer/);
    for (const f of INVOKER) {
      const nome = f.split("(")[0];
      expect(MIGRATION).toMatch(
        new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`),
      );
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon;`);
      expect(MIGRATION).toContain(
        `grant execute on function public.${f} to authenticated, service_role;`,
      );
    }
  });

  it("o público reaproveita o filtro da 2B e só responde a gerente (ou ao service role)", () => {
    expect(MIGRATION).toContain("public.fn_escale_contatos_do_filtro(");
    expect(MIGRATION.match(/fn_role_at_least\(p_org, 'manager'\)/g)?.length).toBe(2);
    // current_user, não auth.role(): o Postgres efêmero do test:db não tem auth.role().
    expect(MIGRATION.match(/current_user in \('postgres', 'service_role'\)/g)?.length).toBe(2);
  });

  it("o baseline traz o bloco (sem a linha do manifesto) depois das importações e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf(CABECALHO);
    const iImportacoes = BASELINE.indexOf(
      "-- ---- FORK ESCALE · importar contatos e negócios (migration 9107) ----",
    );
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(iImportacoes).toBeGreaterThan(-1);
    expect(iBloco).toBeGreaterThan(iImportacoes);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
