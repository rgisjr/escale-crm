import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

const ORIGENS: Origens = {
  grupos: [],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const E1 = "aaaaaaaa-0000-4000-8000-000000000001";
const E2 = "aaaaaaaa-0000-4000-8000-000000000002";
const CONFIG: ConfiguracoesDaOrigem = {
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [
    { id: E1, name: "Novo", position: 1, is_won: false, is_lost: false },
    { id: E2, name: "Reunião Agendada", position: 2, is_won: false, is_lost: false },
    {
      id: "aaaaaaaa-0000-4000-8000-000000000003",
      name: "Ganho",
      position: 3,
      is_won: true,
      is_lost: false,
    },
  ],
  fork: {
    moeda: null,
    tagsPadrao: [],
    motivosInativos: [],
    aoSair: {},
    alerta: { geral: null, etapas: {} },
    visualizacao: null,
    pessoas: [],
    soAdminGanha: false,
    camposOcultos: { usar_do_grupo: false, contato: [], negocio: [], empresa: [] },
    atribuicao: { operador: "e", condicoes: [] },
    notificacoes: { novoNegocio: [], mudancaDeStatus: { status: [], pessoas: [] } },
  },
  motivos: [],
  campos: [],
  regras: [],
  moedaDaOrganizacao: "BRL",
  visualizacao: "own_and_unassigned",
  visualizacaoDaOrganizacao: "own_and_unassigned",
  pessoasDoGrupo: [],
  ocultosDoGrupo: null,
  podeAdministrar: false,
  distribuicao: [],
  distribuicaoAtualizada: null,
};

const LIMITE = {
  atencao: 4,
  atencao_unidade: "horas",
  critico: 8,
  critico_unidade: "horas",
} as const;
const COM_DUAS_EXCECOES: ConfiguracoesDaOrigem = {
  ...CONFIG,
  fork: { ...CONFIG.fork, alerta: { geral: null, etapas: { [E1]: LIMITE, [E2]: LIMITE } } },
};

async function abrirAlerta(config: ConfiguracoesDaOrigem = CONFIG) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
    url === "/api/v1/pipelines/f-1/configuracoes" ? { data: config } : { data: [] },
  );
  vi.mocked(apiClient.patch).mockResolvedValue({ data: config });
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(await screen.findByRole("button", { name: "Alerta de tempo na etapa" }));
  return user;
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Alerta de tempo na etapa", () => {
  it("sem regra: o vazio da Clint e Definir regra geral", async () => {
    await abrirAlerta();
    expect(
      screen.getByText(
        "Sem regra geral. Apenas as etapas listadas em Exceções abaixo terão alerta de tempo.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhuma exceção configurada. Todas as etapas seguem a regra geral."),
    ).toBeInTheDocument();
  });

  it("definir a regra geral, uma exceção com unidade própria, e salvar", async () => {
    const user = await abrirAlerta();
    await user.click(screen.getByRole("button", { name: "Definir regra geral" }));
    expect(
      screen.getByRole("textbox", { name: "Limite de atenção — Regra geral do funil" }),
    ).toHaveValue("4");
    await user.click(screen.getByRole("button", { name: "Adicionar etapa" }));
    await user.click(await screen.findByRole("button", { name: "Reunião Agendada" }));
    const critico = screen.getByRole("textbox", { name: "Limite crítico — Reunião Agendada" });
    await user.clear(critico);
    await user.type(critico, "2");
    await user.click(
      screen.getByRole("combobox", { name: "Unidade do limite crítico — Reunião Agendada" }),
    );
    await user.click(await screen.findByRole("option", { name: "Dias" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
        alerta: {
          geral: { atencao: 4, atencao_unidade: "horas", critico: 8, critico_unidade: "horas" },
          etapas: {
            "aaaaaaaa-0000-4000-8000-000000000002": {
              atencao: 4,
              atencao_unidade: "horas",
              critico: 2,
              critico_unidade: "dias",
            },
          },
        },
      }),
    );
  });

  it("crítico menor que atenção barra o salvar com o texto da Clint", async () => {
    const user = await abrirAlerta();
    await user.click(screen.getByRole("button", { name: "Definir regra geral" }));
    const critico = screen.getByRole("textbox", {
      name: "Limite crítico — Regra geral do funil",
    });
    await user.clear(critico);
    await user.type(critico, "2");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "O limite crítico deve ser maior que o limite de atenção.",
    );
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("Como aparece no card mostra as três pílulas ao passar o mouse", async () => {
    const user = await abrirAlerta();
    await user.hover(screen.getByRole("button", { name: "Como aparece no card" }));
    const dica = screen.getByRole("tooltip");
    expect(dica).toHaveTextContent("No rodapé do card");
    expect(dica).toHaveTextContent("dentro do prazo · cinza");
    expect(dica).toHaveTextContent("passou de atenção · âmbar");
    expect(dica).toHaveTextContent("passou de crítico · vermelho");
  });

  it("Remover regra geral volta ao vazio, e Definir regra geral a traz de novo", async () => {
    const user = await abrirAlerta();
    await user.click(screen.getByRole("button", { name: "Definir regra geral" }));
    await user.click(screen.getByRole("button", { name: "Remover regra geral" }));
    expect(screen.getByText(/^Sem regra geral\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover regra geral" })).toBeNull();
    expect(screen.getByRole("button", { name: "Definir regra geral" })).toBeInTheDocument();
  });

  it("Voltar à regra geral tira a exceção da etapa", async () => {
    const user = await abrirAlerta(COM_DUAS_EXCECOES);
    expect(screen.getByRole("textbox", { name: "Limite crítico — Novo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Voltar à regra geral: Novo" }));
    expect(screen.queryByRole("textbox", { name: "Limite crítico — Novo" })).toBeNull();
    expect(
      screen.getByRole("textbox", { name: "Limite crítico — Reunião Agendada" }),
    ).toBeInTheDocument();
  });

  it("sem etapas livres, a lista de Adicionar etapa diz que todas já têm regra", async () => {
    const user = await abrirAlerta(COM_DUAS_EXCECOES);
    await user.click(screen.getByRole("button", { name: "Adicionar etapa" }));
    expect(await screen.findByText("Todas as etapas já têm regra própria.")).toBeInTheDocument();
  });

  it("o valor do limite só aceita dígitos", async () => {
    const user = await abrirAlerta();
    await user.click(screen.getByRole("button", { name: "Definir regra geral" }));
    const atencao = screen.getByRole("textbox", {
      name: "Limite de atenção — Regra geral do funil",
    });
    await user.clear(atencao);
    await user.type(atencao, "1a,2.x3");
    expect(atencao).toHaveValue("123");
  });

  it("o teto da mensagem é o da unidade escolhida (Dias 365)", async () => {
    const user = await abrirAlerta();
    await user.click(screen.getByRole("button", { name: "Definir regra geral" }));
    await user.click(
      screen.getByRole("combobox", { name: "Unidade do limite crítico — Regra geral do funil" }),
    );
    await user.click(await screen.findByRole("option", { name: "Dias" }));
    const critico = screen.getByRole("textbox", { name: "Limite crítico — Regra geral do funil" });
    await user.clear(critico);
    await user.type(critico, "999");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um valor entre 1 e 365.");
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("regra geral vazia: a mensagem fala da regra geral, não da exceção", async () => {
    const user = await abrirAlerta();
    await user.click(screen.getByRole("button", { name: "Definir regra geral" }));
    await user.clear(
      screen.getByRole("textbox", { name: "Limite de atenção — Regra geral do funil" }),
    );
    await user.clear(
      screen.getByRole("textbox", { name: "Limite crítico — Regra geral do funil" }),
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    const aviso = screen.getByRole("alert");
    expect(aviso).toHaveTextContent("Preencha pelo menos um limite da regra geral");
    expect(aviso).not.toHaveTextContent("na exceção");
  });

  it("com várias exceções, o erro diz qual etapa falhou", async () => {
    const user = await abrirAlerta(COM_DUAS_EXCECOES);
    await user.clear(screen.getByRole("textbox", { name: "Limite de atenção — Reunião Agendada" }));
    await user.clear(screen.getByRole("textbox", { name: "Limite crítico — Reunião Agendada" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Reunião Agendada: Preencha pelo menos um limite na exceção ou remova-a antes de salvar.",
    );
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("com uma só exceção, o erro não repete o nome da etapa", async () => {
    const user = await abrirAlerta({
      ...COM_DUAS_EXCECOES,
      fork: { ...COM_DUAS_EXCECOES.fork, alerta: { geral: null, etapas: { [E2]: LIMITE } } },
    });
    await user.clear(screen.getByRole("textbox", { name: "Limite de atenção — Reunião Agendada" }));
    await user.clear(screen.getByRole("textbox", { name: "Limite crítico — Reunião Agendada" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^Preencha pelo menos um limite na exceção/,
    );
  });

  it("a unidade tem ~128px, e os rótulos das exceções ficam centrados sobre o seu lado", async () => {
    await abrirAlerta(COM_DUAS_EXCECOES);
    const unidade = screen.getByRole("combobox", { name: "Unidade do limite crítico — Novo" });
    expect(unidade.parentElement).toHaveClass("w-[128px]");
    const rotulo = screen.getAllByText("Limite de atenção")[0]!;
    expect(rotulo.closest("span.flex")).toHaveClass("justify-center");
  });

  it("Como aparece no card: fundo lilás ao passar o mouse e o balão ligado por aria-describedby", async () => {
    const user = await abrirAlerta();
    const botao = screen.getByRole("button", { name: "Como aparece no card" });
    expect(botao.className).toContain("hover:bg-casca-marca-suave");
    expect(botao.className).toContain("focus-visible:bg-casca-marca-suave");
    expect(botao).not.toHaveAttribute("aria-describedby");
    await user.hover(botao);
    const dica = screen.getByRole("tooltip");
    expect(botao).toHaveAttribute("aria-describedby", dica.id);
    expect(within(dica).getByText("No rodapé do card")).toBeInTheDocument();
  });
});
