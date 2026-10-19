import { describe, expect, it } from "vitest";

import { dataNoPassado, decidirEnvio, novaAgendadaSchema } from "@/lib/escale/conversas/agendadas";
import {
  camposParaEntrarEmEspera,
  camposParaSairDaEspera,
  emEsperaDaCasca,
  ESPERA_SEM_FIM,
} from "@/lib/escale/conversas/espera";
import {
  eventosDasAtribuicoes,
  juntarItens,
  rotuloDoDia,
  textoDoEvento,
} from "@/lib/escale/conversas/eventos";
import { modoDoCompositor, seloDaJanela } from "@/lib/escale/conversas/janela";
import { fimDoPrazo, pausaVigente, seloDaPausa, textoDoFim } from "@/lib/escale/conversas/pausa";

const t = (s: string) => s;
const AGORA = new Date("2026-10-18T19:56:00-03:00");
const nomes = new Map([
  ["u1", "Camilly Victória"],
  ["u2", "Bathuly Bueno"],
]);

describe("os eventos da thread (C2, C4)", () => {
  it("espera, encerrar e reabrir com a pessoa em negrito e a hora", () => {
    const e = textoDoEvento(
      { id: "e1", tipo: "espera", em: "2026-10-18T20:46:00Z", user_id: "u2" },
      nomes,
      t,
    );
    expect(e.partes).toEqual([
      { texto: "Bathuly Bueno", forte: true },
      { texto: " colocou o atendimento em espera" },
    ]);
    expect(e.hora).toBe("17:46");
    expect(
      textoDoEvento(
        { id: "e2", tipo: "encerrado", em: "2026-10-18T20:48:00Z", user_id: "u2" },
        nomes,
        t,
      ).partes[1],
    ).toEqual({ texto: " encerrou o atendimento" });
    expect(
      textoDoEvento(
        { id: "e3", tipo: "espera_removida", em: "2026-10-18T20:49:00Z", user_id: null },
        nomes,
        t,
      ).partes,
    ).toEqual([{ texto: "O contato respondeu e a espera foi removida" }]);
  });

  it("as atribuições do original viram 'O atendimento foi alterado de X para Y' e 'iniciou o atendimento'", () => {
    const eventos = eventosDasAtribuicoes([
      {
        id: "a1",
        from_user_id: null,
        to_user_id: "u1",
        changed_by: "u1",
        reason: "claim",
        created_at: "2026-10-18T22:31:00Z",
      },
      {
        id: "a2",
        from_user_id: "u1",
        to_user_id: "u2",
        changed_by: "u1",
        reason: "transfer",
        created_at: "2026-10-18T22:40:00Z",
      },
    ]);
    expect(textoDoEvento(eventos[0]!, nomes, t).partes).toEqual([
      { texto: "Camilly Victória", forte: true },
      { texto: " iniciou o atendimento" },
    ]);
    expect(textoDoEvento(eventos[1]!, nomes, t).partes).toEqual([
      { texto: "O atendimento foi alterado de " },
      { texto: "Camilly Victória", forte: true },
      { texto: " para " },
      { texto: "Bathuly Bueno", forte: true },
    ]);
    expect(textoDoEvento({ ...eventos[1]!, de_user_id: null }, nomes, t).partes[1]).toEqual({
      texto: "Sem atendente",
      forte: true,
    });
  });

  it("junta mensagens, notas, passagens e eventos por hora; o dia vira HOJE/ONTEM/data", () => {
    const itens = juntarItens(
      [{ id: "m1", sent_at: "2026-10-18T10:00:00Z" } as never],
      [{ id: "n1", created_at: "2026-10-18T11:00:00Z" } as never],
      [],
      [{ id: "e1", tipo: "espera", em: "2026-10-18T10:30:00Z", user_id: "u1" }],
    );
    expect(itens.map((i) => i.kind)).toEqual(["message", "evento", "note"]);
    expect(rotuloDoDia(new Date("2026-10-18T10:00:00-03:00"), AGORA, t)).toBe("Hoje");
    expect(rotuloDoDia(new Date("2026-10-17T10:00:00-03:00"), AGORA, t)).toBe("Ontem");
    expect(rotuloDoDia(new Date("2026-08-26T10:00:00-03:00"), AGORA, t)).toBe("26/08/2026");
  });
});

describe("em espera sem lembrete (decisão 2)", () => {
  it("entra com o snooze sem fim e a marca; sai limpando os dois", () => {
    const entrar = camposParaEntrarEmEspera("u1", AGORA, { foo: 1 });
    expect(entrar.snooze_until).toBe(ESPERA_SEM_FIM);
    expect(entrar.snoozed_by_user_id).toBe("u1");
    expect(entrar.metadata).toEqual({ foo: 1, escale_em_espera: true });
    expect(
      emEsperaDaCasca(
        { snooze_until: ESPERA_SEM_FIM, metadata: { escale_em_espera: true } },
        AGORA,
      ),
    ).toBe(true);
    expect(emEsperaDaCasca({ snooze_until: "2026-10-19T00:00:00Z", metadata: {} }, AGORA)).toBe(
      false,
    );
    expect(camposParaSairDaEspera({ escale_em_espera: true, foo: 1 }).metadata).toEqual({ foo: 1 });
  });
});

describe("a janela e o modo do compositor (C2, C11, C16)", () => {
  it("aberta mostra hh:mm no WhatsApp e Nd Nh Nm no Instagram; fechada, 'Janela encerrada' ou 'Aguardando abrir janela'", () => {
    expect(
      seloDaJanela(
        { tipo: "aberta", restanteMs: 23 * 3600_000 + 36 * 60_000 },
        "meta_cloud",
        false,
        t,
      ),
    ).toEqual({ texto: "23:36", tom: "aberta" });
    expect(
      seloDaJanela(
        { tipo: "aberta", restanteMs: (6 * 24 + 23) * 3600_000 + 56 * 60_000 },
        "zernio_social",
        false,
        t,
      ),
    ).toEqual({ texto: "6d 23h 56m", tom: "aberta" });
    expect(seloDaJanela({ tipo: "fechada", fechadaHaMs: 1 }, "meta_cloud", false, t)).toEqual({
      texto: "Janela encerrada",
      tom: "fechada",
    });
    expect(seloDaJanela({ tipo: "fechada", fechadaHaMs: 1 }, "meta_cloud", true, t)).toEqual({
      texto: "Aguardando abrir janela",
      tom: "aguardando",
    });
    expect(seloDaJanela({ tipo: "sem_restricao" }, "waha", false, t)).toBeNull();
  });

  it("o modo: livre, só modelo, outro modelo (depois de um template) e aguardando o contato (Instagram)", () => {
    expect(
      modoDoCompositor({
        estado: { tipo: "aberta", restanteMs: 1 },
        provider: "meta_cloud",
        ultimaFoiTemplate: false,
      }),
    ).toBe("livre");
    expect(
      modoDoCompositor({
        estado: { tipo: "fechada", fechadaHaMs: 1 },
        provider: "meta_cloud",
        ultimaFoiTemplate: false,
      }),
    ).toBe("so_modelo");
    expect(
      modoDoCompositor({
        estado: { tipo: "fechada", fechadaHaMs: 1 },
        provider: "meta_cloud",
        ultimaFoiTemplate: true,
      }),
    ).toBe("outro_modelo");
    expect(
      modoDoCompositor({
        estado: { tipo: "fechada", fechadaHaMs: 1 },
        provider: "zernio_social",
        ultimaFoiTemplate: false,
      }),
    ).toBe("aguardando_contato");
    expect(
      modoDoCompositor({
        estado: { tipo: "sem_restricao" },
        provider: "waha",
        ultimaFoiTemplate: false,
      }),
    ).toBe("livre");
  });
});

describe("mensagens agendadas (C9)", () => {
  it("o schema aceita 1 a 5 mensagens, texto ou template, e recusa no passado", () => {
    const base = {
      conversation_id: "11111111-1111-4111-8111-111111111111",
      enviar_em: "2026-10-19T13:00:00.000Z",
    };
    expect(
      novaAgendadaSchema.safeParse({ ...base, mensagens: [{ tipo: "texto", corpo: "Boa tarde" }] })
        .success,
    ).toBe(true);
    expect(
      novaAgendadaSchema.safeParse({
        ...base,
        mensagens: [
          { tipo: "template", template: { name: "boa_tarde", language: "pt_BR", values: {} } },
        ],
      }).success,
    ).toBe(true);
    expect(novaAgendadaSchema.safeParse({ ...base, mensagens: [] }).success).toBe(false);
    expect(
      novaAgendadaSchema.safeParse({
        ...base,
        mensagens: Array(6).fill({ tipo: "texto", corpo: "x" }),
      }).success,
    ).toBe(false);
    expect(dataNoPassado("2026-10-18T22:00:00Z", AGORA)).toBe(true);
    expect(dataNoPassado("2026-10-18T23:30:00Z", AGORA)).toBe(false);
  });

  it("o cron só envia com o dispositivo de pé e, fora da janela, só template", () => {
    const canal = { status: "WORKING", provider: "meta_cloud" };
    expect(
      decidirEnvio({ canal, lastInboundAt: "2026-10-18T22:00:00Z", tipo: "texto", agora: AGORA }),
    ).toEqual({ ok: true });
    expect(
      decidirEnvio({
        canal: { status: "STOPPED", provider: "meta_cloud" },
        lastInboundAt: null,
        tipo: "texto",
        agora: AGORA,
      }),
    ).toMatchObject({ ok: false, motivo: "dispositivo" });
    expect(
      decidirEnvio({ canal, lastInboundAt: "2026-10-10T22:00:00Z", tipo: "texto", agora: AGORA }),
    ).toMatchObject({ ok: false, motivo: "janela" });
    expect(
      decidirEnvio({
        canal,
        lastInboundAt: "2026-10-10T22:00:00Z",
        tipo: "template",
        agora: AGORA,
      }),
    ).toEqual({ ok: true });
    expect(
      decidirEnvio({
        canal: { status: "WORKING", provider: "waha" },
        lastInboundAt: null,
        tipo: "texto",
        agora: AGORA,
      }),
    ).toEqual({ ok: true });
  });
});

describe("pausar automação (D4)", () => {
  it("os prazos somam ao agora; o texto do fim é hoje hh:mm ou 'amanhã hh:mm'; o selo", () => {
    expect(fimDoPrazo("30m", AGORA).toISOString()).toBe("2026-10-18T23:26:00.000Z");
    expect(textoDoFim(fimDoPrazo("30m", AGORA).toISOString(), AGORA, t)).toBe("20:26");
    expect(textoDoFim(fimDoPrazo("1d", AGORA).toISOString(), AGORA, t)).toBe("amanhã 19:56");
    expect(textoDoFim("2026-10-25T13:00:00Z", AGORA, t)).toBe("25/10/2026 10:00");
    expect(seloDaPausa({ ate: null }, AGORA, t)).toBe("Até retomar");
    expect(seloDaPausa({ ate: "2026-10-18T23:26:00Z" }, AGORA, t)).toBe("até 20:26");
    expect(pausaVigente({ ate: "2026-10-18T22:00:00Z" }, AGORA)).toBe(false);
    expect(pausaVigente({ ate: null }, AGORA)).toBe(true);
  });
});
