// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { criarEsqueleto, eventoDoRascunho, gravarRascunho, lerRascunho, rascunhoSchema } from "@/lib/escale/automacoes/rascunho";

const ORG = "11111111-1111-4111-8111-111111111111";
const R1 = "22222222-2222-4222-8222-222222222222";
const gatilho = (evento: string) => ({
  id: "gatilho",
  type: "gatilho" as const,
  position: { x: 0, y: 0 },
  data: { kind: "gatilho" as const, evento, tela: {} },
});

type Chamada = { metodo: string; args: unknown[] };

/** Cliente falso: anota cada chamada e responde sempre a mesma coisa. */
function banco(resposta: { data: unknown; error: { message: string } | null }) {
  const chamadas: Chamada[] = [];
  const q: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "upsert", "insert", "delete"]) {
    q[m] = (...args: unknown[]) => {
      chamadas.push({ metodo: m, args });
      return q;
    };
  }
  q.maybeSingle = async () => resposta;
  q.single = async () => resposta;
  q.then = (ok: (r: unknown) => unknown, erro?: (e: unknown) => unknown) => Promise.resolve(resposta).then(ok, erro);
  return { db: q as unknown as SupabaseClient, chamadas };
}
const args = (chamadas: Chamada[], metodo: string) => chamadas.filter((c) => c.metodo === metodo).map((c) => c.args);

describe("eventoDoRascunho", () => {
  it("o evento do gatilho quando é um gatilho conhecido", () => {
    expect(eventoDoRascunho({ caixas: [gatilho("lead.created")] })).toBe("lead.created");
  });
  it("sem gatilho escolhido, evento desconhecido ou sem caixa: null", () => {
    expect(eventoDoRascunho({ caixas: [gatilho("")] })).toBeNull();
    expect(eventoDoRascunho({ caixas: [gatilho("nao.existe")] })).toBeNull();
    expect(eventoDoRascunho({ caixas: [] })).toBeNull();
  });
});

describe("rascunhoSchema", () => {
  it("aceita desenho com caixa incompleta (é rascunho)", () => {
    const acao = {
      id: "acao-1",
      type: "acao",
      position: { x: 1, y: 1 },
      data: { kind: "acao", acao: { type: "send_whatsapp_message", config: { template: "" } } },
    };
    expect(rascunhoSchema.safeParse({ nome: "", desenho: { caixas: [gatilho(""), acao], ligacoes: [] } }).success).toBe(true);
  });
  it("recusa nome acima de 120 e desenho sem caixas", () => {
    expect(rascunhoSchema.safeParse({ nome: "x".repeat(121), desenho: { caixas: [gatilho("")], ligacoes: [] } }).success).toBe(false);
    expect(rascunhoSchema.safeParse({ nome: "A", desenho: { caixas: [], ligacoes: [] } }).success).toBe(false);
  });
});

describe("banco do rascunho", () => {
  it("gravar faz upsert por regra, com a organização e quem salvou", async () => {
    const { db, chamadas } = banco({ data: { updated_at: "2026-11-04T12:00:00Z" }, error: null });
    const em = await gravarRascunho(db, { orgId: ORG, ruleId: R1, userId: "u1", nome: "A", desenho: { caixas: [gatilho("")], ligacoes: [] } });
    expect(em).toBe("2026-11-04T12:00:00Z");
    expect(args(chamadas, "from")[0]).toEqual(["crm_rascunhos_de_automacao"]);
    const [linha, opcoes] = args(chamadas, "upsert")[0]!;
    expect(linha).toMatchObject({ rule_id: R1, organization_id: ORG, salvo_por: "u1", nome: "A" });
    expect(opcoes).toEqual({ onConflict: "rule_id" });
  });

  it("ler filtra a organização e a regra, e devolve null para desenho torto", async () => {
    const { db, chamadas } = banco({ data: { nome: "A", desenho: { caixas: "x" }, updated_at: "t" }, error: null });
    expect(await lerRascunho(db, ORG, R1)).toBeNull();
    expect(args(chamadas, "eq")).toContainEqual(["organization_id", ORG]);
    expect(args(chamadas, "eq")).toContainEqual(["rule_id", R1]);
  });

  it("o esqueleto nasce pausado, sem ação e com nome mesmo vazio", async () => {
    const { db, chamadas } = banco({ data: { id: R1 }, error: null });
    expect(await criarEsqueleto(db, { orgId: ORG, userId: "u1", nome: "  ", evento: "lead.created" })).toBe(R1);
    expect(args(chamadas, "insert")[0]![0]).toMatchObject({
      organization_id: ORG,
      name: "Sem nome",
      trigger_event: "lead.created",
      actions: [],
      conditions: [],
      is_active: false,
      created_by_user_id: "u1",
    });
  });

  it("erro do banco vira exceção", async () => {
    const { db } = banco({ data: null, error: { message: "boom" } });
    await expect(lerRascunho(db, ORG, R1)).rejects.toThrow("boom");
  });
});
