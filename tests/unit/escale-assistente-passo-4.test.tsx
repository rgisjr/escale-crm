import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/escale/useAssistenteDeCampanha", () => ({
  usePaginaDoPublico: () => ({
    data: {
      linhas: [{ id: "c1", nome: "Fernanda", telefone: "+5549984086513", email: null, tags: [] }],
      total: 1,
    },
    isLoading: false,
  }),
}));

import { FimDoAssistente } from "@/components/escale/campanhas/assistente/FimDoAssistente";
import { PassoConfirmar } from "@/components/escale/campanhas/assistente/PassoConfirmar";
import { ASSISTENTE_VAZIO, estadoInicial } from "@/lib/escale/campanhas/estado-do-assistente";
import {
  enviarPara,
  quandoNoResumo,
  textoDoMotivo,
} from "@/lib/escale/campanhas/textos-do-assistente";

const ESTADO = {
  ...estadoInicial(),
  passo: 3 as const,
  campanhaId: "c-1",
  dados: { ...ASSISTENTE_VAZIO, nome: "Teste prints (nao enviar)" },
};

beforeEach(() => vi.clearAllMocks());

describe("textos", () => {
  it("quando, motivo e quantos", () => {
    expect(quandoNoResumo({ modo: "agora" })).toBe("Envio imediato");
    expect(
      quandoNoResumo({ modo: "agendar", em: "2026-11-20T18:30:00.000Z" }, "America/Sao_Paulo"),
    ).toBe("20/11/2026 15:30");
    expect(textoDoMotivo("sem_telefone")).toBe("Sem telefone no cadastro");
    expect(textoDoMotivo("qualquer")).toBe("qualquer");
    expect(enviarPara(1)).toBe("1 contato selecionado");
    expect(enviarPara(14989)).toBe("14.989 contatos selecionados");
  });
});

describe("PassoConfirmar", () => {
  it("o cartão da Clint com os elegíveis, fora da lista com os motivos, custo '—' e o aviso de limites", async () => {
    render(
      <PassoConfirmar
        estado={ESTADO}
        resumo={{
          total: 3,
          elegiveis: 2,
          excluidos: 1,
          motivos: [{ motivo: "sem_telefone", quantidade: 1 }],
        }}
        preparando={false}
        erroDaPreparacao={null}
        numero={null}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Confirme seu envio de mensagem de Whatsapp" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Teste prints (nao enviar)")).toBeInTheDocument();
    expect(screen.getByText("Envio imediato")).toBeInTheDocument();
    expect(screen.getByText("2 contatos selecionados")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Limites de envio do WhatsApp")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver motivos" }));
    expect(screen.getByText("Sem telefone no cadastro")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver contatos" }));
    expect(screen.getByRole("heading", { name: "Contatos selecionados" })).toBeInTheDocument();
  });

  it("preparando e erro da preparação", () => {
    const { rerender } = render(
      <PassoConfirmar
        estado={ESTADO}
        resumo={null}
        preparando
        erroDaPreparacao={null}
        numero={null}
      />,
    );
    expect(screen.getByText("Preparando a lista de envio…")).toBeInTheDocument();
    rerender(
      <PassoConfirmar
        estado={ESTADO}
        resumo={null}
        preparando={false}
        erroDaPreparacao="O recorte não encontrou nenhum contato."
        numero={null}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("O recorte não encontrou nenhum contato.");
  });
});

describe("FimDoAssistente", () => {
  it("sucesso: os dois botões da Clint", async () => {
    const aoNovaCampanha = vi.fn();
    render(
      <FimDoAssistente
        resultado={{ tipo: "sucesso", nome: "Reativação", modo: "iniciada" }}
        aoNovaCampanha={aoNovaCampanha}
        aoTentarDeNovo={vi.fn()}
      />,
    );
    expect(screen.getByText("Campanha Reativação enviada com sucesso")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Criar nova campanha" }));
    expect(aoNovaCampanha).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Ir para a tela inicial" }));
    expect(push).toHaveBeenCalledWith("/app/campaigns");
  });

  it("agendada e erro", () => {
    const { rerender } = render(
      <FimDoAssistente
        resultado={{ tipo: "sucesso", nome: "R", modo: "agendada" }}
        aoNovaCampanha={vi.fn()}
        aoTentarDeNovo={vi.fn()}
      />,
    );
    expect(screen.getByText("Campanha R agendada com sucesso")).toBeInTheDocument();
    rerender(
      <FimDoAssistente
        resultado={{ tipo: "erro", mensagem: "Falhou o canal." }}
        aoNovaCampanha={vi.fn()}
        aoTentarDeNovo={vi.fn()}
      />,
    );
    expect(screen.getByText("Erro ao criar campanha de WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Falhou o canal.")).toBeInTheDocument();
  });
});
