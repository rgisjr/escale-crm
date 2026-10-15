import { describe, expect, it } from "vitest";

import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem, opcoesDeOrdem, posicaoNoFimDaEtapa, rotulosDaDirecao } from "@/lib/escale/filtros/ordenar";
import type { CriterioDeOrdem } from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";
import { AGORA, horasAtras, negocio } from "@/tests/helpers/negocio-do-quadro";

const CAMPOS = camposFiltraveis([
  {
    fields: [
      { key: "renda", label: "Renda", type: "currency" },
      { key: "interesses", label: "Interesses", type: "multiselect" },
      { key: "cidade", label: "Cidade", type: "text" },
    ],
  },
]);
const ordenar = (leads: Lead[], ordem: CriterioDeOrdem[]) => [...leads].sort(comparadorDaOrdem(ordem, CAMPOS, AGORA)!).map((l) => l.id);

describe("opções de ordenação", () => {
  it("as fixas da Clint e os campos do negócio que dá para ordenar (várias opções não dá)", () => {
    const opcoes = opcoesDeOrdem(CAMPOS);
    expect(opcoes[0]).toEqual({ campo: "contato.nome", rotulo: "Nome do contato", grupo: "contato", tipo: "texto" });
    expect(opcoes.filter((o) => o.grupo === "campos").map((o) => [o.campo, o.tipo])).toEqual([
      ["campo:renda", "numero"],
      ["campo:cidade", "texto"],
    ]);
  });

  it("a direção fala a língua do tipo", () => {
    expect(rotulosDaDirecao("texto")).toEqual({ asc: "Alfabético de A a Z", desc: "Alfabético de Z a A" });
    expect(rotulosDaDirecao("tempo")).toEqual({ asc: "Menor tempo na etapa", desc: "Maior tempo na etapa" });
    expect(rotulosDaDirecao("numero")).toEqual({ asc: "Crescente", desc: "Decrescente" });
  });
});

describe("comparadorDaOrdem", () => {
  it("sem critério não há comparador: vale a ordem manual", () => {
    expect(comparadorDaOrdem(undefined)).toBeUndefined();
    expect(comparadorDaOrdem([])).toBeUndefined();
  });

  it("valor nas duas direções: vazio sempre no fim, e o empate cai na posição manual", () => {
    const leads = [
      negocio("a", { value_cents: 100, position_in_stage: 1000 }),
      negocio("b", { value_cents: null, position_in_stage: 500 }),
      negocio("c", { value_cents: 300, position_in_stage: 2000 }),
      negocio("d", { value_cents: 100, position_in_stage: 500 }),
    ];
    expect(ordenar(leads, [{ campo: "negocio.valor", direcao: "desc" }])).toEqual(["c", "d", "a", "b"]);
    expect(ordenar(leads, [{ campo: "negocio.valor", direcao: "asc" }])).toEqual(["d", "a", "c", "b"]);
  });

  it("nome do contato de A a Z, respeitando acento e caixa", () => {
    const leads = [
      negocio("bruno", {}, { contato_nome: "Bruno" }),
      negocio("agata", {}, { contato_nome: "Ágata" }),
      negocio("carla", {}, { contato_nome: "carla" }),
    ];
    expect(ordenar(leads, [{ campo: "contato.nome", direcao: "asc" }])).toEqual(["agata", "bruno", "carla"]);
  });

  it("o segundo critério desempata o primeiro", () => {
    const leads = [
      negocio("b", { value_cents: 100, title: "Beta" }),
      negocio("a", { value_cents: 100, title: "Alfa" }),
      negocio("z", { value_cents: 50, title: "Zeta" }),
    ];
    expect(
      ordenar(leads, [
        { campo: "negocio.valor", direcao: "desc" },
        { campo: "negocio.titulo", direcao: "asc" },
      ]),
    ).toEqual(["a", "b", "z"]);
  });

  it("maior tempo na etapa primeiro; sem a data da etapa, conta da criação", () => {
    const leads = [
      negocio("10h", { stage_changed_at: horasAtras(10) }),
      negocio("50h", { stage_changed_at: horasAtras(50) }),
      negocio("criado-20h", { stage_changed_at: null, created_at: horasAtras(20) }),
    ];
    expect(ordenar(leads, [{ campo: "negocio.tempo_na_etapa", direcao: "desc" }])).toEqual(["50h", "criado-20h", "10h"]);
  });

  it("campo personalizado de moeda gravado como texto ordena como número", () => {
    const leads = [
      negocio("mil-e-quinhentos", { custom_fields: { renda: "1.500,00" } }),
      negocio("duzentos", { custom_fields: { renda: "200" } }),
      negocio("novecentos", { custom_fields: { renda: 900 } }),
    ];
    expect(ordenar(leads, [{ campo: "campo:renda", direcao: "asc" }])).toEqual(["duzentos", "novecentos", "mil-e-quinhentos"]);
  });

  it("atividades concluídas e mensagens não lidas", () => {
    const leads = [
      negocio("uma", { conversa: { id: "v1", preview: null, last_message_at: null, unread: 5 } }, { atividades_concluidas: 1 }),
      negocio("tres", { conversa: { id: "v2", preview: null, last_message_at: null, unread: 0 } }, { atividades_concluidas: 3 }),
    ];
    expect(ordenar(leads, [{ campo: "atividades.concluidas", direcao: "desc" }])).toEqual(["tres", "uma"]);
    expect(ordenar(leads, [{ campo: "atendimento.nao_lidas", direcao: "desc" }])).toEqual(["uma", "tres"]);
  });
});

describe("posicaoNoFimDaEtapa", () => {
  const leads = [
    negocio("x", { stage_id: "s1", position_in_stage: 3000 }),
    negocio("y", { stage_id: "s1", position_in_stage: 1000 }),
    negocio("z", { stage_id: "s2", position_in_stage: 9000 }),
  ];

  it("depois do último card da etapa inteira", () => {
    expect(posicaoNoFimDaEtapa(leads, "s1", "novo")).toBe(4000);
  });

  it("sem contar o próprio card que está sendo movido", () => {
    expect(posicaoNoFimDaEtapa(leads, "s1", "x")).toBe(2000);
  });

  it("etapa vazia: a primeira posição", () => {
    expect(posicaoNoFimDaEtapa(leads, "s3", "x")).toBe(1000);
  });
});
