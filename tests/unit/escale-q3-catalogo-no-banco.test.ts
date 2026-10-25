import { describe, expect, it, vi } from "vitest";

import { lerCatalogo, lerCatalogosSemeando, reordenar } from "@/lib/escale/campos/banco";

/** Q3 (G3-1, G3-5, G3-2, B3-8): leitura do catálogo em paralelo, semente só se vazio, reordenar em paralelo. */
const ORG = "aaaaaaaa-0000-4000-8000-0000000000aa";

/** Banco falso: uma "consulta" é thenable e conta quantas estão em voo ao mesmo tempo. */
function bancoFalso(opcoes: { grupos?: unknown[]; falhaEm?: string } = {}) {
  const estado = { emVoo: 0, picoEmVoo: 0, leituras: [] as string[], updates: [] as Array<{ tabela: string; valores: unknown; id: string }> };
  const esperar = async <T,>(valor: T): Promise<T> => {
    estado.emVoo += 1;
    estado.picoEmVoo = Math.max(estado.picoEmVoo, estado.emVoo);
    await new Promise((r) => setTimeout(r, 1));
    estado.emVoo -= 1;
    return valor;
  };
  const sb = {
    from: (tabela: string) => ({
      select: () => {
        estado.leituras.push(tabela);
        const cadeia: Record<string, unknown> = {};
        for (const m of ["eq", "order", "limit"]) cadeia[m] = () => cadeia;
        cadeia.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) =>
          esperar({ data: tabela === "crm_grupos_de_campos" ? (opcoes.grupos ?? []) : [], error: null }).then(ok, ko);
        return cadeia;
      },
      update: (valores: unknown) => ({
        eq: () => ({
          eq: (_c: string, id: string) =>
            esperar(null).then(() => {
              estado.updates.push({ tabela, valores, id });
              return { error: opcoes.falhaEm === id ? { message: "falhou" } : null };
            }),
        }),
      }),
    }),
  };
  return { sb: sb as never, estado };
}

describe("lerCatalogo (G3-1)", () => {
  it("lê grupos e campos ao mesmo tempo", async () => {
    const { sb, estado } = bancoFalso();
    await lerCatalogo(sb, ORG, "contato");
    expect(estado.picoEmVoo).toBe(2);
  });
});

describe("lerCatalogosSemeando (G3-1, G3-5)", () => {
  it("lê os dois catálogos juntos e NÃO semeia quando já há grupos", async () => {
    const { sb, estado } = bancoFalso({ grupos: [{ id: "g", chave: "informacoes_gerais", nome: "Geral", posicao: 0, padrao: true }] });
    const rpc = vi.fn(async () => ({ error: null }));
    const admin = { rpc, from: vi.fn() } as never;
    const [contato, empresa] = await lerCatalogosSemeando(sb, admin, ORG, ["contato", "empresa"]);
    expect(rpc).not.toHaveBeenCalled();
    expect(contato.grupos).toHaveLength(1);
    expect(empresa.grupos).toHaveLength(1);
    expect(estado.picoEmVoo).toBe(4);
  });

  it("semeia uma vez e relê quando o catálogo volta sem grupos", async () => {
    const { sb } = bancoFalso({ grupos: [] });
    const rpc = vi.fn(async () => ({ error: null }));
    const admin = {
      rpc,
      from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }),
    } as never;
    await lerCatalogosSemeando(sb, admin, ORG, ["contato", "empresa"]);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe("reordenar (G3-2, B3-8)", () => {
  const G = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
  const C = ["00000000-0000-4000-8000-0000000000c1", "00000000-0000-4000-8000-0000000000c2", "00000000-0000-4000-8000-0000000000c3"];

  it("grava grupos e campos em paralelo, com a posição de cada um", async () => {
    const { sb, estado } = bancoFalso();
    await reordenar(sb, ORG, { objeto: "contato", grupos: G, campos: [{ grupo_id: G[0]!, ids: C }] });
    expect(estado.updates).toHaveLength(5);
    expect(estado.picoEmVoo).toBeGreaterThan(1);
    expect(estado.updates.find((u) => u.id === C[2])?.valores).toEqual({ posicao: 2, grupo_id: G[0] });
    expect(estado.updates.find((u) => u.id === G[1])?.valores).toEqual({ posicao: 1 });
  });

  it("uma gravação que falha derruba a chamada com o erro", async () => {
    const { sb } = bancoFalso({ falhaEm: C[1] });
    await expect(reordenar(sb, ORG, { objeto: "contato", grupos: [], campos: [{ grupo_id: G[0]!, ids: C }] })).rejects.toMatchObject({ message: "falhou" });
  });
});
