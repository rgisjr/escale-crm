import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAX_ARQUIVO_BYTES, MAX_ARQUIVO_MB } from "@/lib/escale/negocio/arquivos";

/**
 * FORK ESCALE · Fase 1H (C): o arquivo do contato vai até 25 MB, como na Clint. O `proxy.ts`
 * cobre `/api/*`, e o Next corta o corpo da requisição em `experimental.proxyClientMaxBodySize`
 * (10 MB por padrão): o teto precisa caber o arquivo inteiro mais as bordas do multipart.
 */
const config = readFileSync(join(__dirname, "..", "..", "next.config.ts"), "utf8");
const MB = 1024 * 1024;

describe("limite de envio dos arquivos do contato", () => {
  it("o arquivo vai até 25 MB", () => {
    expect(MAX_ARQUIVO_MB).toBe(25);
    expect(MAX_ARQUIVO_BYTES).toBe(25 * MB);
  });

  it("o teto do corpo atrás do proxy cabe o arquivo e 1 MB de bordas do multipart", () => {
    const achado = config.match(/proxyClientMaxBodySize:\s*"(\d+)mb"/);
    expect(achado, "next.config.ts sem experimental.proxyClientMaxBodySize").not.toBeNull();
    expect(Number(achado?.[1]) * MB).toBeGreaterThanOrEqual(MAX_ARQUIVO_BYTES + MB);
  });
});
