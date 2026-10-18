import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "@/app/api/v1/lista-de-contatos/[id]/route";
import { ApiError } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/require-role";
import { excluirContatoComNegocios } from "@/lib/escale/contatos/excluir";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/escale/contatos/excluir", () => ({ excluirContatoComNegocios: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const SESSAO = { sessao: true };
const pedido = () =>
  new NextRequest(new URL(`/api/v1/lista-de-contatos/${C1}`, "http://x"), {
    method: "DELETE",
  } as never);
const comId = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.mocked(excluirContatoComNegocios).mockReset();
  vi.mocked(createClient).mockResolvedValue(SESSAO as never);
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("manager");
});

describe("DELETE /api/v1/lista-de-contatos/[id] (Q5)", () => {
  it("gerente ou acima; o acompanhamento só-leitura não exclui; id inválido é 422", async () => {
    vi.mocked(excluirContatoComNegocios).mockResolvedValue({ id: C1, negocios: 0 });
    await DELETE(pedido(), comId(C1));
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("manager");
    expect((await DELETE(pedido(), comId("abc"))).status).toBe(422);
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await DELETE(pedido(), comId(C1))).status).toBe(403);
  });

  it("exclui com os negócios, pela sessão de quem pede", async () => {
    vi.mocked(excluirContatoComNegocios).mockResolvedValue({ id: C1, negocios: 2 });
    const r = await DELETE(pedido(), comId(C1));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ data: { id: C1, negocios: 2 } });
    expect(excluirContatoComNegocios).toHaveBeenCalledWith(
      SESSAO,
      expect.objectContaining({ organization_id: ORG_ID, actor: { type: "user", id: USER_ID } }),
      C1,
    );
  });

  it("a trava da Agenda volta como 409 com os vínculos, como no original", async () => {
    vi.mocked(excluirContatoComNegocios).mockRejectedValue(
      new ApiError(
        409,
        "state_conflict",
        { vinculos: ["1 compromisso(s) na agenda"], por_tabela: { calendar_appointments: 1 } },
        "r",
        "bloqueado",
      ),
    );
    const r = await DELETE(pedido(), comId(C1));
    expect(r.status).toBe(409);
    expect(JSON.stringify(await r.json())).toContain("calendar_appointments");
  });
});
