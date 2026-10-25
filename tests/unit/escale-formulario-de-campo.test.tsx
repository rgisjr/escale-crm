import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormularioDeCampo } from "@/components/escale/campos/FormularioDeCampo";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const CATALOGO = {
  grupos: [{ id: "g1", chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true }],
  campos: [{ id: "c1", objeto: "contato" as const, chave: "cargo", definicao: { label: "Cargo", type: "text" as const }, grupo_id: "g1", papel_minimo: null, posicao: 0, padrao: false }],
};

describe("FormularioDeCampo (AddFieldForm da Clint)", () => {
  it("pílulas de objeto, nome com o exemplo do objeto, grupo e os nove tipos; Salvar só com nome, grupo e tipo", async () => {
    const aoSalvar = vi.fn().mockResolvedValue(undefined);
    render(<FormularioDeCampo objeto="contato" catalogo={CATALOGO} grupoSugerido={CATALOGO.grupos[0]!} aoFechar={vi.fn()} aoSalvar={aoSalvar} aoCriarGrupo={vi.fn()} />);
    expect(screen.getByText("Estou criando um campo para:")).toBeInTheDocument();
    for (const o of ["Contato", "Empresa", "Negócio"]) expect(screen.getByRole("radio", { name: o })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Linkedin")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Empresa" }));
    expect(screen.getByPlaceholderText("Ex: Número de funcionários")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Contato" }));

    const salvar = screen.getByRole("button", { name: "Salvar" });
    expect(salvar).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "Linkedin" } });
    expect(screen.getByText("Grupo")).toBeInTheDocument();
    expect(screen.getByText("Tipo do campo")).toBeInTheDocument();
    for (const tipo of ["Texto", "Número", "Monetário", "Texto Rico", "Telefone", "Seleção", "Múltipla seleção", "Data", "Data e Hora"]) {
      expect(screen.getByRole("radio", { name: tipo })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("radio", { name: "Número" }));
    expect(salvar).toBeEnabled();
    fireEvent.click(salvar);
    await waitFor(() => expect(aoSalvar).toHaveBeenCalledWith({ objeto: "contato", nome: "Linkedin", grupo_id: "g1", tipo: "NUMBER", opcoes: undefined }));
  });

  it("nome já existente avisa com o texto da Clint e não salva", () => {
    const aoSalvar = vi.fn();
    render(<FormularioDeCampo objeto="contato" catalogo={CATALOGO} grupoSugerido={CATALOGO.grupos[0]!} aoFechar={vi.fn()} aoSalvar={aoSalvar} aoCriarGrupo={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "cargo" } });
    expect(screen.getByText("Já existe um outro campo com o nome informado, o campo deve ser único.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("Seleção pede opções; 'Nova opção' acrescenta linha; sem opção não salva", () => {
    render(<FormularioDeCampo objeto="negocio" catalogo={{ ...CATALOGO, campos: [] }} grupoSugerido={CATALOGO.grupos[0]!} aoFechar={vi.fn()} aoSalvar={vi.fn()} aoCriarGrupo={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "Origem" } });
    fireEvent.click(screen.getByRole("radio", { name: "Seleção" }));
    expect(screen.getByText("Opções de seleção")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Nova opção" }));
    const caixas = screen.getAllByLabelText(/Opção \d/);
    fireEvent.change(caixas[0]!, { target: { value: "Orgânico" } });
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("o grupo inline: '+' abre 'Nome do Grupo', salva e já seleciona", async () => {
    const aoCriarGrupo = vi.fn().mockResolvedValue({ id: "g2", chave: "kaio_ia", nome: "Kaio IA", posicao: 1, padrao: false });
    render(<FormularioDeCampo objeto="contato" catalogo={CATALOGO} grupoSugerido={CATALOGO.grupos[0]!} aoFechar={vi.fn()} aoSalvar={vi.fn()} aoCriarGrupo={aoCriarGrupo} />);
    fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "Score" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar um grupo" }));
    fireEvent.change(screen.getByPlaceholderText("Digite para criar um novo grupo"), { target: { value: "Kaio IA" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar grupo" }));
    await waitFor(() => expect(aoCriarGrupo).toHaveBeenCalledWith("Kaio IA", "contato"));
    expect(await screen.findByText("Kaio IA")).toBeInTheDocument();
  });

  it("trocar o objeto avisa a janela e passa a usar os grupos do catálogo do objeto escolhido (B3-4)", async () => {
    const aoMudarObjeto = vi.fn();
    const aoSalvar = vi.fn().mockResolvedValue(undefined);
    const props = { objeto: "contato" as const, grupoSugerido: CATALOGO.grupos[0]!, aoFechar: vi.fn(), aoSalvar, aoCriarGrupo: vi.fn(), aoMudarObjeto };
    const { rerender } = render(<FormularioDeCampo {...props} catalogo={CATALOGO} />);
    fireEvent.click(screen.getByRole("radio", { name: "Empresa" }));
    expect(aoMudarObjeto).toHaveBeenCalledWith("empresa");
    const DA_EMPRESA = { grupos: [{ id: "ge1", chave: "geral", nome: "Geral da empresa", posicao: 0, padrao: true }], campos: [] };
    rerender(<FormularioDeCampo {...props} catalogo={DA_EMPRESA} />);
    fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "Porte" } });
    fireEvent.click(screen.getByRole("radio", { name: "Número" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(aoSalvar).toHaveBeenCalledWith({ objeto: "empresa", nome: "Porte", grupo_id: "ge1", tipo: "NUMBER", opcoes: undefined }));
  });
});
