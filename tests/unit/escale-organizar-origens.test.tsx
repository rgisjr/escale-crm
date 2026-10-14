import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type { Origens } from "@/lib/escale/origens/regras";
import { OrganizarOrigens } from "@/components/escale/origens/OrganizarOrigens";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras" },
    { id: "g-cred", name: "Credenciados" },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras" },
    { id: "f-solto", name: "Pós-venda", group_id: null },
  ],
};
const NOVAS: Origens = { grupos: [...ORIGENS.grupos, { id: "g-novo", name: "Parcerias" }], funis: ORIGENS.funis };

function abrir() {
  const onOrigens = vi.fn();
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <OrganizarOrigens open onOpenChange={() => {}} origens={ORIGENS} onOrigens={onOrigens} />
    </QueryClientProvider>,
  );
  return { onOrigens, user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(apiClient.post).mockResolvedValue({ data: NOVAS });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: NOVAS });
  vi.mocked(apiClient.put).mockResolvedValue({ data: NOVAS });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: NOVAS });
});

describe("<OrganizarOrigens>", () => {
  it("cria um grupo e aplica as origens da resposta", async () => {
    const { onOrigens, user } = abrir();
    await user.type(screen.getByRole("textbox", { name: "Nome do novo grupo" }), "Parcerias");
    await user.click(screen.getByRole("button", { name: "Criar grupo" }));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipeline-groups", { name: "Parcerias" });
    await vi.waitFor(() => expect(onOrigens).toHaveBeenCalledWith(NOVAS));
  });

  it("renomeia um grupo", async () => {
    const { user } = abrir();
    await user.click(screen.getByRole("button", { name: "Renomear INSS de obras" }));
    const campo = screen.getByRole("textbox", { name: "Nome do grupo" });
    expect(campo).toHaveValue("INSS de obras");
    await user.clear(campo);
    await user.type(campo, "INSS Obras 2026");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras", { name: "INSS Obras 2026" });
  });

  it("excluir pede confirmação e avisa que nenhum funil é apagado", async () => {
    const { user } = abrir();
    await user.click(screen.getByRole("button", { name: "Excluir Credenciados" }));
    expect(screen.getByText(/Nenhum negócio é apagado/)).toBeInTheDocument();
    expect(apiClient.delete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-cred");
  });

  it("move o funil para outro grupo e para Sem grupo", async () => {
    const { user } = abrir();
    await user.click(screen.getByRole("combobox", { name: "Grupo do funil Leads INSS WhatsApp" }));
    await user.click(await screen.findByRole("option", { name: "Credenciados" }));
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-leads/grupo", { group_id: "g-cred" });
    // A caixa fica desabilitada enquanto a mutação corre; espera ela voltar.
    await vi.waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Grupo do funil Leads INSS WhatsApp" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("combobox", { name: "Grupo do funil Leads INSS WhatsApp" }));
    await user.click(await screen.findByRole("option", { name: "Sem grupo" }));
    expect(apiClient.put).toHaveBeenLastCalledWith("/api/v1/pipelines/f-leads/grupo", { group_id: null });
  });

  it("a recusa da rota aparece na janela", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(
      new ApiError(422, "unprocessable_entity", undefined, "r-1", "Já existe um grupo com esse nome."),
    );
    const { onOrigens, user } = abrir();
    await user.type(screen.getByRole("textbox", { name: "Nome do novo grupo" }), "Credenciados");
    await user.click(screen.getByRole("button", { name: "Criar grupo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um grupo com esse nome.");
    expect(onOrigens).not.toHaveBeenCalled();
  });
});
