import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * FORK ESCALE · Fase 1K (D13): a forma da migration 9013, lida como texto. A
 * prova de comportamento é `tests/invariants/escale-distribuicao-de-dono.test.ts`.
 */
const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261028120000_9013_distribuicao_de_dono.sql"),
  "utf8",
);
const BASELINE = readFileSync(join(process.cwd(), "supabase/baseline.sql"), "utf8");

const FUNCOES = [
  "fn_escale_recebe_da_origem(uuid, uuid, uuid)",
  "fn_escale_salvar_distribuicao(uuid, uuid, uuid, jsonb, boolean)",
  "fn_escale_reiniciar_distribuicao(uuid, uuid, uuid)",
  "fn_escale_reparte_dono_da_origem()",
  "fn_escale_registra_a_distribuicao()",
];

describe("migration 9013 — distribuição de dono", () => {
  it("abre com a linha do manifesto", () => {
    expect(MIGRATION.startsWith("-- manifest: **Distribuição de dono por origem")).toBe(true);
  });

  it("as três tabelas com RLS ligada e só a policy de leitura (gerente ou acima)", () => {
    for (const tabela of [
      "crm_distribuicao_de_dono",
      "crm_distribuicoes_feitas",
      "crm_distribuicao_alteracoes",
    ]) {
      expect(MIGRATION).toContain(`create table if not exists public.${tabela} (`);
      expect(MIGRATION).toContain(`alter table public.${tabela} enable row level security;`);
      expect(MIGRATION).toContain(`create policy ${tabela}_select on public.${tabela}`);
    }
    expect(MIGRATION.match(/fn_role_at_least\(organization_id, 'manager'\)/g)).toHaveLength(3);
    // 1J: gerente que não tem acesso à origem (lista de pessoas) também não lê a distribuição dela.
    expect(
      MIGRATION.split(
        "fn_role_at_least(organization_id, 'manager')\n    and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)",
      ),
    ).toHaveLength(4);
    expect(MIGRATION).not.toMatch(/for (insert|update|delete|all) to authenticated/);
  });

  it("as três tabelas nascem fechadas: sem nada a anon, só leitura ao authenticated, tudo ao service_role", () => {
    for (const tabela of [
      "crm_distribuicao_de_dono",
      "crm_distribuicoes_feitas",
      "crm_distribuicao_alteracoes",
    ]) {
      const t = `public.${tabela}`;
      expect(MIGRATION).toContain(`revoke all on ${t} from anon;`);
      expect(MIGRATION).toContain(
        `revoke insert, update, delete, truncate, references, trigger on ${t} from authenticated;`,
      );
      expect(MIGRATION).toContain(`grant select on ${t} to authenticated;`);
      expect(MIGRATION).toContain(`grant all on ${t} to service_role;`);
    }
  });

  it("toda função é definer com search_path e fechada a public, anon e authenticated", () => {
    for (const f of FUNCOES) {
      expect(MIGRATION).toContain(
        `revoke all on function public.${f} from public, anon, authenticated;`,
      );
    }
    expect(MIGRATION.match(/security definer\s+set search_path = public, pg_temp/g)?.length).toBe(
      FUNCOES.length,
    );
  });

  it("só as duas RPCs abrem ao service_role; nenhuma ao authenticated", () => {
    expect(MIGRATION).toContain(
      "grant execute on function public.fn_escale_salvar_distribuicao(uuid, uuid, uuid, jsonb, boolean) to service_role;",
    );
    expect(MIGRATION).toContain(
      "grant execute on function public.fn_escale_reiniciar_distribuicao(uuid, uuid, uuid) to service_role;",
    );
    expect(MIGRATION).not.toMatch(/grant execute on function [^;]+ to [^;]*authenticated/);
  });

  it("os gatilhos: o BEFORE roda depois da carteira e do dono padrão (ordem alfabética) e antes da validação do dono", () => {
    expect(MIGRATION).toContain(
      "create trigger trg_escale_reparte_dono_da_origem\n  before insert on public.crm_leads",
    );
    expect(MIGRATION).toContain(
      "create trigger trg_escale_registra_a_distribuicao\n  after insert on public.crm_leads",
    );
    const nomes = [
      "trg_crm_lead_nasce_na_carteira",
      "trg_escale_dono_padrao_na_origem",
      "trg_escale_reparte_dono_da_origem",
      "trg_lead_so_liga_a_propria_empresa",
    ];
    expect([...nomes].sort()).toEqual(nomes);
  });

  it("o gatilho de repartição repete a leitura da trava uma vez (as linhas novas do salvar)", () => {
    const gatilho = MIGRATION.slice(
      MIGRATION.indexOf("create or replace function public.fn_escale_reparte_dono_da_origem()"),
    );
    expect(gatilho.match(/for update;/g)?.length).toBe(2);
  });

  it("o baseline traz o bloco idêntico, antes da âncora", () => {
    const bloco = `-- ---- FORK ESCALE · distribuição de dono (migration 9013) ----\n${MIGRATION}`;
    expect(BASELINE).toContain(bloco);
    expect(BASELINE.indexOf(bloco)).toBeLessThan(
      BASELINE.indexOf(
        "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
      ),
    );
  });
});
