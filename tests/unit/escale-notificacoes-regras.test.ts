import { describe, expect, it } from "vitest";

import {
  ERRO_SEM_USUARIO,
  avisoDoNegocio,
  avisoDoNegocioUmaVez,
  destinatariosDoEvento,
  erroDasNotificacoes,
  gravarNotificacoes,
  lerNotificacoes,
  origensQueAvisam,
} from "@/lib/escale/notificacoes/regras";

const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const C = "cccccccc-1111-4111-8111-111111111111";
const CFG = {
  escale_notificacoes: {
    novo_negocio: { pessoas: [A, A.toUpperCase(), "lixo"] },
    mudanca_de_status: { status: ["won", "x"], pessoas: [B, C] },
  },
};

describe("leitura e gravação", () => {
  it("lê tolerante: ids válidos, minúsculos, sem repetição; só os status conhecidos", () => {
    expect(lerNotificacoes(CFG)).toEqual({
      novoNegocio: [A],
      mudancaDeStatus: { status: ["won"], pessoas: [B, C] },
    });
    expect(lerNotificacoes({})).toEqual({
      novoNegocio: [],
      mudancaDeStatus: { status: [], pessoas: [] },
    });
  });

  it("status sem usuário trava (texto da Clint)", () => {
    expect(
      erroDasNotificacoes({ novoNegocio: [], mudancaDeStatus: { status: ["lost"], pessoas: [] } }),
    ).toBe(ERRO_SEM_USUARIO);
    expect(
      erroDasNotificacoes({ novoNegocio: [], mudancaDeStatus: { status: [], pessoas: [] } }),
    ).toBeNull();
  });

  it("gravar: só membros; sem ninguém a chave some; o resto do settings fica", () => {
    const membros = [A, B];
    expect(
      gravarNotificacoes(
        { fields: [] },
        { novo_negocio: { pessoas: [A] }, mudanca_de_status: { status: ["won"], pessoas: [B] } },
        membros,
      ),
    ).toEqual({
      ok: true,
      settings: {
        fields: [],
        escale_notificacoes: {
          novo_negocio: { pessoas: [A] },
          mudanca_de_status: { status: ["won"], pessoas: [B] },
        },
      },
    });
    expect(
      gravarNotificacoes(
        { ...CFG, fields: [] },
        { novo_negocio: { pessoas: [] }, mudanca_de_status: { status: [], pessoas: [] } },
        membros,
      ),
    ).toEqual({ ok: true, settings: { fields: [] } });
    expect(
      gravarNotificacoes(
        {},
        { novo_negocio: { pessoas: [C] }, mudanca_de_status: { status: [], pessoas: [] } },
        membros,
      ),
    ).toEqual({ ok: false, erro: "Este usuário não faz parte da equipe." });
  });
});

describe("quem é avisado (N22)", () => {
  const n = lerNotificacoes(CFG);
  it("novo negócio: só o que nasce sem pessoa que o criou", () => {
    expect(
      destinatariosDoEvento("lead.created", n, { owner_user_id: null, created_by_user_id: null }),
    ).toEqual([A]);
    expect(
      destinatariosDoEvento("lead.created", n, { owner_user_id: null, created_by_user_id: B }),
    ).toEqual([]);
  });

  it("mudança de status: só os status escolhidos, sem o dono (o original já o avisa)", () => {
    expect(
      destinatariosDoEvento("lead.won", n, { owner_user_id: B, created_by_user_id: null }),
    ).toEqual([C]);
    expect(
      destinatariosDoEvento("lead.lost", n, { owner_user_id: null, created_by_user_id: null }),
    ).toEqual([]);
  });

  it("origensQueAvisam: só as origens em que eu estou", () => {
    const origens = [
      { id: "o1", name: "Clayton", settings: CFG },
      { id: "o2", name: "Outra", settings: {} },
    ];
    expect(origensQueAvisam(origens, B)).toEqual([
      { id: "o1", nome: "Clayton", novo: false, status: ["won"] },
    ]);
    expect(origensQueAvisam(origens, A)).toEqual([
      { id: "o1", nome: "Clayton", novo: true, status: [] },
    ]);
  });

  it("avisoDoNegocio: o texto, o destino e as regras do tempo real", () => {
    const origem = { id: "o1", nome: "Clayton", novo: true, status: ["won" as const] };
    expect(
      avisoDoNegocio({
        tipo: "INSERT",
        novo: { id: "l1", title: "Maria", created_by_user_id: null },
        antigo: null,
        origem,
        eu: A,
      }),
    ).toMatchObject({
      category: "lead_assigned",
      title: "Novo negócio",
      body: "Clayton · Maria",
      href: "/app/negocios/l1",
    });
    expect(
      avisoDoNegocio({
        tipo: "INSERT",
        novo: { id: "l1", title: "Maria", created_by_user_id: B },
        antigo: null,
        origem,
        eu: A,
      }),
    ).toBeNull();
    expect(
      avisoDoNegocio({
        tipo: "UPDATE",
        novo: { id: "l1", title: "Maria", status: "won", owner_user_id: B },
        antigo: { status: "open" },
        origem,
        eu: A,
      }),
    ).toMatchObject({ category: "lead_won", title: "Negócio ganho" });
    expect(
      avisoDoNegocio({
        tipo: "UPDATE",
        novo: { id: "l1", title: "Maria", status: "won", owner_user_id: A },
        antigo: { status: "open" },
        origem,
        eu: A,
      }),
    ).toBeNull();
    expect(
      avisoDoNegocio({
        tipo: "UPDATE",
        novo: { id: "l1", title: "Maria", status: "lost", owner_user_id: B },
        antigo: { status: "open" },
        origem,
        eu: A,
      }),
    ).toBeNull();
    expect(
      avisoDoNegocio({
        tipo: "INSERT",
        novo: { id: "l1" },
        antigo: null,
        origem: undefined,
        eu: A,
      }),
    ).toBeNull();
  });
});

describe("ganho/perda no tempo real: o `old` traz só o id", () => {
  const origem = {
    id: "o1",
    nome: "Clayton",
    novo: false,
    status: ["won" as const, "lost" as const],
  };
  const AGORA = Date.parse("2026-10-18T12:00:00Z");
  const ganho = (extra: Record<string, unknown> = {}) => ({
    tipo: "UPDATE" as const,
    novo: {
      id: "l1",
      title: "Maria",
      status: "won",
      owner_user_id: B,
      closed_at: "2026-10-18T11:59:50Z",
      ...extra,
    },
    antigo: { id: "l1" },
    origem,
    eu: A,
    agora: AGORA,
  });

  it("fechamento recente avisa; UPDATE antigo de negócio já ganho não", () => {
    expect(avisoDoNegocio(ganho())).toMatchObject({ category: "lead_won" });
    expect(avisoDoNegocio(ganho({ closed_at: "2026-10-18T11:50:00Z" }))).toBeNull();
    expect(avisoDoNegocio(ganho({ closed_at: undefined }))).toMatchObject({
      category: "lead_won",
    });
  });

  it("a janela usa o updated_at da linha (do servidor), não o relógio do navegador", () => {
    // Navegador uma hora adiantado: pelo relógio dele o fechamento recente pareceria antigo.
    const adiantado = { agora: AGORA + 3_600_000 };
    const recente = { updated_at: "2026-10-18T11:59:50Z" };
    expect(avisoDoNegocio({ ...ganho(recente), ...adiantado })).toMatchObject({
      category: "lead_won",
    });
    // Edição posterior (título, dono...) adianta o updated_at: já não é a virada.
    expect(avisoDoNegocio(ganho({ updated_at: "2026-10-18T12:30:00Z" }))).toBeNull();
    // Sem updated_at na linha, vale o relógio do navegador.
    expect(avisoDoNegocio({ ...ganho(), ...adiantado })).toBeNull();
  });

  it("reabrir e ganhar de novo (outro closed_at) avisa outra vez; o mesmo fechamento não", () => {
    const jaAvisados = new Set<string>();
    const primeiro = { closed_at: "2026-10-18T11:59:50Z", updated_at: "2026-10-18T11:59:50Z" };
    const segundo = { closed_at: "2026-10-18T11:59:55Z", updated_at: "2026-10-18T11:59:55Z" };
    expect(avisoDoNegocioUmaVez(ganho(primeiro), jaAvisados)).not.toBeNull();
    expect(avisoDoNegocioUmaVez(ganho(primeiro), jaAvisados)).toBeNull();
    expect(avisoDoNegocioUmaVez(ganho(segundo), jaAvisados)).not.toBeNull();
  });

  it("com antigo = { id } e o mesmo ganho chegando duas vezes, avisa uma só vez", () => {
    const jaAvisados = new Set<string>();
    expect(avisoDoNegocioUmaVez(ganho(), jaAvisados)).toMatchObject({ category: "lead_won" });
    expect(avisoDoNegocioUmaVez(ganho({ title: "Maria 2" }), jaAvisados)).toBeNull();
  });

  it("perda depois do ganho do mesmo negócio avisa (outro status); outro negócio também", () => {
    const jaAvisados = new Set<string>();
    expect(avisoDoNegocioUmaVez(ganho(), jaAvisados)).not.toBeNull();
    expect(avisoDoNegocioUmaVez(ganho({ status: "lost" }), jaAvisados)).toMatchObject({
      category: "lead_lost",
    });
    expect(avisoDoNegocioUmaVez(ganho({ id: "l2" }), jaAvisados)).not.toBeNull();
  });

  it("o que não vira aviso não entra na memória", () => {
    const jaAvisados = new Set<string>();
    expect(avisoDoNegocioUmaVez({ ...ganho(), eu: B }, jaAvisados)).toBeNull();
    expect(jaAvisados.size).toBe(0);
    expect(avisoDoNegocioUmaVez(ganho(), jaAvisados)).not.toBeNull();
  });
});
