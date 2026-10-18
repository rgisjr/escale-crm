import { describe, expect, it, vi } from "vitest";

import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { GET } from "@/app/api/v1/escale/avisos-da-origem/route";
import { USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

/** FORK ESCALE · Fase 1K (D15): as origens que avisam quem pede (lidas com a sessão). */
describe("GET /api/v1/escale/avisos-da-origem", () => {
  it("devolve só as origens em que a pessoa está, com o que cada uma avisa", async () => {
    authOk("manager");
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq"]) b[m] = () => b;
    b.then = (r: (v: unknown) => unknown) =>
      r({
        data: [
          {
            id: "o1",
            name: "Clayton",
            settings: {
              escale_notificacoes: {
                novo_negocio: { pessoas: [USER_ID] },
                mudanca_de_status: { status: [], pessoas: [] },
              },
            },
          },
          { id: "o2", name: "Outra", settings: {} },
        ],
        error: null,
      });
    vi.mocked(createClient).mockResolvedValue({ from: () => b } as never);
    const { data } = (await (await GET()).json()) as { data: unknown };
    expect(data).toEqual([{ id: "o1", nome: "Clayton", novo: true, status: [] }]);
    expect(requireRole).toHaveBeenCalledWith("agent", expect.anything());
  });
});
