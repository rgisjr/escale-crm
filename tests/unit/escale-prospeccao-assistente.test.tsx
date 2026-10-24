import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistenteDeProspeccao } from "@/components/escale/prospeccao/assistente/AssistenteDeProspeccao";
import {
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { detalhe, empresa, ID, linha, OPCOES } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/random-id", () => ({ randomId: () => "99999999-9999-4999-8999-999999999999" }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));
// O seletor da 8B tem internos próprios; aqui basta escolher o número.
vi.mock("@/components/escale/campanhas/molde/SeletorDeNumero", () => ({
  SeletorDeNumero: ({
    numeros,
    aoMudar,
  }: {
    numeros: { id: string; nome: string }[];
    aoMudar: (id: string) => void;
  }) => (
    <div>
      {numeros.map((n) => (
        <button key={n.id} type="button" onClick={() => aoMudar(n.id)}>
          {`número ${n.nome}`}
        </button>
      ))}
    </div>
  ),
}));

const mutateAsync = vi.fn();
let detalhes: Record<string, unknown> = {};

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  detalhes = {};
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
  vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES, isError: false } as never);
  vi.mocked(useDetalheDaProspeccao).mockImplementation(((id: string | null) => ({
    data: id ? detalhes[id] : undefined,
    isError: false,
  })) as never);
});

async function preencherPasso1() {
  await userEvent.type(
    screen.getByPlaceholderText("Ex: Clínicas de estética em Campinas"),
    "Clínicas Campinas",
  );
  await userEvent.click(screen.getByRole("button", { name: "número Comercial" }));
}

describe("AssistenteDeProspeccao — passos 1 e 2 (018, 031; D9)", () => {
  it("trilha, passos e o passo 1", () => {
    render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    expect(screen.getByText("Nova prospecção")).toBeInTheDocument();
    expect(screen.getByText("Configure a sua prospecção")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Configurar por conversa/ })).toBeInTheDocument();
  });

  it("Próximo sem nada lista os erros e não avança", async () => {
    render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("alert")).toHaveTextContent("O nome precisa ter de 3 a 80 caracteres.");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escolha o número que vai abordar as empresas.",
    );
  });

  it("agente existente pede a escolha do agente", async () => {
    render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    await preencherPasso1();
    await userEvent.click(screen.getByRole("radio", { name: /Usar agente existente/ }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha um agente publicado.");
  });

  it("passo 2: busca manda o search com o request_id e mostra o andamento", async () => {
    mutateAsync.mockResolvedValue({ id: ID });
    const { rerender } = render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    await preencherPasso1();
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await userEvent.type(screen.getByLabelText("Público ou segmento"), "clínicas de estética");
    await userEvent.type(screen.getByLabelText("Cidade ou região"), "Campinas, SP");
    await userEvent.click(screen.getByRole("button", { name: "Buscar empresas" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      action: "search",
      request_id: "99999999-9999-4999-8999-999999999999",
      search: {
        name: "Clínicas Campinas",
        niche: "clínicas de estética",
        location: "Campinas, SP",
        limit: 20,
        budget_usd: 1,
        enrich: true,
      },
    });
    detalhes[ID] = detalhe({
      status: "draft",
      statusDaBusca: "running",
      config: null,
      empresas: [],
      linha: linha({ situacao: "buscando" }),
    });
    rerender(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    expect(
      await screen.findByText(
        "Buscando empresas no Google Maps. Isso pode levar alguns minutos; você pode sair e voltar pela lista.",
      ),
    ).toBeInTheDocument();
  });

  it("rascunho continuado: começa no passo 1 com o nome travado; no passo 2 a lista e o select", async () => {
    detalhes[ID] = detalhe({
      status: "draft",
      config: null,
      linha: linha({ situacao: "rascunho" }),
      empresas: [
        empresa({ id: "a", status: "new", progresso: "new" }),
        empresa({
          id: "b",
          status: "new",
          progresso: "new",
          selecionada: false,
          dados: { ...empresa().dados, name: "Studio Pele" },
        }),
      ],
    });
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    expect(screen.getByText("Continuar prospecção")).toBeInTheDocument();
    expect(screen.getByText("O nome foi gravado com a busca.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "número Comercial" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("2 empresas encontradas · 1 marcadas")).toBeInTheDocument();
    mutateAsync.mockResolvedValue({});
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Marcar empresa para abordagem: Clínica Bela" }),
    );
    expect(mutateAsync).toHaveBeenCalledWith({
      action: "select",
      id: ID,
      candidate_ids: ["a"],
      selected: false,
    });
  });

  it("prospecção já iniciada não abre no assistente", () => {
    detalhes[ID] = detalhe();
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    expect(
      screen.getByText("Esta prospecção já começou. Acompanhe pela lista."),
    ).toBeInTheDocument();
  });
});
