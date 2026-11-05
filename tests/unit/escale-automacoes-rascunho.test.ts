// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cifra = vi.hoisted(() => ({ encryptRuleActionSecrets: vi.fn() }));
vi.mock("@/lib/webhooks/secrets", () => cifra);

import {
  cifrarSegredosDoDesenho,
  criarEsqueleto,
  eventoDoRascunho,
  gravarRascunho,
  lerRascunho,
  rascunhoSchema,
} from "@/lib/escale/automacoes/rascunho";

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

describe("cifrarSegredosDoDesenho: a senha do webhook nunca fica aberta no rascunho", () => {
  const webhook = (config: Record<string, unknown>) => ({ type: "call_webhook", config });
  const caixa = (acao: unknown) => ({ id: "acao-1", type: "acao", position: { x: 0, y: 0 }, data: { kind: "acao", acao } });
  const desenho = (acao: unknown) => ({ caixas: [gatilho("lead.created"), caixa(acao)], ligacoes: [] });
  const admin = {} as SupabaseClient;

  beforeEach(() => {
    cifra.encryptRuleActionSecrets.mockReset();
  });

  it("troca secret por secret_enc, igual à regra publicada", async () => {
    cifra.encryptRuleActionSecrets.mockImplementation(async (_a: unknown, acoes: Array<{ type: string; config: Record<string, unknown> }>) =>
      acoes.map((a) => ({ ...a, config: { url: a.config.url, secret_enc: "abc" } })),
    );
    const saida = await cifrarSegredosDoDesenho(admin, desenho(webhook({ url: "https://x.test", secret: "senha-aberta" })));
    expect(JSON.stringify(saida)).not.toContain("senha-aberta");
    expect((saida.caixas[1]!.data as { acao?: unknown }).acao).toEqual({ type: "call_webhook", config: { url: "https://x.test", secret_enc: "abc" } });
  });

  it("pega também o webhook de dentro de um passo 'Ações' (grupo)", async () => {
    cifra.encryptRuleActionSecrets.mockImplementation(async (_a: unknown, acoes: Array<{ type: string; config: Record<string, unknown> }>) =>
      acoes.map((a) => ({ ...a, config: { secret_enc: "abc" } })),
    );
    const grupo = { type: "grupo_de_acoes", config: { acoes: [webhook({ secret: "senha-aberta" })] } };
    const saida = await cifrarSegredosDoDesenho(admin, desenho(grupo));
    expect(JSON.stringify(saida)).not.toContain("senha-aberta");
    expect(JSON.stringify(saida)).toContain("secret_enc");
  });

  it("sem chave de cifra descarta a senha mas guarda o resto (não perde o trabalho)", async () => {
    cifra.encryptRuleActionSecrets.mockResolvedValue(null);
    const saida = await cifrarSegredosDoDesenho(admin, desenho(webhook({ url: "https://x.test", secret: "senha-aberta" })));
    expect((saida.caixas[1]!.data as { acao?: unknown }).acao).toEqual({ type: "call_webhook", config: { url: "https://x.test" } });
  });

  it("webhook sem senha e outras ações passam intactos, sem chamar a cifra", async () => {
    const entrada = desenho(webhook({ url: "https://x.test" }));
    expect(await cifrarSegredosDoDesenho(admin, entrada)).toEqual(entrada);
    expect(cifra.encryptRuleActionSecrets).not.toHaveBeenCalled();
  });
});

describe("versão-base", () => {
  it("a leitura devolve a versão em que o rascunho se baseou (ou null)", async () => {
    const d = { caixas: [gatilho("lead.created")], ligacoes: [] };
    const com = banco({ data: { nome: "A", desenho: d, versao_base: "2026-11-04T10:00:00Z", updated_at: "t" }, error: null });
    expect((await lerRascunho(com.db, ORG, R1))?.versaoBase).toBe("2026-11-04T10:00:00Z");
    const sem = banco({ data: { nome: "A", desenho: d, versao_base: null, updated_at: "t" }, error: null });
    expect((await lerRascunho(sem.db, ORG, R1))?.versaoBase).toBeNull();
  });

  it("gravar leva a versão-base na linha", async () => {
    const { db, chamadas } = banco({ data: { updated_at: "t" }, error: null });
    await gravarRascunho(db, { orgId: ORG, ruleId: R1, userId: "u1", nome: "A", desenho: { caixas: [gatilho("")], ligacoes: [] }, versaoBase: "v1" });
    expect(args(chamadas, "upsert")[0]![0]).toMatchObject({ versao_base: "v1" });
  });
});
