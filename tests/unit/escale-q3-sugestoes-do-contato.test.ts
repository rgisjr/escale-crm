import { describe, expect, it, vi } from "vitest";

import { lerSugestoes, mesclarGrupo } from "@/lib/escale/mescla/banco";
import { chavesDoGrupoDe, consultaDeSugestoesSchema } from "@/lib/escale/mescla/regras";

vi.mock("@/lib/escale/empresas/banco", () => ({ trocarEmpresaDoContato: vi.fn() }));

/** Q3 (G9-1): sugestão de um contato só carrega o grupo dele; o total do selo tem cache curto. */
const D = "00000000-0000-4000-8000-00000000000d";
const E = "00000000-0000-4000-8000-00000000000e";
const CHAVES = [
  { contato_id: "a", regra: "telefone", chave: "1" },
  { contato_id: "b", regra: "telefone", chave: "1" },
  { contato_id: "b", regra: "email", chave: "x@y" },
  { contato_id: "c", regra: "email", chave: "x@y" },
  { contato_id: D, regra: "telefone", chave: "9" },
  { contato_id: E, regra: "telefone", chave: "9" },
] as const;

function bancoFalso(chaves: readonly unknown[] = CHAVES) {
  const lidos: string[][] = [];
  const rpc = vi.fn(async (nome: string) => (nome === "fn_escale_chaves_de_mescla" ? { data: chaves, error: null } : { data: { contato_id: "a", contatos_mesclados: ["b"] }, error: null }));
  const sb = {
    rpc,
    from: (tabela: string) => ({
      select: () => {
        const cadeia: Record<string, unknown> = {};
        for (const m of ["eq", "is", "order"]) cadeia[m] = () => cadeia;
        cadeia.in = (coluna: string, ids: string[]) => {
          if (tabela === "contacts" && coluna === "id") lidos.push(ids);
          return cadeia;
        };
        cadeia.then = (ok: (v: unknown) => unknown) =>
          Promise.resolve({
            data: tabela === "contacts" ? (lidos.at(-1) ?? []).map((id) => ({ id, name: id, display_name: null, phone_number: null, email: null, wa_lid: null, custom_fields: {}, tags: [], person_id: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" })) : [],
            error: null,
          }).then(ok);
        return cadeia;
      },
    }),
  };
  return { sb: sb as never, rpc, lidos };
}
const consulta = (extra: Record<string, unknown>) => consultaDeSugestoesSchema.parse(extra);

describe("chavesDoGrupoDe", () => {
  it("segue as chaves em cadeia (a-b por telefone, b-c por e-mail) e deixa o outro grupo de fora", () => {
    const ids = new Set(chavesDoGrupoDe([...CHAVES], "a").map((c) => c.contato_id));
    expect([...ids].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("lerSugestoes com contato (G9-1)", () => {
  it("carrega só os contatos do grupo dele", async () => {
    const { sb, lidos } = bancoFalso();
    const r = await lerSugestoes(sb, "org-g91", consulta({ contato: D, n: 1 }));
    expect(lidos.flat().sort()).toEqual([D, E]);
    expect(r.total).toBe(1);
    expect(r.data[0]!.contatos.map((c) => c.id).sort()).toEqual([D, E]);
  });
});

describe("total do selo (G9-1)", () => {
  it("a segunda chamada em seguida não vai ao banco; mesclar esquece o total", async () => {
    const { sb, rpc } = bancoFalso();
    const c = consulta({ n: 0 });
    const primeira = await lerSugestoes(sb, "org-cache", c);
    const segunda = await lerSugestoes(sb, "org-cache", c);
    expect(segunda.total).toBe(primeira.total);
    expect(rpc).toHaveBeenCalledTimes(1);
    await mesclarGrupo(sb, sb, "org-cache", "u", "a", ["b"], {} as never);
    await lerSugestoes(sb, "org-cache", c);
    expect(rpc.mock.calls.filter((x) => x[0] === "fn_escale_chaves_de_mescla")).toHaveLength(2);
  });
});
