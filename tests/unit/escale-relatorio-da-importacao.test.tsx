import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const importacao = {
  id: "imp-1", tipo: "contato", arquivo: "a.csv", status: "aguardando_revisao", total: 6,
  importadas: 3, revisar: 1, puladas: 1, erros: 1, avisos: 1, linhas_apagadas_em: null, created_at: "2026-10-19T12:00:00Z",
};
const linhas = [
  { id: "1", numero: 2, status: "pulada", motivo: "INVALID_EMAIL_FORMAT", normalizado: { nome: "Ana" }, detalhe: { avisos: {} }, resolucoes: {}, mensagem: null, com_aviso: false },
  { id: "2", numero: 3, status: "erro", motivo: null, normalizado: { nome: "Bia" }, detalhe: { avisos: {} }, resolucoes: {}, mensagem: "Contato já cadastrado com este e-mail, telefone ou CPF.", com_aviso: false },
  { id: "3", numero: 4, status: "importada", motivo: null, normalizado: { nome: "Caio" }, detalhe: { avisos: { telefone: "12" } }, resolucoes: {}, mensagem: null, com_aviso: true },
];
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useImportacao: () => ({ data: importacao, isLoading: false }),
  useLinhasDaImportacao: () => ({ data: linhas, isLoading: false }),
}));

import { RelatorioDaImportacao } from "@/components/escale/importacao/RelatorioDaImportacao";

describe("Relatório da importação (Fase 2F)", () => {
  it("os cartões, os motivos, o erro e os avisos", () => {
    render(<RelatorioDaImportacao id="imp-1" />);
    expect(screen.getByRole("heading", { name: "Relatório da importação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revisar 1 pendências" })).toBeInTheDocument();
    expect(screen.getByText("Linhas não importadas por motivo")).toBeInTheDocument();
    expect(screen.getAllByText("E-mail inválido").length).toBeGreaterThan(0);
    expect(screen.getByText("Contato já cadastrado com este e-mail, telefone ou CPF.")).toBeInTheDocument();
    expect(screen.getByText("Telefone descartado: 12")).toBeInTheDocument();
    expect(screen.getByText("Linha 4")).toBeInTheDocument();
  });
});
