// @vitest-environment node
import { describe, expect, it } from "vitest";

import { excluirCaixa, type CaixaDoDesenho, type Desenho } from "@/lib/automation/desenho-da-regra";
import {
  comGrupos,
  emModoFluxo,
  inserirNoFluxo,
  ligarNoFluxo,
  normalizarSaidas,
  organizarGrafo,
  semSaidasInvalidas,
} from "@/lib/escale/automacoes/fluxo/edicao";
import { agruparNoFluxo } from "@/lib/escale/automacoes/fluxo/grupos";

const p = { x: 0, y: 0 };
const tela = { fonte: null, data: { pipeline_id: "", campo: "", dias: "7" }, tempo: { dias: "7", direcao: "da_equipe" as const, proteger_pela_agenda: false }, criado: { pipeline_id: "", stage_id: "" }, tags: [] };
const gatilho: CaixaDoDesenho = { id: "gatilho", type: "gatilho", position: p, data: { kind: "gatilho", evento: "message.received", tela } };
const atraso = (id: string): CaixaDoDesenho => ({ id, type: "atraso", position: p, data: { kind: "atraso", quantidade: 1, unidade: "minutos", janela: null } });
const acao = (id: string, type = "add_tag"): CaixaDoDesenho => ({ id, type: "acao", position: p, data: { kind: "acao", acao: { type, config: {} } } });
const condicoes = (id: string): CaixaDoDesenho => ({
  id, type: "condicoes", position: p,
  data: { kind: "condicoes", linhas: [], grupos: [{ id: "g1", modo: "todas", linhas: [] }, { id: "g2", modo: "todas", linhas: [] }] },
});
const whats = (id: string, botoes: string[], tempo = false): CaixaDoDesenho => ({
  id, type: "acao", position: p,
  data: { kind: "acao", acao: { type: "send_whatsapp_message", config: {
    passos: [{ tipo: "interativo", interativo: { tipo: "botoes", corpo: "?", botoes: botoes.map((b) => ({ id: b, titulo: b.toUpperCase() })) } }],
    ...(tempo ? { tempo_de_resposta: { quantidade: 5, unidade: "minutos" } } : {}),
  } } },
});

describe("ligarNoFluxo", () => {
  const base: Desenho = { caixas: [gatilho, condicoes("c"), atraso("a"), acao("x")], ligacoes: [{ id: "l1", source: "gatilho", target: "c", saida: undefined }] };

  it("cada saída liga a um destino; ligar de novo a mesma saída troca o destino", () => {
    const um = ligarNoFluxo(base, "c", "grupo:g1", "a");
    if (!um.ok) throw new Error("recusou");
    const dois = ligarNoFluxo(um.desenho, "c", "grupo:g1", "x");
    if (!dois.ok) throw new Error("recusou");
    expect(dois.desenho.ligacoes.filter((l) => l.source === "c")).toEqual([expect.objectContaining({ target: "x", saida: "grupo:g1" })]);
    const outra = ligarNoFluxo(dois.desenho, "c", "nenhuma", "a");
    expect(outra.ok && outra.desenho.ligacoes.filter((l) => l.source === "c")).toHaveLength(2);
  });

  it("várias caixas podem chegar na mesma caixa", () => {
    const r1 = ligarNoFluxo(base, "c", "grupo:g1", "x");
    if (!r1.ok) throw new Error("recusou");
    const r2 = ligarNoFluxo(r1.desenho, "c", "nenhuma", "x");
    expect(r2.ok && r2.desenho.ligacoes.filter((l) => l.target === "x")).toHaveLength(2);
  });

  it("recusa o gatilho, o círculo e a saída que a caixa não tem", () => {
    expect(ligarNoFluxo(base, "c", "grupo:g1", "gatilho")).toMatchObject({ ok: false });
    expect(ligarNoFluxo(base, "c", "botao:zzz", "a")).toEqual({ ok: false, recusa: null });
    const r = ligarNoFluxo(base, "c", "grupo:g1", "a");
    if (!r.ok) throw new Error("recusou");
    const volta = ligarNoFluxo(r.desenho, "a", "proximo", "c");
    expect(volta).toMatchObject({ ok: false });
  });
});

describe("inserirNoFluxo", () => {
  it("entra depois da âncora e assume o destino da primeira saída dela", () => {
    const d: Desenho = { caixas: [gatilho, acao("x")], ligacoes: [{ id: "l1", source: "gatilho", target: "x" }] };
    const novo = inserirNoFluxo(d, "gatilho", atraso("a"));
    expect(novo.ligacoes.map((l) => `${l.source}>${l.target}`).sort()).toEqual(["a>x", "gatilho>a"]);
  });
  it("sem âncora entra no fim da cadeia 'Próximo passo'", () => {
    const d: Desenho = { caixas: [gatilho, acao("x")], ligacoes: [{ id: "l1", source: "gatilho", target: "x" }] };
    const novo = inserirNoFluxo(d, null, atraso("a"));
    expect(novo.ligacoes.map((l) => `${l.source}>${l.target}`).sort()).toEqual(["gatilho>x", "x>a"]);
  });
});

describe("saídas e modo", () => {
  it("semSaidasInvalidas tira a ligação do botão que não existe mais", () => {
    const d: Desenho = { caixas: [whats("m", ["a"], true), acao("x")], ligacoes: [
      { id: "1", source: "m", target: "x", saida: "botao:a" },
      { id: "2", source: "m", target: "x", saida: "botao:b" },
      { id: "3", source: "m", target: "x", saida: "nao_respondeu" },
    ] };
    expect(semSaidasInvalidas(d).ligacoes.map((l) => l.saida)).toEqual(["botao:a", "nao_respondeu"]);
    const semTempo: Desenho = { ...d, caixas: [whats("m", ["a"], false), acao("x")] };
    expect(semSaidasInvalidas(semTempo).ligacoes.map((l) => l.saida)).toEqual(["botao:a"]);
  });
  it("normalizarSaidas manda a ligação de uma caixa com grupos para o primeiro grupo", () => {
    const d: Desenho = { caixas: [condicoes("c"), acao("x")], ligacoes: [{ id: "1", source: "c", target: "x" }] };
    expect(normalizarSaidas(d).ligacoes[0]!.saida).toBe("grupo:g1");
  });
  it("comGrupos dá o grupo g1 à caixa de hoje", () => {
    const antiga: CaixaDoDesenho = { id: "c", type: "condicoes", position: p, data: { kind: "condicoes", linhas: [{ field: "a", op: "eq", value: "b" }] } };
    const r = comGrupos({ caixas: [antiga, acao("x")], ligacoes: [{ id: "1", source: "c", target: "x" }] });
    expect(r.caixas[0]!.data).toMatchObject({ grupos: [{ id: "g1", modo: "todas" }] });
    expect(r.ligacoes[0]!.saida).toBe("grupo:g1");
  });
  it("emModoFluxo: atraso, ramos ou entradas fora da fila; a fila de hoje não", () => {
    expect(emModoFluxo({ caixas: [gatilho, acao("x")], ligacoes: [{ id: "1", source: "gatilho", target: "x" }] })).toBe(false);
    expect(emModoFluxo({ caixas: [gatilho, atraso("a")], ligacoes: [{ id: "1", source: "gatilho", target: "a" }] })).toBe(true);
  });
});

describe("excluir, agrupar e organizar", () => {
  it("excluir uma caixa com várias entradas e uma saída religa cada entrada", () => {
    const d: Desenho = { caixas: [gatilho, condicoes("c"), atraso("a"), acao("x")], ligacoes: [
      { id: "1", source: "c", target: "a", saida: "grupo:g1" },
      { id: "2", source: "c", target: "a", saida: "nenhuma" },
      { id: "3", source: "a", target: "x" },
    ] };
    const r = excluirCaixa(d, "a");
    expect(r.ligacoes.map((l) => `${l.source}>${l.target}:${l.saida}`).sort()).toEqual(["c>x:grupo:g1", "c>x:nenhuma"]);
  });
  it("agruparNoFluxo junta só as ações comuns seguidas e mantém os ramos", () => {
    const d: Desenho = { caixas: [gatilho, atraso("a"), acao("x"), acao("y"), whats("m", ["a"])], ligacoes: [
      { id: "1", source: "gatilho", target: "a" },
      { id: "2", source: "a", target: "x" },
      { id: "3", source: "x", target: "y" },
      { id: "4", source: "y", target: "m" },
    ] };
    const r = agruparNoFluxo(d);
    expect(r.caixas.map((c) => c.id)).toEqual(["gatilho", "a", "x", "m"]);
    expect(r.ligacoes.map((l) => `${l.source}>${l.target}`)).toEqual(["gatilho>a", "a>x", "x>m"]);
  });
  it("organizarGrafo: uma coluna por profundidade, as saídas de uma caixa uma embaixo da outra", () => {
    const d: Desenho = { caixas: [gatilho, condicoes("c"), atraso("a"), acao("x")], ligacoes: [
      { id: "1", source: "gatilho", target: "c" },
      { id: "2", source: "c", target: "a", saida: "grupo:g1" },
      { id: "3", source: "c", target: "x", saida: "grupo:g2" },
    ] };
    const r = organizarGrafo(d);
    const pos = Object.fromEntries(r.caixas.map((c) => [c.id, c.position]));
    expect(pos.gatilho!.x).toBeLessThan(pos.c!.x);
    expect(pos.a!.x).toBe(pos.x!.x);
    expect(pos.a!.y).toBeLessThan(pos.x!.y);
  });
});
