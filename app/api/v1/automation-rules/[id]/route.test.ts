/**
 * Salvar de uma tela velha não apaga a versão boa (28/10/2026).
 *
 * O editor abria a automação da cópia da lista, que podia estar velha; salvar
 * dali gravava a versão antiga por cima da que acabara de ser salva. Agora o
 * editor manda `versao_lida` (o `updated_at` que ele abriu) e a rota só grava
 * se a linha ainda for aquela — a checagem vai NO MESMO UPDATE.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/webhooks/secrets", () => ({ encryptRuleActionSecrets: vi.fn(async (_admin: unknown, a: unknown) => a) }));

const ORG = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const SESSAO = "44444444-4444-4444-8444-444444444444";
const LIDA = "2026-10-28T13:46:30.317+00:00";

type Linha = Record<string, unknown>;

/** Banco de uma tabela só: aplica os `eq` de verdade, no SELECT e no UPDATE. */
function bancoCom(linha: Linha) {
  const estado = { linha: { ...linha }, updates: [] as { patch: Linha; filtros: [string, unknown][] }[] };
  const consulta = () => {
    const filtros: [string, unknown][] = [];
    let patch: Linha | null = null;
    const casa = () => filtros.every(([c, v]) => estado.linha[c] === v);
    const q = {
      select: () => q,
      update: (p: Linha) => {
        patch = p;
        return q;
      },
      eq: (c: string, v: unknown) => {
        filtros.push([c, v]);
        return q;
      },
      maybeSingle: async () => {
        if (!casa()) return { data: null, error: null };
        if (patch) {
          estado.updates.push({ patch, filtros });
          estado.linha = { ...estado.linha, ...patch };
        }
        return { data: { ...estado.linha }, error: null };
      },
    };
    return q;
  };
  vi.mocked(createClient).mockResolvedValue({ from: () => consulta() } as never);
  return estado;
}

const regra = (extra: Linha = {}): Linha => ({
  id: ID,
  organization_id: ORG,
  name: "Primeira msg csa",
  trigger_event: "contact.tag_added",
  trigger_config: {},
  actions: [{ type: "send_whatsapp_message", config: { channel_session_id: SESSAO, template: "Olá {{nome}}" } }],
  updated_at: LIDA,
  ...extra,
});

const corpo = (extra: Linha = {}) => ({
  name: "Primeira msg csa",
  trigger_event: "contact.tag_added",
  conditions: [],
  trigger_config: {},
  actions: [
    { type: "send_whatsapp_message", config: { channel_session_id: SESSAO, template: "Olá [CONTACT.FIRST_NAME]" } },
  ],
  ...extra,
});

const ctx = () => ({ params: Promise.resolve({ id: ID }) });
const patch = (body: unknown) =>
  new NextRequest(`http://localhost/api/v1/automation-rules/${ID}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: "u1", idioma: "pt-BR" },
    org: { orgId: ORG, role: "manager" },
  } as never);
});

describe("PATCH /api/v1/automation-rules/[id] com a versão lida", () => {
  it("grava quando a versão lida ainda é a do banco, e não grava a versão_lida como coluna", async () => {
    const banco = bancoCom(regra());
    const { PATCH } = await import("./route");
    const res = await PATCH(patch(corpo({ versao_lida: LIDA })), ctx());

    expect(res.status).toBe(200);
    expect(banco.updates).toHaveLength(1);
    expect(banco.updates[0]?.filtros).toContainEqual(["updated_at", LIDA]);
    expect(banco.updates[0]?.patch).not.toHaveProperty("versao_lida");
    expect(banco.linha.actions).toEqual(corpo().actions);
  });

  it("recusa com 409 quando outra tela salvou depois, sem tocar na versão boa", async () => {
    const banco = bancoCom(regra({ updated_at: "2026-10-28T13:47:00.000+00:00" }));
    const { PATCH } = await import("./route");
    const res = await PATCH(patch(corpo({ versao_lida: LIDA })), ctx());

    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("state_conflict");
    expect(banco.updates).toEqual([]);
    expect(banco.linha.actions).toEqual(regra().actions);
  });

  it("sem versão lida (ligar/pausar pela lista) continua gravando", async () => {
    const banco = bancoCom(regra({ updated_at: "2026-10-28T13:47:00.000+00:00" }));
    const { PATCH } = await import("./route");
    const res = await PATCH(patch({ is_active: true }), ctx());

    expect(res.status).toBe(200);
    expect(banco.linha.is_active).toBe(true);
  });
});

describe("GET /api/v1/automation-rules/[id]", () => {
  it("devolve a regra do banco, filtrando pela organização", async () => {
    bancoCom(regra());
    const { GET } = await import("./route");
    const res = await GET(new NextRequest(`http://localhost/api/v1/automation-rules/${ID}`), ctx());

    expect(res.status).toBe(200);
    expect((await res.json()).data.updated_at).toBe(LIDA);
  });

  it("regra de outra organização é 404", async () => {
    bancoCom(regra({ organization_id: "33333333-3333-4333-8333-333333333333" }));
    const { GET } = await import("./route");
    const res = await GET(new NextRequest(`http://localhost/api/v1/automation-rules/${ID}`), ctx());

    expect(res.status).toBe(404);
  });
});
