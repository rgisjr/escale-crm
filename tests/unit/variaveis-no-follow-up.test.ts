import { describe, expect, it } from "vitest";

import { deriveTemplateContract } from "@/lib/channels/meta/template-contract";
import { modelosQueOFluxoEnvia } from "@/lib/followup/modelos-aprovados";
import { fontesDoContexto } from "@/lib/variaveis/fontes-do-contexto";
import { modeloPodeSairNoFluxo, valoresDoModeloDoFluxo } from "@/lib/variaveis/mapeamento";

/** FORK ESCALE · Frente V (Task 13): o follow-up manda modelo com variável pelo mapeamento salvo (D6, D8). */
const COMPONENTES = [{ type: "BODY", text: "Olá {{1}}, sobre {{2}}." }];
const CONTRATO = deriveTemplateContract({
  name: "oi",
  language: "pt_BR",
  parameter_format: "POSITIONAL",
  components: COMPONENTES as never,
});
const MAPA = {
  "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: null },
  "2": { fonte: "campo", campo: "[DEAL.OBRA]", alternativo: "sua obra" },
};
const linha = (extra: Record<string, unknown> = {}) => ({
  contract_hash: "h1",
  variaveis: MAPA,
  variaveis_contrato: "h1",
  saved_values: {},
  ...extra,
});
const CONTEXTO = {
  contact: { id: "c-1", name: "Ana Paula", display_name: null, email: null, phone_number: null, custom_fields: {} },
  lead: { id: "l-1", created_at: new Date("2026-10-05T15:00:00Z"), status: "open", value_cents: "150000", currency: "BRL", custom_fields: {} },
};
const QUANDO = { agora: new Date("2026-10-25T13:00:00Z"), fuso: "America/Sao_Paulo" };

describe("fontesDoContexto", () => {
  it("lê as linhas cruas do motor", () => {
    const f = fontesDoContexto(CONTEXTO, "America/Sao_Paulo");
    expect(f.contato?.nome).toBe("Ana Paula");
    expect(f.negocio).toMatchObject({ id: "l-1", criadoEm: "2026-10-05T15:00:00.000Z", valorCentavos: 150000 });
    expect(fontesDoContexto({}).contato).toBeNull();
  });
});

describe("modeloPodeSairNoFluxo", () => {
  it("sem variável sempre; com variável só com o mapa completo e atual", () => {
    const sem = deriveTemplateContract({ name: "x", language: "pt_BR", components: [{ type: "BODY", text: "Oi" }] as never });
    expect(modeloPodeSairNoFluxo(sem, { contract_hash: "h" })).toBe(true);
    expect(modeloPodeSairNoFluxo(CONTRATO, linha())).toBe(true);
    expect(modeloPodeSairNoFluxo(CONTRATO, linha({ variaveis: {} }))).toBe(false);
    expect(modeloPodeSairNoFluxo(CONTRATO, linha({ variaveis_contrato: "h0" }))).toBe(false);
    expect(modeloPodeSairNoFluxo(CONTRATO, linha({ variaveis: { "1": MAPA["1"] } }))).toBe(false);
  });

  it("mídia sem o link salvo não sai", () => {
    const comMidia = deriveTemplateContract({
      name: "x",
      language: "pt_BR",
      components: [{ type: "HEADER", format: "IMAGE" }, ...COMPONENTES] as never,
    });
    expect(modeloPodeSairNoFluxo(comMidia, linha())).toBe(false);
    expect(modeloPodeSairNoFluxo(comMidia, linha({ saved_values: { "header:1": "https://img" } }))).toBe(true);
  });
});

describe("valoresDoModeloDoFluxo", () => {
  it("campo e alternativo", () => {
    expect(valoresDoModeloDoFluxo(CONTRATO, linha(), fontesDoContexto(CONTEXTO), QUANDO)).toEqual({
      ok: true,
      valores: { "1": "Ana", "2": "sua obra" },
    });
  });

  it("sem o dado e sem alternativo: pula com variavel_sem_valor", () => {
    const r = valoresDoModeloDoFluxo(CONTRATO, linha(), fontesDoContexto({ ...CONTEXTO, contact: { ...CONTEXTO.contact, name: null } }), QUANDO);
    expect(r).toMatchObject({ ok: false, motivo: expect.stringContaining("variavel_sem_valor: 1") });
  });

  it("sem mapeamento: o motivo aponta Modelos de mensagem", () => {
    expect(valoresDoModeloDoFluxo(CONTRATO, linha({ variaveis: {} }), fontesDoContexto(CONTEXTO), QUANDO)).toMatchObject({
      ok: false,
      motivo: expect.stringContaining("Modelos de mensagem"),
    });
  });
});

describe("modelosQueOFluxoEnvia", () => {
  it("lista o modelo com variável mapeado; o sem mapa continua fora", () => {
    const base = { language: "pt_BR", status: "APPROVED", parameter_format: "POSITIONAL", components: COMPONENTES };
    const r = modelosQueOFluxoEnvia([
      { id: "a", name: "mapeado", ...base, ...linha() },
      { id: "b", name: "sem_mapa", ...base, ...linha({ variaveis: {} }) },
    ] as never);
    expect(r.map((m) => m.name)).toEqual(["mapeado"]);
  });
});
