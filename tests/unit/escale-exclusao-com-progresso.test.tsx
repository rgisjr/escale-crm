import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { NextRequest } from "next/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as HooksDeAcoes from "@/hooks/escale/useAcoesEmMassa";
import { POST } from "@/app/api/v1/acoes-em-massa/route";
import { AcoesEmMassa } from "@/components/escale/contatos/massa/AcoesEmMassa";
import { FaixaDaExclusao } from "@/components/escale/contatos/massa/FaixaDaExclusao";
import { JanelaExcluirContatos } from "@/components/escale/contatos/massa/JanelaExcluirContatos";
import { useExclusaoEmAndamento } from "@/hooks/escale/useExclusaoEmAndamento";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const consulta = vi.hoisted(() => ({ valor: { data: undefined as unknown } }));
vi.mock("@/hooks/escale/useAcoesEmMassa", async (original) => ({
  ...(await original<typeof HooksDeAcoes>()),
  useAcoesEmMassa: () => consulta.valor,
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip"], isLoading: false }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [] }),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const exclusao = (status: string, feitos: number, total = 100) => ({
  id: "a1",
  acao: "excluir",
  status,
  total,
  feitos,
  falhas: 0,
  tem_arquivo: false,
  created_at: "2026-10-25T10:00:00Z",
});
const comAcoes = (minhas: unknown[]) => ({ data: { minhas, para_aprovar: [] } });

describe("useExclusaoEmAndamento", () => {
  let qc: QueryClient;
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    qc = new QueryClient();
  });

  it("soma o total e os feitos das exclusões em andamento", () => {
    consulta.valor = comAcoes([exclusao("processando", 30), exclusao("concluida", 10)]);
    const { result } = renderHook(() => useExclusaoEmAndamento(), { wrapper: envolver });
    expect(result.current).toEqual({ emAndamento: true, total: 100, feitos: 30 });
  });

  it("sem exclusão em andamento (ou só outra ação), não há faixa", () => {
    consulta.valor = comAcoes([{ ...exclusao("processando", 5), acao: "exportar" }]);
    const { result } = renderHook(() => useExclusaoEmAndamento(), { wrapper: envolver });
    expect(result.current.emAndamento).toBe(false);
  });

  it("refaz só a lista da casca quando `feitos` muda e quando a exclusão termina", () => {
    const espiao = vi.spyOn(qc, "invalidateQueries");
    consulta.valor = comAcoes([exclusao("processando", 10)]);
    const { rerender } = renderHook(() => useExclusaoEmAndamento(), { wrapper: envolver });
    expect(espiao).not.toHaveBeenCalled();
    consulta.valor = comAcoes([exclusao("processando", 10)]);
    act(() => rerender());
    expect(espiao).not.toHaveBeenCalled();
    consulta.valor = comAcoes([exclusao("processando", 40)]);
    act(() => rerender());
    expect(espiao).toHaveBeenCalledTimes(1);
    expect(espiao).toHaveBeenLastCalledWith({ queryKey: ["contacts", "lista-da-casca"] });
    consulta.valor = comAcoes([exclusao("concluida", 100)]);
    act(() => rerender());
    expect(espiao).toHaveBeenCalledTimes(2);
  });
});

describe("FaixaDaExclusao", () => {
  it("mostra os números em formato brasileiro e some quando não há exclusão", () => {
    const { rerender } = render(<FaixaDaExclusao emAndamento total={1500} feitos={320} />);
    expect(screen.getByRole("status").textContent).toContain("Excluindo 1.500 contatos…");
    expect(screen.getByRole("status").textContent).toContain("320 de 1.500");
    rerender(<FaixaDaExclusao emAndamento={false} total={0} feitos={0} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("AcoesEmMassa com exclusão em andamento", () => {
  const montar = (exclusaoEmAndamento: boolean) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AcoesEmMassa
          quantidade={3}
          alvo={{ tipo: "filtro", v: "todos", quantidade: null, excluidos: [] }}
          origens={[]}
          camposDoContato={[]}
          aoLimpar={vi.fn()}
          aoPedir={vi.fn()}
          exclusaoEmAndamento={exclusaoEmAndamento}
        />
      </QueryClientProvider>,
    );

  it("desliga o Excluir e explica o motivo", () => {
    montar(true);
    const botao = screen.getByRole("button", { name: "Excluir selecionados" });
    expect((botao as HTMLButtonElement).disabled).toBe(true);
    fireEvent.mouseEnter(botao.parentElement as HTMLElement);
    expect(screen.getByRole("tooltip").textContent).toBe("Já existe uma exclusão em andamento.");
    fireEvent.click(botao);
    expect(screen.queryByText("Apagar Contatos")).toBeNull();
  });

  it("sem exclusão em andamento, o Excluir abre a confirmação", () => {
    montar(false);
    const botao = screen.getByRole("button", { name: "Excluir selecionados" });
    expect((botao as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(botao);
    expect(screen.getByText("Apagar Contatos")).toBeTruthy();
  });
});

describe("JanelaExcluirContatos", () => {
  it("avisa que a exclusão roda em segundo plano", () => {
    render(
      <JanelaExcluirContatos
        aberta
        quantidade={3}
        enviando={false}
        aoFechar={vi.fn()}
        aoConfirmar={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        "A exclusão roda em segundo plano e pode levar alguns minutos. Você pode continuar usando o sistema.",
      ),
    ).toBeTruthy();
  });
});

describe("POST /api/v1/acoes-em-massa (excluir)", () => {
  const corpo = {
    lista: "contatos",
    acao: "excluir",
    alvo: { tipo: "ids", ids: ["c1c1c1c1-0000-4000-8000-000000000001"] },
    parametros: {},
  };
  const pedido = () =>
    new NextRequest(new URL("/api/v1/acoes-em-massa", "http://x"), {
      method: "POST",
      body: JSON.stringify(corpo),
    } as never);

  function banco(emAndamento: unknown[]) {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ acao_id: "aaaaaaaa-0000-4000-8000-000000000001", quantidade: 1, status: "na_fila" }],
      error: null,
    });
    const filtros: Array<[string, unknown[]]> = [];
    const from = vi.fn(() => {
      const cadeia: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "limit"])
        cadeia[m] = vi.fn((...a: unknown[]) => {
          filtros.push([m, a]);
          return cadeia;
        });
      cadeia.then = (ok: (r: unknown) => unknown) =>
        Promise.resolve({ data: emAndamento, error: null }).then(ok);
      return cadeia;
    });
    vi.mocked(createClient).mockResolvedValue({ rpc, from } as never);
    return { rpc, filtros };
  }

  beforeEach(() => {
    vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
    authOk("manager");
  });

  it("responde 409 e não cria nada quando já há exclusão em andamento", async () => {
    const { rpc, filtros } = banco([{ id: "x" }]);
    const r = await POST(pedido());
    expect(r.status).toBe(409);
    expect((await r.json()).error.message).toBe("Já existe uma exclusão em andamento.");
    expect(rpc).not.toHaveBeenCalled();
    expect(filtros).toContainEqual(["eq", ["organization_id", ORG_ID]]);
    expect(filtros).toContainEqual(["eq", ["acao", "excluir"]]);
  });

  it("cria normalmente quando não há exclusão em andamento", async () => {
    const { rpc } = banco([]);
    const r = await POST(pedido());
    expect(r.status).toBe(201);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
