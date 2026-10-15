import { describe, expect, it } from "vitest";

import {
  FILTROS_PADRAO,
  contarPorSecao,
  criteriosAtivos,
  enxugar,
  filtrosDoQuadroSchema,
  limparCriterios,
  limparSecao,
  mesmosFiltros,
  normalizarStatus,
  removerCriterio,
  temCriterios,
  type FiltrosDoQuadro,
} from "@/lib/escale/filtros/tipos";
import { filtrosDaUrl, filtrosParaUrl } from "@/lib/escale/filtros/url";

const ID_SALVO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const url = (texto: string) => filtrosDaUrl(new URLSearchParams(texto));

const COMPLETO: FiltrosDoQuadro = {
  status: ["open", "won"],
  busca: "ana",
  dono: "agent:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  tags: ["vip", "quente"],
  modoDasTags: "ou",
  atrasados: true,
  criadoEm: { de: "2026-10-01", ate: "2026-10-15" },
  valor: { min: 100000 },
  conversa: { naoLidas: true, canais: ["whatsapp"], atendentes: ["nenhum"] },
  campos: [{ alvo: "negocio", chave: "cidade", op: "contem", valor: "Natal" }],
  atividadesConcluidas: { min: 2, max: 5 },
  tempoNaEtapa: { min: 3, unidade: "dias" },
  tempoDesdeEntrada: { max: 48, unidade: "horas" },
  ordem: [{ campo: "negocio.valor", direcao: "desc" }],
};

describe("os filtros na URL", () => {
  it("sem nada na URL, o quadro abre em Em aberto e sem filtro salvo", () => {
    expect(url("")).toEqual({ filtros: { status: ["open"] }, filtroSalvoId: null });
    expect(FILTROS_PADRAO).toEqual({ status: ["open"] });
  });

  it("st junta status na ordem fixa; status= de link antigo ainda vale; lixo vira o padrão", () => {
    expect(url("st=won,open").filtros.status).toEqual(["open", "won"]);
    expect(url("status=lost").filtros.status).toEqual(["lost"]);
    expect(url("status=all").filtros.status).toEqual(["open", "won", "lost"]);
    expect(url("st=open&status=lost").filtros.status).toEqual(["open"]);
    expect(url("st=qualquer").filtros.status).toEqual(["open"]);
  });

  it("ida e volta: o que vai para a URL volta igual, com o filtro salvo", () => {
    expect(url(filtrosParaUrl(COMPLETO, ID_SALVO))).toEqual({ filtros: enxugar(COMPLETO), filtroSalvoId: ID_SALVO });
  });

  it("as chaves do original continuam as mesmas, e o padrão não escreve st nem f", () => {
    const p = new URLSearchParams(
      filtrosParaUrl({ status: ["open"], dono: "u-1", tags: ["vip", "quente"], modoDasTags: "ou", busca: "ana", atrasados: true }),
    );
    expect(p.get("owner")).toBe("u-1");
    expect(p.getAll("tag")).toEqual(["vip", "quente"]);
    expect(p.get("modo")).toBe("ou");
    expect(p.get("q")).toBe("ana");
    expect(p.get("overdue")).toBe("1");
    expect(p.has("st")).toBe(false);
    expect(p.has("status")).toBe(false);
    expect(p.has("f")).toBe(false);
  });

  it("f quebrado ou fora do schema é ignorado, sem erro; fs que não é uuid também", () => {
    expect(url("f=%7Bquebrado").filtros).toEqual({ status: ["open"] });
    expect(url(`f=${encodeURIComponent(JSON.stringify({ valor: { min: -5 } }))}`).filtros).toEqual({ status: ["open"] });
    expect(url("fs=nao-e-uuid").filtroSalvoId).toBeNull();
  });
});

describe("enxugar, seções e critérios ativos", () => {
  it("tira o que está vazio e põe o status padrão quando falta", () => {
    expect(
      enxugar({
        status: [],
        busca: "  ",
        dono: "any",
        tags: [],
        conversa: {},
        campos: [],
        valor: {},
        tempoNaEtapa: { unidade: "dias" },
        ordem: [],
      }),
    ).toEqual({ status: ["open"] });
  });

  it("'sem conversa' apaga os outros filtros de conversa; E/OU só fica com duas tags", () => {
    expect(enxugar({ status: ["open"], conversa: { existe: "sem", naoLidas: true } }).conversa).toEqual({ existe: "sem" });
    expect(enxugar({ status: ["open"], tags: ["vip"], modoDasTags: "ou" }).modoDasTags).toBeUndefined();
  });

  it("conta os critérios por seção (status e busca não contam: têm controle próprio)", () => {
    expect(contarPorSecao(COMPLETO)).toEqual({ negocio: 4, conversas: 3, tags: 1, campos: 1, outros: 3 });
    expect(contarPorSecao({ status: ["lost"], busca: "x" })).toEqual({ negocio: 0, conversas: 0, tags: 0, campos: 0, outros: 0 });
    expect(temCriterios({ status: ["lost"], ordem: COMPLETO.ordem })).toBe(false);
    expect(temCriterios({ status: ["open"], atrasados: true })).toBe(true);
  });

  it("limpar uma seção tira só ela; limpar filtros mantém status e ordenação", () => {
    expect(limparSecao(COMPLETO, "conversas").conversa).toBeUndefined();
    expect(limparSecao(COMPLETO, "conversas").tags).toEqual(["vip", "quente"]);
    expect(limparSecao(COMPLETO, "tags").modoDasTags).toBeUndefined();
    expect(limparCriterios(COMPLETO)).toEqual({ status: ["open", "won"], ordem: [{ campo: "negocio.valor", direcao: "desc" }] });
  });

  it("os critérios ativos viram chips (sem a busca), e tirar tags leva o E/OU junto", () => {
    expect(criteriosAtivos(COMPLETO).map((c) => [c.id, c.n])).toEqual([
      ["dono", undefined],
      ["criadoEm", undefined],
      ["valor", undefined],
      ["atrasados", undefined],
      ["conversa", undefined],
      ["tags", 2],
      ["campos", 1],
      ["atividadesConcluidas", undefined],
      ["tempoNaEtapa", undefined],
      ["tempoDesdeEntrada", undefined],
    ]);
    const semTags = removerCriterio(COMPLETO, "tags");
    expect(semTags.tags).toBeUndefined();
    expect(semTags.modoDasTags).toBeUndefined();
  });

  it("dois filtros são iguais sem olhar a ordem das chaves nem o que está vazio", () => {
    const a: FiltrosDoQuadro = { status: ["open"], campos: [{ alvo: "negocio", chave: "x", op: "contem", valor: "1" }], busca: "" };
    const b = JSON.parse('{"campos":[{"valor":"1","op":"contem","chave":"x","alvo":"negocio"}],"status":["open"]}') as FiltrosDoQuadro;
    expect(mesmosFiltros(a, b)).toBe(true);
    expect(mesmosFiltros(a, { ...b, campos: [{ alvo: "negocio", chave: "x", op: "contem", valor: "2" }] })).toBe(false);
  });

  it("o schema recusa chave a mais, status vazio, número negativo e campo de ordem desconhecido", () => {
    expect(filtrosDoQuadroSchema.safeParse(COMPLETO).success).toBe(true);
    expect(filtrosDoQuadroSchema.safeParse({ status: [] }).success).toBe(false);
    expect(filtrosDoQuadroSchema.safeParse({ status: ["open"], organization_id: "x" }).success).toBe(false);
    expect(filtrosDoQuadroSchema.safeParse({ status: ["open"], valor: { min: -1 } }).success).toBe(false);
    expect(
      filtrosDoQuadroSchema.safeParse({ status: ["open"], ordem: [{ campo: "qualquer.coisa", direcao: "asc" }] }).success,
    ).toBe(false);
    expect(normalizarStatus(["lost", "lost", "open"])).toEqual(["open", "lost"]);
  });
});
