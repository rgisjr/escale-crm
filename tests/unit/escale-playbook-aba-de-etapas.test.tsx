import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { AbaDeEtapas } from "@/components/escale/configuracoes/AbaDeEtapas";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import { atividadesDaEtapa, type AtividadeDoPlaybook } from "@/lib/escale/playbook/regras";

/** FORK ESCALE · Fase 1I (D10): a aba Etapas e atividades com o playbook (prints F20, F21 e 030). */
const CONFIG = {
  etapas: [
    { id: "e1", name: "1. Entrada Lead", position: 1, is_won: false, is_lost: false },
    { id: "e2", name: "2. Em atendimento", position: 2, is_won: false, is_lost: false },
    { id: "g", name: "Ganho", position: 3, is_won: true, is_lost: false },
  ],
  campos: [],
} as unknown as ConfiguracoesDaOrigem;
const atv = (n: number, extra: Partial<AtividadeDoPlaybook> = {}): AtividadeDoPlaybook => ({
  id: `a${n}`,
  etapaId: "e2",
  titulo: `Msg ${n}`,
  tipo: "whatsapp",
  visibilidade: "padrao",
  prazoMinutos: 1440,
  ordem: n,
  conteudo: null,
  ...extra,
});
const OITO = Array.from({ length: 8 }, (_, i) => atv(i + 1, i === 7 ? { prazoMinutos: 2880 } : {}));

function abrir(atividades: AtividadeDoPlaybook[] = OITO, temSalvas = true) {
  const mudar = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <TooltipProvider>
      <AbaDeEtapas config={CONFIG} atividades={atividades} temSalvas={temSalvas} mudar={mudar} />
    </TooltipProvider>,
  );
  return { user, mudar };
}

describe("aba Etapas e atividades com o playbook", () => {
  it("uma coluna por etapa aberta; a vazia diz 'Nenhuma atividade nessa etapa'", () => {
    abrir();
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual([
      "1. Entrada Lead",
      "2. Em atendimento",
    ]);
    const vazia = screen.getByRole("region", { name: "1. Entrada Lead" });
    expect(within(vazia).getByText("Nenhuma atividade nessa etapa")).toBeInTheDocument();
    expect(within(vazia).getByRole("button", { name: "Nova atividade" })).toBeEnabled();
  });

  it("mostra 6, 'Ver mais' mostra as 8 e 'Ver menos' volta; a contagem recolhe a lista", async () => {
    const { user } = abrir();
    const coluna = screen.getByRole("region", { name: "2. Em atendimento" });
    expect(within(coluna).getAllByRole("listitem")).toHaveLength(6);
    await user.click(within(coluna).getByRole("button", { name: "Ver mais" }));
    expect(within(coluna).getAllByRole("listitem")).toHaveLength(8);
    await user.click(within(coluna).getByRole("button", { name: "Ver menos" }));
    expect(within(coluna).getAllByRole("listitem")).toHaveLength(6);
    const contagem = within(coluna).getByRole("button", { name: "8 Atividades nessa etapa" });
    await user.click(contagem);
    expect(contagem).toHaveAttribute("aria-expanded", "false");
    expect(within(coluna).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("o item tem o número e a letra da unidade, o título e o olho da não listada", () => {
    abrir([atv(1, { visibilidade: "nao_listada", prazoMinutos: 120 })]);
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("2");
    expect(item).toHaveTextContent("H");
    expect(within(item).getByRole("button", { name: "Msg 1" })).toBeInTheDocument();
    expect(within(item).getByRole("img", { name: "Atividade não listada" })).toBeInTheDocument();
  });

  it("as setas só aparecem entre vizinhas de mesmo prazo; a lixeira remove", async () => {
    const { user, mudar } = abrir([atv(1), atv(2), atv(3, { prazoMinutos: 2880 })]);
    const [primeira, segunda, terceira] = screen.getAllByRole("listitem");
    expect(within(primeira!).queryByRole("button", { name: "Subir" })).toBeNull();
    expect(within(primeira!).getByRole("button", { name: "Descer" })).toBeInTheDocument();
    expect(within(segunda!).queryByRole("button", { name: "Descer" })).toBeNull();
    expect(within(terceira!).queryByRole("button", { name: "Subir" })).toBeNull();
    await user.click(within(primeira!).getByRole("button", { name: "Descer" }));
    const trocar = mudar.mock.calls[0]![0] as (l: AtividadeDoPlaybook[]) => AtividadeDoPlaybook[];
    expect(
      atividadesDaEtapa(trocar([atv(1), atv(2), atv(3, { prazoMinutos: 2880 })]), "e2").map(
        (a) => a.id,
      ),
    ).toEqual(["a2", "a1", "a3"]);
    await user.click(within(segunda!).getByRole("button", { name: "Remover atividade" }));
    const remover = mudar.mock.calls[1]![0] as (l: AtividadeDoPlaybook[]) => AtividadeDoPlaybook[];
    expect(remover([atv(1), atv(2)]).map((a) => a.id)).toEqual(["a1"]);
  });

  it("o canto: 'Origem customizada' com a dica, ou 'Nenhum modelo'; o ⋮ com os modelos 'Em breve'", async () => {
    const { user } = abrir();
    expect(screen.getByText("Origem customizada")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Origem customizada" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Opções do modelo" }));
    for (const nome of ["Escolher um modelo", "Compartilhar modelo"]) {
      expect(screen.getByRole("menuitem", { name: nome })).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("sem atividade salva: 'Nenhum modelo'", () => {
    abrir([], false);
    expect(screen.getByText("Nenhum modelo")).toBeInTheDocument();
  });

  it("'+ Nova atividade' abre a janela; Continuar põe no rascunho e abre Configurações de atividades", async () => {
    const { user, mudar } = abrir([]);
    const coluna = screen.getByRole("region", { name: "1. Entrada Lead" });
    await user.click(within(coluna).getByRole("button", { name: "Nova atividade" }));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Entrada de Lead");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    const adicionar = mudar.mock.calls[0]![0] as (
      l: AtividadeDoPlaybook[],
    ) => AtividadeDoPlaybook[];
    expect(adicionar([])).toEqual([
      expect.objectContaining({ etapaId: "e1", titulo: "Entrada de Lead", ordem: 0 }),
    ]);
    expect(screen.getByRole("dialog", { name: "Configurações de atividades" })).toBeInTheDocument();
  });
});
