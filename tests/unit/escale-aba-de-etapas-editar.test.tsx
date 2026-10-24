import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { AbaDeEtapas } from "@/components/escale/configuracoes/AbaDeEtapas";
import { JanelaExcluirEtapa } from "@/components/escale/configuracoes/etapas/JanelaExcluirEtapa";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import { rascunhoInicialDasEtapas, type RascunhoDasEtapas } from "@/lib/escale/etapas/rascunho";
import type { AtividadeDoPlaybook } from "@/lib/escale/playbook/regras";

/** FORK ESCALE · Fase 1L: editar etapas na aba (lápis, lixeira, "+ Nova Etapa"; prints de 24/10). */
const CONFIG = {
  etapas: [
    {
      id: "e1",
      name: "1. Entrada Lead",
      description: "Começo",
      position: 1,
      is_won: false,
      is_lost: false,
    },
    {
      id: "e2",
      name: "2. Em atendimento",
      description: null,
      position: 2,
      is_won: false,
      is_lost: false,
    },
    { id: "g", name: "Ganho", description: null, position: 3, is_won: true, is_lost: false },
  ],
  campos: [],
} as unknown as ConfiguracoesDaOrigem;

const visto: { etapas: RascunhoDasEtapas; atividades: readonly AtividadeDoPlaybook[] } = {
  etapas: rascunhoInicialDasEtapas(CONFIG.etapas),
  atividades: [],
};

function Palco({ somenteLeitura = false }: { somenteLeitura?: boolean }) {
  const [etapas, setEtapas] = useState(rascunhoInicialDasEtapas(CONFIG.etapas));
  const [atividades, setAtividades] = useState<readonly AtividadeDoPlaybook[]>([]);
  useEffect(() => {
    visto.etapas = etapas;
    visto.atividades = atividades;
  });
  return (
    <TooltipProvider>
      <AbaDeEtapas
        config={CONFIG}
        atividades={atividades}
        temSalvas={false}
        mudar={(f) => setAtividades(f)}
        etapas={somenteLeitura ? undefined : etapas}
        mudarEtapas={somenteLeitura ? undefined : (f) => setEtapas(f)}
      />
    </TooltipProvider>
  );
}

const abrir = (somenteLeitura = false) => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(<Palco somenteLeitura={somenteLeitura} />);
  return user;
};

describe("aba Etapas e atividades: editar etapas", () => {
  it("sem 'mudarEtapas' é só leitura: nem lápis, nem lixeira, nem '+ Nova Etapa'", () => {
    abrir(true);
    expect(screen.queryByRole("button", { name: "Editar etapa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Deletar etapa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nova Etapa" })).toBeNull();
  });

  it("o lápis abre 'Nome da etapa', Enter salva no rascunho e a janelinha fecha", async () => {
    const user = abrir();
    const coluna = screen.getByRole("region", { name: "1. Entrada Lead" });
    await user.click(within(coluna).getByRole("button", { name: "Editar etapa" }));
    const janela = screen.getByRole("dialog", { name: "Nome da etapa" });
    const nome = within(janela).getByDisplayValue("1. Entrada Lead");
    await user.clear(nome);
    await user.type(nome, "1. Lead novo{Enter}");
    expect(screen.queryByRole("dialog", { name: "Nome da etapa" })).toBeNull();
    expect(visto.etapas.etapas[0]).toMatchObject({ nome: "1. Lead novo", descricao: "Começo" });
    expect(screen.getByRole("region", { name: "1. Lead novo" })).toBeInTheDocument();
  });

  it("nome vazio mostra o erro e não fecha; a descrição mostra o contador n/200", async () => {
    const user = abrir();
    await user.click(
      within(screen.getByRole("region", { name: "2. Em atendimento" })).getByRole("button", {
        name: "Editar etapa",
      }),
    );
    const janela = screen.getByRole("dialog", { name: "Nome da etapa" });
    expect(within(janela).getByText("0/200")).toBeInTheDocument();
    await user.type(within(janela).getByRole("textbox", { name: /Descrição da etapa/ }), "abc");
    expect(within(janela).getByText("3/200")).toBeInTheDocument();
    await user.clear(within(janela).getByDisplayValue("2. Em atendimento"));
    await user.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(within(janela).getByRole("alert")).toHaveTextContent(
      "O nome precisa ter pelo menos 1 caractere.",
    );
    expect(visto.etapas.etapas[1]!.nome).toBe("2. Em atendimento");
  });

  it("'Cancelar' fecha sem mudar o rascunho", async () => {
    const user = abrir();
    await user.click(
      within(screen.getByRole("region", { name: "1. Entrada Lead" })).getByRole("button", {
        name: "Editar etapa",
      }),
    );
    const janela = screen.getByRole("dialog", { name: "Nome da etapa" });
    await user.type(within(janela).getByDisplayValue("1. Entrada Lead"), "XYZ");
    await user.click(within(janela).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Nome da etapa" })).toBeNull();
    expect(visto.etapas.etapas[0]!.nome).toBe("1. Entrada Lead");
  });

  it("'+ Nova Etapa' cria 'Nova Etapa 3' no fim; a lixeira de etapa de rascunho pede confirmação", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: "Nova Etapa" }));
    const nova = screen.getByRole("region", { name: "Nova Etapa 3" });
    expect(visto.etapas.etapas.at(-1)).toMatchObject({ nome: "Nova Etapa 3", nova: true });
    await user.click(within(nova).getByRole("button", { name: "Deletar etapa" }));
    expect(
      screen.getByText("Tem certeza que deseja excluir esta etapa em rascunho?"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(visto.etapas.etapas.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("a lixeira de etapa já salva tira a coluna e a põe na lista de exclusões, sem perguntar", async () => {
    const user = abrir();
    await user.click(
      within(screen.getByRole("region", { name: "2. Em atendimento" })).getByRole("button", {
        name: "Deletar etapa",
      }),
    );
    expect(screen.queryByRole("region", { name: "2. Em atendimento" })).toBeNull();
    expect(visto.etapas.excluidas).toEqual([
      { id: "e2", nome: "2. Em atendimento", negocios: null },
    ]);
    expect(visto.atividades).toEqual([]);
  });
});

describe("janela de exclusão com negócios", () => {
  const etapas = [{ id: "e1", nome: "1. Entrada Lead", negocios: 3 }];
  const destinos = [{ id: "e2", nome: "2. Em atendimento" }];

  it("o botão vermelho só liga com tudo decidido; 'Excluir todos os negócios' basta", async () => {
    const aoConfirmar = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <JanelaExcluirEtapa
        etapas={etapas}
        destinos={destinos}
        aoConfirmar={aoConfirmar}
        aoCancelar={vi.fn()}
      />,
    );
    const botao = screen.getByRole("button", { name: "Confirmar e excluir etapa" });
    expect(botao).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Excluir todos os negócios" }));
    expect(botao).toBeEnabled();
    await user.click(botao);
    expect(aoConfirmar).toHaveBeenCalledWith({ e1: { acao: "excluir" } });
  });

  it("'Mover para outra etapa' continua desligado até escolher o destino", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <JanelaExcluirEtapa
        etapas={etapas}
        destinos={destinos}
        aoConfirmar={vi.fn()}
        aoCancelar={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Mover para outra etapa" }));
    expect(screen.getByRole("button", { name: "Confirmar e excluir etapa" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Escolha a etapa" })).toBeInTheDocument();
  });
});
