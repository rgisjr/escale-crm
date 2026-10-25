import { describe, expect, it } from "vitest";

import { ErroDaImportacao, cancelarImportacao } from "@/lib/escale/importacao/banco";
import { numeroDoValor } from "@/lib/escale/filtros/campos";

const admin = (message: string) => ({ rpc: async () => ({ error: { message } }) });

describe("cancelarImportacao (B5-9)", () => {
  it("só a marca de estado da função vira o erro de estado (409)", async () => {
    await expect(
      cancelarImportacao(admin("importacao_nao_cancelavel: só se cancela") as never, "i"),
    ).rejects.toBeInstanceOf(ErroDaImportacao);
  });

  it("qualquer outra falha do banco sobe como falha de verdade, não como 409", async () => {
    const erro = await cancelarImportacao(admin("connection reset") as never, "i").catch((e) => e);
    expect(erro).not.toBeInstanceOf(ErroDaImportacao);
    expect(erro.message).toBe("connection reset");
  });
});

describe("filtro 'entre' em vírgula decimal (B5-13)", () => {
  it("'0,125' é relido como 0,125, não como 125", () => {
    expect(numeroDoValor("0,125")).toBe(0.125);
    expect(numeroDoValor("0.125")).toBe(125); // a heurística brasileira: por isso o valor é gravado com vírgula
  });
});
