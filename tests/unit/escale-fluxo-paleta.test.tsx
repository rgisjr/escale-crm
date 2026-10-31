import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { JanelaDeAcoes } from "@/components/escale/automacoes/fluxo/JanelaDeAcoes";
import { PaletaDoFluxo } from "@/components/escale/automacoes/fluxo/PaletaDoFluxo";
import { MENSAGEM_DO_LACO_DE_LEAD } from "@/lib/schemas/webhooks";

describe("paleta do fluxo", () => {
  it("fechada mostra 7 botões com título e o botão de abrir", () => {
    render(<PaletaDoFluxo aoEscolher={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Abrir paleta de passos" })).toBeTruthy();
    const botoes = within(screen.getByTestId("paleta-do-fluxo")).getAllByRole("button");
    expect(botoes).toHaveLength(8);
    expect(screen.getByTitle("WhatsApp")).toBeTruthy();
    expect(screen.getByTestId("paleta-do-fluxo").className).toContain("w-[78px]");
  });

  it("aberta mostra título, subtítulo, busca e as 4 seções na ordem", async () => {
    render(<PaletaDoFluxo aoEscolher={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir paleta de passos" }));
    expect(screen.getByTestId("paleta-do-fluxo").className).toContain("w-[344px]");
    expect(screen.getByText("Adicionar passo")).toBeTruthy();
    expect(screen.getByText("Arraste para o canvas ou clique")).toBeTruthy();
    expect(screen.getByPlaceholderText("Buscar passo…")).toBeTruthy();
    const secoes = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(secoes).toEqual(["Começar", "Canais", "Lógica", "Inteligência Artificial"]);
  });

  it("clicar escolhe o passo e arrastar grava o passo no dataTransfer", async () => {
    const aoEscolher = vi.fn();
    render(<PaletaDoFluxo aoEscolher={aoEscolher} />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir paleta de passos" }));
    const botao = screen.getByRole("button", { name: /WhatsApp/ });
    await userEvent.click(botao);
    expect(aoEscolher).toHaveBeenCalledWith("send_whatsapp_message");
    const dados = new Map<string, string>();
    const dataTransfer = { setData: (k: string, v: string) => dados.set(k, v), effectAllowed: "" };
    const evento = new Event("dragstart", { bubbles: true });
    Object.defineProperty(evento, "dataTransfer", { value: dataTransfer });
    botao.dispatchEvent(evento);
    expect(dados.get("application/x-automacao-caixa")).toBe("send_whatsapp_message");
  });

  it("busca pela descrição, esconde a seção sem item e mostra o vazio", async () => {
    render(<PaletaDoFluxo aoEscolher={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir paleta de passos" }));
    await userEvent.type(screen.getByPlaceholderText("Buscar passo…"), "tag");
    expect(screen.getAllByRole("button", { name: /Ações/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /WhatsApp/ })).toBeNull();
    expect(screen.queryByText("Canais")).toBeNull();
    await userEvent.clear(screen.getByPlaceholderText("Buscar passo…"));
    await userEvent.type(screen.getByPlaceholderText("Buscar passo…"), "zzz");
    expect(screen.getByText("Sem resultados para “zzz”")).toBeTruthy();
  });
});

describe("modal Realizar ação", () => {
  it("abre em Dados do contato com as abas na vertical; sem rodapé nem botão de confirmar", async () => {
    render(<JanelaDeAcoes aberta evento="contact.tag_added" aoFechar={vi.fn()} aoEscolher={vi.fn()} />);
    expect(screen.getAllByText("Realizar ação").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab").map((a) => a.textContent)).toEqual(["Dados do contato", "Integrações", "CRM"]);
    expect(screen.getByText("Adicionar tag")).toBeTruthy();
    expect(screen.getByText("Remover tag")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Integrações" }));
    expect(screen.getByText("Enviar Webhook")).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "CRM" }));
    for (const titulo of ["Criar ou mover negócio", "Atribuir dono do negócio", "Tarefa interna", "Plano de tarefas"]) {
      expect(screen.getByText(titulo)).toBeTruthy();
    }
  });

  it("clicar no cartão já escolhe a ação", async () => {
    const aoEscolher = vi.fn();
    render(<JanelaDeAcoes aberta evento="contact.tag_added" aoFechar={vi.fn()} aoEscolher={aoEscolher} />);
    await userEvent.click(screen.getByText("Remover tag"));
    expect(aoEscolher).toHaveBeenCalledWith("remove_tag");
  });

  it("com gatilho que fecha laço, 'Atribuir dono do negócio' fica travado com a mensagem do laço", async () => {
    render(<JanelaDeAcoes aberta evento="lead.assigned" aoFechar={vi.fn()} aoEscolher={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: "CRM" }));
    const cartao = screen.getByText("Atribuir dono do negócio").closest("button")!;
    expect(cartao.disabled).toBe(true);
    expect(cartao.getAttribute("title")).toBe(MENSAGEM_DO_LACO_DE_LEAD);
  });
});
