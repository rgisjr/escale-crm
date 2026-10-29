import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  criarPainelComGraficos,
  ErroDoModelo,
  excluirTemplate,
  lerTemplatesDaOrganizacao,
  tornarTemplate,
  type NovoGraficoDeModelo,
} from "@/lib/escale/indicadores/modelos/banco";

type Resposta = { data?: unknown; error?: { message: string } | null };
type Chamada = { tabela: string; op: string; payload?: unknown; filtros: Array<[string, unknown[]]> };

/** Cliente falso: grava as chamadas e responde por "tabela.operação" (lista = uma resposta por chamada). */
function falso(respostas: Record<string, Resposta | Resposta[]>, rpc: Resposta = {}) {
  const chamadas: Chamada[] = [];
  const rpcs: Array<[string, unknown]> = [];
  const contagem = new Map<string, number>();
  const cliente = {
    from(tabela: string) {
      let op = "select";
      let payload: unknown;
      const filtros: Array<[string, unknown[]]> = [];
      const resolver = (): Resposta => {
        chamadas.push({ tabela, op, payload, filtros });
        const chave = `${tabela}.${op}`;
        const r = respostas[chave];
        const n = contagem.get(chave) ?? 0;
        contagem.set(chave, n + 1);
        const escolhida = Array.isArray(r) ? r[n] : r;
        return { data: null, error: null, ...(escolhida ?? {}) };
      };
      const b: Record<string, unknown> = {
        insert: (v: unknown) => ((op = "insert"), (payload = v), b),
        update: (v: unknown) => ((op = "update"), (payload = v), b),
        delete: () => ((op = "delete"), b),
        select: () => b,
        single: () => Promise.resolve(resolver()),
        maybeSingle: () => Promise.resolve(resolver()),
        then: (res: (r: Resposta) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(resolver()).then(res, rej),
      };
      for (const f of ["eq", "is", "in", "limit", "order"]) b[f] = (...a: unknown[]) => (filtros.push([f, a]), b);
      return b;
    },
    rpc(nome: string, args: unknown) {
      rpcs.push([nome, args]);
      return Promise.resolve({ data: null, error: null, ...rpc });
    },
  };
  return { sb: cliente as unknown as SupabaseClient, chamadas, rpcs };
}

const ORG = "org-da-sessao";
const USER = "user-1";
const GRAFICO: NovoGraficoDeModelo = {
  nome: "G",
  descricao: null,
  tipo: "numero",
  layout: { x: 0, y: 0, w: 6, h: 4 },
  pergunta: { indicadores: ["negocio.quantidade"] },
  opcoes: {},
};
const PAINEL = { nome: "Painel", cor: "marca", icone: "user" };

describe("criarPainelComGraficos", () => {
  it("insere o painel (modelo false, listas vazias) e UM insert de array dos gráficos", async () => {
    const { sb, chamadas } = falso({ "crm_paineis.insert": { data: { id: "novo" } } });
    const r = await criarPainelComGraficos(sb, ORG, USER, PAINEL, [GRAFICO, { ...GRAFICO, nome: "H" }], { comoModelo: false });
    expect(r).toEqual({ id: "novo" });
    const painel = chamadas.find((c) => c.tabela === "crm_paineis" && c.op === "insert");
    expect(painel?.payload).toMatchObject({ organization_id: ORG, modelo: false, permissoes_usuarios: [], permissoes_papeis: [], criado_por: USER });
    const graficos = chamadas.filter((c) => c.tabela === "crm_graficos" && c.op === "insert");
    expect(graficos).toHaveLength(1);
    expect(graficos[0]?.payload).toHaveLength(2);
    expect((graficos[0]?.payload as Array<Record<string, unknown>>)[0]).toMatchObject({ painel_id: "novo", organization_id: ORG });
    expect(chamadas.some((c) => c.op === "update")).toBe(false);
  });

  it("com comoModelo faz o update modelo:true no fim", async () => {
    const { sb, chamadas } = falso({ "crm_paineis.insert": { data: { id: "novo" } } });
    await criarPainelComGraficos(sb, ORG, USER, PAINEL, [GRAFICO], { comoModelo: true });
    const ultimo = chamadas[chamadas.length - 1];
    expect(ultimo).toMatchObject({ tabela: "crm_paineis", op: "update" });
    expect(ultimo?.payload).toMatchObject({ modelo: true });
  });

  it("falha nos gráficos apaga o painel; limite_de_graficos vira 'limite'", async () => {
    const { sb, chamadas } = falso({
      "crm_paineis.insert": { data: { id: "novo" } },
      "crm_graficos.insert": { error: { message: "limite_de_graficos" } },
    });
    await expect(criarPainelComGraficos(sb, ORG, USER, PAINEL, [GRAFICO], { comoModelo: false })).rejects.toMatchObject({ motivo: "limite" });
    expect(chamadas.some((c) => c.tabela === "crm_paineis" && c.op === "delete")).toBe(true);
    const outro = falso({ "crm_paineis.insert": { data: { id: "n" } }, "crm_graficos.insert": { error: { message: "boom" } } });
    await expect(criarPainelComGraficos(outro.sb, ORG, USER, PAINEL, [GRAFICO], { comoModelo: false })).rejects.toBeInstanceOf(ErroDoModelo);
  });

  it("falha no update final apaga o painel; zero gráficos não faz o segundo insert", async () => {
    const { sb, chamadas } = falso({ "crm_paineis.insert": { data: { id: "novo" } }, "crm_paineis.update": { error: { message: "x" } } });
    await expect(criarPainelComGraficos(sb, ORG, USER, PAINEL, [GRAFICO], { comoModelo: true })).rejects.toMatchObject({ motivo: "falhou" });
    expect(chamadas.some((c) => c.op === "delete")).toBe(true);
    const vazio = falso({ "crm_paineis.insert": { data: { id: "n" } } });
    await criarPainelComGraficos(vazio.sb, ORG, USER, PAINEL, [], { comoModelo: false });
    expect(vazio.chamadas.some((c) => c.tabela === "crm_graficos")).toBe(false);
  });
});

describe("lerTemplatesDaOrganizacao", () => {
  it("filtra modelo=true e não apagados, e conta os gráficos pela segunda consulta", async () => {
    const { sb, chamadas } = falso({
      "crm_paineis.select": { data: [{ id: "a", nome: "T", cor: "marca", icone: "user", created_at: "2026-10-28" }] },
      "crm_graficos.select": { data: [{ painel_id: "a" }, { painel_id: "a" }] },
    });
    const r = await lerTemplatesDaOrganizacao(sb, ORG);
    expect(r).toEqual([{ origem: "organizacao", id: "a", nome: "T", cor: "marca", icone: "user", graficos: 2, criadoEm: "2026-10-28" }]);
    const primeira = chamadas[0];
    expect(primeira?.filtros).toEqual(expect.arrayContaining([["eq", ["modelo", true]], ["is", ["deleted_at", null]], ["eq", ["organization_id", ORG]]]));
  });
});

describe("tornarTemplate", () => {
  it("copia os gráficos do painel de origem como modelo", async () => {
    const { sb, chamadas } = falso({
      "crm_graficos.select": { data: [{ id: "g1", nome: "G", descricao: null, tipo: "numero", layout: { x: 0, y: 0, w: 6, h: 4 }, pergunta: {}, opcoes: {} }] },
      "crm_paineis.insert": { data: { id: "copia" } },
    });
    const r = await tornarTemplate(sb, ORG, USER, { id: "orig", nome: "Meu", cor: "marca", icone: "user" });
    expect(r).toEqual({ id: "copia" });
    expect(chamadas.find((c) => c.tabela === "crm_paineis" && c.op === "insert")?.payload).toMatchObject({ nome: "Meu", modelo: false });
    expect(chamadas[chamadas.length - 1]).toMatchObject({ op: "update" });
  });
});

describe("excluirTemplate", () => {
  it("modelo:false e depois a RPC", async () => {
    const { sb, chamadas, rpcs } = falso({ "crm_paineis.select": { data: { id: "t", nome: "T", cor: "marca", icone: "user" } } });
    await excluirTemplate(sb, ORG, "t");
    expect(chamadas.find((c) => c.op === "update")?.payload).toMatchObject({ modelo: false });
    expect(rpcs).toEqual([["fn_escale_excluir_painel", { p_painel: "t" }]]);
  });
  it("RPC falhando devolve modelo:true", async () => {
    const { sb, chamadas } = falso({ "crm_paineis.select": { data: { id: "t", nome: "T", cor: "marca", icone: "user" } } }, { error: { message: "sem_permissao" } });
    await expect(excluirTemplate(sb, ORG, "t")).rejects.toThrow();
    const updates = chamadas.filter((c) => c.op === "update");
    expect(updates).toHaveLength(2);
    expect(updates[1]?.payload).toMatchObject({ modelo: true });
  });
  it("template inexistente → nao_encontrado", async () => {
    const { sb } = falso({ "crm_paineis.select": { data: null } });
    await expect(excluirTemplate(sb, ORG, "x")).rejects.toMatchObject({ motivo: "nao_encontrado" });
  });
});
