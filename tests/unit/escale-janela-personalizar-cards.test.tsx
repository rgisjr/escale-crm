import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: { children: (p: unknown) => ReactNode }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }),
}));
vi.mock("@/components/escale/quadro/CardDaCasca", () => ({
  CardDaCasca: ({
    lead,
    prefs,
  }: {
    lead: { title: string };
    prefs: { itens: Record<string, boolean>; campos: unknown[] };
  }) => <p>{`prévia ${lead.title} | tags ${prefs.itens.tags} | campos ${prefs.campos.length}`}</p>,
}));
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

import { JanelaPersonalizarCards } from "@/components/escale/capa/JanelaPersonalizarCards";
import { PersonalizarCards } from "@/components/escale/capa/PersonalizarCards";
import { ApiError } from "@/lib/api/types";
import { CAMPOS_MAX, PREFS_PADRAO, camposDaCapa } from "@/lib/escale/capa/tipos";

const CAMPOS = camposDaCapa([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);
const onFechar = vi.fn();

function janela(prefs = PREFS_PADRAO) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <JanelaPersonalizarCards prefs={prefs} campos={CAMPOS} onFechar={onFechar} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

function icone() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PersonalizarCards campos={[]} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

beforeEach(() => {
  api.get.mockReset();
  toast.success.mockReset();
  api.put.mockReset().mockResolvedValue({ data: { prefs: PREFS_PADRAO } });
  onFechar.mockReset();
  toast.error.mockReset();
});

describe("<JanelaPersonalizarCards> (01-019)", () => {
  it("abre com CONTATO aberto, a prévia e Salvar desligado até mudar", async () => {
    const user = janela();
    expect(screen.getByRole("dialog", { name: "Personalizar cards" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Prévia da última mensagem" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.queryByRole("switch", { name: "Tags" })).toBeNull();
    expect(screen.getByText(/prévia Maria Silva/)).toHaveTextContent("tags true");
    const salvar = screen.getByRole("button", { name: "Salvar preferência" });
    expect(salvar).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Negócio/ }));
    await user.click(screen.getByRole("switch", { name: "Tags" }));
    expect(salvar).toBeEnabled();
    expect(screen.getByText(/prévia Maria Silva/)).toHaveTextContent("tags false");
  });

  it("salvar grava a preferência, mostra 'Preferências salvas' e fecha", async () => {
    const user = janela();
    await user.click(screen.getByRole("button", { name: /Negócio/ }));
    await user.click(screen.getByRole("switch", { name: "Renda" }));
    await user.click(screen.getByRole("button", { name: "Salvar preferência" }));
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
    expect(api.put).toHaveBeenCalledWith("/api/v1/capas-do-card", {
      prefs: { ...PREFS_PADRAO, campos: [{ entidade: "negocio", chave: "renda" }] },
    });
    expect(toast.success).toHaveBeenCalledWith("Preferências salvas");
  });

  it("com 10 ocupados, o que está desligado trava com a dica da Clint", async () => {
    const cheia = {
      ...PREFS_PADRAO,
      campos: [1, 2, 3].map((n) => ({ entidade: "negocio" as const, chave: `x${n}` })),
    };
    const user = janela(cheia);
    await user.click(screen.getByRole("button", { name: /Negócio/ }));
    expect(CAMPOS_MAX).toBe(10);
    expect(screen.getByRole("switch", { name: "Renda" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Renda" })).toHaveAttribute(
      "title",
      "Limite de 10 campos atingido",
    );
  });

  it("canais: 3 no máximo; Lembrete e Agendamento 'Em breve'; Nome da empresa 'Em breve'", async () => {
    const user = janela();
    await user.click(screen.getByRole("button", { name: /Ícones de canal no rodapé/ }));
    expect(
      screen.getByRole("switch", { name: "Ícones de canal no rodapé: Lembrete" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Empresa/ }));
    expect(screen.getByRole("switch", { name: "Nome da empresa" })).toHaveAttribute(
      "title",
      "Em breve",
    );
  });

  it("a busca filtra e avisa quando não acha; a recusa da rota aparece com a mensagem dela", async () => {
    const user = janela();
    await user.type(screen.getByRole("searchbox", { name: "Buscar por..." }), "xyz");
    expect(screen.getByText("Nenhum campo encontrado.")).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Buscar por..." }));
    api.put.mockRejectedValue(
      new ApiError(
        409,
        "state_conflict",
        undefined,
        "r",
        "A preferência mudou em outra aba. Abra de novo e salve.",
      ),
    );
    await user.click(screen.getByRole("button", { name: /Negócio/ }));
    await user.click(screen.getByRole("switch", { name: "Tags" }));
    await user.click(screen.getByRole("button", { name: "Salvar preferência" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "A preferência mudou em outra aba. Abra de novo e salve.",
      ),
    );
  });
});

describe("canais no limite de 3 (01-019)", () => {
  it("com 3 ícones ligados, o que está desligado trava com 'Limite de 3 ícones no rodapé atingido'", async () => {
    // Só chega neste estado por preferência já gravada: Lembrete e Agendamento são
    // "Em breve" (travados), então pela tela a pessoa só tem 3 canais para ligar.
    const user = janela({
      ...PREFS_PADRAO,
      canais: { telefone: true, mensagem: true, email: false, lembrete: true, agendamento: false },
    });
    await user.click(screen.getByRole("button", { name: /Ícones de canal no rodapé/ }));
    const email = screen.getByRole("switch", { name: "Ícones de canal no rodapé: E-mail" });
    expect(email).toBeDisabled();
    expect(email).toHaveAttribute("title", "Limite de 3 ícones no rodapé atingido");
    await user.click(screen.getByRole("switch", { name: "Ícones de canal no rodapé: Telefone" }));
    expect(screen.getByRole("switch", { name: "Ícones de canal no rodapé: E-mail" })).toBeEnabled();
  });
});

describe("<PersonalizarCards> (ícone de ajustes)", () => {
  it("o ponto da marca aparece quando a preferência difere do padrão", async () => {
    api.get.mockResolvedValue({
      data: { prefs: { ...PREFS_PADRAO, itens: { ...PREFS_PADRAO.itens, tags: false } } },
    });
    icone();
    expect(await screen.findByTestId("ponto-da-capa")).toBeInTheDocument();
  });

  it("sem preferência gravada, ou igual ao padrão, não há ponto", async () => {
    api.get.mockResolvedValue({ data: { prefs: PREFS_PADRAO } });
    icone();
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Personalizar cards" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    );
    expect(screen.queryByTestId("ponto-da-capa")).toBeNull();
  });

  it("se a leitura da preferência falha, o clique mostra o erro e a janela não abre", async () => {
    api.get.mockRejectedValue(new ApiError(500, "internal", undefined, "r", "Falha ao ler."));
    const user = icone();
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Personalizar cards" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Falha ao ler."));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("enquanto carrega, o ícone fica aria-busy e a janela abre quando chega", async () => {
    let chega: (v: unknown) => void = () => {};
    api.get.mockReturnValue(new Promise((r) => (chega = r)));
    const user = icone();
    const botao = screen.getByRole("button", { name: "Personalizar cards" });
    expect(botao).toHaveAttribute("aria-busy", "true");
    await user.click(botao);
    expect(screen.queryByRole("dialog")).toBeNull();
    chega({ data: { prefs: PREFS_PADRAO } });
    expect(await screen.findByRole("dialog", { name: "Personalizar cards" })).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
