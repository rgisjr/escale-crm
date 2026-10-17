import { describe, expect, it } from "vitest";

import {
  FIXADOS_MAX,
  RECENTES_GUARDADOS,
  chaveDosRecentes,
  comRecente,
  desafixar,
  fixar,
  lerRecentes,
  linkDoRecente,
  recenteDoLead,
  type NegocioRecente,
  type Recentes,
} from "@/lib/escale/recentes/regras";
import type { Lead } from "@/lib/types/leads";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

const id = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const ORIGEM = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const r = (n: number): NegocioRecente => ({
  id: id(n),
  titulo: `Negócio ${n}`,
  origemId: ORIGEM,
  origem: "Vendas",
  telefone: null,
  foto: null,
});
const VAZIO: Recentes = { fixados: [], recentes: [] };

describe("os Recentes (Clint superior: LAST_LEADS e PIN_LEAD)", () => {
  it("o aberto vai para o topo, sem repetir, e a lista guarda 20", () => {
    const cheio = Array.from({ length: RECENTES_GUARDADOS }, (_, i) => r(i + 1)).reduce(
      comRecente,
      VAZIO,
    );
    expect(cheio.recentes).toHaveLength(20);
    expect(cheio.recentes[0]?.titulo).toBe("Negócio 20");
    const deNovo = comRecente(cheio, r(3));
    expect(deNovo.recentes[0]?.titulo).toBe("Negócio 3");
    expect(deNovo.recentes.filter((x) => x.id === id(3))).toHaveLength(1);
  });

  it("fixar tira dos recentes e põe nos fixados; abrir um fixado atualiza o dado sem duplicar", () => {
    const com2 = [r(1), r(2)].reduce(comRecente, VAZIO);
    const fixo = fixar(com2, id(1));
    expect(fixo).not.toBe("limite");
    const estado = fixo as Recentes;
    expect(estado.fixados.map((x) => x.id)).toEqual([id(1)]);
    expect(estado.recentes.map((x) => x.id)).toEqual([id(2)]);
    const renomeado = comRecente(estado, { ...r(1), titulo: "Novo nome" });
    expect(renomeado.fixados[0]?.titulo).toBe("Novo nome");
    expect(renomeado.recentes.map((x) => x.id)).toEqual([id(2)]);
    expect(desafixar(renomeado, id(1)).recentes.map((x) => x.id)).toEqual([id(1), id(2)]);
  });

  it("o sexto fixado não entra", () => {
    let estado = Array.from({ length: 6 }, (_, i) => r(i + 1)).reduce(comRecente, VAZIO);
    for (let n = 1; n <= FIXADOS_MAX; n += 1) estado = fixar(estado, id(n)) as Recentes;
    expect(fixar(estado, id(6))).toBe("limite");
  });

  it("o que vem do navegador é conferido; a chave é por organização e pessoa; o link abre no quadro da origem", () => {
    expect(lerRecentes(null)).toEqual(VAZIO);
    expect(lerRecentes("{quebrado")).toEqual(VAZIO);
    const bruto = JSON.stringify({
      fixados: [r(1), { ...r(2), id: "lixo" }],
      recentes: [r(3), { id: id(4) }],
    });
    const lido = lerRecentes(bruto);
    expect(lido.fixados.map((x) => x.id)).toEqual([id(1)]);
    expect(lido.recentes.map((x) => x.id)).toEqual([id(3)]);
    expect(chaveDosRecentes("org-1", "u-1")).toBe("escale:negocios-recentes:v2:org-1:u-1");
    expect(linkDoRecente(r(1))).toBe(`/app/pipelines/${ORIGEM}?lead=${id(1)}`);
  });

  it("a foto só vale como /api/v1/contacts/<uuid>/avatar: o navegador não escolhe o que a página carrega", () => {
    const AVATAR = `/api/v1/contacts/${id(9)}/avatar`;
    const fotos = [
      AVATAR,
      "https://cdn.exemplo.com/a.jpg",
      "http://inseguro.exemplo.com/a.jpg",
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "//outro-dominio.com/a.jpg",
      "/\\outro-dominio.com/a.jpg",
      "/\t/evil.com/a.jpg",
      "/\n/evil.com/a.jpg",
      "/\r/evil.com/a.jpg",
      "/api/v1/contacts/c-1/avatar",
      `${AVATAR}\n`,
      `${AVATAR}?x=//evil.com`,
      `/api/v1/contacts/${id(9)}/avatar/../../../evil`,
      "/outro/caminho.jpg",
    ];
    const lido = lerRecentes(
      JSON.stringify({
        fixados: [],
        recentes: fotos.map((foto, i) => ({ ...r(i + 1), foto })),
      }),
    );
    expect(lido.recentes.map((x) => x.foto)).toEqual([AVATAR, ...fotos.slice(1).map(() => null)]);
  });

  it("o telefone lido do navegador ou do negócio perde os espaços das pontas; em branco vira null", () => {
    const lido = lerRecentes(
      JSON.stringify({
        fixados: [],
        recentes: [
          { ...r(1), telefone: "  +5511999990000 " },
          { ...r(2), telefone: "   " },
          { ...r(3), telefone: "" },
        ],
      }),
    );
    expect(lido.recentes.map((x) => x.telefone)).toEqual(["+5511999990000", null, null]);
    const lead = negocio("x", { pipeline_id: ORIGEM, contact_phone: "   " } as Partial<Lead>);
    expect(recenteDoLead(lead, "Vendas").telefone).toBeNull();
    const comEspaco = negocio("y", {
      pipeline_id: ORIGEM,
      contact_phone: " +5511999990000\n",
    } as Partial<Lead>);
    expect(recenteDoLead(comEspaco, "Vendas").telefone).toBe("+5511999990000");
  });

  it("o mesmo id duas vezes na mesma lista entra uma vez só (a primeira)", () => {
    const lido = lerRecentes(
      JSON.stringify({
        fixados: [r(1), { ...r(1), titulo: "Repetido" }],
        recentes: [r(2), { ...r(2), titulo: "Repetido" }, r(3)],
      }),
    );
    expect(lido.fixados.map((x) => x.titulo)).toEqual(["Negócio 1"]);
    expect(lido.recentes.map((x) => x.id)).toEqual([id(2), id(3)]);
    expect(lido.recentes[0]?.titulo).toBe("Negócio 2");
  });

  it("recenteDoLead guarda o título, a origem, o telefone e a foto do contato", () => {
    const lead = negocio(
      "x",
      {
        title: "Proposta ACME",
        pipeline_id: ORIGEM,
        contact_id: "c-1",
        contact_phone: "+5511999990000",
      } as Partial<Lead>,
      { contato_tem_foto: true },
    );
    expect(recenteDoLead(lead, "Vendas")).toEqual({
      id: "x",
      titulo: "Proposta ACME",
      origemId: ORIGEM,
      origem: "Vendas",
      telefone: "+5511999990000",
      foto: "/api/v1/contacts/c-1/avatar",
    });
  });

  it("um recente que também está nos fixados some dos recentes", () => {
    const lido = lerRecentes(JSON.stringify({ fixados: [r(1)], recentes: [r(1), r(2)] }));
    expect(lido.recentes.map((x) => x.id)).toEqual([id(2)]);
  });
});
