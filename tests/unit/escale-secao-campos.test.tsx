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
  },
  motivos: [],
  campos: [
    { campo: "closer", rotulo: "Closer", tipo: "text", objeto: "Negócio" },
    { campo: "proposta", rotulo: "Proposta", tipo: "text", objeto: "Negócio" },
  ],
  regras: [{ campo: "closer", quando: "ao_entrar", etapas: [E2], status: [] }],
  moedaDaOrganizacao: "BRL",
  visualizacao: "own_and_unassigned",
  podeAdministrar: true,
};

async function abrirCampos(config: ConfiguracoesDaOrigem = CONFIG) {
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
  await user.click(await screen.findByRole("button", { name: "Campos obrigatórios" }));
  return user;
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Campos obrigatórios", () => {
  it("a linha da Clint: Campo/Negócio, Quando, Etapas, Status e a lixeira", async () => {
    await abrirCampos();
    expect(screen.getByText("Closer")).toBeInTheDocument();
    expect(screen.getByText("Negócio")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ao entrar" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("combobox", { name: "Etapas — Closer" })).toHaveTextContent(
      "Reunião Agendada",
    );
    expect(screen.getByRole("combobox", { name: "Status — Closer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remover a regra de Closer" })).toBeInTheDocument();
  });

  it("adicionar campo, trocar para Durante, escolher Todas as etapas e Perdido, e salvar", async () => {
    const user = await abrirCampos();
    await user.click(screen.getByRole("combobox", { name: "Adicionar campo obrigatório" }));
    await user.click(await screen.findByRole("option", { name: "Proposta" }));
    const radios = screen.getAllByRole("radio", { name: "Ao sair" });
    await user.click(radios[radios.length - 1]!);
    await user.click(screen.getByRole("combobox", { name: "Etapas — Proposta" }));
    await user.click(await screen.findByRole("checkbox", { name: "Todas as etapas" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("combobox", { name: "Status — Proposta" }));
    await user.click(await screen.findByRole("checkbox", { name: "Perdido" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
        campos: {
          regras: [
            { campo: "closer", quando: "ao_entrar", etapas: [E2], status: [] },
            { campo: "proposta", quando: "ao_sair", etapas: ["all"], status: ["perdido"] },
          ],
        },
      }),
    );
  });

  it("a linha nova nasce em Ao sair, com o erro da Clint, e o Salvar não grava", async () => {
    const user = await abrirCampos();
    await user.click(screen.getByRole("combobox", { name: "Adicionar campo obrigatório" }));
    await user.click(await screen.findByRole("option", { name: "Proposta" }));
    const quando = screen.getByRole("radiogroup", { name: "Quando — Proposta" });
    expect(within(quando).getByRole("radio", { name: "Ao sair" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByText("Selecione ao menos uma etapa ou status")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("a lixeira tira a regra; sem regras, o vazio da Clint", async () => {
    const user = await abrirCampos();
    await user.click(screen.getByRole("button", { name: "Remover a regra de Closer" }));
    expect(screen.getByText("Nenhum campo obrigatório configurado.")).toBeInTheDocument();
  });

  it("o gerente vê sem mudar", async () => {
    await abrirCampos({ ...CONFIG, podeAdministrar: false });
    expect(
      screen.getByText(
        "Só administrador muda os campos obrigatórios. Você vê as regras como elas estão.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Adicionar campo obrigatório" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remover a regra de Closer" })).toBeNull();
  });

  it("sem nenhum campo no CRM: o aviso e o link para Configurações › Funis (F19)", async () => {
    await abrirCampos({ ...CONFIG, campos: [], regras: [] });
    expect(screen.getByText("Ainda não há campos personalizados no CRM.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Criar campos em Configurações › Funis" }),
    ).toHaveAttribute("href", "/app/settings/tenant/pipelines");
  });

  it("a lista de campos é a do CRM, agrupada em NEGÓCIO (P11)", async () => {
    const user = await abrirCampos();
    await user.click(screen.getByRole("combobox", { name: "Adicionar campo obrigatório" }));
    // O DOM guarda "Negócio"; o CSS (`uppercase`) o desenha como NEGÓCIO, igual ao P11.
    const lista = await screen.findByRole("listbox");
    const grupo = within(lista).getByText("Negócio");
    expect(grupo.className).toContain("uppercase");
    expect(within(lista).getByRole("option", { name: "Proposta" })).toBeInTheDocument();
  });
});
