import { describe, expect, it } from "vitest";

import { agruparPorChave, celula, chavesDaLinha, csvDoRelatorio, dataEHora, detalheDaLinha, processadas } from "@/lib/escale/importacao/relatorio";
import type { ImportacaoLida, LinhaLida } from "@/lib/escale/importacao/tipos";

const linha = (extra: Partial<LinhaLida>): LinhaLida => ({
  id: "l",
  numero: 2,
  status: "pulada",
  motivo: null,
  normalizado: { nome: "Ana", email: "ana@x.com", telefone: null },
  detalhe: { avisos: {} },
  resolucoes: {},
  mensagem: null,
  com_aviso: false,
  ...extra,
});

describe("relatório da importação (Fase 2F)", () => {
  it("data no formato brasileiro e o progresso", () => {
    expect(dataEHora("2026-10-19T13:05:00Z")).toMatch(/^19\/10\/2026 \d{2}:05$/);
    expect(processadas({ importadas: 3, puladas: 1, erros: 1, revisar: 2 } as ImportacaoLida)).toBe(7);
  });

  it("os motivos da linha: o da pulada, o do erro e os avisos da importada", () => {
    expect(chavesDaLinha(linha({ motivo: "INVALID_EMAIL_FORMAT" }))).toEqual(["INVALID_EMAIL_FORMAT"]);
    expect(chavesDaLinha(linha({ status: "erro", mensagem: "x" }))).toEqual(["erro"]);
    expect(
      chavesDaLinha(linha({ status: "importada", com_aviso: true, detalhe: { avisos: { telefone: "12", dono: "zé" } } })),
    ).toEqual(["aviso:telefone", "aviso:dono"]);
  });

  it("agrupa do maior para o menor e monta o detalhe", () => {
    const linhas = [linha({ motivo: "DUPLICATE_IN_BATCH" }), linha({ motivo: "DUPLICATE_IN_BATCH" }), linha({ motivo: "INVALID_EMAIL_FORMAT" })];
    expect(agruparPorChave(linhas)).toEqual([
      ["DUPLICATE_IN_BATCH", 2],
      ["INVALID_EMAIL_FORMAT", 1],
    ]);
    expect(detalheDaLinha(linha({ status: "importada", detalhe: { avisos: { telefone: "12" } } }))).toEqual({
      titulo: "Ana",
      meio: "ana@x.com",
      avisos: ["Telefone descartado: 12"],
      erro: null,
    });
  });

  it("o CSV do relatório: BOM, cabeçalho e a guarda de fórmula", () => {
    const csv = csvDoRelatorio([linha({ motivo: "INVALID_EMAIL_FORMAT", normalizado: { nome: "=SOMA(1)" } })], (x) => x);
    expect(csv.startsWith("\uFEFFLinha,Motivo,Detalhe\n")).toBe(true);
    expect(csv).toContain(`2,E-mail inválido,'=SOMA(1)`);
  });

  it("a guarda de fórmula cobre também tabulação e retorno de carro no começo (fora-8)", () => {
    expect(celula("\t=SOMA(1)")).toBe("'\t=SOMA(1)");
    expect(celula("\r@x")).toBe(`"'\r@x"`);
    expect(celula("normal")).toBe("normal");
  });
});
