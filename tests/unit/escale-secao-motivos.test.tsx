import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
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
const motivo = (rotulo: string, selecionado: boolean) => ({ rotulo, selecionado, daOrigem: true });
const CONFIG: ConfiguracoesDaOrigem = {
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [],
  fork: {
    moeda: null,
    tagsPadrao: [],
    motivosInativos: [],
    aoSair: {},
    alerta: { geral: null, etapas: {} },
    visualizacao: null,
    pessoas: [],
  },
  motivos: [
    motivo("Preço", true),
    motivo("Sumiu", false),
    ...Array.from({ length: 10 }, (_, i) => motivo(`Motivo ${i + 1}`, true)),
  ],
  campos: [],
  regras: [],
  moedaDaOrganizacao: "BRL",
  visualizacao: "own_and_unassigned",
  visualizacaoDaOrganizacao: "own_and_unassigned",
  pessoasDoGrupo: [],
  podeAdministrar: true,
  distribuicao: [],
  distribuicaoAtualizada: null,
};

async function abrirMotivos(config: ConfiguracoesDaOrigem = CONFIG) {
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
  await user.click(await screen.findByRole("button", { name: "Motivo de Perda" }));
  return user;
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Motivo de Perda (variante superior)", () => {
  it("o contador e os chips das escolhidas; nada de interruptor nem paginação", async () => {
    await abrirMotivos();
    expect(
      screen.getByText("Configure aqui os motivos de perda desta origem."),
    ).toBeInTheDocument();
    expect(screen.getByText("11 Motivos de perda selecionados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover Preço" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover Motivo 10" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover Sumiu" })).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Próximo" })).toBeNull();
  });

  it("a lista mostra só os que faltam; digitar filtra; sem nenhum, Nenhum resultado", async () => {
    const user = await abrirMotivos();
    const seletor = screen.getByRole("combobox", { name: "Motivos de perda da origem" });
    await user.click(seletor);
    expect(screen.getByRole("option", { name: "Sumiu" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Preço" })).toBeNull();
    await user.type(seletor, "zzz");
    expect(screen.getByText("Nenhum resultado")).toBeInTheDocument();
  });

  it("escolher, tirar e criar vão no Salvar único", async () => {
    const user = await abrirMotivos();
    await user.click(screen.getByRole("combobox", { name: "Motivos de perda da origem" }));
    await user.click(screen.getByRole("option", { name: "Sumiu" }));
    await user.click(screen.getByRole("button", { name: "Remover Preço" }));
    await user.click(screen.getByRole("button", { name: "Adicionar Motivo de Perda" }));
    await user.type(
      await screen.findByRole("textbox", { name: "Novo motivo de perda" }),
      "Sem orçamento{Enter}",
    );
    expect(screen.getByRole("button", { name: "Remover Sem orçamento" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() => expect(apiClient.patch).toHaveBeenCalled());
    const [, corpo] = vi.mocked(apiClient.patch).mock.calls.at(-1)!;
    expect(corpo).toEqual({
      motivos: {
        selecionados: expect.arrayContaining(["Sumiu", "Sem orçamento", "Motivo 1"]),
        novos: ["Sem orçamento"],
      },
    });
    expect((corpo as { motivos: { selecionados: string[] } }).motivos.selecionados).not.toContain(
      "Preço",
    );
  });

  it("motivo repetido é recusado com o texto da Clint, e o balão fica aberto", async () => {
    const user = await abrirMotivos();
    await user.click(screen.getByRole("button", { name: "Adicionar Motivo de Perda" }));
    await user.type(
      await screen.findByRole("textbox", { name: "Novo motivo de perda" }),
      "preço{Enter}",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Esse motivo de perda já existe.");
    expect(screen.getByRole("textbox", { name: "Novo motivo de perda" })).toBeInTheDocument();
  });

  it("limpar tudo e salvar barra com o texto da Clint", async () => {
    const user = await abrirMotivos();
    await user.click(screen.getByRole("button", { name: "Limpar tudo" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(
      screen
        .getAllByRole("alert")
        .some((a) =>
          a.textContent?.includes("Para continuar selecione ao menos um motivo de perda."),
        ),
    ).toBe(true);
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("o gerente vê só para leitura", async () => {
    await abrirMotivos({ ...CONFIG, podeAdministrar: false });
    expect(
      screen.getByText("Só administrador muda os motivos de perda. Você vê a lista como ela está."),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Motivos de perda da origem" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Remover Preço" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Adicionar Motivo de Perda" })).toBeNull();
  });
});

describe("a janela de perder do original deixa de oferecer o inativo", () => {
  it("useMotivosDePerdaDoFunil passa a lista pelo semMotivosInativos", () => {
    const fonte = readFileSync(
      join(__dirname, "..", "..", "hooks/kanban/useMotivosDePerdaDoFunil.ts"),
      "utf8",
    );
    expect(fonte).toContain("FORK ESCALE · Fase 1F");
    expect(fonte).toContain("semMotivosInativos(motivosDoFunil(settings), settings)");
  });
});
