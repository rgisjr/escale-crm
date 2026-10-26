import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/variaveis/resolver/route";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fontesDaConversa } from "@/lib/variaveis/fontes-da-conversa";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ sessao: true })) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ admin: true })) }));
vi.mock("@/lib/variaveis/fontes-da-conversa", () => ({ fontesDaConversa: vi.fn() }));

/** FORK ESCALE · Frente V (Task 7): a rota que a resposta rápida usa. */
const CV = "c0000000-0000-4000-8000-000000000001";
const pedido = (corpo: unknown) =>
  new NextRequest("http://x", { method: "POST", body: JSON.stringify(corpo) } as never);

describe("POST /api/v1/variaveis/resolver", () => {
  beforeEach(() => {
    vi.mocked(fontesDaConversa).mockReset();
    authOk("agent");
  });

  it("sem sessão, o portão responde", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: { code: "unauthenticated" } }, { status: 401 }),
    } as never);
    expect((await POST(pedido({ texto: "x", conversation_id: CV }))).status).toBe(401);
  });

  it("corpo inválido: 422", async () => {
    expect((await POST(pedido({ texto: "x", conversation_id: "nao-uuid" }))).status).toBe(422);
    expect((await POST(pedido({ texto: "x", conversation_id: CV, extra: 1 }))).status).toBe(422);
  });

  it("texto sem token da Clint volta igual, sem consultar", async () => {
    const r = await POST(pedido({ texto: "Oi {{nome}}", conversation_id: CV }));
    expect(await r.json()).toMatchObject({ data: { texto: "Oi {{nome}}", faltando: [] } });
    expect(fontesDaConversa).not.toHaveBeenCalled();
  });

  it("conversa fora do alcance da sessão: 404", async () => {
    vi.mocked(fontesDaConversa).mockResolvedValue(null);
    expect((await POST(pedido({ texto: "[CONTACT.NAME]", conversation_id: CV }))).status).toBe(404);
  });

  it("resolve com a organização e o usuário da sessão; o que falta volta", async () => {
    vi.mocked(fontesDaConversa).mockResolvedValue({
      contato: { id: "c", nome: "Ana Paula", email: null, telefone: null },
      negocio: null,
    });
    const r = await POST(pedido({ texto: "Oi [CONTACT.FIRST_NAME], [DEAL.STAGE]", conversation_id: CV }));
    expect(await r.json()).toMatchObject({
      data: { texto: "Oi Ana, [DEAL.STAGE]", faltando: ["DEAL.STAGE"] },
    });
    expect(fontesDaConversa).toHaveBeenCalledWith(
      { sessao: true },
      { admin: true },
      ORG_ID,
      CV,
      USER_ID,
      ["CONTACT.FIRST_NAME", "DEAL.STAGE"],
    );
    expect(createAdminClient).toHaveBeenCalled();
    expect(createClient).toHaveBeenCalled();
  });
});
