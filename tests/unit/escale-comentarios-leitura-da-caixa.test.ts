// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { contaDaCaixa, contasDaCaixa, type ContaDaCaixa } from "@/lib/escale/comentarios/contas-da-caixa";
import { comentariosDaCaixa } from "@/lib/escale/comentarios/leitura-da-caixa";

import { bancoFalso, type Chamada } from "./helpers/banco-falso";

/** Fase 10A: as contas que a pessoa atende (D7) e a leitura dos comentários com os extras do banco. */
const ORG = "org-1";
const sessao = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  display_name: `Conta ${id}`,
  phone_number: null,
  zernio_account_id: `zacc-${id}`,
  status: "WORKING",
  metadata: { social_platform: "instagram" },
  ...extra,
});

function bancoDeContas(opcoes: {
  sessoes: Array<Record<string, unknown>>;
  politicas?: Array<{ id: string; channel_session_id: string }>;
  responsaveis?: Array<{ policy_id: string; user_id: string }>;
}) {
  return bancoFalso((c: Chamada) => {
    if (c.tabela === "channel_sessions") {
      const filtrada = c.filtros.find(([op, col]) => op === "eq" && col === "id");
      const lista = filtrada ? opcoes.sessoes.filter((s) => s.id === filtrada[2]) : opcoes.sessoes;
      return { data: lista, error: null };
    }
    if (c.tabela === "channel_routing_policies") return { data: opcoes.politicas ?? [], error: null };
    if (c.tabela === "channel_routing_responsibles") return { data: opcoes.responsaveis ?? [], error: null };
    return undefined;
  });
}

describe("contasDaCaixa (D7)", () => {
  it("só zernio_social instagram/facebook; WhatsApp e tiktok ficam de fora", async () => {
    const { admin } = bancoDeContas({
      sessoes: [sessao("a"), sessao("b", { metadata: { social_platform: "facebook" } }), sessao("c", { metadata: { social_platform: "tiktok" } }), sessao("d", { metadata: {} })],
    });
    const contas = await contasDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "agent" });
    expect(contas.map((c) => [c.id, c.plataforma])).toEqual([["a", "instagram"], ["b", "facebook"]]);
  });

  it("agente fora da lista do canal não vê a conta; quem está na lista vê; admin sempre", async () => {
    const base = {
      sessoes: [sessao("a"), sessao("b")],
      politicas: [{ id: "p-a", channel_session_id: "a" }],
      responsaveis: [{ policy_id: "p-a", user_id: "outro" }],
    };
    const { admin } = bancoDeContas(base);
    expect((await contasDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "agent" })).map((c) => c.id)).toEqual(["b"]);
    expect((await contasDaCaixa(admin, { organizationId: ORG, userId: "outro", papel: "agent" })).map((c) => c.id)).toEqual(["a", "b"]);
    expect((await contasDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "admin" })).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("política sem ninguém = restricted_empty: só admin vê", async () => {
    const { admin } = bancoDeContas({ sessoes: [sessao("a")], politicas: [{ id: "p-a", channel_session_id: "a" }] });
    expect(await contasDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "manager" })).toEqual([]);
    expect(await contasDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "admin" })).toHaveLength(1);
  });

  it("podeApagar pelo papel; desconectada vem com conectada=false; contaId vem do zernio_account_id", async () => {
    const { admin } = bancoDeContas({ sessoes: [sessao("a", { status: "STOPPED" })] });
    const [agente] = await contasDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "agent" });
    const [gerente] = await contasDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "manager" });
    expect(agente).toMatchObject({ conectada: false, podeApagar: false, contaId: "zacc-a" });
    expect(gerente?.podeApagar).toBe(true);
  });

  it("contaDaCaixa: de outra org ou que a pessoa não atende → null", async () => {
    const { admin } = bancoDeContas({
      sessoes: [sessao("a")],
      politicas: [{ id: "p-a", channel_session_id: "a" }],
      responsaveis: [{ policy_id: "p-a", user_id: "outro" }],
    });
    expect(await contaDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "agent", canal: "a" })).toBeNull();
    expect(await contaDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "agent", canal: "inexistente" })).toBeNull();
    expect(await contaDaCaixa(admin, { organizationId: ORG, userId: "outro", papel: "agent", canal: "a" })).toMatchObject({ id: "a", status: "WORKING" });
  });

  it("filtra sempre pela organização", async () => {
    const { admin, chamadas } = bancoDeContas({ sessoes: [sessao("a")] });
    await contasDaCaixa(admin, { organizationId: ORG, userId: "u1", papel: "agent" });
    expect(chamadas.find((c) => c.tabela === "channel_sessions")?.filtros).toContainEqual(["eq", "organization_id", ORG]);
  });
});

const CONTA: ContaDaCaixa = { id: "canal-1", nome: "Conta", plataforma: "instagram", contaId: "zacc-1", conectada: true, podeApagar: false };
const AGORA = new Date("2026-11-02T12:00:00.000Z");

function zernioDevolve(comentarios: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: comentarios, pagination: { hasMore: false } }), { status: 200 })));
}
const comentarioBruto = (id: string, autor: string, extra: Record<string, unknown> = {}) => ({
  id,
  message: "oi",
  createdTime: "2026-11-02T10:00:00Z",
  from: { id: autor, username: `user-${autor}` },
  ...extra,
});

afterEach(() => vi.unstubAllGlobals());

describe("comentariosDaCaixa", () => {
  const ler = (admin: ReturnType<typeof bancoFalso>["admin"]) =>
    comentariosDaCaixa(admin, { organizationId: ORG, conta: CONTA, chave: "sk", publicacaoId: "post-1", cursor: null, agora: AGORA });

  it("contato pela identidade; sem identidade, pelo disparo do autor", async () => {
    zernioDevolve([comentarioBruto("c1", "u1"), comentarioBruto("c2", "u2"), comentarioBruto("c3", "u3")]);
    const { admin } = bancoFalso((c) => {
      if (c.tabela === "contacts" && c.filtros.some(([, col]) => col === "social_identity")) {
        return { data: [{ id: "k1", name: "Ana", social_identity: "instagram:zacc-1:u1" }], error: null };
      }
      if (c.tabela === "contacts") return { data: [{ id: "k2", name: "Bia" }], error: null };
      if (c.tabela === "escale_disparos_de_comentario" && c.filtros.some(([, col]) => col === "autor_id")) {
        return { data: [{ autor_id: "u2", contact_id: "k2" }], error: null };
      }
      return { data: [], error: null };
    });
    const r = await ler(admin);
    if (!r.ok) throw new Error("esperava ok");
    expect(r.dados.itens.map((c) => c.contato)).toEqual([{ id: "k1", nome: "Ana" }, { id: "k2", nome: "Bia" }, null]);
  });

  it("ação resposta feita → respondido; disparo enviado, direct feito/enviando e falhou+ja_usada → ja_usado", async () => {
    zernioDevolve([comentarioBruto("c1", "u1"), comentarioBruto("c2", "u2"), comentarioBruto("c3", "u3"), comentarioBruto("c4", "u4"), comentarioBruto("c5", "u5")]);
    const { admin } = bancoFalso((c) => {
      if (c.tabela === "escale_acoes_no_comentario") {
        return {
          data: [
            { comentario_id: "c1", acao: "resposta", status: "feito", motivo: null },
            { comentario_id: "c2", acao: "direct", status: "feito", motivo: null },
            { comentario_id: "c3", acao: "direct", status: "falhou", motivo: "resposta_privada_ja_usada" },
            { comentario_id: "c5", acao: "direct", status: "falhou", motivo: "interrompido" },
          ],
          error: null,
        };
      }
      if (c.tabela === "escale_disparos_de_comentario" && c.filtros.some(([, col]) => col === "comentario_id")) {
        return { data: [{ comentario_id: "c4", direct: "enviado" }], error: null };
      }
      return { data: [], error: null };
    });
    const r = await ler(admin);
    if (!r.ok) throw new Error("esperava ok");
    const [c1, c2, c3, c4, c5] = r.dados.itens;
    expect(c1?.respondido).toBe(true);
    expect(c2?.direct).toEqual({ liberado: false, motivo: "ja_usado" });
    expect(c3?.direct).toEqual({ liberado: false, motivo: "ja_usado" });
    expect(c4?.direct).toEqual({ liberado: false, motivo: "ja_usado" });
    expect(c5?.direct).toEqual({ liberado: true });
  });

  it("toda leitura do banco leva a organização", async () => {
    zernioDevolve([comentarioBruto("c1", "u1")]);
    const { admin, chamadas } = bancoFalso(() => undefined);
    await ler(admin);
    expect(chamadas.length).toBeGreaterThan(0);
    for (const c of chamadas) expect(c.filtros).toContainEqual(["eq", "organization_id", ORG]);
  });

  it("erro de banco → a lista do Zernio aparece sem os extras e nada lança", async () => {
    zernioDevolve([comentarioBruto("c1", "u1")]);
    const { admin } = bancoFalso(() => ({ data: null, error: { message: "boom" } }));
    const r = await ler(admin);
    if (!r.ok) throw new Error("esperava ok");
    expect(r.dados.itens).toHaveLength(1);
    expect(r.dados.itens[0]).toMatchObject({ contato: null, respondido: false, direct: { liberado: true } });
  });

  it("erro do Zernio volta como está, sem tocar no banco", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 403 })));
    const { admin, chamadas } = bancoFalso(() => undefined);
    expect(await ler(admin)).toMatchObject({ ok: false, status: 403 });
    expect(chamadas).toHaveLength(0);
  });
});
