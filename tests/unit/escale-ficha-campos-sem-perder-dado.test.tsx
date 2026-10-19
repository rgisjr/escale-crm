import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => true }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useEditLead: () => ({ mutateAsync: vi.fn(async () => ({})) }),
}));
const api = vi.hoisted(() => ({
  servidor: {} as Record<string, unknown>,
  get: vi.fn(),
  patch: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: api.get, patch: api.patch } }));

// FORK ESCALE · Fase 2C: o contato lê o catálogo do contato (as chaves colidem de propósito com as colunas).
const CATALOGO_DO_CONTATO = vi.hoisted(() => {
  const campo = (chave: string, label: string, posicao: number) => ({
    id: "c-" + chave,
    objeto: "contato",
    chave,
    definicao: { label, type: "text" },
    grupo_id: "g1",
    papel_minimo: null,
    posicao,
    padrao: false,
  });
  return {
    grupos: [{ id: "g1", chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true }],
    campos: [campo("notas", "Notas", 0), campo("obs", "Observação", 1), campo("nome", "Apelido", 2), campo("email", "Email secundário", 3), campo("codigo", "Código", 4)],
  };
});
vi.mock("@/hooks/escale/useCatalogoDeCampos", () => ({
  useCatalogoDeCampos: () => ({ catalogo: CATALOGO_DO_CONTATO, carregando: false, erro: false }),
}));
vi.mock("@/hooks/escale/useOcultosDaOrigem", () => ({
  useOcultosDaOrigem: () => ({ usar_do_grupo: false, contato: [], negocio: [], empresa: [] }),
}));

import { AbaContato } from "@/components/escale/negocio/abas/AbasDeCampos";
import type { Pipeline } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/**
 * FORK ESCALE · Fase 1H, revisão final do PR A: a aba Contato não perde dado.
 * Os hooks são os de verdade (`useContact`, `useUpdateContact`,
 * `useGravarContato`); só a rede é simulada. O PATCH do original SUBSTITUI
 * `custom_fields`, então cada teste olha o CORPO que iria para o servidor.
 */
const LEAD = { id: "n1", contact_id: "c1", title: "Ana", custom_fields: {} } as unknown as Lead;
const PIPELINE = {
  id: "o1",
  settings: {
    fields: [
      { key: "notas", label: "Notas", type: "text" },
      { key: "obs", label: "Observação", type: "text" },
      // Chaves que colidem com as colunas e com o prefixo dos links (I5).
      { key: "nome", label: "Apelido", type: "text" },
      { key: "email", label: "Email secundário", type: "text" },
    ],
  },
} as unknown as Pipeline;

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AbaContato lead={LEAD} pipeline={PIPELINE} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.servidor = {
    id: "c1",
    name: "Ana",
    email: "ana@b.co",
    phone_number: "+5543998031566",
    tags: [],
    custom_fields: { cargo: "CEO", link_site: "https://a.com/" },
  };
  api.get.mockReset();
  api.patch.mockReset();
  api.get.mockImplementation(async () => ({ data: api.servidor }));
  api.patch.mockImplementation(async (_url: string, patch: Record<string, unknown>) => {
    await new Promise((r) => setTimeout(r, 30));
    api.servidor = { ...api.servidor, ...patch };
    return { data: api.servidor };
  });
});

describe("C1: nada é gravado antes de o contato carregar", () => {
  it("carregando: os campos ficam só leitura e nada é enviado", async () => {
    api.get.mockImplementation(() => new Promise(() => undefined));
    renderizar();
    expect(screen.getByRole("heading", { name: "Campos de contato" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Notas" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Nome" })).toBeNull();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("falhou: o aviso aparece, os campos ficam só leitura e nada é enviado", async () => {
    api.get.mockRejectedValue(new Error("500"));
    renderizar();
    expect(await screen.findByText("Não consegui carregar o contato.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Notas" })).toBeNull();
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe("I1: duas gravações seguidas não se desfazem", () => {
  it("a segunda gravação leva o valor da primeira", async () => {
    renderizar();
    const notas = await screen.findByRole("textbox", { name: "Notas" });
    await userEvent.type(notas, "A{Enter}");
    await userEvent.type(screen.getByRole("textbox", { name: "Observação" }), "B{Enter}");
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
    expect(api.patch.mock.calls[1]![1]).toEqual({
      custom_fields: { cargo: "CEO", link_site: "https://a.com/", notas: "A", obs: "B" },
    });
  });
});

describe("I5: o campo do CRM grava em custom_fields, qualquer que seja a chave", () => {
  it("chaves nome, email e codigo do CRM não vão para as colunas nem para os links", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderizar();
    await userEvent.type(await screen.findByRole("textbox", { name: "Apelido" }), "Aninha{Enter}");
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch.mock.calls[0]![1]).toEqual({
      custom_fields: { cargo: "CEO", link_site: "https://a.com/", nome: "Aninha" },
    });
    await userEvent.type(screen.getByRole("textbox", { name: "Código" }), "XPTO{Enter}");
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
    expect(api.patch.mock.calls[1]![1]).toEqual({
      custom_fields: { cargo: "CEO", link_site: "https://a.com/", nome: "Aninha", codigo: "XPTO" },
    });
    // O Email da coluna e o do CRM convivem na mesma lista: as chaves do React não se repetem.
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("ana@b.co");
    expect(
      erro.mock.calls.some((c) => String(c[0]).includes("same key")),
      "chave repetida na lista de campos",
    ).toBe(false);
    erro.mockRestore();
  });

  it("o link do catálogo grava pelo aplicarLinks, sem tocar os outros campos", async () => {
    renderizar();
    await userEvent.type(
      await screen.findByRole("textbox", { name: "Instagram" }),
      "instagram.com/ana{Enter}",
    );
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch.mock.calls[0]![1]).toEqual({
      custom_fields: {
        cargo: "CEO",
        link_site: "https://a.com/",
        link_instagram: "https://instagram.com/ana",
      },
    });
  });
});
