import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org-1" } }),
}));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["setembro/16", "outubro/20"] }),
}));
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useDestinosDaImportacao: () => ({
    data: [
      {
        id: "o1",
        nome: "Prospecção",
        grupo: "Credenciados",
        etapas: [{ id: "e1", nome: "Avaliar interesse" }],
        motivos: [],
      },
    ],
  }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({
    data: [{ user_id: "u1", full_name: "Naiara Zeri", role: "agent" }],
  }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({
    data: [{ agent_id: "g1", name: "SDR", version_number: 1 }],
  }),
}));

import { EscolhaDeTagsDaCampanha } from "@/components/escale/campanhas/assistente/EscolhaDeTagsDaCampanha";
import { PassoOpcionais } from "@/components/escale/campanhas/assistente/PassoOpcionais";
import { POS_ENVIO_PADRAO } from "@/lib/escale/campanhas/assistente";
import { ASSISTENTE_VAZIO, estadoInicial } from "@/lib/escale/campanhas/estado-do-assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";

// A página monta o provedor (N19); o teste monta o mesmo, de propósito, só aqui.
const comDica = (ui: ReactNode) => <TooltipProvider>{ui}</TooltipProvider>;
const LIVRE: NumeroDaCampanha = {
  id: "n2",
  nome: "Naiara",
  telefone: null,
  conectado: true,
  oficial: false,
  provider: "p",
  setor: null,
};
const OUTRO: NumeroDaCampanha = { ...LIVRE, id: "n3", nome: "Camilly" };

beforeEach(() => vi.clearAllMocks());

describe("PassoOpcionais", () => {
  it("os textos da Clint, origem que abre a etapa e o dono só com origem", async () => {
    const despachar = vi.fn();
    const { rerender } = render(
      comDica(
        <PassoOpcionais
          estado={{ ...estadoInicial(), passo: 2, dados: { ...ASSISTENTE_VAZIO, numeroId: "n2" } }}
          despachar={despachar}
          numeros={[LIVRE, OUTRO]}
        />,
      ),
    );
    expect(screen.getByRole("heading", { name: "Configurações opcionais" })).toBeInTheDocument();
    expect(
      screen.getByText("As tags serão aplicadas aos contatos alcançados pela campanha."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Manter atendente de acordo com a distribuição de dono do negócio",
      }),
    ).toBeDisabled();
    expect(screen.queryByText("Etapa")).toBeNull();
    rerender(
      comDica(
        <PassoOpcionais
          estado={{
            ...estadoInicial(),
            passo: 2,
            dados: {
              ...ASSISTENTE_VAZIO,
              numeroId: "n2",
              posEnvio: { ...POS_ENVIO_PADRAO, origemId: "o1", etapaId: "e1" },
            },
          }}
          despachar={despachar}
          numeros={[LIVRE, OUTRO]}
        />,
      ),
    );
    expect(screen.getByText("Etapa")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Manter atendente de acordo com a distribuição de dono do negócio",
      }),
    ).toBeEnabled();
    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Para atendimentos existentes manter o status atual da conversa",
      }),
    );
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudarPosEnvio",
      campos: { manterStatus: true },
    });
  });

  it("os blocos do original: quem atende, ritmo e números extras (só não oficial)", async () => {
    const despachar = vi.fn();
    const { rerender } = render(
      comDica(
        <PassoOpcionais
          estado={{ ...estadoInicial(), passo: 2, dados: { ...ASSISTENTE_VAZIO, numeroId: "n2" } }}
          despachar={despachar}
          numeros={[LIVRE, OUTRO]}
        />,
      ),
    );
    expect(screen.getByText("Quem atende a resposta")).toBeInTheDocument();
    expect(screen.getByText("Ritmo de envio")).toBeInTheDocument();
    expect(screen.getByText("Números extras")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Intervalo entre mensagens (segundos)"), "6");
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudar",
      campos: { ritmo: { intervalo_segundos: 6 } },
    });
    rerender(
      comDica(
        <PassoOpcionais
          estado={{ ...estadoInicial(), passo: 2, dados: { ...ASSISTENTE_VAZIO, numeroId: "n1" } }}
          despachar={despachar}
          numeros={[{ ...LIVRE, id: "n1", oficial: true }]}
        />,
      ),
    );
    expect(screen.queryByText("Números extras")).toBeNull();
  });
});

describe("EscolhaDeTagsDaCampanha", () => {
  it("'+ Adicionar tag' abre a lista; escolher e remover", async () => {
    const aoMudar = vi.fn();
    const { rerender } = render(<EscolhaDeTagsDaCampanha tags={[]} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.click(screen.getByRole("option", { name: "outubro/20" }));
    expect(aoMudar).toHaveBeenCalledWith(["outubro/20"]);
    rerender(<EscolhaDeTagsDaCampanha tags={["outubro/20"]} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover outubro/20" }));
    expect(aoMudar).toHaveBeenLastCalledWith([]);
  });

  it("digitar uma tag nova e Enter cria", async () => {
    const aoMudar = vi.fn();
    render(<EscolhaDeTagsDaCampanha tags={[]} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.type(screen.getByPlaceholderText("Adicione uma tag"), "Reativados{Enter}");
    expect(aoMudar).toHaveBeenCalledWith(["reativados"]);
  });
});
