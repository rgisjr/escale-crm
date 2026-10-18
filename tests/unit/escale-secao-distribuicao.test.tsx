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

import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1K (D13): a subaba "Distribuição de dono" (print 01-028 e código `Is` da Clint). */
const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const C = "cccccccc-1111-4111-8111-111111111111";
const V = "dddddddd-1111-4111-8111-111111111111";
const R = "eeeeeeee-1111-4111-8111-111111111111";
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const membro = (
  user_id: string,
  full_name: string,
  role: string,
  revoked_at: string | null = null,
) => ({
  user_id,
  role,
  full_name,
  email: `${full_name.split(" ")[0]!.toLowerCase()}@x.com`,
  accepted_at: "2026-01-01",
  revoked_at,
  invited_at: null,
  created_at: "2026-01-01",
  last_sign_in_at: null,
});
const EQUIPE = [
  membro(A, "Ana Lima", "agent"),
  membro(B, "Bruno Reis", "agent"),
  membro(C, "Carla Dias", "agent"),
  membro(V, "Vera Viewer", "viewer"),
  membro(R, "Rui Revogado", "agent", "2026-02-01"),
];

function config(over: Partial<ConfiguracoesDaOrigem> = {}): ConfiguracoesDaOrigem {
  return {
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
      soAdminGanha: false,
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
    podeAdministrar: true,
    distribuicao: [
      { userId: A, percentual: 50, contador: 3, papel: "agent" },
      { userId: B, percentual: 50, contador: 1, papel: "agent" },
    ],
    distribuicaoAtualizada: null,
    ...over,
  } as ConfiguracoesDaOrigem;
}

function abrir(c: ConfiguracoesDaOrigem = config()) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: c };
    if (url === "/api/v1/team") return { data: EQUIPE };
    return { data: [] };
  });
  vi.mocked(apiClient.put).mockResolvedValue({ data: c });
  vi.mocked(apiClient.post).mockResolvedValue({ data: c });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: c });
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
  return { user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

async function irPara(user: ReturnType<typeof userEvent.setup>, item = "Distribuição de dono") {
  await screen.findByRole("navigation", { name: "Configurações da origem" });
  await user.click(screen.getByRole("button", { name: item }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(toast.success).mockClear();
});

describe("Distribuição de dono", () => {
  it("o item do menu só aparece para administrador (Clint)", async () => {
    abrir(config({ podeAdministrar: false }));
    const menu = await screen.findByRole("navigation", { name: "Configurações da origem" });
    expect(within(menu).queryByRole("button", { name: "Distribuição de dono" })).toBeNull();
  });

  it("título, descrição da Clint, cabeçalhos, nome e e-mail, percentual com vírgula e contador", async () => {
    const { user } = abrir();
    await irPara(user);
    expect(screen.getByRole("heading", { name: "Distribuição de dono" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Defina os usuários e percentuais. Negócios criados por Integrações, Apps e Checkouts são distribuídos automaticamente entre eles.",
      ),
    ).toBeInTheDocument();
    // O "?" da ajuda do Contador entra no texto do cabeçalho: tira antes de comparar.
    expect(
      screen.getAllByRole("columnheader").map((h) => (h.textContent ?? "").replace("?", "").trim()),
    ).toEqual(["Usuários", "Percentual %", "Contador", ""]);
    const linhaDaAna = await screen.findByRole("row", { name: /Ana Lima/ });
    expect(within(linhaDaAna).getByText("ana@x.com")).toBeInTheDocument();
    expect(within(linhaDaAna).getByRole("textbox", { name: "Percentual % Ana Lima" })).toHaveValue(
      "50",
    );
    expect(within(linhaDaAna).getByText("3")).toBeInTheDocument();
  });

  it("adicionar refaz todos com 100/n; viewer e revogado não são oferecidos; Salvar manda o PUT", async () => {
    const { user } = abrir();
    await irPara(user);
    await user.click(await screen.findByRole("combobox", { name: "Adicionar usuário" }));
    expect(screen.queryByRole("option", { name: "Vera Viewer" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Rui Revogado" })).toBeNull();
    await user.click(screen.getByRole("option", { name: "Carla Dias" }));
    for (const nome of ["Ana Lima", "Bruno Reis", "Carla Dias"]) {
      expect(screen.getByRole("textbox", { name: `Percentual % ${nome}` })).toHaveValue("33,33");
    }
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-1/distribuicao", {
      pessoas: [
        { user_id: A, percentual: 33.33 },
        { user_id: B, percentual: 33.33 },
        { user_id: C, percentual: 33.33 },
      ],
      reiniciar: false,
    });
    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      "As configurações de distribuição foram salvas com sucesso!",
    );
  });

  it("a lixeira pede confirmação; 'Sim' tira e refaz com 100/n", async () => {
    const { user } = abrir();
    await irPara(user);
    await user.click(await screen.findByRole("button", { name: "Remover Bruno Reis" }));
    expect(
      screen.getByText(
        "A distribuição vai ser refeita com porcentagens iguais entre os demais usuários. Tem certeza que deseja remover este usuário?",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sim" }));
    expect(screen.queryByRole("row", { name: /Bruno Reis/ })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Percentual % Ana Lima" })).toHaveValue("100");
  });

  it("soma errada: o Salvar mostra o texto da Clint e não grava", async () => {
    const { user } = abrir();
    await irPara(user);
    const campo = await screen.findByRole("textbox", { name: "Percentual % Ana Lima" });
    await user.clear(campo);
    await user.type(campo, "40");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(
      screen.getByText("Verificar o total das porcentagens, deve somar 100%."),
    ).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("Resetar distribuição confirma e chama a rota; editando, vira a caixa 'Reiniciar a contagem…' e o PUT leva reiniciar", async () => {
    const { user } = abrir();
    await irPara(user);
    await user.click(await screen.findByRole("button", { name: "Resetar distribuição" }));
    expect(
      screen.getByText(
        "A contagem de negócios será zerada e o histórico de distribuições desta origem será apagado. Tem certeza que deseja continuar?",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sim" }));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipelines/f-1/distribuicao/reiniciar", {});
    expect(toast.success).toHaveBeenCalledWith("A distribuição foi reiniciada com sucesso.");

    const campo = screen.getByRole("textbox", { name: "Percentual % Ana Lima" });
    await user.clear(campo);
    await user.type(campo, "60");
    await user.clear(screen.getByRole("textbox", { name: "Percentual % Bruno Reis" }));
    await user.type(screen.getByRole("textbox", { name: "Percentual % Bruno Reis" }), "40");
    expect(screen.queryByRole("button", { name: "Resetar distribuição" })).toBeNull();
    await user.click(
      screen.getByRole("checkbox", { name: "Reiniciar a contagem de negócios ao salvar" }),
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.put).toHaveBeenCalledWith(
      "/api/v1/pipelines/f-1/distribuicao",
      expect.objectContaining({ reiniciar: true }),
    );
  });
});

describe("M6: a caixa 'Reiniciar…' e o Salvar", () => {
  it("marcar, editar e voltar às linhas gravadas deixa o Salvar desligado (nada a gravar)", async () => {
    const { user } = abrir();
    await irPara(user);
    const ana = await screen.findByRole("textbox", { name: "Percentual % Ana Lima" });
    const bruno = screen.getByRole("textbox", { name: "Percentual % Bruno Reis" });
    await user.clear(ana);
    await user.type(ana, "60");
    await user.clear(bruno);
    await user.type(bruno, "40");
    await user.click(
      screen.getByRole("checkbox", { name: "Reiniciar a contagem de negócios ao salvar" }),
    );
    await user.clear(ana);
    await user.type(ana, "50");
    await user.clear(bruno);
    await user.type(bruno, "50");
    expect(screen.getByRole("button", { name: "Resetar distribuição" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});

describe("Q9 da 1J: a lista de pessoas e a distribuição", () => {
  it("a lista que deixa de fora quem recebe por distribuição não salva e mostra o texto da Clint com os nomes", async () => {
    const { user } = abrir();
    await irPara(user, "Permissão de usuários");
    await user.click(await screen.findByRole("combobox", { name: "Adicione um usuário..." }));
    await user.click(screen.getByRole("option", { name: "Carla Dias" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(
      screen.getByText(
        "Não é possível salvar. Estes usuários recebem negócios por distribuição nesta origem e não estão na lista: Ana Lima, Bruno Reis. Inclua-os na lista de permissões ou remova-os da distribuição.",
      ),
    ).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
});
