import { describe, expect, it } from "vitest";

import { CATALOGO, assuntoDe, medidaPorId } from "@/lib/escale/indicadores/catalogo";
import type { CampoDinamico } from "@/lib/escale/indicadores/catalogo/campos-personalizados";
import { predicadoDoFiltro } from "@/lib/escale/indicadores/catalogo/construtores";
import { hojeNoFuso, periodoAnterior } from "@/lib/escale/indicadores/motor/periodo";
import { detalhamentoSchema, perguntaSchema, validarDetalhamento, validarPergunta } from "@/lib/escale/indicadores/pergunta";

describe("catálogo: detalhamento (fase 7E)", () => {
  it("o detalheSql de cada medida é o predicado do seu filter (where …)", () => {
    for (const a of CATALOGO) {
      for (const m of a.medidas) {
        if (m.semDetalhe) continue;
        expect(m.detalheSql ?? null, m.id).toBe(predicadoDoFiltro(m.sql));
      }
    }
  });

  it("percentuais e médias de intervalo não têm detalhamento; o ciclo de venda tem", () => {
    for (const a of CATALOGO) {
      for (const m of a.medidas.filter((x) => x.unidade === "percentual")) expect(m.semDetalhe, m.id).toBe(true);
    }
    const ciclo = medidaPorId("negocio.ciclo_de_venda")?.medida;
    expect(ciclo?.semDetalhe).toBeUndefined();
    expect(ciclo?.detalheSql).toBe("b.status = 'won'");
    expect(medidaPorId("negocio.taxa_de_conversao")?.medida.semDetalhe).toBe(true);
    expect(medidaPorId("negocio.ganhos")?.medida.detalheSql).toBe("b.status = 'won'");
    expect(medidaPorId("negocio.quantidade")?.medida.detalheSql).toBeUndefined();
  });

  it("o detalheSql só usa aliases declarados", () => {
    for (const a of CATALOGO) {
      const validos = new Set([a.base.alias, ...Object.keys(a.joins)]);
      for (const m of a.medidas) {
        for (const achado of (m.detalheSql ?? "").matchAll(/\b([a-z]{1,3})\.[a-z_]+/g)) {
          expect(validos.has(achado[1] as string), `${m.id}: alias ${achado[1]}`).toBe(true);
        }
      }
    }
  });

  it("o negócio tem a coluna Valor com formato valor", () => {
    const valor = assuntoDe("negocio.ganhos")?.colunasDoDetalhamento.find((c) => c.chave === "valor");
    expect(valor?.formato).toBe("valor");
  });

  it("predicadoDoFiltro lê parênteses aninhados e recusa dois filtros", () => {
    expect(predicadoDoFiltro("count(*) filter (where b.status in ('won','lost') and coalesce(b.x, 0) > 0)")).toBe(
      "b.status in ('won','lost') and coalesce(b.x, 0) > 0",
    );
    expect(predicadoDoFiltro("count(*) filter (where a) / count(*) filter (where b)")).toBeNull();
    expect(predicadoDoFiltro("count(*)")).toBeNull();
  });
});

describe("periodoAnterior e hojeNoFuso", () => {
  it("equivalente: a janela de mesmo tamanho logo antes", () => {
    expect(periodoAnterior({ de: "2026-10-01", ate: "2026-10-31" }, "equivalente")).toEqual({ de: "2026-08-31", ate: "2026-09-30" });
  });
  it("mes_anterior: as mesmas datas um mês antes, recortadas ao fim do mês", () => {
    expect(periodoAnterior({ de: "2026-10-01", ate: "2026-10-31" }, "mes_anterior")).toEqual({ de: "2026-09-01", ate: "2026-09-30" });
    expect(periodoAnterior({ de: "2026-03-31", ate: "2026-03-31" }, "mes_anterior")).toEqual({ de: "2026-02-28", ate: "2026-02-28" });
  });
  it("ano_anterior: um ano antes (29/02 vira 28/02)", () => {
    expect(periodoAnterior({ de: "2028-02-29", ate: "2028-02-29" }, "ano_anterior")).toEqual({ de: "2027-02-28", ate: "2027-02-28" });
  });
  it("hojeNoFuso respeita o fuso da organização", () => {
    expect(hojeNoFuso(new Date("2026-10-27T02:30:00Z"), "America/Sao_Paulo")).toBe("2026-10-26");
  });
});

const base = {
  indicadores: ["negocio.ganhos", "negocio.soma_de_valores"],
  variaveis: [] as string[],
  tempo: { campo: "negocio.criado_em", granularidade: "mes", periodo: { atalho: "este_mes" } },
};
const ticket = { id: "calc:ticket", nome: "Ticket", a: "negocio.soma_de_valores", op: "divisao", b: "negocio.ganhos", formato: "moeda" };
const ler = (o: unknown) => perguntaSchema.safeParse(o);
const validar = (o: unknown) => validarPergunta(perguntaSchema.parse(o));

describe("pergunta com recursos da 7E", () => {
  it("aceita um calculado e o filtro quantitativo sobre ele", () => {
    const o = { ...base, calculados: [ticket], filtroQuantitativo: [{ indicador: "calc:ticket", op: "maior_que", valor: 10 }] };
    expect(ler(o).success).toBe(true);
    expect(validar(o).ok).toBe(true);
  });

  it("recusa percentual com soma, 4 calculados e operando de outro assunto", () => {
    expect(ler({ ...base, calculados: [{ ...ticket, op: "soma", formato: "percentual" }] }).success).toBe(false);
    expect(ler({ ...base, calculados: Array(4).fill(ticket) }).success).toBe(false);
    expect(validar({ ...base, calculados: [{ ...ticket, a: "conversa.quantidade" }] }).ok).toBe(false);
  });

  it("limita indicadores + calculados a 5", () => {
    const tres = ["negocio.ganhos", "negocio.perdidos", "negocio.abertos"];
    const tres_calc = [ticket, { ...ticket, id: "calc:b" }, { ...ticket, id: "calc:c" }];
    expect(validar({ ...base, indicadores: tres, calculados: tres_calc }).ok).toBe(false);
    expect(validar({ ...base, indicadores: tres, calculados: tres_calc.slice(0, 2) }).ok).toBe(true);
  });

  it("filtro quantitativo: recusa operador de texto e indicador fora da pergunta", () => {
    expect(ler({ ...base, filtroQuantitativo: [{ indicador: "negocio.ganhos", op: "contem", valor: 1 }] }).success).toBe(false);
    expect(validar({ ...base, filtroQuantitativo: [{ indicador: "calc:nao_existe", op: "maior_que", valor: 1 }] }).ok).toBe(false);
  });

  it("comparação exige tempo e período diferente de tudo", () => {
    expect(validar({ ...base, tempo: undefined, comparacao: { modo: "equivalente" } }).ok).toBe(false);
    expect(validar({ ...base, tempo: { ...base.tempo, periodo: { atalho: "tudo" } }, comparacao: { modo: "equivalente" } }).ok).toBe(false);
    expect(validar({ ...base, comparacao: { modo: "mes_anterior" } }).ok).toBe(true);
  });

  it("matriz de tempo: só com tempo sem variável, granularidade nem comparação", () => {
    const sem = { ...base, tempo: { campo: "negocio.criado_em", periodo: { atalho: "este_mes" } } };
    expect(validar({ ...sem, matrizDeTempo: true }).ok).toBe(true);
    expect(validar({ ...sem, variaveis: ["negocio.origem"], matrizDeTempo: true }).ok).toBe(false);
    expect(validar({ ...base, matrizDeTempo: true }).ok).toBe(false);
  });
});

describe("detalhamento", () => {
  const pedido = {
    pergunta: { indicadores: ["negocio.ganhos"], variaveis: ["negocio.origem"] },
    indicador: "negocio.ganhos",
    ponto: { variaveis: [{ id: "negocio.origem", valor: "abc" }] },
  };
  const campos = new Map<string, CampoDinamico>([
    ["campo:negocio:plano", { id: "campo:negocio:plano", nome: "Plano", objeto: "negocio", chave: "plano", tipo: "texto" }],
  ]);
  const validar2 = (o: unknown) => validarDetalhamento(detalhamentoSchema.parse(o), campos);

  it("aceita o pedido e usa 10 por página por padrão", () => {
    const r = detalhamentoSchema.safeParse(pedido);
    expect(r.success).toBe(true);
    if (r.success) expect([r.data.pagina, r.data.porPagina]).toEqual([1, 10]);
  });

  it("recusa a página 201 de 50 e a página 0", () => {
    expect(detalhamentoSchema.safeParse({ ...pedido, pagina: 201, porPagina: 50 }).success).toBe(false);
    expect(detalhamentoSchema.safeParse({ ...pedido, pagina: 0 }).success).toBe(false);
    expect(detalhamentoSchema.safeParse({ ...pedido, pagina: 200, porPagina: 50 }).success).toBe(true);
  });

  it("recusa ordem fora do catálogo e aceita campo personalizado existente", () => {
    expect(validar2({ ...pedido, ordem: { coluna: "b.id; drop", direcao: "asc" } }).ok).toBe(false);
    expect(validar2({ ...pedido, colunas: ["campo:negocio:plano"] }).ok).toBe(true);
    expect(validar2({ ...pedido, colunas: ["campo:negocio:outro"] }).ok).toBe(false);
  });

  it("recusa indicador sem detalhamento com o aviso próprio", () => {
    const r = validar2({
      pergunta: { indicadores: ["negocio.taxa_de_conversao"] },
      indicador: "negocio.taxa_de_conversao",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.semDetalhe).toBe(true);
  });

  it("o ponto só usa variáveis da pergunta", () => {
    expect(validar2({ ...pedido, ponto: { variaveis: [{ id: "negocio.etapa", valor: "x" }] } }).ok).toBe(false);
  });
});
