// @vitest-environment node
import { describe, expect, it } from "vitest";

import { corpoDoDesenho, type Desenho } from "@/lib/automation/desenho-da-regra";
import { compilar, desenhoDoFluxo, modoDoDesenho } from "@/lib/escale/automacoes/fluxo/compilar";
import { validateFlowForPublish } from "@/lib/followup/validate-publish";

const p = { x: 0, y: 0 };
const tela = { fonte: null, data: { pipeline_id: "", campo: "", dias: "7" }, tempo: { dias: "7", direcao: "da_equipe" as const, proteger_pela_agenda: false }, criado: { pipeline_id: "", stage_id: "" }, tags: [] };

const leadNovo: Desenho = {
  caixas: [
    { id: "gatilho", type: "gatilho", position: p, data: { kind: "gatilho", evento: "message.received", tela } },
    { id: "espera", type: "atraso", position: p, data: { kind: "atraso", quantidade: 30, unidade: "segundos", janela: null } },
    { id: "acoes", type: "acao", position: p, data: { kind: "acao", acao: { type: "create_or_move_lead", config: { pipeline_id: "P", stage_id: "S" } } } },
    { id: "horario", type: "condicoes", position: p, data: { kind: "condicoes", linhas: [], grupos: [
      { id: "util", modo: "todas", linhas: [{ field: "agora.hora", op: "entre", value: '{"de":"09:30","ate":"23:00","dias":[1,2,3,4,5]}' }] },
    ] } },
    { id: "fora", type: "atraso", position: p, data: { kind: "atraso", quantidade: 1, unidade: "minutos", janela: { de: "08:00", ate: "09:00", dias: [0, 1, 2, 3, 4, 5, 6] } } },
    { id: "msg", type: "acao", position: p, data: { kind: "acao", acao: { type: "send_whatsapp_message", config: {
      channel_session_id: "conversation",
      passos: [
        { tipo: "midia", asset: "var:bv1" },
        { tipo: "pausa", segundos: 4 },
        { tipo: "interativo", interativo: { tipo: "lista", corpo: "Aonde você quer fazer o teste?", botaoDaLista: "Ver opções",
          linhas: [{ id: "tv", titulo: "TV BOX" }, { id: "cel", titulo: "CELULAR ANDROID" }] } },
      ],
    } } } },
    { id: "avisa", type: "acao", position: p, data: { kind: "acao", acao: { type: "create_task", config: { titulo: "Lead clicou", vence_em_dias: 0, atribuir_a: "dono_do_lead" } } } },
  ],
  ligacoes: [
    { id: "l1", source: "gatilho", target: "espera" },
    { id: "l2", source: "espera", target: "acoes" },
    { id: "l3", source: "acoes", target: "horario" },
    { id: "l4", source: "horario", target: "msg", saida: "grupo:util" },
    { id: "l5", source: "horario", target: "fora", saida: "nenhuma" },
    { id: "l6", source: "fora", target: "msg" },
    { id: "l7", source: "msg", target: "avisa", saida: "botao:tv" },
    { id: "l8", source: "msg", target: "avisa", saida: "botao:cel" },
  ],
};

const chave = (d: Desenho) => d.ligacoes.map((l) => `${l.source}>${l.target}:${l.saida ?? "proximo"}`).sort();

describe("compilar o Lead novo GERAL", () => {
  it("é modo fluxo", () => expect(modoDoDesenho(leadNovo)).toBe("fluxo"));

  it("gera o grafo esperado", () => {
    const r = compilar({ nome: "Lead novo", desenho: leadNovo, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error(JSON.stringify(r));
    const tipos = Object.fromEntries(r.grafo.nodes.map((n) => [n.id, n.type]));
    expect(tipos).toMatchObject({
      gatilho: "trigger", espera: "wait", acoes: "acoes_da_automacao", horario: "condicoes_da_automacao",
      fora: "wait", msg: "action", msg__resposta: "match_reply", avisa: "acoes_da_automacao",
    });
    const resposta = r.grafo.nodes.find((n) => n.id === "msg__resposta");
    expect(resposta?.type === "match_reply" && resposta.config.branches.map((b) => [b.id, b.pattern, b.alternativas])).toEqual([
      ["tv", "TV BOX", ["1"]], ["cel", "CELULAR ANDROID", ["2"]],
    ]);
    expect(r.regra.trigger_event).toBe("message.received");
  });

  it("ida e volta devolve as mesmas caixas e saídas", () => {
    const r = compilar({ nome: "Lead novo", desenho: leadNovo, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error("compilou errado");
    const volta = desenhoDoFluxo({ ...r.regra, actions: [] }, r.grafo);
    expect(volta.caixas.map((c) => c.id).sort()).toEqual(leadNovo.caixas.map((c) => c.id).sort());
    expect(chave(volta)).toEqual(chave(leadNovo));
  });

  it("e-mail depois de um atraso é recusado com a mensagem do passo", () => {
    const comEmail: Desenho = {
      caixas: [...leadNovo.caixas, { id: "mail", type: "acao", position: p, data: { kind: "acao", acao: { type: "send_email", config: {} } } }],
      ligacoes: [...leadNovo.ligacoes, { id: "l9", source: "avisa", target: "mail" }],
    };
    const r = compilar({ nome: "x", desenho: comEmail, regraGravada: null });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problemas).toContainEqual({ caixa: "mail", mensagem: "Este passo não pode vir depois de um Atraso, de uma Condição com ramos ou de uma resposta do contato." });
  });

  it("atraso abaixo de 30 s é recusado", () => {
    const curto: Desenho = { ...leadNovo, caixas: leadNovo.caixas.map((c) => c.id === "espera" ? { ...c, data: { kind: "atraso" as const, quantidade: 10, unidade: "segundos" as const, janela: null } } : c) };
    const r = compilar({ nome: "x", desenho: curto, regraGravada: null });
    expect(!r.ok && r.problemas).toContainEqual({ caixa: "espera", mensagem: "O atraso mínimo é de 30 segundos." });
  });
});

describe("outros desenhos", () => {
  const texto = { tipo: "texto", texto: "oi" };
  const msg = (config: Record<string, unknown>) => ({ id: "m", type: "acao" as const, position: p, data: { kind: "acao" as const, acao: { type: "send_whatsapp_message", config: { channel_session_id: "conversation", passos: [texto], ...config } } } });
  const gat = { id: "gatilho", type: "gatilho" as const, position: p, data: { kind: "gatilho" as const, evento: "lead.created", tela } };

  it("desenho linear de hoje continua no modo regra, igual ao corpo de sempre", () => {
    const desenho: Desenho = { caixas: [gat, msg({})], ligacoes: [{ id: "l", source: "gatilho", target: "m" }] };
    expect(modoDoDesenho(desenho)).toBe("regra");
    const r = compilar({ nome: "A", desenho, regraGravada: null });
    expect(r.ok && r.modo === "regra" && r.corpo).toEqual(corpoDoDesenho({ nome: "A", desenho, regraGravada: null }));
  });

  it("condição de um grupo logo depois do gatilho vira filtro da regra", () => {
    const filtro = { id: "c", type: "condicoes" as const, position: p, data: { kind: "condicoes" as const, linhas: [], grupos: [{ id: "g1", modo: "todas" as const, linhas: [{ field: "lead.title", op: "contains" as const, value: "x" }] }] } };
    const espera = { id: "e", type: "atraso" as const, position: p, data: { kind: "atraso" as const, quantidade: 1, unidade: "minutos" as const, janela: null } };
    const desenho: Desenho = {
      caixas: [gat, filtro, espera, msg({})],
      ligacoes: [
        { id: "1", source: "gatilho", target: "c" },
        { id: "2", source: "c", target: "e", saida: "grupo:g1" },
        { id: "3", source: "e", target: "m" },
      ],
    };
    const r = compilar({ nome: "A", desenho, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error(JSON.stringify(r));
    expect(r.regra.conditions).toEqual([{ field: "lead.title", op: "contains", value: "x" }]);
    expect(r.grafo.nodes.map((n) => n.id)).not.toContain("c");
    expect(r.grafo.edges.find((e) => e.source === "gatilho")?.target).toBe("e");
    const volta = desenhoDoFluxo({ ...r.regra, trigger_config: {}, actions: [] }, r.grafo);
    expect(volta.caixas.map((c) => c.id)).toContain("condicoes");
  });

  it("tempo de resposta sem botões: ramo 'respondeu' com * e saída 'não respondeu'", () => {
    const nao = { id: "n", type: "acao" as const, position: p, data: { kind: "acao" as const, acao: { type: "add_tag", config: { tags: ["x"] } } } };
    const desenho: Desenho = {
      caixas: [gat, msg({ tempo_de_resposta: { quantidade: 15, unidade: "minutos" } }), nao],
      ligacoes: [{ id: "1", source: "gatilho", target: "m" }, { id: "2", source: "m", target: "n", saida: "nao_respondeu" }],
    };
    const r = compilar({ nome: "A", desenho, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error(JSON.stringify(r));
    const resposta = r.grafo.nodes.find((n) => n.id === "m__resposta");
    expect(resposta?.type === "match_reply" && resposta.config.branches).toEqual([{ id: "respondeu", label: "Respondeu", op: "contains", pattern: "*" }]);
    expect(resposta?.type === "match_reply" && resposta.config.grace_timeout_ms).toBe(900_000);
    const deResposta = r.grafo.edges.filter((e) => e.source === "m__resposta");
    const respondeu = deResposta.find((e) => e.condition.type === "branch" && e.condition.branch_id === "respondeu");
    expect(deResposta.find((e) => e.condition.type === "always")?.target).toBe(respondeu?.target);
    expect(deResposta.find((e) => e.condition.type === "branch" && e.condition.branch_id === "no_reply")?.target).toBe("n");
  });

  it("tempo de resposta sem botões: o grafo compilado passa no publish (saída de escape ligada)", () => {
    const nao = { id: "n", type: "acao" as const, position: p, data: { kind: "acao" as const, acao: { type: "add_tag", config: { tags: ["x"] } } } };
    const desenho: Desenho = {
      caixas: [gat, msg({ tempo_de_resposta: { quantidade: 15, unidade: "minutos" } }), nao],
      ligacoes: [
        { id: "1", source: "gatilho", target: "m" },
        { id: "2", source: "m", target: "n" },
        { id: "3", source: "m", target: "n", saida: "nao_respondeu" },
      ],
    };
    const r = compilar({ nome: "A", desenho, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error(JSON.stringify(r));
    const v = validateFlowForPublish(r.grafo, { surface: "crm_automation", exigeModeloForaDaJanela: false });
    expect(v.ok ? [] : v.errors.map((e) => e.code)).toEqual([]);
  });
});

describe("revisão da frente", () => {
  const gat = { id: "gatilho", type: "gatilho" as const, position: p, data: { kind: "gatilho" as const, evento: "message.received", tela } };
  const espera = { id: "e", type: "atraso" as const, position: p, data: { kind: "atraso" as const, quantidade: 1, unidade: "minutos" as const, janela: null } };
  const msg = { id: "m", type: "acao" as const, position: p, data: { kind: "acao" as const, acao: { type: "send_whatsapp_message", config: { channel_session_id: "conversation", template: "oi" } } } };

  it("Condições sem grupos no meio do fluxo: quem casa segue para a mensagem, quem não casa termina", () => {
    const cond = { id: "c", type: "condicoes" as const, position: p, data: { kind: "condicoes" as const, linhas: [{ field: "lead.tags", op: "contains" as const, value: "vip" }] } };
    const desenho: Desenho = { caixas: [gat, espera, cond, msg], ligacoes: [
      { id: "1", source: "gatilho", target: "e" }, { id: "2", source: "e", target: "c" }, { id: "3", source: "c", target: "m" },
    ] };
    const r = compilar({ nome: "A", desenho, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error(JSON.stringify(r));
    const saidas = r.grafo.edges.filter((e) => e.source === "c");
    expect(saidas.find((e) => e.condition.type === "branch")?.target).toBe("m");
    expect(saidas.find((e) => e.condition.type === "always")?.target).toBe("fim");
  });

  it("webhook com segredo e condição de campo do evento no meio do fluxo são recusados", () => {
    const hook = { id: "h", type: "acao" as const, position: p, data: { kind: "acao" as const, acao: { type: "call_webhook", config: { url: "https://x.com", secret: "abc" } } } };
    const cond = { id: "c", type: "condicoes" as const, position: p, data: { kind: "condicoes" as const, linhas: [{ field: "event.added_tags", op: "contains" as const, value: "vip" }] } };
    const desenho: Desenho = { caixas: [gat, espera, hook, cond, msg], ligacoes: [
      { id: "1", source: "gatilho", target: "e" }, { id: "2", source: "e", target: "h" }, { id: "3", source: "h", target: "c" }, { id: "4", source: "c", target: "m" },
    ] };
    const r = compilar({ nome: "A", desenho, regraGravada: null });
    expect(!r.ok && r.problemas.map((x) => x.caixa).sort()).toEqual(["c", "h"]);
  });
});

describe("o grafo compilado passa no publish da automação", () => {
  it("o Lead novo GERAL (Atraso de 30 s e de 1 min) não é recusado", () => {
    const r = compilar({ nome: "Lead novo", desenho: leadNovo, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error("compilou errado");
    expect(validateFlowForPublish(r.grafo, { surface: "crm_automation", exigeModeloForaDaJanela: false })).toEqual({ ok: true });
  });
});
