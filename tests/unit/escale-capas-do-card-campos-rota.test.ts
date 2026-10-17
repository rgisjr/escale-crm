import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/capas-do-card/campos/route";
import { requireRole } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { OUTRA_ORG, authOk, funilRow, makeDb } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const campo = (key: string, label: string) => ({ key, label, type: "text" });

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(logger.error).mockClear();
  authOk();
});

describe("GET /api/v1/capas-do-card/campos", () => {
  it("junta os campos do negócio de todas as origens da organização, sem repetir, e só eles", async () => {
    makeDb({
      pipelines: [
        funilRow({
          id: "p1",
          name: "A",
          settings: { fields: [campo("renda", "Renda")], secret: "x" },
        }),
        funilRow({
          id: "p2",
          name: "B",
          settings: { fields: [campo("renda", "Renda"), campo("plano", "Plano")] },
        }),
        funilRow({ id: "p3", name: "C", settings: null }),
        funilRow({
          id: "p4",
          name: "D",
          organization_id: OUTRA_ORG,
          settings: { fields: [campo("alheio", "Alheio")] },
        }),
      ],
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as {
      data: { campos: Array<{ entidade: string; chave: string }> };
    };
    expect(corpo.data.campos.map((c) => `${c.entidade}:${c.chave}`)).toEqual([
      "negocio:renda",
      "negocio:plano",
    ]);
    expect(JSON.stringify(corpo)).not.toContain("secret");
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("viewer");
  });

  it("organização sem campo nenhum devolve lista vazia", async () => {
    makeDb({ pipelines: [funilRow({ id: "p1", name: "A", settings: {} })] });
    const corpo = (await (await GET()).json()) as { data: { campos: unknown[] } };
    expect(corpo.data.campos).toEqual([]);
  });

  it("erro do banco é 500 genérico: a mensagem crua vai só para o log", async () => {
    const CRU = "falha interna de crm_pipelines";
    makeDb({
      readError: (tabela) => (tabela === "crm_pipelines" ? { code: "XX000", message: CRU } : null),
    });
    const res = await GET();
    const texto = await res.text();
    expect(res.status).toBe(500);
    expect(texto).not.toContain("crm_pipelines");
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ codigo: "XX000", erro: CRU }),
    );
  });
});
