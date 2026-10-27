import { describe, expect, it } from "vitest";

import { dataBr, filtrarLinhas, montarLinhas, paginar } from "@/lib/escale/tags/tela";

const linha = (tag: string, extra: Record<string, unknown> = {}) => ({
  tag, uso_em_contatos: 1, uso_em_leads: 0, uso_em_conversas: 0, em_regras: 0,
  cor: null, descricao: null, no_vocabulario: true, ...extra,
});
const settings = {
  tags: [
    "velha",
    { tag: "nova", cor: "#e91e63", criada_em: "2026-10-24T10:00:00Z", criada_por: "u1" },
    { tag: "meio", criada_em: "2026-10-10T10:00:00Z", criada_por: "u2" },
  ],
};

describe("tela de Tags", () => {
  it("junta o vocabulário com quem criou e quando, mais nova primeiro", () => {
    const l = montarLinhas([linha("velha"), linha("meio"), linha("nova", { uso_em_contatos: 3 })], settings);
    expect(l.map((x) => x.tag)).toEqual(["nova", "meio", "velha"]);
    expect(l[0]).toMatchObject({ emUso: 3, criadaPor: "u1", criadaEm: "2026-10-24T10:00:00Z" });
    expect(l[2]).toMatchObject({ criadaEm: null, criadaPor: null });
  });

  it("busca sem acento e sem caixa; filtra por período e por quem criou", () => {
    const l = montarLinhas([linha("velha"), linha("meio"), linha("nova")], settings);
    const agora = new Date("2026-10-27T12:00:00Z");
    expect(filtrarLinhas(l, { busca: "NOV", periodo: "todos", criadaPor: "" }, agora).map((x) => x.tag)).toEqual(["nova"]);
    expect(filtrarLinhas(l, { busca: "", periodo: "7", criadaPor: "" }, agora).map((x) => x.tag)).toEqual(["nova"]);
    expect(filtrarLinhas(l, { busca: "", periodo: "todos", criadaPor: "u2" }, agora).map((x) => x.tag)).toEqual(["meio"]);
  });

  it("pagina e formata a data no padrão brasileiro", () => {
    expect(paginar([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(dataBr("2026-10-24T10:00:00Z", "pt-BR")).toBe("24/10/2026");
    expect(dataBr(null, "pt-BR")).toBe("—");
  });
});
