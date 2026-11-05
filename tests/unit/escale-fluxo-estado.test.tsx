import { configDoComentarioSchema } from "@/lib/escale/comentarios/schema";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  atualizar: vi.fn(),
  atualizarMutate: vi.fn(),
  criar: vi.fn(),
  replace: vi.fn(),
  gravarRascunho: vi.fn(),
  ordem: [] as string[],
}));
// FORK ESCALE · automações: o que não publica vira rascunho (o resto do módulo é o de verdade).
vi.mock("@/hooks/escale/useAutomacoesDaCasca", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/escale/useAutomacoesDaCasca")>()),
  useSalvarRascunho: () => ({ isPending: false, mutateAsync: h.gravarRascunho }),
  useDescartarRascunho: () => ({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() }),
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
import { percorrer } from "@/lib/automation/desenho-da-regra";
import { PROBLEMA_DO_GRUPO_VAZIO, dadosDoGrupo } from "@/lib/escale/automacoes/fluxo/grupos";
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
/** A fila na tela: o gatilho, as condições e os passos (cada grupo conta como um). */
const filaDa = (r: { current: ReturnType<typeof useFluxo> }) => percorrer(r.current.desenho).fila.map((c) => c.id);

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

  it("as duas tags da regra abrem como UM passo 'Ações'; a fila do motor segue com as duas", () => {
    const { result } = montar(regra());
    expect(filaDa(result)).toEqual(["gatilho", "condicoes", "acao-1"]);
    expect(result.current.percurso.acoes).toHaveLength(2);
  });

  it("adicionar 'grupo' põe um passo vazio no fim e o seleciona; com seleção entra depois dela", () => {
    const { result } = montar(regra());
    act(() => result.current.adicionar("grupo"));
    expect(filaDa(result)).toEqual(["gatilho", "condicoes", "acao-1", "acao-2"]);
    expect(result.current.selecionado).toBe("acao-2");
    act(() => result.current.selecionar("acao-1"));
    act(() => result.current.adicionar("send_whatsapp_message"));
    expect(filaDa(result)).toEqual(["gatilho", "condicoes", "acao-1", "acao-3", "acao-2"]);
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

  it("duplicar copia o passo logo depois e recusa quando passaria de 10 ações", () => {
    const { result } = montar(regra());
    act(() => result.current.duplicarNo("acao-1"));
    expect(filaDa(result)).toEqual(["gatilho", "condicoes", "acao-1", "acao-2"]);
    expect(result.current.percurso.acoes).toHaveLength(4);
    const dez = Array.from({ length: 10 }, () => ({ type: "add_tag", config: { tags: ["a"] } }));
    const cheia = montar(regra({ actions: dez }));
    act(() => cheia.result.current.duplicarNo("acao-1"));
    expect(cheia.result.current.percurso.acoes).toHaveLength(10);
    expect(toast.error).toHaveBeenCalledWith("Uma automação tem no máximo 10 ações.");
  });

  it("remover o gatilho não faz nada; remover um passo do meio fecha a fila", () => {
    const whatsapp = { type: "send_whatsapp_message", config: { channel_session_id: U1, template: "Oi" } };
    const { result } = montar(
      regra({ actions: [{ type: "add_tag", config: { tags: ["a"] } }, whatsapp, { type: "add_tag", config: { tags: ["c"] } }] }),
    );
    expect(filaDa(result)).toEqual(["gatilho", "condicoes", "acao-1", "acao-2", "acao-3"]);
    act(() => result.current.removerNo("gatilho"));
    expect(result.current.desenho.caixas.some((c) => c.id === "gatilho")).toBe(true);
    act(() => result.current.removerNo("acao-2"));
    expect(filaDa(result)).toEqual(["gatilho", "condicoes", "acao-1", "acao-3"]);
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

  it("salvar sem ação não publica: marca o problema no nó e guarda como rascunho", async () => {
    h.gravarRascunho.mockResolvedValue({ ruleId: "r1", atualizadoEm: "2026-11-04T12:00:00Z", criada: false });
    const { result } = montar(regra({ actions: [] }));
    let resultado = "";
    await act(async () => {
      resultado = await result.current.salvar();
    });
    expect(resultado).toBe("rascunho");
    expect(h.atualizar).not.toHaveBeenCalled();
    expect(h.gravarRascunho).toHaveBeenCalled();
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

  it("passo 'Ações' vazio é marcado e não publica (guarda como rascunho)", async () => {
    h.gravarRascunho.mockResolvedValue({ ruleId: "r1", atualizadoEm: "2026-11-04T12:00:00Z", criada: false });
    const { result } = montar(regra());
    act(() => result.current.adicionar("grupo"));
    let resultado = "";
    await act(async () => {
      resultado = await result.current.salvar();
    });
    expect(resultado).toBe("rascunho");
    expect(h.atualizar).not.toHaveBeenCalled();
    const no = result.current.nos.find((n) => n.id === "acao-2")!;
    expect(no.data.problemas?.map((p) => p.mensagem)).toEqual([PROBLEMA_DO_GRUPO_VAZIO]);
  });

  it("as ações do passo vão para a lista da regra na ordem em que estão no passo", async () => {
    const { result } = montar(regra());
    act(() =>
      result.current.aplicarNoNo(
        "acao-1",
        dadosDoGrupo([
          { type: "add_tag", config: { tags: ["x"] } },
          { type: "create_task", config: { titulo: "Ligar", vence_em_dias: 1, atribuir_a: "dono_do_lead", prioridade: "medium" } },
          { type: "remove_tag", config: { tags: ["y"] } },
        ]),
      ),
    );
    await act(async () => {
      await result.current.salvar();
    });
    expect(h.atualizar.mock.calls[0]![0].actions.map((a: { type: string }) => a.type)).toEqual(["add_tag", "create_task", "remove_tag"]);
  });

  it("canal entre dois passos 'Ações' mantém a ordem gravada ao salvar sem mexer", async () => {
    const whatsapp = { type: "send_whatsapp_message", config: { channel_session_id: U1, template: "Oi" } };
    const acoes = [{ type: "add_tag", config: { tags: ["a"] } }, whatsapp, { type: "add_tag", config: { tags: ["c"] } }];
    const { result } = montar(regra({ actions: acoes }));
    await act(async () => {
      await result.current.salvar();
    });
    expect(h.atualizar.mock.calls[0]![0].actions).toEqual(acoes);
  });

  it("organizar chama aoReorganizar", () => {
    const aoReorganizar = vi.fn();
    const { result } = montar(regra(), { aoReorganizar });
    act(() => result.current.reorganizar());
    expect(aoReorganizar).toHaveBeenCalled();
  });
});

// FORK ESCALE · Fase 10B: o gatilho de comentário e o passo Instagram no estado do fluxo.
describe("useFluxo · gatilho de comentário e passo Instagram", () => {
  const CANAL = "22222222-2222-4222-8222-222222222222";
  const configDoComentario = {
    channel_session_id: CANAL,
    escopo: "especificos",
    caminhos: [
      {
        id: "caminho-1",
        publicacoes: [{ id: "179", legenda: "Promo", miniatura: null, tipo: null }],
        filtro: { modo: "palavras", palavras: ["link"], combinar: "qualquer" },
        resposta: { variacoes: ["Te respondi no direct!"] },
      },
    ],
  };
  const passo = { type: "send_instagram_message", config: { texto: "Oi!", botoes: [{ titulo: "Ver", url: "https://a.com" }], anexo: null } };
  const regraDeComentario = (over: Partial<AutomationRuleRow> = {}) =>
    regra({ trigger_event: "comment.received", trigger_config: configDoComentario, conditions: [], actions: [passo], ...over });

  it("abre a regra de comentário e salva sem mexer mandando o mesmo trigger_config e as mesmas ações", async () => {
    const { result } = montar(regraDeComentario());
    expect(result.current.sujo).toBe(false);
    await act(async () => {
      await result.current.salvar();
    });
    expect(h.atualizar).toHaveBeenCalledWith(
      expect.objectContaining({ trigger_event: "comment.received", trigger_config: configDoComentarioSchema.parse(configDoComentario), actions: [passo] }),
    );
  });

  it("mexer na configuração do gatilho deixa sujo", () => {
    const { result } = montar(regraDeComentario());
    const gatilho = result.current.nos.find((n) => n.data.kind === "gatilho")!;
    act(() => {
      if (gatilho.data.kind !== "gatilho") return;
      result.current.aplicarNoNo("gatilho", {
        ...gatilho.data,
        tela: { ...gatilho.data.tela, configPropria: { ...configDoComentario, escopo: "todos" } },
      });
    });
    expect(result.current.sujo).toBe(true);
  });

  it("adicionar o passo Instagram com o gatilho de comentário cria a caixa com texto vazio e sem botões", () => {
    const { result } = montar(regraDeComentario({ actions: [{ type: "add_tag", config: { tags: ["a"] } }] }));
    act(() => result.current.adicionar("send_instagram_message"));
    const acoes = result.current.percurso.acoes.map((c) => (c.data.kind === "acao" ? c.data.acao : null));
    expect(acoes.at(-1)).toEqual({ type: "send_instagram_message", config: { texto: "", botoes: [] } });
  });

  it("com outro gatilho o passo Instagram é recusado e nada muda", () => {
    const { result } = montar(regra());
    const antes = filaDa(result);
    act(() => result.current.adicionar("send_instagram_message"));
    expect(toast.error).toHaveBeenCalledWith("O passo Instagram funciona com os gatilhos do Instagram.");
    expect(filaDa(result)).toEqual(antes);
  });
});
