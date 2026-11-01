import { describe, expect, it } from "vitest";

import { csvDasExecucoes, nomeDoCsvDasExecucoes } from "@/lib/escale/automacoes/insights/csv";
import type { LinhaDaExecucao } from "@/lib/escale/automacoes/insights/tipos";

const t = (s: string) => s;
const SP = "America/Sao_Paulo";
const ACOES = [{ type: "send_whatsapp_message" }, { type: "call_webhook" }];

const LINHAS: LinhaDaExecucao[] = [
  {
    id: "r1",
    status: "failed",
    criadaEm: "2026-09-10T15:40:00Z",
    eventoId: "e1",
    resultados: [
      { type: "send_whatsapp_message", status: "success" },
      { type: "call_webhook", status: "failed", error: "http_500" },
    ],
    contato: { id: "k1", nome: "=HYPERLINK(1)", telefone: "+5553984555965", email: "a@b.com", temFoto: false },
    negocio: { id: "n1", titulo: "Negócio X" },
  },
  { id: "r2", status: "success", criadaEm: "2026-09-11T10:00:00Z", eventoId: null, resultados: [], contato: null, negocio: null },
];

describe("csvDasExecucoes", () => {
  const linhas = csvDasExecucoes(LINHAS, ACOES, t, SP, (r) => `motivo:${r.error}`).split("\r\n");

  it("cabeçalho na ordem", () => {
    expect(linhas[0]).toBe("Data,Contato,Telefone,E-mail,Negócio,Status,Passo com problema,Motivo");
  });

  it("data BR, telefone formatado, passo com problema e motivo; fórmula neutralizada", () => {
    expect(linhas[1]).toBe(
      "10/09/2026 12:40,'=HYPERLINK(1),(53) 98455-5965,a@b.com,Negócio X,Falhou,2. Avisar outro sistema (webhook),motivo:http_500",
    );
  });

  it("sem contato, as colunas de contato ficam vazias", () => {
    expect(linhas[2]).toBe("11/09/2026 07:00,,,,,Sucesso,,");
  });
});

describe("nomeDoCsvDasExecucoes", () => {
  it("tira acento, usa o dia no fuso", () => {
    expect(nomeDoCsvDasExecucoes("Boas-vindas à Clínica", new Date("2026-10-30T15:00:00Z"), SP)).toBe(
      "execucoes-boas-vindas-a-clinica-2026-10-30.csv",
    );
  });
});
