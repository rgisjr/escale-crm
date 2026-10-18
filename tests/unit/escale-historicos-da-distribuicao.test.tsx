import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL", role: "admin" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1K (D13): o relógio e o contador da distribuição (código `Ms` e o histórico da Clint; sem print). */
const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const EQUIPE = [
  {
    user_id: A,
    role: "admin",
    full_name: "Ana Lima",
    email: "ana@x.com",
    accepted_at: "2026-01-01",
    revoked_at: null,
    invited_at: null,
    created_at: "2026-01-01",
    last_sign_in_at: null,
  },
  {
    user_id: B,
    role: "agent",
    full_name: "Bruno Reis",
    email: "bruno@x.com",
    accepted_at: "2026-01-01",
    revoked_at: null,
    invited_at: null,
    created_at: "2026-01-01",
    last_sign_in_at: null,
  },
];
const CONFIG = {
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [],
  motivos: [],
  campos: [],
  regras: [],
  fork: {
    moeda: null,
    tagsPadrao: [],
    motivosInativos: [],
    aoSair: {},
    alerta: { geral: null, etapas: {} },
    visualizacao: null,
    pessoas: [],
  },
  moedaDaOrganizacao: "BRL",
  visualizacao: "own_and_unassigned",
  visualizacaoDaOrganizacao: "own_and_unassigned",
  pessoasDoGrupo: [],
  podeAdministrar: true,
  distribuicao: [{ userId: A, percentual: 100, contador: 7, papel: "admin" }],
  distribuicaoAtualizada: { em: new Date(Date.now() - 5 * 60_000).toISOString(), autorId: A },
} as unknown as ConfiguracoesDaOrigem;

function abrir(rotas: Record<string, unknown>) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: CONFIG };
    if (url === "/api/v1/team") return { data: EQUIPE };
    const chave = Object.keys(rotas).find((r) => url.startsWith(r));
    return { data: chave ? rotas[chave] : [] };
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

async function irParaDistribuicao(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("navigation", { name: "Configurações da origem" });
  await user.click(screen.getByRole("button", { name: "Distribuição de dono" }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("o relógio: Histórico de alterações", () => {
  it("mostra 'Atualizado há 5 minutos' e abre a gaveta com as versões e os textos da Clint", async () => {
    const em = new Date(Date.now() - 5 * 60_000).toISOString();
    const user = abrir({
      "/api/v1/pipelines/f-1/distribuicao/alteracoes": [
        {
          id: "1",
          evento: "percentual_alterado",
          pessoaId: A,
          percentualAntes: 50,
          percentualDepois: 100,
          autorId: A,
          em,
        },
        {
          id: "2",
          evento: "pessoa_saiu",
          pessoaId: B,
          percentualAntes: 50,
          percentualDepois: null,
          autorId: A,
          em,
        },
        {
          id: "3",
          evento: "contagem_reiniciada",
          pessoaId: null,
          percentualAntes: null,
          percentualDepois: null,
          autorId: B,
          em: "2026-01-01T10:00:00Z",
        },
      ],
    });
    await irParaDistribuicao(user);
    await user.click(await screen.findByRole("button", { name: "Histórico de alterações" }));
    const gaveta = await screen.findByRole("dialog", { name: "Histórico de alterações" });
    expect(within(gaveta).getByText("Distribuição de dono · Clayton")).toBeInTheDocument();
    expect(
      await within(gaveta).findByText("Percentual de Ana Lima alterado de 50% para 100%"),
    ).toBeInTheDocument();
    expect(within(gaveta).getByText("Bruno Reis saiu da distribuição")).toBeInTheDocument();
    expect(within(gaveta).getByText("Contagem de negócios reiniciada")).toBeInTheDocument();
    expect(within(gaveta).getByText("Versão atual")).toBeInTheDocument();
    expect(within(gaveta).getByText("Versão anterior")).toBeInTheDocument();
  });

  it("sem nada registrado: o texto vazio da Clint", async () => {
    const user = abrir({ "/api/v1/pipelines/f-1/distribuicao/alteracoes": [] });
    await irParaDistribuicao(user);
    await user.click(await screen.findByRole("button", { name: "Histórico de alterações" }));
    expect(await screen.findByText("Nenhuma alteração registrada ainda.")).toBeInTheDocument();
  });
});

describe("o contador: Histórico de distribuições", () => {
  it("a pílula abre a janela filtrada pela pessoa, com a tabela, o rodapé e o 'Removido'", async () => {
    const user = abrir({
      "/api/v1/pipelines/f-1/distribuicao/feitas": {
        itens: [
          {
            id: "d1",
            leadId: "l1",
            titulo: "Maria Souza",
            etapa: "Novo",
            userId: A,
            em: "2026-10-18T13:05:00Z",
          },
          {
            id: "d2",
            leadId: "l2",
            titulo: "João Prado",
            etapa: null,
            userId: B,
            em: "2026-10-17T09:00:00Z",
          },
        ],
        total: 2,
      },
    });
    await irParaDistribuicao(user);
    await user.click(await screen.findByRole("button", { name: "Ver distribuições de Ana" }));
    const janela = await screen.findByRole("dialog", { name: "Histórico de distribuições" });
    expect(within(janela).getByText("Origem: Clayton")).toBeInTheDocument();
    expect(
      vi.mocked(apiClient.get).mock.calls.some(([u]) => String(u).includes(`usuario=${A}`)),
    ).toBe(true);
    expect(
      within(janela)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Negócio", "Etapa", "Distribuído para", "Data"]);
    expect(await within(janela).findByText("Maria Souza")).toBeInTheDocument();
    expect(within(janela).getByText("Removido")).toBeInTheDocument();
    expect(within(janela).getByText("Mostrando 1–2 de 2 negócios atribuídos")).toBeInTheDocument();
  });

  it("sem resultado: o texto da Clint e 'Limpar filtros'", async () => {
    const user = abrir({ "/api/v1/pipelines/f-1/distribuicao/feitas": { itens: [], total: 0 } });
    await irParaDistribuicao(user);
    await user.click(await screen.findByRole("button", { name: "Ver distribuições de Ana" }));
    expect(
      await screen.findByText("Nenhuma distribuição encontrada para os filtros selecionados."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
  });
});
