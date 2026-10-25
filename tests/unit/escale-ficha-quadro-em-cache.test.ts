import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { quadroEmCache } from "@/lib/kanban/quadro-em-cache";
import type { BoardData } from "@/lib/kanban/types";

/** G2-9: moeda, motivos e portão de campos leem o funil também da ficha aberta por link. */
const quadro = (nome: string) =>
  ({ pipeline: { id: "o1", name: nome, settings: {} }, stages: [], leads: [] }) as unknown as BoardData;

describe("quadroEmCache", () => {
  it("devolve o quadro inteiro quando ele está em cache", () => {
    const qc = new QueryClient();
    qc.setQueryData(["board", "o1"], quadro("inteiro"));
    qc.setQueryData(["board", "o1", "negocio", "n1"], quadro("leve"));
    expect(quadroEmCache(qc, "o1")?.pipeline.name).toBe("inteiro");
  });

  it("sem o quadro, cai no negócio leve do MESMO funil", () => {
    const qc = new QueryClient();
    qc.setQueryData(["board", "o2", "negocio", "n9"], quadro("de outro funil"));
    qc.setQueryData(["board", "o1", "negocio", "n1"], quadro("leve"));
    expect(quadroEmCache(qc, "o1")?.pipeline.name).toBe("leve");
  });

  it("cache vazio devolve undefined (os hooks seguem no padrão de sempre)", () => {
    expect(quadroEmCache(new QueryClient(), "o1")).toBeUndefined();
  });
});
