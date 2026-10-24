import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const salvar = vi.fn();
const acao = vi.fn();
const salvo = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  redirect: vi.fn(),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "topo" }) }) }));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u1" })),
  resolveActiveOrg: vi.fn(async () => ({
    orgId: "org-1",
    role: "manager",
    timezone: "America/Sao_Paulo",
  })),
}));
vi.mock("@/lib/escale/contatos/origens-da-pagina", () => ({
  origensDaPagina: vi.fn(async () => ({ origens: [], papel: "manager", opcoesDoFiltro: {} })),
}));
vi.mock("@/hooks/escale/useAssistenteDeCampanha", () => ({
  useNumerosDaCampanha: () => ({
    data: [
      {
        id: "aaaaaaaa-0000-4000-8000-000000000002",
        nome: "Naiara",
        telefone: null,
        conectado: true,
        oficial: false,
        provider: "p",
        setor: null,
      },
    ],
  }),
  useAssistenteSalvo: (id: string | null) => salvo(id),
  useSalvarAssistente: () => ({ mutateAsync: salvar, isPending: false }),
  useAcaoDoAssistente: () => ({ mutateAsync: acao, isPending: false }),
  usePaginaDoPublico: () => ({ data: { linhas: [], total: 1 }, isLoading: false }),
  useForaDaLista: () => ({ data: [] }),
  useAcompanharImportacao: () => ({ data: undefined }),
  contatosDaImportacao: vi.fn(),
}));
vi.mock("@/hooks/escale/useCamposDaCampanha", () => ({ useCamposDaCampanha: () => [] }));
vi.mock("@/hooks/escale/useModelosDeMensagem", () => ({
  useModelosDeMensagem: () => ({
    modelos: [],
    recentes: [],
    marcarUsado: vi.fn(),
    recarregar: vi.fn(),
  }),
}));
vi.mock("@/hooks/campanhas/useConfiguracao", () => ({ useTextosSalvos: () => ({ data: [] }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org-1" } }),
}));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: [] }),
}));
vi.mock("@/hooks/escale/useImportacoes", () => ({ useDestinosDaImportacao: () => ({ data: [] }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({ data: [] }),
}));
vi.mock("@/components/escale/contatos/JanelaNovoContato", () => ({
  JanelaNovoContato: () => null,
}));

import NovaCampanhaPage from "@/app/app/campaigns/new/page";
import { AssistenteDeCampanha } from "@/components/escale/campanhas/assistente/AssistenteDeCampanha";
import { POS_ENVIO_PADRAO, type Assistente } from "@/lib/escale/campanhas/assistente";

const comConsulta = (ui: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
);
const PRONTO: Assistente = {
  nome: "Reativação de junho",
  numeroId: "aaaaaaaa-0000-4000-8000-000000000002",
  mensagem: { tipo: "texto", texto: "Oi {{primeiro_nome}}" },
  quando: { modo: "agora" },
  baseLegal: "consent",
  lia: null,
  publico: { selecao: null, avulsos: ["bbbbbbbb-0000-4000-8000-000000000001"], removidos: [] },
  posEnvio: POS_ENVIO_PADRAO,
  agenteId: null,
  ritmo: {},
  numerosExtras: [],
};
const montar = (campanhaId: string | null) =>
  render(
    comConsulta(
      <AssistenteDeCampanha
        campanhaId={campanhaId}
        origens={[]}
        opcoesDoFiltro={{} as never}
        papel="manager"
        fuso="America/Sao_Paulo"
      />,
    ),
  );

beforeEach(() => {
  vi.clearAllMocks();
  salvo.mockReturnValue({ data: undefined, isLoading: false });
  salvar.mockResolvedValue("c-1");
  acao.mockImplementation(async ({ acao: a }: { acao: string }) =>
    a === "preparar"
      ? { resumo: { total: 1, elegiveis: 1, excluidos: 0, motivos: [] } }
      : a === "enviar"
        ? { modo: "iniciada", quando: null }
        : { status: "draft" },
  );
});

describe("AssistenteDeCampanha", () => {
  it("a trilha, a barra e o passo 1; 'Próximo' com erro não avança", async () => {
    montar(null);
    expect(screen.getByText("Nova campanha")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("list", { name: "Passos da campanha" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("Escolha o dispositivo de WhatsApp.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mensagem de WhatsApp" })).toBeInTheDocument();
  });

  it("do rascunho ao 'Enviar Whatsapp': salva e prepara ao entrar no passo 4, envia e mostra o sucesso", async () => {
    salvo.mockReturnValue({
      data: { campanhaId: "c-1", status: "draft", assistente: PRONTO, publicoAntigo: false },
      isLoading: false,
    });
    montar("c-1");
    await screen.findByDisplayValue("Reativação de junho");
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("Escolha para quem você quer enviar Whatsapp")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("heading", { name: "Configurações opcionais" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() => expect(acao).toHaveBeenCalledWith({ id: "c-1", acao: "preparar" }));
    expect(salvar).toHaveBeenCalledWith({ campanhaId: "c-1", dados: PRONTO });
    await userEvent.click(await screen.findByRole("button", { name: "Enviar Whatsapp" }));
    expect(
      await screen.findByText("Campanha Reativação de junho enviada com sucesso"),
    ).toBeInTheDocument();
  });

  it("'Voltar' do passo 4 devolve a campanha a rascunho; 'Salvar como rascunho' volta à lista", async () => {
    salvo.mockReturnValue({
      data: { campanhaId: "c-1", status: "draft", assistente: PRONTO, publicoAntigo: false },
      isLoading: false,
    });
    montar("c-1");
    await screen.findByDisplayValue("Reativação de junho");
    for (let i = 0; i < 3; i++)
      await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await screen.findByRole("button", { name: "Enviar Whatsapp" });
    await userEvent.click(screen.getByRole("button", { name: "Salvar como rascunho" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/campaigns"));
    expect(acao).toHaveBeenCalledWith({ id: "c-1", acao: "rascunho" });
  });

  it("campanha que ficou 'Pronta' (aba fechada no passo 4) volta a rascunho ao abrir", async () => {
    salvo.mockReturnValue({
      data: { campanhaId: "c-1", status: "ready", assistente: PRONTO, publicoAntigo: false },
      isLoading: false,
    });
    montar("c-1");
    await waitFor(() => expect(acao).toHaveBeenCalledWith({ id: "c-1", acao: "rascunho" }));
  });

  it("campanha que já saiu não abre no assistente", async () => {
    salvo.mockReturnValue({
      data: { campanhaId: "c-1", status: "running", assistente: PRONTO, publicoAntigo: false },
      isLoading: false,
    });
    montar("c-1");
    expect(await screen.findByText("Esta campanha não é mais um rascunho.")).toBeInTheDocument();
  });
});

describe("o encaixe em /app/campaigns/new", () => {
  it("com a casca, devolve o assistente", async () => {
    const el = (await NovaCampanhaPage()) as {
      type: unknown;
      props: { campanhaId: string | null };
    };
    expect(el.type).toBe(AssistenteDeCampanha);
    expect(el.props.campanhaId).toBeNull();
  });
});
