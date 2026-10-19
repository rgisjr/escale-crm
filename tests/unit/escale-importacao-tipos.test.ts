import { describe, expect, it } from "vitest";

import { pedidoDeImportacaoSchema, resolucaoSchema } from "@/lib/escale/importacao/tipos";

const base = {
  tipo: "contato",
  nivel: "conservador",
  decisoes: { MATCH_PHONE_DIFFERS: "PENDING_REVIEW" },
  mapeamento: [{ csv: "Email", para: "email" }],
  configuracao: { tags: ["feira"] },
};
const ORIGEM = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const ETAPA = "9e2a3c1b-4d5e-4f6a-9b0c-1d2e3f4a5b6c";

describe("pedido da importação (Fase 2F)", () => {
  it("contato: configuração com padrões", () => {
    expect(pedidoDeImportacaoSchema.parse(base).configuracao).toEqual({
      tags: ["feira"],
      origemId: null,
      etapaId: null,
      status: "open",
      motivoDePerda: null,
    });
  });

  it("negócio exige origem e etapa", () => {
    expect(pedidoDeImportacaoSchema.safeParse({ ...base, tipo: "negocio" }).success).toBe(false);
    expect(
      pedidoDeImportacaoSchema.safeParse({ ...base, tipo: "negocio", configuracao: { origemId: ORIGEM, etapaId: ETAPA } }).success,
    ).toBe(true);
  });

  it("recusa motivo, ação ou destino desconhecidos", () => {
    expect(pedidoDeImportacaoSchema.safeParse({ ...base, decisoes: { INVENTADO: "SKIP_ROW" } }).success).toBe(false);
    expect(pedidoDeImportacaoSchema.safeParse({ ...base, decisoes: { MATCH_PHONE_DIFFERS: "VOAR" } }).success).toBe(false);
    expect(pedidoDeImportacaoSchema.safeParse({ ...base, mapeamento: [] }).success).toBe(false);
  });

  it("resolução: ação e dados opcionais", () => {
    expect(resolucaoSchema.parse({ acao: "KEEP_DB", dados: { sobrescrever: ["campo:plano"] } })).toMatchObject({ acao: "KEEP_DB" });
    expect(resolucaoSchema.safeParse({ acao: "KEEP_DB", dados: { origemId: "x" } }).success).toBe(false);
  });
});
