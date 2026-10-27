import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gravar = vi.fn(async () => true);
const renomear = vi.fn(async () => true);
const remover = vi.fn(async () => true);
vi.mock("@/hooks/escale/useTagsDaCasca", () => ({ useTagsDaCasca: () => ({ gravar, renomear, remover }) }));

import { BalaoEditarTag } from "@/components/escale/configuracoes/tags/BalaoEditarTag";
import { BalaoNovaTag } from "@/components/escale/configuracoes/tags/BalaoNovaTag";
import { chaveAutomatica } from "@/lib/escale/tags/paleta";

beforeEach(() => vi.clearAllMocks());

describe("Adicionar tag", () => {
  it("cria com a cor automática do nome", async () => {
    render(<BalaoNovaTag gatilho={<button type="button">Adicionar tag</button>} existentes={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.type(screen.getByPlaceholderText("nome da tag"), "Quente");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(gravar).toHaveBeenCalledWith("quente", chaveAutomatica("quente"), null);
  });

  it("nome que já existe não cria e avisa", async () => {
    render(<BalaoNovaTag gatilho={<button type="button">Adicionar tag</button>} existentes={["quente"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.type(screen.getByPlaceholderText("nome da tag"), "Quente");
    expect(screen.getByRole("button", { name: "Criar" })).toBeDisabled();
    expect(screen.getByText("Já existe uma tag com esse nome.")).toBeInTheDocument();
  });
});

describe("Editar tag", () => {
  const linha = { tag: "vip", cor: "#e91e63", descricao: null, emUso: 1, criadaEm: null, criadaPor: null };

  it("troca a cor e a descrição", async () => {
    render(<BalaoEditarTag linha={linha} aberto aoFechar={vi.fn()} ancora={<span />} />);
    await userEvent.click(screen.getByRole("radio", { name: "Verde" }));
    await userEvent.type(screen.getByPlaceholderText("Para que serve esta tag? (opcional)"), "Clientes VIP");
    expect(screen.getByText("12/160")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(renomear).not.toHaveBeenCalled();
    expect(gravar).toHaveBeenCalledWith("vip", "#4caf50", "Clientes VIP");
  });

  it("renomeia antes de gravar quando o nome muda", async () => {
    render(<BalaoEditarTag linha={linha} aberto aoFechar={vi.fn()} ancora={<span />} />);
    const nome = screen.getByRole("textbox", { name: "Nome" });
    await userEvent.clear(nome);
    await userEvent.type(nome, "Cliente VIP");
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(renomear).toHaveBeenCalledWith("vip", "cliente vip");
    expect(gravar).toHaveBeenCalledWith("cliente vip", "#e91e63", null);
  });

  it("tag com maiúscula no vocabulário: trocar só a cor grava pela chave, sem renomear", async () => {
    render(<BalaoEditarTag linha={{ ...linha, tag: "Quente" }} aberto aoFechar={vi.fn()} ancora={<span />} />);
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: "Verde" }));
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(renomear).not.toHaveBeenCalled();
    expect(gravar).toHaveBeenCalledWith("quente", "#4caf50", null);
  });

  it("tag com mais de 40 caracteres não é cortada: só renomeia", async () => {
    const longa = "a".repeat(45);
    render(<BalaoEditarTag linha={{ ...linha, tag: longa }} aberto aoFechar={vi.fn()} ancora={<span />} />);
    await userEvent.click(screen.getByRole("radio", { name: "Verde" }));
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
    expect(screen.getByText("Esta tag tem mais de 40 caracteres: só dá para renomear.")).toBeInTheDocument();
    expect(renomear).not.toHaveBeenCalled();
  });

  it("renomear para um nome que já existe é recusado (não junta as duas)", async () => {
    render(<BalaoEditarTag linha={linha} existentes={["Cliente"]} aberto aoFechar={vi.fn()} ancora={<span />} />);
    const nome = screen.getByRole("textbox", { name: "Nome" });
    await userEvent.clear(nome);
    await userEvent.type(nome, "cliente");
    expect(screen.getByText("Já existe uma tag com esse nome.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
    expect(renomear).not.toHaveBeenCalled();
  });

  it("a lixeira pede confirmação e remove", async () => {
    render(<BalaoEditarTag linha={linha} aberto aoFechar={vi.fn()} ancora={<span />} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover tag" }));
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(remover).toHaveBeenCalledWith("vip");
  });
});
