import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { JanelaConfiguracoesDeAtividades } from "@/components/escale/configuracoes/playbook/JanelaConfiguracoesDeAtividades";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AtividadeDoPlaybook } from "@/lib/escale/playbook/regras";

/** FORK ESCALE · Fase 1I (D10): a janela "Configurações de atividades". */
const ETAPAS = [
  { id: "e1", name: "1. Entrada Lead" },
  { id: "e2", name: "2. Em atendimento" },
];
const atv = (id: string, extra: Partial<AtividadeDoPlaybook> = {}): AtividadeDoPlaybook => ({
  id,
  etapaId: "e1",
  titulo: `Atividade ${id}`,
  tipo: "whatsapp",
  visibilidade: "padrao",
  prazoMinutos: 1440,
  ordem: 0,
  conteudo: null,
  ...extra,
});
const LISTA = [atv("a1"), atv("a2", { tipo: "ligacao", ordem: 1 }), atv("b1", { etapaId: "e2" })];

function abrir(escolhidaId = "a1") {
  const props = { aoEscolher: vi.fn(), aoAtualizar: vi.fn(), aoNova: vi.fn(), aoFechar: vi.fn() };
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <TooltipProvider>
      <JanelaConfiguracoesDeAtividades
        aberta
        etapas={ETAPAS}
        atividades={LISTA}
        escolhidaId={escolhidaId}
        campos={[{ chave: "proposta", rotulo: "Proposta" }]}
        {...props}
      />
    </TooltipProvider>,
  );
  return { user, ...props };
}

describe("Configurações de atividades", () => {
  it("lista as atividades da etapa da escolhida e mostra a escolhida no editor", () => {
    abrir();
    const janela = screen.getByRole("dialog", { name: "Configurações de atividades" });
    const lista = within(janela).getByRole("list", { name: "Atividades da etapa" });
    expect(
      within(lista)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Atividade a1", "Atividade a2"]);
    expect(within(lista).getByRole("button", { name: "Atividade a1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(janela).getByRole("textbox", { name: "Título" })).toHaveValue("Atividade a1");
    expect(within(janela).getByRole("textbox", { name: "Conteúdo da atividade" })).toHaveAttribute(
      "placeholder",
      "Clique aqui para adicionar o conteúdo da mensagem.",
    );
  });

  it("escolher outra e criar nova avisam quem abriu", async () => {
    const { user, aoEscolher, aoNova } = abrir();
    await user.click(screen.getByRole("button", { name: "Atividade a2" }));
    expect(aoEscolher).toHaveBeenCalledWith("a2");
    await user.click(screen.getByRole("button", { name: "Nova atividade" }));
    expect(aoNova).toHaveBeenCalledWith("e1");
  });

  it("a variável entra no cursor e 'Atualizar' grava título, conteúdo e prazo", async () => {
    const { user, aoAtualizar } = abrir();
    const caixa = screen.getByRole("textbox", { name: "Conteúdo da atividade" });
    await user.type(caixa, "Olá !");
    (caixa as HTMLTextAreaElement).setSelectionRange(4, 4);
    await user.click(screen.getByRole("button", { name: "Adicionar variáveis" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar variável" }), "primeiro");
    const contato = screen.getByRole("group", { name: "Contato" });
    await user.click(within(contato).getByRole("button", { name: /Primeiro nome/ }));
    expect(caixa).toHaveValue("Olá [CONTACT.FIRST_NAME]!");
    await user.clear(screen.getByRole("textbox", { name: "Título" }));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Entrada de Lead");
    await user.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(aoAtualizar).toHaveBeenCalledWith("a1", {
      titulo: "Entrada de Lead",
      conteudo: "Olá [CONTACT.FIRST_NAME]!",
      prazoMinutos: 1440,
    });
  });

  it("o campo personalizado da origem entra nas variáveis de Negócio", async () => {
    const { user } = abrir();
    await user.click(screen.getByRole("button", { name: "Adicionar variáveis" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar variável" }), "proposta");
    const negocio = screen.getByRole("group", { name: "Negócio" });
    await user.click(within(negocio).getByRole("button", { name: /Proposta/ }));
    expect(screen.getByRole("textbox", { name: "Conteúdo da atividade" })).toHaveValue(
      "[DEAL.PROPOSTA]",
    );
  });

  it("título vazio desliga o Atualizar", async () => {
    const { user } = abrir();
    await user.clear(screen.getByRole("textbox", { name: "Título" }));
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
  });
});
