import { describe, expect, it } from "vitest";

import {
  alvoDaSelecaoDaFila,
  pedidoDaFilaSchema,
  textoDasSelecionadas,
} from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import {
  compilarFiltrosDaFila,
  padraoDaBusca,
} from "@/lib/escale/conversas/compilar-filtros-da-fila";
import {
  PAINEL_DO_PRESET,
  contarNaSecaoDaFila,
  enxugarFiltrosDoPainel,
  filtrosDaFilaSchema,
  limparSecaoDaFila,
  mesmosFiltrosDoPainel,
  painelDaUrl,
  painelDoTexto,
  paramsDoPainel,
  presetDoPainel,
  rotuloDoBotao,
  temCriterios,
  totalDeCriterios,
} from "@/lib/escale/conversas/filtros-da-fila";

const t = (s: string) => s;
const U1 = "b0000000-0000-4000-8000-000000000001";
const U2 = "b0000000-0000-4000-8000-000000000002";
const A1 = "c0000000-0000-4000-8000-000000000001";
const urlDe = (q: string) => new URLSearchParams(q);
const uuidN = (n: number) => `e0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("o painel e os presets (N2)", () => {
  it("cada preset da 3A é um valor do painel", () => {
    expect(PAINEL_DO_PRESET.todos).toEqual({});
    expect(PAINEL_DO_PRESET.nao_lidas).toEqual({ conversas: { marcas: ["nao_lidas"] } });
    expect(PAINEL_DO_PRESET.meus_em_aberto).toEqual({
      conversas: { marcas: ["atribuidas_a_mim"], status: ["em_aberto"] },
    });
    expect(PAINEL_DO_PRESET.em_espera).toEqual({ conversas: { status: ["em_espera"] } });
    expect(PAINEL_DO_PRESET.fechadas).toEqual({ conversas: { status: ["fechado"] } });
  });

  it("o painel igual a um preset mostra o preset; igual a um salvo, o nome; senão, Personalizado", () => {
    expect(presetDoPainel({ conversas: { status: ["em_espera"] } })).toBe("em_espera");
    expect(presetDoPainel({})).toBe("todos");
    expect(presetDoPainel({ grupos: "grupos" })).toBe("somente_grupos");
    const salvos = [
      { id: "s1", nome: "Perdidos", criterios: { negocios: { status: ["lost" as const] } } },
    ];
    expect(rotuloDoBotao({ conversas: { status: ["em_espera"] } }, salvos)).toEqual({
      tipo: "preset",
      preset: "em_espera",
    });
    expect(rotuloDoBotao({ grupos: "conversas" }, salvos)).toEqual({
      tipo: "grupo",
      preset: "somente_conversas",
    });
    expect(rotuloDoBotao({ negocios: { status: ["lost"] } }, salvos)).toEqual({
      tipo: "salvo",
      id: "s1",
      nome: "Perdidos",
    });
    expect(
      rotuloDoBotao({ conversas: { status: ["em_espera"], marcas: ["suspensas"] } }, salvos),
    ).toEqual({ tipo: "personalizado" });
  });

  it("a contagem do selo segue a Clint (status = 1; cada toggle conta)", () => {
    expect(totalDeCriterios(PAINEL_DO_PRESET.em_espera)).toBe(1);
    expect(totalDeCriterios(PAINEL_DO_PRESET.meus_em_aberto)).toBe(2);
    const f = {
      conversas: { marcas: ["lidas" as const] },
      negocios: { status: ["lost" as const], motivos: ["price"] },
      canais: [A1],
    };
    expect(contarNaSecaoDaFila(f, "conversas")).toBe(1);
    expect(contarNaSecaoDaFila(f, "negocios")).toBe(2);
    expect(contarNaSecaoDaFila(f, "canais")).toBe(1);
    expect(limparSecaoDaFila(f, "negocios")).toEqual({
      conversas: { marcas: ["lidas"] },
      canais: [A1],
    });
    expect(temCriterios({ conversas: { marcas: [] }, negocios: {} })).toBe(false);
  });

  it("enxugar tira o vazio, ordena e compara sem olhar a ordem", () => {
    const sujo = {
      canais: [],
      conversas: { status: ["fechado" as const, "em_espera" as const], atendentes: [U2, U1, U1] },
      negocios: { data: { tipo: "ganho" as const } },
    };
    expect(enxugarFiltrosDoPainel(sujo)).toEqual({
      conversas: { status: ["em_espera", "fechado"], atendentes: [U1, U2] },
    });
    expect(
      mesmosFiltrosDoPainel(
        { conversas: { status: ["fechado", "em_espera"] } },
        { conversas: { status: ["em_espera", "fechado"] } },
      ),
    ).toBe(true);
  });

  it("a URL: preset em ?v=, o resto em ?f=; lixo vira vazio", () => {
    expect(paramsDoPainel({ conversas: { status: ["em_espera"] } })).toEqual({
      v: "em_espera",
      f: null,
    });
    expect(paramsDoPainel({})).toEqual({ v: null, f: null });
    const f = { conversas: { marcas: ["suspensas" as const] } };
    expect(paramsDoPainel(f)).toEqual({ v: null, f: JSON.stringify(f) });
    expect(painelDaUrl(urlDe(`f=${encodeURIComponent(JSON.stringify(f))}`))).toEqual(f);
    expect(painelDaUrl(urlDe("v=fechadas"))).toEqual({ conversas: { status: ["fechado"] } });
    expect(painelDaUrl(urlDe("f=%7Bx"))).toEqual({});
    expect(painelDoTexto('{"conversas":{"agentes":["nao-e-uuid"]}}')).toBeNull();
    expect(painelDoTexto(null)).toEqual({});
  });

  it("o schema recusa mais de 20 agentes e marca que não existe", () => {
    const vinteEUm = Array.from({ length: 21 }, (_, i) => uuidN(i));
    expect(filtrosDaFilaSchema.safeParse({ conversas: { agentes: vinteEUm } }).success).toBe(false);
    expect(
      filtrosDaFilaSchema.safeParse({ conversas: { marcas: ["chamada_aberta"] } }).success,
    ).toBe(false);
    expect(
      filtrosDaFilaSchema.safeParse({ conversas: { atendentes: ["nenhum", U1] } }).success,
    ).toBe(true);
  });
});

describe("o filtro compilado (N3–N8)", () => {
  it("a busca escapa curinga, troca o * do original por % e só leva dígitos a partir de 4", () => {
    expect(padraoDaBusca("50%_off")).toEqual({ padrao: "%50\\%\\_off%", digitos: null });
    expect(padraoDaBusca("(62) 9999-0000")?.digitos).toBe("6299990000");
    expect(padraoDaBusca("a")).toBeNull();
  });

  it("separa atendente e 'Sem atendente', donos de pessoa/agente/sem dono, e baixa a caixa das tags", () => {
    const c = compilarFiltrosDaFila(
      {
        conversas: { atendentes: ["nenhum", U1], criadaEm: { de: "2026-10-01" } },
        negocios: {
          donos: ["sem_dono", U2, `agent:${A1}`],
          data: { tipo: "perda", ate: "2026-10-18" },
        },
        contatos: {
          tags: {
            combinar: "ou",
            grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: " VIP " }] }],
          },
        },
      },
      "maria",
      "America/Sao_Paulo",
    );
    expect(c).toMatchObject({
      fuso: "America/Sao_Paulo",
      atendentes: [U1],
      sem_atendente: true,
      criada_de: "2026-10-01",
      negocio: {
        tem: "com",
        donos_usuarios: [U2],
        donos_agentes: [A1],
        sem_dono: true,
        data_tipo: "perda",
        data_ate: "2026-10-18",
        fuso: "America/Sao_Paulo",
      },
      tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "vip" }] }] },
      busca: { padrao: "%maria%", digitos: null },
    });
    expect(compilarFiltrosDaFila({}, undefined, "UTC")).toEqual({ fuso: "UTC" });
  });
});

describe("as ações em massa (N12–N15)", () => {
  it("o alvo: os ids marcados, ou o filtro com a quantidade e os desmarcados", () => {
    expect(alvoDaSelecaoDaFila({ tipo: "ids", ids: [U1] }, { painel: {} })).toEqual({
      tipo: "ids",
      ids: [U1],
    });
    expect(
      alvoDaSelecaoDaFila(
        { tipo: "todos", quantidade: null, excluidos: [U2] },
        { painel: PAINEL_DO_PRESET.em_espera, busca: " ana " },
      ),
    ).toEqual({
      tipo: "filtro",
      f: JSON.stringify({ conversas: { status: ["em_espera"] } }),
      q: "ana",
      quantidade: null,
      excluidos: [U2],
    });
  });

  it("o pedido valida a ação e os parâmetros", () => {
    const alvo = { tipo: "ids", ids: [U1] };
    expect(
      pedidoDaFilaSchema.safeParse({ acao: "status", alvo, parametros: { status: "em_espera" } })
        .success,
    ).toBe(true);
    expect(
      pedidoDaFilaSchema.safeParse({ acao: "atendente", alvo, parametros: { user_id: null } })
        .success,
    ).toBe(true);
    expect(
      pedidoDaFilaSchema.safeParse({ acao: "status", alvo, parametros: { status: "arquivada" } })
        .success,
    ).toBe(false);
    expect(
      pedidoDaFilaSchema.safeParse({ acao: "incluir_tag", alvo, parametros: { tag: "" } }).success,
    ).toBe(false);
  });

  it("'1 conversa selecionada' e '56.128 conversas selecionadas' (número no formato brasileiro)", () => {
    expect(textoDasSelecionadas(1, t)).toBe("1 conversa selecionada");
    expect(textoDasSelecionadas(56128, t)).toBe("56.128 conversas selecionadas");
  });
});
