import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PassoArquivo } from "@/components/escale/importacao/PassoArquivo";
import { csvDeExemplo } from "@/lib/escale/importacao/exemplo";

describe("passo Arquivo (Fase 2F; print 2b-41)", () => {
  it("Contatos: o título de contatos e a troca para Negócios", () => {
    const aoMudarTipo = vi.fn();
    render(<PassoArquivo tipo="contato" aoMudarTipo={aoMudarTipo} travarTipo={false} nomeDoArquivo={null} lendo={false} erro={null} aoEscolher={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Escolha o arquivo .CSV para criar contatos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Negócios" }));
    expect(aoMudarTipo).toHaveBeenCalledWith("negocio");
  });

  it("travado (vindo do quadro): a troca fica desligada", () => {
    render(<PassoArquivo tipo="negocio" aoMudarTipo={vi.fn()} travarTipo nomeDoArquivo={null} lendo={false} erro={null} aoEscolher={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Contatos" })).toBeDisabled();
  });

  it("arquivo pronto e o erro", () => {
    render(<PassoArquivo tipo="contato" aoMudarTipo={vi.fn()} travarTipo={false} nomeDoArquivo="a.csv" lendo={false} erro="Selecione um arquivo .CSV válido." aoEscolher={vi.fn()} />);
    expect(screen.getByText("a.csv")).toBeInTheDocument();
    expect(screen.getByText("Pronto para mapear")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Selecione um arquivo .CSV válido.");
  });

  it("o exemplo da Clint", () => {
    expect(csvDeExemplo("contato").split("\n")[0]).toBe("nome,email,telefone,instagram,empresa,tag");
    expect(csvDeExemplo("negocio").split("\n")[0]).toBe("nome,email,telefone,instagram,empresa,tag,titulo,valor,etapa,status");
  });
});
