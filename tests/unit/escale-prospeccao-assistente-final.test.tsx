import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistenteDeProspeccao } from "@/components/escale/prospeccao/assistente/AssistenteDeProspeccao";
import {
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import {
  AGENTE,
  CONFIG,
  detalhe,
  empresa,
  ETAPA_ENTRADA,
  ETAPA_QUALIFICADOS,
  FUNIL,
  ID,
  linha,
  NUMERO,
  OPCOES,
} from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));
// O construtor do original conversa com a IA; aqui ele só "publica" o agente.
vi.mock("@/app/app/prospecting/_create-agent", () => ({
  ProspectingAgentBuilder: ({
    onCreated,
    campaign,
  }: {
    onCreated: (id: string, r: unknown, s: unknown) => Promise<void>;
    campaign: { id: string };
  }) => (
    <button
      type="button"
      onClick={() =>
        void onCreated(
          campaign.id,
          { agent: { id: AGENTE, name: "Sofia" }, version_id: "v", model_label: "modelo" },
          {
            name: "Sofia",
            tone: "cordial",
            channel_session_id: NUMERO,
            pipeline_id: FUNIL,
            stage_id: ETAPA_ENTRADA,
            qualified_stage_id: ETAPA_QUALIFICADOS,
            instruction: CONFIG.instruction,
            qualification: CONFIG.qualification,
          },
        )
      }
    >
      publicar agente de teste
    </button>
  ),
}));

const mutateAsync = vi.fn();
const RASCUNHO = detalhe({
  status: "draft",
  config: null,
  linha: linha({ situacao: "rascunho" }),
  empresas: [empresa({ id: "a", status: "new", progresso: "new" })],
});

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset().mockResolvedValue({ started: true });
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
  vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES, isError: false } as never);
});

describe("AssistenteDeProspeccao — passos 3 e 4 (038, 044; D9)", () => {
  it("rascunho com a preparação começada abre na confirmação e inicia com a mesma configuração", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({
      data: detalhe({ status: "draft", linha: linha({ situacao: "rascunho" }) }),
      isError: false,
    } as never);
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    expect(screen.getByText("Confirme sua prospecção")).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    expect(screen.getByText("Sofia")).toBeInTheDocument();
    expect(screen.getByText("US$ 0,45")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Iniciar prospecção" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "start", id: ID, config: CONFIG });
    expect(push).toHaveBeenCalledWith("/app/campaigns?aba=prospeccao");
  });

  it("rascunho sem configuração começa no passo 1 e pede o número de novo (A4)", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: RASCUNHO, isError: false } as never);
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escolha o número que vai abordar as empresas.",
    );
  });

  it("passo 3 com agente existente: Próximo exige etapas e textos; base legal no passo 4", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({
      data: detalhe({
        status: "draft",
        linha: linha({ situacao: "rascunho" }),
        config: { ...CONFIG, legal_basis_ref: "" as string },
      }),
      isError: false,
    } as never);
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Iniciar prospecção" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe a referência da avaliação de legítimo interesse (de 3 a 500 caracteres).",
    );
    expect(mutateAsync).not.toHaveBeenCalled();
    await userEvent.type(
      screen.getByLabelText("Referência da avaliação de legítimo interesse"),
      "LIA 2026/01",
    );
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("heading", { name: "Configure a abordagem" })).toBeInTheDocument();
    expect(screen.getByLabelText("O que a IA deve oferecer e como iniciar")).toHaveValue(
      CONFIG.instruction,
    );
  });

  it("duplicar: tudo preenchido, nome com Cópia, começa no passo 1 sem campanha", () => {
    vi.mocked(useDetalheDaProspeccao).mockImplementation(((id: string | null) => ({
      data: id ? detalhe() : undefined,
      isError: false,
    })) as never);
    render(<AssistenteDeProspeccao campanhaId={null} copiarDe={ID} />);
    expect(screen.getByDisplayValue("Clínicas Campinas Cópia")).toBeInTheDocument();
    expect(screen.queryByText("Salvar como rascunho")).not.toBeInTheDocument();
  });
});

describe("construtor por conversa no passo 3", () => {
  it("publicar o agente preenche o rascunho e libera o passo", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: RASCUNHO, isError: false } as never);
    const { PassoAbordagem } =
      await import("@/components/escale/prospeccao/assistente/PassoAbordagem");
    const { RASCUNHO_VAZIO } = await import("@/lib/escale/prospeccao/assistente");
    const atualizar = vi.fn();
    render(
      <PassoAbordagem
        r={{ ...RASCUNHO_VAZIO, numeroId: NUMERO }}
        atualizar={atualizar}
        opcoes={OPCOES}
        campanha={RASCUNHO}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "publicar agente de teste" }));
    expect(atualizar).toHaveBeenCalledWith({
      agenteId: AGENTE,
      numeroId: NUMERO,
      funilId: FUNIL,
      etapaId: ETAPA_ENTRADA,
      etapaQualificadaId: ETAPA_QUALIFICADOS,
      instrucao: CONFIG.instruction,
      qualificacao: CONFIG.qualification,
    });
  });
});
