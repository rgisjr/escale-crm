import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { JanelaNovaAtividade } from "@/components/escale/configuracoes/playbook/JanelaNovaAtividade";
import { PrazoDaAtividade } from "@/components/escale/configuracoes/playbook/PrazoDaAtividade";
import { TooltipProvider } from "@/components/ui/tooltip";

/** FORK ESCALE · Fase 1I (D10): a janela "Nova atividade" da origem e o prazo (print 024). */
const ETAPA = { id: "e1", name: "Desqualificado" };

function abrirNova() {
  const aoContinuar = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <TooltipProvider>
      <JanelaNovaAtividade aberta etapa={ETAPA} aoFechar={vi.fn()} aoContinuar={aoContinuar} />
    </TooltipProvider>,
  );
  return { user, aoContinuar };
}

describe("janela Nova atividade (origem)", () => {
  it("mostra a etapa, o título, os três cartões (dependente em breve), os 7 tipos e o prazo padrão", () => {
    abrirNova();
    const janela = screen.getByRole("dialog", { name: "Nova atividade" });
    expect(within(janela).getByText("Desqualificado")).toBeInTheDocument();
    expect(within(janela).getByPlaceholderText("Ex: Whatsapp de convite")).toBeInTheDocument();
    expect(within(janela).getByRole("button", { name: /Atividade padrão/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const dependente = within(janela).getByRole("button", { name: /Atividade dependente/ });
    expect(dependente).toBeDisabled();
    expect(dependente).toHaveAttribute("title", "Em breve");
    for (const tipo of [
      "WhatsApp",
      "Instagram",
      "Ligação",
      "Email",
      "Agendamento",
      "Tarefa",
      "Reunião",
    ]) {
      expect(within(janela).getByRole("button", { name: tipo })).toBeInTheDocument();
    }
    expect(within(janela).getByRole("button", { name: "WhatsApp" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(janela).getByText("Você poderá configurar a mensagem após a criação da atividade."),
    ).toBeInTheDocument();
    expect(within(janela).getByRole("button", { name: "Data da atividade" })).toHaveTextContent(
      "1 dia(s)",
    );
    expect(within(janela).getByText("após entrar na etapa")).toBeInTheDocument();
  });

  it("trocar o tipo troca o exemplo do título e o aviso", async () => {
    const { user } = abrirNova();
    await user.click(screen.getByRole("button", { name: "Ligação" }));
    expect(screen.getByPlaceholderText("Ex: Ligação de prospecção")).toBeInTheDocument();
    expect(
      screen.getByText("Você poderá configurar o script de ligação após a criação da atividade."),
    ).toBeInTheDocument();
  });

  it("Continuar sem título mostra o erro da Clint e não continua", async () => {
    const { user, aoContinuar } = abrirNova();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Campo obrigatório*")).toBeInTheDocument();
    expect(aoContinuar).not.toHaveBeenCalled();
  });

  it("Continuar com título entrega a atividade (não listada, tarefa, 1 dia) com id novo", async () => {
    const { user, aoContinuar } = abrirNova();
    await user.type(screen.getByRole("textbox", { name: "Título" }), "  Validar ICP  ");
    await user.click(screen.getByRole("button", { name: /Atividade não listada/ }));
    await user.click(screen.getByRole("button", { name: "Tarefa" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(aoContinuar).toHaveBeenCalledWith({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      etapaId: "e1",
      titulo: "Validar ICP",
      tipo: "tarefa",
      visibilidade: "nao_listada",
      prazoMinutos: 1440,
      conteudo: null,
    });
  });
});

describe("prazo da atividade", () => {
  function abrirPrazo(minutos = 1440) {
    const aoMudar = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<PrazoDaAtividade minutos={minutos} aoMudar={aoMudar} />);
    return { user, aoMudar };
  }

  it("o atalho 'Em 3 dias' grava 4320 minutos e fecha", async () => {
    const { user, aoMudar } = abrirPrazo();
    await user.click(screen.getByRole("button", { name: "Data da atividade" }));
    expect(screen.getByText("Criar atividade após entrar na etapa em:")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Em 3 dias" }));
    expect(aoMudar).toHaveBeenCalledWith(4320);
  });

  it("número fora de 1 a 999 desliga o Salvar; 2 horas grava 120", async () => {
    const { user, aoMudar } = abrirPrazo(120);
    await user.click(screen.getByRole("button", { name: "Data da atividade" }));
    const numero = screen.getByRole("spinbutton", { name: "Quantidade" });
    expect(numero).toHaveValue(2);
    await user.clear(numero);
    await user.type(numero, "0");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await user.clear(numero);
    await user.type(numero, "2");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoMudar).toHaveBeenCalledWith(120);
  });
});
