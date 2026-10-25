import { describe, expect, it } from "vitest";

import { dayStartInTz } from "@/lib/agent-engine/pacing/engine";

import { estadoDeEnvio } from "./rodada";

/**
 * O teto diário da campanha conta no fuso DO CLIENTE, nunca em UTC.
 *
 * `lib/campanhas/rodada.ts` usava `setUTCHours(0,0,0,0)` para achar o início
 * do dia em `estadoDeEnvio`, enquanto todo o resto do ritmo (janela, hora
 * local) já contava no fuso do número principal. Com `America/Sao_Paulo`
 * (UTC-3), o dia UTC começa às **21h locais** — DENTRO da janela de envio de
 * 7h-22h. Uma campanha com `teto_diario` já batido voltava a enviar às 21h,
 * com uma hora de janela pela frente: na cadência de 1/min, até 60 mensagens
 * além do que o operador configurou.
 *
 * Achado por @melgarafael na triagem do PR #1392.
 */
describe("teto diário conta no fuso do cliente", () => {
  const FUSO = "America/Sao_Paulo";

  it("21h30 em São Paulo ainda é o MESMO dia — UTC já virou", () => {
    // 2026-09-19T00:30:00Z = 21h30 de 18/09 em São Paulo.
    const vinteUmaETrinta = new Date("2026-09-19T00:30:00.000Z");

    const certo = dayStartInTz(vinteUmaETrinta, FUSO);
    const errado = new Date(vinteUmaETrinta);
    errado.setUTCHours(0, 0, 0, 0);

    // O jeito errado corta o dia às 21h locais e "zera" o teto cedo demais.
    expect(errado.toISOString()).toBe("2026-09-19T00:00:00.000Z");
    // O certo ainda aponta para a meia-noite LOCAL do dia 18.
    expect(certo.toISOString()).toBe("2026-09-18T03:00:00.000Z");
    expect(certo.getTime()).toBeLessThan(errado.getTime());
  });

  it("um envio das 10h da manhã continua contando às 21h30 do mesmo dia", () => {
    const dezDaManha = new Date("2026-09-18T13:00:00.000Z"); // 10h em SP
    const vinteUmaETrinta = new Date("2026-09-19T00:30:00.000Z"); // 21h30 em SP

    const inicioCerto = dayStartInTz(vinteUmaETrinta, FUSO);
    const inicioErrado = new Date(vinteUmaETrinta);
    inicioErrado.setUTCHours(0, 0, 0, 0);

    // Com o fuso certo, o envio das 10h está DENTRO do dia — o teto segura.
    expect(dezDaManha.getTime()).toBeGreaterThanOrEqual(inicioCerto.getTime());
    // Com UTC, ele cai fora — `enviadasHoje` volta a zero e a campanha dispara.
    expect(dezDaManha.getTime()).toBeLessThan(inicioErrado.getTime());
  });

  it("fuso negativo distante (America/Los_Angeles) tem o mesmo risco", () => {
    const vinteUmaETrinta = new Date("2026-09-19T04:30:00.000Z"); // 21h30 em LA
    const certo = dayStartInTz(vinteUmaETrinta, "America/Los_Angeles");
    const errado = new Date(vinteUmaETrinta);
    errado.setUTCHours(0, 0, 0, 0);
    expect(certo.getTime()).toBeLessThan(errado.getTime());
  });
});

/**
 * Os casos acima comparam as duas contas; estes passam pela função que a
 * rodada chama. Sem eles, voltar `setUTCHours` para `estadoDeEnvio` deixava o
 * arquivo verde (medido na triagem: com a linha sabotada, os três casos acima
 * seguiam passando).
 */
describe("estadoDeEnvio conta o dia no fuso que recebe", () => {
  /**
   * Supabase falso com o limite de 1.000 linhas do PostgREST: o `select` de
   * linhas corta em 1.000; a contagem (`head: true`) devolve o total real.
   */
  function adminComEnvios(enviosEm: string[]) {
    return {
      from: () => {
        let corte = "";
        let contagem = false;
        const consulta: Record<string, unknown> = {
          select: (_c: string, op?: { head?: boolean }) => ((contagem = !!op?.head), consulta),
          eq: () => consulta,
          not: () => consulta,
          gte: (_coluna: string, valor: string) => ((corte = valor), consulta),
          order: () => consulta,
          limit: () => consulta,
          then: (ok: (v: unknown) => unknown) => {
            const dentro = enviosEm.filter((s) => s >= corte).sort().reverse();
            return Promise.resolve(
              contagem
                ? { count: dentro.length, error: null }
                : { data: dentro.slice(0, 1).map((sent_at) => ({ sent_at })), error: null },
            ).then(ok);
          },
        };
        return consulta;
      },
    } as never;
  }

  const DEZ_DA_MANHA_EM_SP = "2026-09-18T13:00:00.000Z";

  it("às 21h30 em São Paulo, o envio das 10h ainda conta no teto de hoje", async () => {
    const estado = await estadoDeEnvio(
      adminComEnvios([DEZ_DA_MANHA_EM_SP]),
      "c1",
      new Date("2026-09-19T00:30:00.000Z"),
      "America/Sao_Paulo",
    );
    expect(estado.enviadasHoje).toBe(1);
  });

  it("no dia local seguinte o teto zera — a campanha não fica presa", async () => {
    const estado = await estadoDeEnvio(
      adminComEnvios([DEZ_DA_MANHA_EM_SP]),
      "c1",
      new Date("2026-09-19T13:00:00.000Z"), // 10h de 19/09 em SP
      "America/Sao_Paulo",
    );
    expect(estado.enviadasHoje).toBe(0);
  });

  it("acima de 1.000 envios no dia o teto ainda enxerga todos (G8-2)", async () => {
    const agora = new Date("2026-09-18T20:00:00.000Z"); // 17h em SP
    const muitos = Array.from({ length: 1500 }, (_, i) =>
      new Date(Date.parse("2026-09-18T10:00:00.000Z") + i * 1000).toISOString(),
    );
    const estado = await estadoDeEnvio(adminComEnvios(muitos), "c1", agora, "America/Sao_Paulo");
    expect(estado.enviadasHoje).toBe(1500);
    expect(estado.enviadasNaUltimaHora).toBe(0);
    expect(estado.ultimoEnvio?.toISOString()).toBe(muitos[1499]);
  });
});
