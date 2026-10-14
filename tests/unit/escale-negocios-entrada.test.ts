import { beforeEach, describe, expect, it, vi } from "vitest";

const store = { valores: {} as Record<string, string>, set: vi.fn() };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) => (nome in store.valores ? { value: store.valores[nome] } : undefined),
    set: store.set,
  }),
}));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "https://app.exemplo.com" } }));
vi.mock("@/lib/supabase/cookie-secure", () => ({ cookieSecure: () => true }));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: "agent" })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/escale/origens/ler-origens", () => ({ lerOrigens: vi.fn() }));

import { resolveActiveOrg } from "@/lib/auth/server";
import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { guardarPreferenciaDeOrigens } from "@/app/actions/escale/origens";
import { GET } from "@/app/app/escale/negocios/route";
import { ITENS_DO_TOPO } from "@/lib/escale/menu-do-topo";

const F_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const F_B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";

beforeEach(() => {
  store.valores = {};
  store.set.mockClear();
  vi.mocked(lerOrigens).mockReset();
  vi.mocked(lerOrigens).mockResolvedValue({
    grupos: [{ id: "g", name: "Geral", color: null, icon: "iniciais", is_archived: false }],
    funis: [
      { id: F_A, name: "A", group_id: "g", is_archived: false, is_default: false },
      { id: F_B, name: "B", group_id: "g", is_archived: false, is_default: true },
    ],
  });
});

describe("GET /app/escale/negocios", () => {
  it("abre o último funil aberto, pelo endereço público", async () => {
    store.valores.escale_ultimo_funil = F_A;
    const res = await GET();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://app.exemplo.com/app/pipelines/${F_A}`);
    expect(lerOrigens).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("sem lembrança, abre o funil padrão", async () => {
    expect((await GET()).headers.get("location")).toBe(`https://app.exemplo.com/app/pipelines/${F_B}`);
  });

  it("sem funil visível, ou com o banco fora do ar, cai na lista de funis", async () => {
    vi.mocked(lerOrigens).mockResolvedValueOnce({ grupos: [], funis: [] });
    expect((await GET()).headers.get("location")).toBe("https://app.exemplo.com/app/kanban");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lerOrigens).mockRejectedValueOnce(new Error("fora do ar"));
    expect((await GET()).headers.get("location")).toBe("https://app.exemplo.com/app/kanban");
  });

  it("sem organização ativa, volta para /app", async () => {
    vi.mocked(resolveActiveOrg).mockResolvedValueOnce(null);
    expect((await GET()).headers.get("location")).toBe("https://app.exemplo.com/app");
  });
});

describe("guardarPreferenciaDeOrigens", () => {
  it("grava só o que passa na validação, em cookie httpOnly", async () => {
    await guardarPreferenciaDeOrigens({ nome: "ultimo_funil", valor: F_A });
    expect(store.set).toHaveBeenCalledWith(
      "escale_ultimo_funil",
      F_A,
      expect.objectContaining({ httpOnly: true, sameSite: "strict", path: "/" }),
    );
    store.set.mockClear();
    await guardarPreferenciaDeOrigens({ nome: "ultimo_funil", valor: "../../x" } as never);
    expect(store.set).not.toHaveBeenCalled();
  });
});

describe("o Negócios do menu do topo", () => {
  it("leva para a entrada nova, sem perder a régua de permissão de /app/kanban", () => {
    const negocios = ITENS_DO_TOPO.find((i) => i.rotulo === "Negócios");
    expect(negocios).toMatchObject({ href: "/app/kanban", destino: "/app/escale/negocios" });
  });
});
