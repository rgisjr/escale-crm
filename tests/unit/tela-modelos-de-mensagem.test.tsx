import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const papel = vi.hoisted(() => ({ role: "admin" }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u-1" }, activeOrg: { orgId: "o-1", role: papel.role } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

import { TelaModelosDeMensagem } from "@/components/escale/conversas/configuracoes/modelos/TelaModelosDeMensagem";
import { TooltipProvider } from "@/components/ui/tooltip";
import { categoriaDoModelo, filtrarModelos, FILTROS_VAZIOS, pedacosDaPrevia, siglaDoIdioma, statusDoModelo } from "@/lib/escale/conversas/modelos";
import { toast } from "sonner";

/** FORK ESCALE · Frente V (Task 10): a lista (print v01) e a janela (v02, v08, v09). */
const SLOTS = [
  { chave: "1", botao: false, antes: "Olá ", depois: ", estou entrando em contato", numero: "1" },
  { chave: "button0:1", botao: true, antes: "", depois: "", numero: "1" },
];
const modelo = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  language: "pt_BR",
  status: "APPROVED",
  category: "MARKETING",
  contractHash: "h1",
  components: [{ type: "BODY", text: "Olá {{1}}, estou entrando em contato." }],
  mapeamento: { slots: SLOTS, variaveis: {}, desatualizado: false },
  ...extra,
});
const MODELOS = [
  modelo("1msg_geral", {
    mapeamento: {
      slots: SLOTS,
      variaveis: { "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: null } },
      desatualizado: false,
    },
  }),
  modelo("boa_tarde", { status: "PENDING", category: "UTILITY", mapeamento: { slots: [], variaveis: {}, desatualizado: false } }),
];

let patches: unknown[] = [];
beforeEach(() => {
  patches = [];
  papel.role = "admin";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/channels/templates/variaveis")) {
        patches.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ data: { variaveis: {} } }), { status: 200 });
      }
      if (url.includes("/channels/templates")) {
        return new Response(JSON.stringify({ data: { waba: "w-1", templates: MODELOS } }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: { grupos: [], campos: [] } }), { status: 200 });
    }),
  );
});

function abrir() {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider>
        <TelaModelosDeMensagem />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return user;
}

describe("regras da lista", () => {
  it("rótulos em português, sigla do idioma e filtros", () => {
    expect(statusDoModelo("APPROVED")).toEqual({ rotulo: "Aprovado", tom: "ok" });
    expect(statusDoModelo("pending").rotulo).toBe("Em análise");
    expect(categoriaDoModelo("UTILITY")).toBe("Utilitário");
    expect(siglaDoIdioma("pt_BR")).toBe("BR");
    expect(siglaDoIdioma("es")).toBe("ES");
    expect(filtrarModelos(MODELOS as never, { ...FILTROS_VAZIOS, status: "Em análise" }).map((m) => m.name)).toEqual([
      "boa_tarde",
    ]);
    expect(filtrarModelos(MODELOS as never, { ...FILTROS_VAZIOS, busca: "GERAL" })).toHaveLength(1);
  });
  it("a prévia corta o corpo nos {{n}}", () => {
    expect(pedacosDaPrevia([{ type: "HEADER", format: "TEXT", text: "Oi {{1}}" }, { type: "BODY", text: "A {{1}} b" }])).toEqual([
      { tipo: "texto", texto: "Oi " },
      { tipo: "variavel", chave: "header:1" },
      { tipo: "texto", texto: "\n\n" },
      { tipo: "texto", texto: "A " },
      { tipo: "variavel", chave: "1" },
      { tipo: "texto", texto: " b" },
    ]);
  });
});

describe("TelaModelosDeMensagem", () => {
  it("lista nome, contador de variáveis, categoria, idioma e status", async () => {
    abrir();
    const linha = await screen.findByRole("row", { name: "1msg_geral" });
    expect(within(linha).getByText("{ } 2 variáveis")).toBeInTheDocument();
    expect(within(linha).getByText("Marketing")).toBeInTheDocument();
    expect(within(linha).getByText("BR")).toBeInTheDocument();
    expect(within(linha).getByText("Aprovado")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: "boa_tarde" })).getByText("Em análise")).toBeInTheDocument();
  });

  it("a busca filtra", async () => {
    const user = abrir();
    await screen.findByRole("row", { name: "1msg_geral" });
    await user.type(screen.getByRole("textbox", { name: "Buscar por modelo..." }), "boa");
    expect(screen.queryByRole("row", { name: "1msg_geral" })).toBeNull();
    expect(screen.getByRole("row", { name: "boa_tarde" })).toBeInTheDocument();
  });

  it("a janela: prévia com o chip, fixo inválido marca Corrigir, alternativo abre e fecha, e salva", async () => {
    const user = abrir();
    await user.click(await screen.findByRole("row", { name: "1msg_geral" }));
    const janela = screen.getByRole("dialog");
    expect(within(janela).getByText("Diga de onde vem cada valor destacado na mensagem.")).toBeInTheDocument();
    expect(within(janela).getAllByText("Primeiro nome").length).toBeGreaterThan(0);
    expect(within(janela).getByText("Pode salvar agora. O envio libera quando tudo estiver definido.")).toBeInTheDocument();

    const v1 = within(janela).getByRole("region", { name: "Variável 1" });
    await user.click(within(v1).getByRole("button", { name: "Definir um valor alternativo" }));
    await user.type(within(v1).getByRole("textbox", { name: "Valor alternativo" }), "cliente");

    const botao = within(janela).getByRole("region", { name: "Variável do botão 1" });
    expect(within(botao).getByRole("button", { name: /Escrever um valor/ })).toBeDisabled();

    await user.click(within(v1).getByRole("button", { name: /Escrever um valor/ }));
    await user.type(within(v1).getByPlaceholderText("Digite o texto"), "a    b");
    expect(within(v1).getByText("Corrigir")).toBeInTheDocument();
    expect(within(janela).getByRole("button", { name: "Salvar" })).toBeDisabled();

    await user.clear(within(v1).getByPlaceholderText("Digite o texto"));
    await user.type(within(v1).getByPlaceholderText("Digite o texto"), "amigo");
    await user.click(within(janela).getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(patches).toEqual([
        { name: "1msg_geral", language: "pt_BR", variaveis: { "1": { fonte: "fixo", valor: "amigo" } } },
      ]),
    );
    expect(toast.success).toHaveBeenCalledWith("As variáveis foram salvas com sucesso!");
  });

  it("Cancelar não grava", async () => {
    const user = abrir();
    await user.click(await screen.findByRole("row", { name: "1msg_geral" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(patches).toEqual([]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("quem não é administrador vê só leitura", async () => {
    papel.role = "agent";
    const user = abrir();
    await user.click(await screen.findByRole("row", { name: "1msg_geral" }));
    const janela = screen.getByRole("dialog");
    expect(within(janela).getByText("Origem de cada valor, somente leitura.")).toBeInTheDocument();
    expect(within(janela).queryByRole("button", { name: "Salvar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ressincronizar" })).toBeNull();
  });

  it("mapeamento desatualizado avisa (D12)", async () => {
    MODELOS[0]!.mapeamento.desatualizado = true;
    const user = abrir();
    await user.click(await screen.findByRole("row", { name: "1msg_geral" }));
    expect(within(screen.getByRole("dialog")).getByText("O modelo mudou na Meta. Confira as variáveis.")).toBeInTheDocument();
    MODELOS[0]!.mapeamento.desatualizado = false;
  });
});
