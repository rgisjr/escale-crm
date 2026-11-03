import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/escale/useVocabularioDeTags", () => ({ useVocabularioDeTags: () => ({ data: ["vip", "cliente"] }) }));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [{ id: "f1", name: "Site" }, { id: "f2", name: "Landing" }] } }),
  usePipelines: () => ({ data: { data: [{ id: "p1", name: "Vendas", is_default: true, settings: null }] } }),
  usePipelineStages: () => ({ data: undefined }),
}));

import { PainelDoGatilho } from "@/components/escale/automacoes/fluxo/painel/PainelDoGatilho";
import { PainelDoNo } from "@/components/escale/automacoes/fluxo/painel/PainelDoNo";
import { telaDoGatilho, type DadosDoGatilho } from "@/lib/automation/desenho-da-regra";

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const gatilho = (evento: string, tela = telaDoGatilho(null)): DadosDoGatilho => ({ kind: "gatilho", evento, tela });

describe("PainelDoNo", () => {
  it("largura 400 e 800, fundo suave do tipo, Cancelar e Salvar", async () => {
    const aoCancelar = vi.fn();
    const aoSalvar = vi.fn();
    const { rerender } = render(
      <PainelDoNo tipo="whatsapp" titulo="Enviar mensagem" aoCancelar={aoCancelar} aoSalvar={aoSalvar}>
        corpo
      </PainelDoNo>,
    );
    expect(screen.getByTestId("painel-do-no").getAttribute("data-largura")).toBe("400");
    expect(screen.getByTestId("painel-do-no-cabecalho").className).toContain("bg-casca-fluxo-whatsapp-suave");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoCancelar).toHaveBeenCalled();
    expect(aoSalvar).toHaveBeenCalled();
    rerender(
      <PainelDoNo tipo="gatilho" largura={800} titulo="x" aoCancelar={aoCancelar} aoSalvar={aoSalvar} salvarDesabilitado>
        corpo
      </PainelDoNo>,
    );
    expect(screen.getByTestId("painel-do-no").getAttribute("data-largura")).toBe("800");
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Condições tem o cabeçalho branco", () => {
    render(
      <PainelDoNo tipo="condicoes" titulo="Condições" aoCancelar={vi.fn()} aoSalvar={vi.fn()}>
        x
      </PainelDoNo>,
    );
    expect(screen.getByTestId("painel-do-no-cabecalho").className).not.toContain("bg-casca-marca-suave");
  });
});

describe("PainelDoGatilho", () => {
  const montar = (dados: DadosDoGatilho, temCondicoes = false) => {
    const aoTrocar = vi.fn();
    envolver(<PainelDoGatilho dados={dados} temCondicoes={temCondicoes} aoCancelar={vi.fn()} aoTrocar={aoTrocar} />);
    return aoTrocar;
  };

  it("com gatilho: título, frase, cartão e 'Trocar gatilho'", () => {
    montar(gatilho("contact.tag_added"));
    expect(screen.getByText("Iniciar automação quando...")).toBeTruthy();
    expect(screen.getByText("Este gatilho inicia a automação.")).toBeTruthy();
    expect(screen.getByText("Tag adicionada ao contato")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trocar gatilho" })).toBeTruthy();
  });

  it("sem gatilho: convite e 'Novo gatilho'", () => {
    montar(gatilho(""));
    expect(screen.getByText("Escolha o gatilho que dará início à automação")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Novo gatilho" })).toBeTruthy();
  });

  it("'Trocar gatilho' abre a escolha em 800 px na fonte do evento, e Agenda mostra os 6", async () => {
    montar(gatilho("contact.tag_added"));
    await userEvent.click(screen.getByRole("button", { name: "Trocar gatilho" }));
    expect(screen.getByTestId("painel-do-no").getAttribute("data-largura")).toBe("800");
    expect(screen.getByText("Gatilhos")).toBeTruthy();
    expect(screen.getByText("Escolha o evento que vai iniciar sua automação")).toBeTruthy();
    expect(screen.getByText("Telefone adicionado ao contato")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Agenda/ }));
    for (const titulo of ["Horário marcado", "Horário confirmado", "Horário remarcado", "Horário cancelado", "Compareceu ao compromisso", "Faltou ao compromisso"]) {
      expect(screen.getByText(titulo)).toBeTruthy();
    }
  });

  it("escolher 'Horário cancelado' volta à lista com o rodapé e Salvar troca", async () => {
    const aoTrocar = montar(gatilho("contact.tag_added"));
    await userEvent.click(screen.getByRole("button", { name: "Trocar gatilho" }));
    await userEvent.click(screen.getByRole("button", { name: /Agenda/ }));
    await userEvent.click(screen.getByText("Horário cancelado"));
    expect(screen.getByTestId("painel-do-no").getAttribute("data-largura")).toBe("400");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoTrocar).toHaveBeenCalledWith("appointment.cancelled", telaDoGatilho(null));
  });

  it("'Tempo na etapa' abre o formulário com os campos de tempo", async () => {
    montar(gatilho("contact.tag_added"));
    await userEvent.click(screen.getByRole("button", { name: "Trocar gatilho" }));
    await userEvent.click(screen.getByRole("button", { name: /Negócios/ }));
    await userEvent.click(screen.getByText("Tempo na etapa"));
    expect(screen.getByText("Depois de N dias")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Não gerar lembrete quando o cliente tiver compromisso marcado" })).toBeTruthy();
  });

  it("'Negócio criado' abre origem, etapa (desligada sem origem) e a fonte do formulário", async () => {
    const aoTrocar = montar(gatilho("contact.tag_added"));
    await userEvent.click(screen.getByRole("button", { name: "Trocar gatilho" }));
    await userEvent.click(screen.getByRole("button", { name: /Negócios/ }));
    expect(screen.getByText("Um negócio foi criado em uma determinada origem e etapa")).toBeTruthy();
    await userEvent.click(screen.getByText("Negócio criado"));
    expect(screen.getByRole("combobox", { name: "O negócio foi criado na origem" }).textContent).toContain("Qualquer origem");
    expect(screen.getByRole("combobox", { name: "E na etapa (opcional)" }).textContent).toContain("Qualquer etapa");
    expect(screen.getByRole("combobox", { name: "Fonte do formulário" }).textContent).toContain("Qualquer fonte");
    await userEvent.click(screen.getByRole("combobox", { name: "O negócio foi criado na origem" }));
    await userEvent.click(screen.getByRole("option", { name: "Vendas" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoTrocar).toHaveBeenCalledWith(
      "lead.created",
      expect.objectContaining({ criado: { pipeline_id: "p1", stage_id: "" } }),
    );
  });

  it("'Tag adicionada ao contato' abre 'Tags' e guarda a escolha", async () => {
    const aoTrocar = montar(gatilho("lead.won"));
    await userEvent.click(screen.getByRole("button", { name: "Trocar gatilho" }));
    await userEvent.click(screen.getByRole("button", { name: /Contatos/ }));
    await userEvent.click(screen.getByText("Tag adicionada ao contato"));
    expect(screen.getByText("Sem tag escolhida, a automação inicia com qualquer tag.")).toBeTruthy();
    await userEvent.click(screen.getByRole("combobox", { name: "Tags" }));
    await userEvent.click(screen.getByRole("option", { name: "cliente" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoTrocar).toHaveBeenCalledWith("contact.tag_added", expect.objectContaining({ tags: ["cliente"] }));
  });

  it("com condições preenchidas, trocar o evento pede confirmação antes de chamar aoTrocar", async () => {
    const aoTrocar = montar(gatilho("contact.tag_added"), true);
    await userEvent.click(screen.getByRole("button", { name: "Trocar gatilho" }));
    await userEvent.click(screen.getByRole("button", { name: /Agenda/ }));
    await userEvent.click(screen.getByText("Horário cancelado"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText("Trocar o gatilho?")).toBeTruthy();
    expect(aoTrocar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Trocar gatilho" }));
    expect(aoTrocar).toHaveBeenCalledWith("appointment.cancelled", expect.anything());
  });

  it("'Faltam N dias' aceita -60 e guarda a string; o cartão da data abre o formulário", async () => {
    const aoTrocar = montar(gatilho("lead.date_field_due"));
    await userEvent.click(screen.getByRole("button", { name: "Gatilho baseado em data" }));
    expect(screen.getByText("Funil do campo")).toBeTruthy();
    const campo = screen.getByRole("textbox", { name: "Faltam N dias" });
    await userEvent.clear(campo);
    await userEvent.type(campo, "-60");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoTrocar).toHaveBeenCalledWith(
      "lead.date_field_due",
      expect.objectContaining({ data: expect.objectContaining({ dias: "-60" }) }),
    );
  });
});
