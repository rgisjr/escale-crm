import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261121120000_9401_q7a_indices_fila_e_publico.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";
const CABECALHO =
  "-- ---- FORK ESCALE · revisão Q7a: índices, fila e público (migration 9401) ----";

const FUNCOES = [
  "fn_escale_admin_unico(uuid)",
  "fn_escale_ids_do_publico(uuid, jsonb)",
  "fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer)",
];

const INDICES = [
  "idx_crm_atividades_do_negocio_lead_id",
  "idx_crm_atividades_do_negocio_atividade",
  "idx_crm_mensagens_agendadas_contato",
  "idx_crm_mensagens_agendadas_conversa_fk",
  "idx_crm_mensagens_agendadas_dispositivo",
  "idx_crm_arquivos_do_contato_negocio",
  "idx_crm_setor_da_conversa_setor_anterior",
  "idx_crm_atividades_da_etapa_stage",
  "idx_conversations_org_fila_interacao",
];

describe("migration 9401 (revisão Q7a: índices, fila e público)", () => {
  it("existe, começa pela linha do manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe(CABECALHO);
  });

  it("idempotente e sem transação explícita", () => {
    expect(MIGRATION).not.toMatch(/^\s*(begin|commit)\s*;/im);
    expect(MIGRATION).not.toMatch(/create index (?!if not exists)/i);
    expect(MIGRATION).not.toMatch(/create function/i);
    for (const i of INDICES) expect(MIGRATION).toContain(`create index if not exists ${i}`);
  });

  it("as três funções são invoker, fechadas ao anon e abertas só a authenticated e service_role", () => {
    expect(MIGRATION).not.toMatch(/security definer/);
    for (const f of FUNCOES) {
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

  it("o único admin conta só convite aceito (B7-2)", () => {
    expect(MIGRATION).toMatch(/u\.accepted_at is not null\s+and u\.revoked_at is null\) = 1/);
  });

  it("a fila ordena direto nas colunas, uma consulta por ordem (G7-3)", () => {
    expect(MIGRATION).toContain("order by c.awaiting_since asc nulls last, c.id asc");
    expect(MIGRATION).toContain("order by c.last_message_at desc nulls last, c.id desc");
    expect(MIGRATION).not.toMatch(/order by\s+case/i);
  });

  it("o baseline traz o bloco (sem a linha do manifesto) depois do da 9310 e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf(CABECALHO);
    const i9310 = BASELINE.indexOf(
      "-- ---- FORK ESCALE · detalhe da campanha da casca (migration 9310) ----",
    );
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(i9310).toBeGreaterThan(-1);
    expect(iBloco).toBeGreaterThan(i9310);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
