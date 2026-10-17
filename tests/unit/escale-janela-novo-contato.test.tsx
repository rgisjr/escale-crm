import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaNovoContato } from "@/components/escale/contatos/JanelaNovoContato";
import { apiClient } from "@/lib/api/client";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

const ORIGENS = [{ id: "o1", nome: "Leads INSS", etapas: [{ id: "e1", nome: "Entrada" }] }];
const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.mocked(apiClient.get)
    .mockReset()
    .mockResolvedValue({ data: [] } as never);
  vi.mocked(apiClient.post).mockReset();
});

describe("JanelaNovoContato (C1)", () => {
  it("título, campos e o botão da Clint", () => {
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    expect(screen.getByRole("heading", { name: "Informações do contato" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Digite o nome do contato")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: @escaleia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar contato" })).toBeInTheDocument();
  });

  it("sem nome não grava", async () => {
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    expect(await screen.findByText("Informe o nome do contato.")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("grava nome, telefone E.164, e-mail e Instagram como link", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { contact: { id: "c9" }, action: "created" },
    } as never);
    const aoFechar = vi.fn();
    envolver(<JanelaNovoContato aberta aoFechar={aoFechar} origens={ORIGENS} />);
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), {
      target: { value: "Maria" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "(64) 99944-6816" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "maria@exemplo.com" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: @escaleia"), {
      target: { value: "@mariap" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/contacts", {
      source: "manual",
      name: "Maria",
      phone_number: "+5564999446816",
      email: "maria@exemplo.com",
      custom_fields: { link_instagram: "https://instagram.com/mariap" },
    });
    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
  });

  it("e-mail já usado é barrado antes de gravar", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: "c1", email: "maria@exemplo.com" }],
    } as never);
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), {
      target: { value: "Maria" },
    });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "Maria@exemplo.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    expect(await screen.findByText("Email já cadastrado")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("telefone repetido (409 contact_exists) vira 'Telefone já cadastrado'", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(
      Object.assign(new Error("x"), { status: 409, code: "contact_exists" }),
    );
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), {
      target: { value: "Maria" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "64999446816" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    expect(await screen.findByText("Telefone já cadastrado")).toBeInTheDocument();
  });

  it("com oportunidade marcada, exige origem e etapa e cria o negócio com o contato", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { contact: { id: "c9" }, action: "created" } } as never)
      .mockResolvedValueOnce({ data: { id: "l9" } } as never);
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), {
      target: { value: "Maria" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Desejo criar uma oportunidade de negócio" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    expect(await screen.findByText("Escolha a origem e a etapa.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Origem" }));
    fireEvent.click(screen.getByRole("option", { name: "Leads INSS" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Etapa" }));
    fireEvent.click(screen.getByRole("option", { name: "Entrada" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2));
    expect(apiClient.post).toHaveBeenLastCalledWith("/api/v1/leads", {
      pipeline_id: "o1",
      stage_id: "e1",
      title: "Maria",
      contact_id: "c9",
      source: "manual",
    });
  });
});
