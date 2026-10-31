import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  atualizar: vi.fn(),
  atualizarMutate: vi.fn(),
  criar: vi.fn(),
  replace: vi.fn(),
  ordem: [] as string[],
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: h.replace, push: vi.fn() }) }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useCreateAutomationRule: () => ({ isPending: false, mutateAsync: h.criar }),
  useUpdateAutomationRule: () => ({ isPending: false, mutateAsync: h.atualizar, mutate: h.atualizarMutate }),
}));

import { toast } from "sonner";

import { useFluxo } from "@/components/escale/automacoes/fluxo/useFluxo";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import { MENSAGEM_DO_LACO_DE_LEAD } from "@/lib/schemas/webhooks";

const U1 = "11111111-1111-4111-8111-111111111111";

function regra(over: Partial<AutomationRuleRow> = {}): AutomationRuleRow {
  return {
    id: "r1",
    organization_id: "o1",
    name: "Boas-vindas",
    trigger_event: "contact.tag_added",
    trigger_config: {},
    conditions: [{ field: "event.added_tags", op: "contains", value: "vip" }],
    actions: [
      { type: "add_tag", config: { tags: ["a"] } },
      { type: "add_tag", config: { tags: ["b"] } },
    ],
    is_active: false,
    last_run_at: null,
    run_count: 0,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-30T10:00:00.000Z",
    last_change_actor_kind: null,
    last_change_at: null,
    ...over,
  };
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);
const montar = (r: AutomationRuleRow | null, opcoes: Parameters<typeof useFluxo>[1] = {}) =>
  renderHook(() => useFluxo(r, opcoes), { wrapper });
const acoesDa = (r: { current: ReturnType<typeof useFluxo> }) => r.current.percurso.acoes.map((c) => c.id);

beforeEach(() => {
  vi.clearAllMocks();
  h.ordem = [];
  h.atualizar.mockImplementation(async (v: { id: string }) => ({ data: regra({ id: v.id, updated_at: "2026-10-30T11:00:00.000Z" }) }));
  h.criar.mockImplementation(async () => ({ data: regra({ id: "r9" }) }));
});

describe("useFluxo", () => {
  it("abre a regra e salva sem mexer mandando o mesmo corpo e a versão lida", async () => {
    const { result } = montar(regra());
    expect(result.current.sujo).toBe(false);
    let resultado = "";
    await act(async () => {
      resultado = await result.current.salvar();
    });
    expect(resultado).toBe("salvo");
    expect(h.atualizar).toHaveBeenCalledWith({
      id: "r1",
      name: "Boas-vindas",
      trigger_event: "contact.tag_added",
      trigger_config: {},
      conditions: [{ field: "event.added_tags", op: "contains", value: "vip" }],
      actions: [
        { type: "add_tag", config: { tags: ["a"] } },
        { type: "add_tag", config: { tags: ["b"] } },
      ],
      versao_lida: "2026-10-30T10:00:00.000Z",
    });
    expect(result.current.sujo).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("Automação salva com sucesso!");
  });

  it("renomear deixa sujo", () => {
    const { result } = montar(regra());
    act(() => result.current.setNome("x"));
    expect(result.current.sujo).toBe(true);
  });

  it("adicionar sem seleção põe no fim da fila e seleciona; com seleção entra depois dela", () => {
    const { result } = montar(regra());
    act(() => result.current.adicionar("add_tag"));
    expect(acoesDa(result)).toEqual(["acao-1", "acao-2", "acao-3"]);
    expect(result.current.selecionado).toBe("acao-3");
    act(() => result.current.selecionar("acao-1"));
    act(() => result.current.adicionar("create_task"));
    expect(acoesDa(result)).toEqual(["acao-1", "acao-4", "acao-2", "acao-3"]);
  });

  it("condições entram uma vez só", () => {
    const { result } = montar(regra({ conditions: [] }));
    act(() => result.current.adicionar("condicoes"));
    act(() => result.current.adicionar("condicoes"));
    expect(result.current.desenho.caixas.filter((c) => c.data.kind === "condicoes")).toHaveLength(1);
    expect(toast.info).toHaveBeenCalledWith("As condições ficam numa caixa só. Acrescente a nova condição nela.");
  });

  it("ação que fecha laço é recusada com a mensagem do laço", () => {
    const { result } = montar(regra({ trigger_event: "lead.assigned", conditions: [] }));
    const antes = result.current.desenho.caixas.length;
    act(() => result.current.adicionar("assign_owner"));
    expect(toast.error).toHaveBeenCalledWith(MENSAGEM_DO_LACO_DE_LEAD);
    expect(result.current.desenho.caixas).toHaveLength(antes);
  });

  it("duplicar copia a ação logo depois e recusa com 10 ações", () => {
    const { result } = montar(regra());
    act(() => result.current.duplicarNo("acao-1"));
    expect(acoesDa(result)).toEqual(["acao-1", "acao-3", "acao-2"]);
    const dez = Array.from({ length: 10 }, () => ({ type: "add_tag", config: { tags: ["a"] } }));
    const cheia = montar(regra({ actions: dez }));
    act(() => cheia.result.current.duplicarNo("acao-1"));
    expect(cheia.result.current.percurso.acoes).toHaveLength(10);
    expect(toast.error).toHaveBeenCalledWith("Uma automação tem no máximo 10 ações.");
  });

  it("remover o gatilho não faz nada; remover uma ação do meio fecha a fila", () => {
    const { result } = montar(regra({ actions: [...regra().actions, { type: "add_tag", config: { tags: ["c"] } }] }));
    act(() => result.current.removerNo("gatilho"));
    expect(result.current.desenho.caixas.some((c) => c.id === "gatilho")).toBe(true);
    act(() => result.current.removerNo("acao-2"));
    expect(acoesDa(result)).toEqual(["acao-1", "acao-3"]);
  });

  it("trocar o gatilho para outro evento apaga as condições; para o mesmo só troca a tela", () => {
    const { result } = montar(regra());
    const tela = (result.current.desenho.caixas[0]!.data as unknown as { tela: never }).tela;
    act(() => result.current.trocarGatilho("contact.tag_added", tela));
    const linhas = () =>
      (result.current.desenho.caixas.find((c) => c.data.kind === "condicoes")!.data as { linhas: unknown[] }).linhas;
    expect(linhas()).toHaveLength(1);
    act(() => result.current.trocarGatilho("message.received", tela));
    expect(result.current.evento).toBe("message.received");
    expect(linhas()).toHaveLength(0);
  });

  it("salvar sem ação é recusado, marca o problema no nó e não chama a API", async () => {
    const { result } = montar(regra({ actions: [] }));
    let resultado = "";
    await act(async () => {
      resultado = await result.current.salvar();
    });
    expect(resultado).toBe("recusado");
    expect(h.atualizar).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Para salvar a automação, conecte pelo menos uma ação ao gatilho.");
    const marcados = result.current.nos.filter((n) => (n.data.problemas ?? []).length > 0);
    expect(marcados.length).toBeGreaterThan(0);
  });

  it("nova com nome inicial: cria, grava pasta e forma ANTES de trocar de tela e avisa duas vezes", async () => {
    const aoCriar = vi.fn(async () => {
      h.ordem.push("aoCriar");
    });
    h.replace.mockImplementation(() => h.ordem.push("replace"));
    const { result } = montar(null, { nomeInicial: "Vendas", aoCriar });
    expect(result.current.sujo).toBe(true);
    act(() => {
      result.current.aplicarNoNo("gatilho", {
        kind: "gatilho",
        evento: "contact.tag_added",
        tela: (result.current.desenho.caixas[0]!.data as unknown as { tela: never }).tela,
      });
    });
    act(() => result.current.adicionar("add_tag"));
    act(() =>
      result.current.aplicarNoNo("acao-1", { kind: "acao", acao: { type: "add_tag", config: { tags: ["x"] } } }),
    );
    let resultado = "";
    await act(async () => {
      resultado = await result.current.salvar();
    });
    expect(resultado).toBe("criado");
    expect(aoCriar).toHaveBeenCalledWith("r9");
    expect(h.replace).toHaveBeenCalledWith("/app/webhooks/automacoes/r9");
    expect(h.ordem).toEqual(["aoCriar", "replace"]);
    expect(toast.success).toHaveBeenCalledWith("Automação salva com sucesso!");
    expect(toast.info).toHaveBeenCalledWith("Ela nasce pausada: ligue quando estiver pronta.");
  });

  it("ligar/pausar é otimista e o Salvar seguinte manda a versão nova", async () => {
    const { result } = montar(regra());
    h.atualizarMutate.mockImplementation((_v: unknown, o: { onSuccess: (r: unknown) => void }) =>
      o.onSuccess({ data: { updated_at: "2026-10-30T12:00:00.000Z" } }),
    );
    act(() => result.current.alternarAtivo(true));
    expect(h.atualizarMutate).toHaveBeenCalledWith({ id: "r1", is_active: true }, expect.anything());
    expect(result.current.ativo).toBe(true);
    await act(async () => {
      await result.current.salvar();
    });
    expect(h.atualizar.mock.calls[0]![0].versao_lida).toBe("2026-10-30T12:00:00.000Z");
  });

  it("organizar chama aoReorganizar", () => {
    const aoReorganizar = vi.fn();
    const { result } = montar(regra(), { aoReorganizar });
    act(() => result.current.reorganizar());
    expect(aoReorganizar).toHaveBeenCalled();
  });
});

void U1;
