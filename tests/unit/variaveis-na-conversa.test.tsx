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
const enviar = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
vi.mock("@/hooks/inbox/useSendMessage", () => ({ useSendMessage: () => enviar }));
const MODELO = vi.hoisted(() => ({
  name: "oi",
  language: "pt_BR",
  status: "APPROVED",
  category: "MARKETING",
  components: [{ type: "BODY", text: "Olá {{1}}, sobre {{2}}." }],
  slots: [
    { key: "1", expects: "text", onde: "corpo", valueKey: "1" },
    { key: "2", expects: "text", onde: "corpo", valueKey: "2" },
  ],
  savedValues: {},
}));
vi.mock("@/hooks/escale/useModelosDeMensagem", () => ({
  useModelosDeMensagem: () => ({
    modelos: [MODELO],
    carregando: false,
    recarregar: vi.fn(),
    recentes: [],
    marcarUsado: vi.fn(),
  }),
}));

import { JanelaModelosDeMensagem } from "@/components/escale/conversas/centro/compositor/JanelaModelosDeMensagem";
import { TooltipProvider } from "@/components/ui/tooltip";

/** FORK ESCALE · Frente V (Task 11): o modelo na conversa usa o mapeamento salvo (c63, D13). */
const CV = "c0000000-0000-4000-8000-000000000001";
let resposta: { valores: Record<string, string>; faltando: string[]; slotsSemMapa: string[] };

beforeEach(() => {
  enviar.mutate.mockClear();
  papel.role = "admin";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("/templates/valores")
        ? new Response(JSON.stringify({ data: resposta }), { status: 200 })
        : new Response(JSON.stringify({ data: { waba: null, templates: [] } }), { status: 200 }),
    ),
  );
});

function abrir() {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider>
        <JanelaModelosDeMensagem
          aberta
          aoFechar={vi.fn()}
          conversationId={CV}
          provider="meta_cloud"
          contato={{ name: "Ana Paula" }}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return user;
}

describe("modelo na conversa com o mapeamento salvo", () => {
  it("mapeado: a prévia sai resolvida, sem campo de digitar, e envia os valores", async () => {
    resposta = { valores: { "1": "Ana", "2": "sua obra" }, faltando: [], slotsSemMapa: [] };
    const user = abrir();
    await user.click(screen.getByRole("button", { name: /oi/ }));
    await waitFor(() => expect(screen.getByText("Olá Ana, sobre sua obra.")).toBeInTheDocument());
    expect(screen.queryByText("Preencha os campos do modelo")).toBeNull();
    const botao = screen.getByRole("button", { name: "Enviar" });
    expect(botao).toBeEnabled();
    await user.click(botao);
    expect(enviar.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: CV,
        type: "template",
        template_values: { "1": "Ana", "2": "sua obra" },
      }),
      expect.anything(),
    );
  });

  it("slot sem mapa continua para digitar; o mapeado não", async () => {
    resposta = { valores: { "1": "Ana" }, faltando: [], slotsSemMapa: ["2"] };
    const user = abrir();
    await user.click(screen.getByRole("button", { name: /oi/ }));
    await screen.findByText("Preencha os campos do modelo");
    const campos = screen.getAllByRole("textbox").filter((e) => e.closest("label"));
    expect(campos).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    await user.type(campos[0]!, "obra");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
  });

  it("falta sem alternativo: avisa e barra o envio", async () => {
    resposta = { valores: { "2": "x" }, faltando: ["1"], slotsSemMapa: [] };
    const user = abrir();
    await user.click(screen.getByRole("button", { name: /oi/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("variável 1 sem valor");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("'Editar modelo' só para administrador", async () => {
    resposta = { valores: {}, faltando: [], slotsSemMapa: ["1", "2"] };
    papel.role = "agent";
    const user = abrir();
    await user.click(screen.getByRole("button", { name: /oi/ }));
    expect(within(document.body).queryByRole("button", { name: "Editar modelo" })).toBeNull();
  });
});
