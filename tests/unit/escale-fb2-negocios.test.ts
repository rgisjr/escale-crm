import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { POST } from "@/app/api/v1/leads/[id]/notas/route";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { authOk } from "@/tests/helpers/stages-db-double";

const ID = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const pedido = () =>
  new NextRequest(new URL(`/api/v1/leads/${ID}/notas`, "http://x"), {
    method: "POST",
    body: JSON.stringify({ texto: "oi" }),
    headers: { "content-type": "application/json" },
  } as never);

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("POST /api/v1/leads/[id]/notas (B2-17)", () => {
  it("erro de banco ao ler o negócio responde 500, não 404 'não existe'", async () => {
    authOk("agent");
    const c: Record<string, unknown> = {};
    for (const m of ["select", "eq"]) c[m] = () => c;
    c.maybeSingle = async () => ({ data: null, error: { message: "timeout" } });
    vi.mocked(createClient).mockResolvedValue({ from: () => c } as never);
    const r = await POST(pedido(), { params: Promise.resolve({ id: ID }) } as never);
    expect(r.status).toBe(500);
  });
});
