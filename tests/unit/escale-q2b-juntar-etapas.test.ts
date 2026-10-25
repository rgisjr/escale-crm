import { describe, expect, it } from "vitest";

import { juntarEtapasPorLead } from "@/lib/escale/quadro/juntar-etapas";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

describe("juntarEtapasPorLead (Q2b, G2-3)", () => {
  it("soma o campo que cada etapa acrescentou, casando pelo id e não pela posição", () => {
    const base = [negocio("a"), negocio("b")];
    const comScore = [{ ...base[1]!, tarefas: { abertas: 1 } }, base[0]!] as never[];
    const comDono = [{ ...base[0]!, owner_agent: { id: "ag" } }, base[1]!] as never[];
    const r = juntarEtapasPorLead(base, [comScore, comDono]);
    expect(r.map((l) => l.id)).toEqual(["a", "b"]);
    expect(r[0]).toMatchObject({ owner_agent: { id: "ag" } });
    expect(r[0]).not.toHaveProperty("tarefas");
    expect(r[1]).toMatchObject({ tarefas: { abertas: 1 } });
  });

  it("etapa que devolve o negócio intacto não apaga o campo de outra", () => {
    const base = [negocio("a")];
    const acrescentou = [{ ...base[0]!, conversa: null }] as never[];
    expect(juntarEtapasPorLead(base, [acrescentou, base])[0]).toHaveProperty("conversa", null);
    expect(juntarEtapasPorLead(base, [base, acrescentou])[0]).toHaveProperty("conversa", null);
  });

  it("sem nada a somar devolve o próprio negócio, sem copiar", () => {
    const base = [negocio("a")];
    expect(juntarEtapasPorLead(base, [base])[0]).toBe(base[0]);
  });
});
