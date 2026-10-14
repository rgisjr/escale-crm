import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: "agent" })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/escale/visualizacoes/ler-visualizacoes", () => ({ lerVisualizacoes: vi.fn() }));
vi.mock("@/lib/escale/origens/ler-origens", () => ({ lerOrigens: vi.fn() }));
vi.mock("@/components/escale/visualizacoes/QuadroDaVisualizacao", () => ({ QuadroDaVisualizacao: () => null }));

import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { lerVisualizacoes } from "@/lib/escale/visualizacoes/ler-visualizacoes";
import VisualizacaoPage from "@/app/app/pipelines/visualizacoes/[id]/page";

beforeEach(() => {
  vi.mocked(lerVisualizacoes).mockResolvedValue([
    { id: "v-1", name: "Time", acesso: "todos", origens: ["f-b", "f-morto", "f-a"], pessoas: [] },
  ]);
  vi.mocked(lerOrigens).mockResolvedValue({
    grupos: [{ id: "g", name: "G", color: null, icon: "iniciais", is_archived: false }],
    funis: [
      { id: "f-a", name: "A", group_id: "g", is_archived: false, is_default: true },
      { id: "f-b", name: "B", group_id: "g", is_archived: false, is_default: false },
      { id: "f-morto", name: "Morto", group_id: "g", is_archived: true, is_default: false },
    ],
  });
});

const abrir = (id: string) => VisualizacaoPage({ params: Promise.resolve({ id }) });

describe("página /app/pipelines/visualizacoes/[id]", () => {
  it("passa o nome e as origens vivas, na ordem da visualização", async () => {
    const pagina = (await abrir("v-1")) as { props: { nome: string; origens: Array<{ id: string; name: string }> } };
    expect(pagina.props.nome).toBe("Time");
    expect(pagina.props.origens).toEqual([
      { id: "f-b", name: "B" },
      { id: "f-a", name: "A" },
    ]);
    expect(lerVisualizacoes).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("visualização que a pessoa não vê (ou que não existe) é 404", async () => {
    await expect(abrir("v-outra")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
