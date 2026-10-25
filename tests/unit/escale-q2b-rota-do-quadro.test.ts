import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const banco = vi.hoisted(() => ({
  chamadas: [] as string[],
  emAndamento: 0,
  maximoEmParalelo: 0,
  tabelas: {} as Record<string, unknown[]>,
}));

/** Um cliente que responde por tabela, anota cada `from`/`rpc` e mede quantas leituras correm juntas. */
function cliente() {
  const resolver = async (tabela: string, primeira: boolean) => {
    banco.emAndamento += 1;
    banco.maximoEmParalelo = Math.max(banco.maximoEmParalelo, banco.emAndamento);
    await new Promise((r) => setTimeout(r, 5));
    banco.emAndamento -= 1;
    const linhas = banco.tabelas[tabela] ?? [];
    return { data: primeira ? (linhas[0] ?? null) : linhas, error: null };
  };
  const from = (tabela: string) => {
    banco.chamadas.push(tabela);
    let primeira = false;
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "neq", "in", "order", "range", "not", "gt", "limit"]) {
      b[m] = () => b;
    }
    b.maybeSingle = () => {
      primeira = true;
      return b;
    };
    b.then = (ok: (r: unknown) => unknown, falha?: (e: unknown) => unknown) =>
      resolver(tabela, primeira).then(ok, falha);
    return b;
  };
  return {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    from,
    rpc: (nome: string) => {
      banco.chamadas.push(`rpc:${nome}`);
      return resolver(`rpc:${nome}`, false);
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => cliente()) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => cliente()) }));
vi.mock("@/lib/auth/server", () => ({ loadAuthUser: vi.fn(async () => ({ idioma: "pt-BR" })) }));
vi.mock("@/app/api/v1/conversations/_handler", () => ({
  idsDeContatosPessoais: vi.fn(async () => []),
}));

import { GET } from "@/app/api/v1/pipelines/[id]/board/route";

/** Q2b (G2-2, G2-3): o quadro lê cada tabela de contato UMA vez, e as etapas independentes correm juntas. */
const lead = (id: string, contact_id: string | null) => ({
  id,
  organization_id: "org-1",
  pipeline_id: "p1",
  stage_id: "e1",
  contact_id,
  status: "open",
  owner_kind: null,
  owner_agent_id: null,
});

beforeEach(() => {
  banco.chamadas = [];
  banco.emAndamento = 0;
  banco.maximoEmParalelo = 0;
  banco.tabelas = {
    crm_pipelines: [{ id: "p1", organization_id: "org-1", settings: {} }],
    crm_stages: [{ id: "e1", pipeline_id: "p1", name: "Entrada" }],
    crm_leads: [lead("a", "c1"), lead("b", null)],
    contacts: [
      {
        id: "c1",
        name: "Ana",
        display_name: null,
        is_anonymized: false,
        avatar_storage_path: null,
        tags: ["vip"],
        phone_number: "+5543999990000",
        email: "ana@x.com",
        custom_fields: {},
      },
    ],
    conversations: [
      {
        id: "v1",
        contact_id: "c1",
        last_message_preview: "oi",
        last_message_at: "2026-10-14T10:00:00Z",
        unread_count_for_assignee: 2,
        tags: ["quente"],
        status: "open",
        channel: "whatsapp",
        assigned_to_user_id: null,
        last_inbound_at: null,
        last_outbound_at: null,
      },
    ],
  };
});

async function chamar() {
  const r = await GET(new NextRequest("http://localhost/api/v1/pipelines/p1/board"), {
    params: Promise.resolve({ id: "p1" }),
  });
  return (await r.json()) as { data: { leads: Array<Record<string, unknown>> } };
}

describe("GET /pipelines/[id]/board", () => {
  it("lê contacts e conversations uma vez cada", async () => {
    await chamar();
    expect(banco.chamadas.filter((t) => t === "contacts")).toHaveLength(1);
    expect(banco.chamadas.filter((t) => t === "conversations")).toHaveLength(1);
  });

  it("as etapas de enriquecimento correm juntas, não em série", async () => {
    await chamar();
    expect(banco.maximoEmParalelo).toBeGreaterThanOrEqual(4);
  });

  it("o resultado junta o campo de cada etapa no mesmo negócio", async () => {
    const { data } = await chamar();
    const a = data.leads.find((l) => l.id === "a")!;
    expect(a.contact_phone).toBe("+5543999990000");
    expect(a.contact_tags).toEqual(["vip"]);
    expect(a.conversation_tags).toEqual(["quente"]);
    expect(a.conversa).toMatchObject({ id: "v1", preview: "oi", unread: 2 });
    expect((a.filtros_escale as { contato_nome: string }).contato_nome).toBe("Ana");
    expect((a.filtros_escale as { conversa: { canal: string } }).conversa.canal).toBe("whatsapp");
    const b = data.leads.find((l) => l.id === "b")!;
    expect(b.conversa).toBeUndefined();
    expect((b.filtros_escale as { contato_nome: unknown }).contato_nome).toBeNull();
  });
});
