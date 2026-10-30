import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => undefined;
  proto.releasePointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
});

const h = vi.hoisted(() => ({
  organizar: vi.fn(),
  canvas: vi.fn(),
  cookie: { valor: undefined as string | undefined },
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() },
}));
vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useCreateAutomationRule: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateAutomationRule: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useAutomationRule: () => ({ data: undefined, isPending: false, isError: false, error: null }),
}));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [] } }),
  usePipelines: () => ({ data: { data: [] } }),
  usePipelineStages: () => ({ data: undefined }),
}));
vi.mock("@/hooks/escale/useAutomacoesDaCasca", () => ({ useOrganizarAoCriar: () => h.organizar }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (h.cookie.valor ? { value: h.cookie.valor } : undefined) }),
}));
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u), notFound: vi.fn(), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: async () => ({ id: "u1", idioma: "pt-BR" }),
  resolveActiveOrg: async () => ({ orgId: "org-1", role: "manager", name: "Org", timezone: null }),
}));
vi.mock("@/app/app/webhooks/_components/SourcesTab", () => ({ SourcesTab: () => <div>ABA RECEBER</div> }));
vi.mock("@/app/app/webhooks/_components/RulesTab", () => ({ RulesTab: () => <div>ABA REGRAS</div> }));
vi.mock("@/app/app/webhooks/_components/ActivityTab", () => ({ ActivityTab: () => <div>ABA ATIVIDADE</div> }));
vi.mock("@/app/app/webhooks/_components/CapturasTab", () => ({ CapturasTab: () => <div>ABA LEADS</div> }));
vi.mock("@/app/app/webhooks/automacoes/[id]/_components/CanvasDaAutomacao", () => ({
  CanvasDaAutomacao: (p: unknown) => {
    h.canvas(p);
    return <div>CANVAS</div>;
  },
}));
vi.mock("@xyflow/react", () => ({ ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import DesignerPage from "@/app/app/webhooks/automacoes/[id]/page";
import { DesignerDeAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/DesignerDeAutomacao";
import { RuleEditor } from "@/app/app/webhooks/_components/RuleEditor";
import WebhooksPage from "@/app/app/webhooks/page";
import { WebhooksClient } from "@/app/app/webhooks/_components/WebhooksClient";

beforeEach(() => {
  vi.clearAllMocks();
  h.cookie.valor = "lateral";
});

describe("WebhooksClient", () => {
  it("sem a prop mantém as quatro abas (o original)", async () => {
    render(<WebhooksClient />);
    expect(await screen.findByRole("tab", { name: "Automações" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
  });

  it("com semAutomacoes tira a aba Automações e deixa as outras três", async () => {
    render(<WebhooksClient semAutomacoes />);
    expect(await screen.findByRole("tab", { name: "Receber dados" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Automações" })).toBeNull();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });
});

describe("página de Webhooks", () => {
  const pagina = (aba?: string) => WebhooksPage({ searchParams: Promise.resolve(aba ? { aba } : {}) });

  it("com a casca e ?aba=automacoes redireciona para /app/automacoes", async () => {
    h.cookie.valor = "topo";
    await expect(pagina("automacoes")).rejects.toThrow("REDIRECT /app/automacoes");
  });

  it("sem a casca abre a aba (o original)", async () => {
    await expect(pagina("automacoes")).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("página do designer", () => {
  const UUID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
  const pagina = (id: string, q: Record<string, string>) =>
    DesignerPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(q) });

  it("passa o nome (cortado em 80) e só uma pasta uuid ao fluxo novo", async () => {
    const el = (await pagina("nova", { nome: "x".repeat(100), pasta: UUID })) as { props: { children: { props: Record<string, unknown> } } };
    const props = el.props.children.props;
    expect((props.nomeInicial as string).length).toBe(80);
    expect(props.pastaInicial).toBe(UUID);
    const ruim = (await pagina("nova", { nome: "a", pasta: "nao-uuid" })) as { props: { children: { props: Record<string, unknown> } } };
    expect(ruim.props.children.props.pastaInicial).toBeNull();
  });

  it("numa automação gravada ignora nome e pasta", async () => {
    const el = (await pagina(UUID, { nome: "a", pasta: UUID })) as { props: { children: { props: Record<string, unknown> } } };
    expect(el.props.children.props.nomeInicial).toBeUndefined();
    expect(el.props.children.props.pastaInicial).toBeNull();
  });
});

describe("DesignerDeAutomacao", () => {
  const qc = () => new QueryClient();
  function montar(props: { nomeInicial?: string; pastaInicial?: string | null }) {
    render(
      <QueryClientProvider client={qc()}>
        <DesignerDeAutomacao id="nova" {...props} />
      </QueryClientProvider>,
    );
  }

  it("com nome inicial, o aoCriar do canvas grava pasta e forma 'fluxo'", async () => {
    montar({ nomeInicial: "Vendas", pastaInicial: "p1" });
    const props = h.canvas.mock.calls[0]?.[0] as { nomeInicial: string; aoCriar: (id: string) => Promise<void> };
    expect(props.nomeInicial).toBe("Vendas");
    await props.aoCriar("r9");
    expect(h.organizar).toHaveBeenCalledWith("r9", { pasta_id: "p1", forma: "fluxo" });
  });

  it("sem nome inicial não há aoCriar (o original)", () => {
    montar({});
    expect((h.canvas.mock.calls[0]?.[0] as { aoCriar?: unknown }).aoCriar).toBeUndefined();
  });
});

describe("RuleEditor", () => {
  function montar(extra: { nomeInicial?: string; daCasca?: boolean }) {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RuleEditor open onOpenChange={vi.fn()} rule={null} {...extra} />
      </QueryClientProvider>,
    );
  }

  it("abre com o nome do modal e leva a marca da casca", async () => {
    montar({ nomeInicial: "Vendas", daCasca: true });
    expect(await screen.findByDisplayValue("Vendas")).toBeTruthy();
    expect(document.querySelector("[data-escale-editor-de-automacao]")).toBeTruthy();
  });

  it("sem as props é o editor de sempre", async () => {
    montar({});
    await screen.findByText("Nova automação");
    expect(document.querySelector("[data-escale-editor-de-automacao]")).toBeNull();
  });
});
