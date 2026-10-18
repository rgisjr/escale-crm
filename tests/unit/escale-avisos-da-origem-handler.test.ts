import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/notifications/web_push", () => ({
  enviarPushAoUsuario: vi.fn(async () => ({ sent: 1 })),
}));
vi.mock("@/lib/notifications/vapid", () => ({ vapidPronto: vi.fn(() => true) }));
vi.mock("@/lib/escale/acesso/modo-da-organizacao", () => ({
  modoDaOrganizacao: vi.fn(async () => "all"),
}));

import { avisosDaOrigemHandler } from "@/lib/escale/notificacoes/avisos-da-origem.handler";
import { enviarPushAoUsuario } from "@/lib/notifications/web_push";
import { createAdminClient } from "@/lib/supabase/admin";

/** FORK ESCALE · Fase 1K (D15): o push das notificações da origem, só para quem vê o negócio. */
const ORG = "11111111-0000-4000-8000-000000000001";
const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const V = "cccccccc-1111-4111-8111-111111111111";

/** Um admin client de mentira: cada tabela devolve as linhas dadas, em `maybeSingle` ou como lista. */
function adminFalso(tabelas: Record<string, Array<Record<string, unknown>>>) {
  const from = (t: string) => {
    const linhas = tabelas[t] ?? [];
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "not", "is"]) b[m] = () => b;
    b.maybeSingle = async () => ({ data: linhas[0] ?? null, error: null });
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: linhas, error: null });
    return b;
  };
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);
}

const evento = (event_type: string) =>
  ({
    id: "ev-1",
    organization_id: ORG,
    event_type,
    entity_id: "lead-1",
    payload: { lead_id: "lead-1" },
  }) as never;

beforeEach(() => vi.mocked(enviarPushAoUsuario).mockClear());

describe("avisosDaOrigemHandler", () => {
  it("escuta lead.created, lead.won e lead.lost", () => {
    expect(avisosDaOrigemHandler.events).toEqual(["lead.created", "lead.won", "lead.lost"]);
  });

  it("novo negócio sem pessoa que criou: push às pessoas escolhidas que veem o negócio", async () => {
    adminFalso({
      crm_leads: [
        {
          id: "lead-1",
          title: "Maria",
          pipeline_id: "p-1",
          owner_user_id: null,
          created_by_user_id: null,
        },
      ],
      crm_pipelines: [
        {
          id: "p-1",
          name: "Clayton",
          group_id: null,
          settings: {
            escale_notificacoes: {
              novo_negocio: { pessoas: [A, V] },
              mudanca_de_status: { status: [], pessoas: [] },
            },
          },
        },
      ],
      user_organizations: [{ user_id: A, role: "agent" }],
    });
    const r = await avisosDaOrigemHandler.handle(evento("lead.created"));
    expect(r.status).toBe("ok");
    expect(enviarPushAoUsuario).toHaveBeenCalledTimes(1);
    expect(enviarPushAoUsuario).toHaveBeenCalledWith(
      ORG,
      A,
      expect.objectContaining({
        title: "Novo negócio",
        body: "Clayton · Maria",
        href: "/app/negocios/lead-1",
      }),
    );
  });

  it("criado por uma pessoa: ninguém", async () => {
    adminFalso({
      crm_leads: [
        {
          id: "lead-1",
          title: "Maria",
          pipeline_id: "p-1",
          owner_user_id: null,
          created_by_user_id: B,
        },
      ],
      crm_pipelines: [
        {
          id: "p-1",
          name: "Clayton",
          group_id: null,
          settings: {
            escale_notificacoes: {
              novo_negocio: { pessoas: [A] },
              mudanca_de_status: { status: [], pessoas: [] },
            },
          },
        },
      ],
      user_organizations: [{ user_id: A, role: "agent" }],
    });
    expect((await avisosDaOrigemHandler.handle(evento("lead.created"))).status).toBe("skipped");
    expect(enviarPushAoUsuario).not.toHaveBeenCalled();
  });

  it("ganho: avisa quem foi escolhido, menos o dono", async () => {
    adminFalso({
      crm_leads: [
        {
          id: "lead-1",
          title: "Maria",
          pipeline_id: "p-1",
          owner_user_id: A,
          created_by_user_id: null,
        },
      ],
      crm_pipelines: [
        {
          id: "p-1",
          name: "Clayton",
          group_id: null,
          settings: {
            escale_notificacoes: {
              novo_negocio: { pessoas: [] },
              mudanca_de_status: { status: ["won"], pessoas: [A, B] },
            },
          },
        },
      ],
      user_organizations: [
        { user_id: A, role: "agent" },
        { user_id: B, role: "manager" },
      ],
    });
    await avisosDaOrigemHandler.handle(evento("lead.won"));
    expect(enviarPushAoUsuario).toHaveBeenCalledTimes(1);
    expect(enviarPushAoUsuario).toHaveBeenCalledWith(
      ORG,
      B,
      expect.objectContaining({ title: "Negócio ganho" }),
    );
  });
});
