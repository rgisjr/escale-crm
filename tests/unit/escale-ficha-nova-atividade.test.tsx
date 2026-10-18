import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { JanelaEditarDataEHora } from "@/components/escale/negocio/abas/atividades/JanelaEditarDataEHora";
import { JanelaNovaAtividadeDoNegocio } from "@/components/escale/negocio/abas/atividades/JanelaNovaAtividadeDoNegocio";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { toast } from "sonner";

/** FORK ESCALE · Fase 1I (C19, P16): data e hora da Clint, "Nova atividade" e "Editar data e hora" na ficha (print 002). */
afterEach(() => vi.useRealTimers());

describe("seletor de data e hora", () => {
  it("mostra dd/mm/aaaa; o calendário troca o dia mantendo a hora; a hora digitada vira HH:mm", async () => {
    const aoMudar = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<SeletorDeDataEHora valor={new Date(2026, 9, 15, 10, 30)} aoMudar={aoMudar} />);
    const data = screen.getByRole("button", { name: "Data" });
    expect(data).toHaveTextContent("15/10/2026");
    await user.click(data);
    await user.click(screen.getByRole("button", { name: "20/10/2026" }));
    expect(aoMudar).toHaveBeenLastCalledWith(new Date(2026, 9, 20, 10, 30));
    const hora = screen.getByRole("textbox", { name: "Hora" });
    expect(hora).toHaveValue("10:30");
    await user.clear(hora);
    await user.type(hora, "1445");
    expect(hora).toHaveValue("14:45");
    expect(aoMudar).toHaveBeenLastCalledWith(new Date(2026, 9, 15, 14, 45));
  });

  it("as setas trocam o mês", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<SeletorDeDataEHora valor={new Date(2026, 9, 15, 10, 30)} aoMudar={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByRole("button", { name: "20/11/2026" })).toBeInTheDocument();
  });
});

describe("Nova atividade na ficha", () => {
  function abrir(aoCriar = vi.fn(async () => undefined)) {
    const aoFechar = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <JanelaNovaAtividadeDoNegocio
        aberta
        etapa={{ id: "e1", name: "1. Entrada Lead" }}
        aoFechar={aoFechar}
        aoCriar={aoCriar}
      />,
    );
    return { user, aoCriar, aoFechar };
  }

  it("título, tipo e data e hora (sem os cartões); Continuar cria na etapa e fecha", async () => {
    const { user, aoCriar, aoFechar } = abrir();
    const janela = screen.getByRole("dialog", { name: "Nova atividade" });
    expect(within(janela).getByText("1. Entrada Lead")).toBeInTheDocument();
    expect(within(janela).queryByRole("button", { name: /Atividade padrão/ })).toBeNull();
    await user.type(within(janela).getByRole("textbox", { name: "Título" }), "Ligar de novo");
    await user.click(within(janela).getByRole("button", { name: "Ligação" }));
    await user.click(within(janela).getByRole("button", { name: "Continuar" }));
    expect(aoCriar).toHaveBeenCalledWith({
      titulo: "Ligar de novo",
      tipo: "ligacao",
      due_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      stage_id: "e1",
    });
    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
  });

  it("sem título: 'Campo obrigatório*'; data no passado: o erro da Clint", async () => {
    const { user, aoCriar } = abrir();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Campo obrigatório*")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Título" }), "X");
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    await user.click(screen.getAllByRole("button", { name: /^10\// })[0]!);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      screen.getByText(
        "A data informada não pode ser no passado. Por favor, selecione uma data futura.",
      ),
    ).toBeInTheDocument();
    expect(aoCriar).not.toHaveBeenCalled();
  });

  it("falha ao criar: toast da Clint e a janela fica", async () => {
    const { user, aoFechar } = abrir(vi.fn(async () => Promise.reject(new Error("x"))));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "X");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao adicionar atividade. Tente novamente."),
    );
    expect(aoFechar).not.toHaveBeenCalled();
  });
});

describe("Editar data e hora", () => {
  it("salva o novo prazo e mostra o toast da Clint", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <JanelaEditarDataEHora
        aberta
        atividade={{ title: "Ligação 1", due_date: new Date(2026, 9, 15, 10, 30).toISOString() }}
        aoFechar={vi.fn()}
        aoSalvar={aoSalvar}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Editar data e hora" })).toHaveTextContent(
      "Ligação 1",
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith(new Date(2026, 9, 15, 10, 30).toISOString());
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "A data e a hora da atividade foram alteradas com sucesso",
      ),
    );
  });
});
