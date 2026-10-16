import { describe, expect, it } from "vitest";

import { aplicarFiltrosDoQuadro, type ContextoDoRecorte } from "@/lib/escale/filtros/aplicar";
import {
  comPeriodo,
  dataBrDoIso,
  isoDaDataBr,
  periodoDosFiltros,
} from "@/lib/escale/filtros/periodo";
import { criteriosAtivos, enxugar, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { filtrosDaUrl, filtrosParaUrl } from "@/lib/escale/filtros/url";
import type { Lead } from "@/lib/types/leads";
import { AGORA, negocio } from "@/tests/helpers/negocio-do-quadro";

const CTX: ContextoDoRecorte = { moeda: "BRL", campos: [], agora: AGORA };
const aplicar = (leads: Lead[], f: Partial<FiltrosDoQuadro>) =>
  aplicarFiltrosDoQuadro(leads, { status: ["open", "won", "lost"], ...f }, CTX).map((l) => l.id);

describe("o período do filtro Data", () => {
  it("lê o período que está nos filtros; sem período, nada", () => {
    expect(periodoDosFiltros({ status: ["open"] })).toBeNull();
    expect(periodoDosFiltros({ status: ["open"], criadoEm: { de: "2026-10-01" } })).toEqual({
      tipo: "criacao",
      de: "2026-10-01",
    });
    expect(
      periodoDosFiltros({ status: ["won"], ganhoEm: { de: "2026-10-01", ate: "2026-10-31" } }),
    ).toEqual({
      tipo: "ganho",
      de: "2026-10-01",
      ate: "2026-10-31",
    });
    expect(periodoDosFiltros({ status: ["lost"], perdidoEm: { ate: "2026-10-31" } })).toEqual({
      tipo: "perda",
      ate: "2026-10-31",
    });
  });

  it("um período por vez: escolher outro tipo apaga o anterior", () => {
    const f = comPeriodo(
      { status: ["open"], criadoEm: { de: "2026-10-01" } },
      { tipo: "perda", de: "2026-10-05", ate: "2026-10-06" },
    );
    expect(f.criadoEm).toBeUndefined();
    expect(f.perdidoEm).toEqual({ de: "2026-10-05", ate: "2026-10-06" });
  });

  it("ganho e perda trazem o status que pedem; criação não mexe no status", () => {
    expect(comPeriodo({ status: ["open"] }, { tipo: "ganho", de: "2026-10-01" }).status).toEqual([
      "open",
      "won",
    ]);
    expect(comPeriodo({ status: ["open"] }, { tipo: "perda", de: "2026-10-01" }).status).toEqual([
      "open",
      "lost",
    ]);
    expect(comPeriodo({ status: ["open"] }, { tipo: "criacao", de: "2026-10-01" }).status).toEqual([
      "open",
    ]);
  });

  it("sem datas, ou com o tipo que ainda não existe, o Data sai", () => {
    expect(
      comPeriodo({ status: ["open"], criadoEm: { de: "2026-10-01" } }, { tipo: "criacao" }),
    ).toEqual({ status: ["open"] });
    expect(
      comPeriodo(
        { status: ["open"], criadoEm: { de: "2026-10-01" } },
        { tipo: "agendado", de: "2026-10-01" },
      ),
    ).toEqual({
      status: ["open"],
    });
  });
});

describe("aplicar ganho e perda", () => {
  const leads = [
    negocio("ganho-dia10", { status: "won", closed_at: "2026-10-10T15:00:00Z" }),
    negocio("ganho-dia12", { status: "won", closed_at: "2026-10-12T15:00:00Z" }),
    negocio("perdido-dia10", { status: "lost", closed_at: "2026-10-10T15:00:00Z" }),
    negocio("aberto", { status: "open", closed_at: null }),
  ];

  it("data de ganho: só ganhos, pelo dia local do fechamento", () => {
    expect(aplicar(leads, { ganhoEm: { de: "2026-10-11" } })).toEqual(["ganho-dia12"]);
    expect(aplicar(leads, { ganhoEm: { ate: "2026-10-11" } })).toEqual(["ganho-dia10"]);
  });

  it("data de perda: só perdidos", () => {
    expect(aplicar(leads, { perdidoEm: { de: "2026-10-01", ate: "2026-10-31" } })).toEqual([
      "perdido-dia10",
    ]);
  });

  it("a data de criação continua igual", () => {
    const criados = [
      negocio("dia10", { created_at: "2026-10-10T15:00:00Z" }),
      negocio("dia12", { created_at: "2026-10-12T15:00:00Z" }),
    ];
    expect(aplicar(criados, { criadoEm: { de: "2026-10-11" } })).toEqual(["dia12"]);
  });
});

describe("ganho e perda na URL e nos critérios", () => {
  it("vão no f e voltam iguais", () => {
    const f: FiltrosDoQuadro = {
      status: ["open", "won"],
      ganhoEm: { de: "2026-10-01", ate: "2026-10-31" },
    };
    expect(filtrosDaUrl(new URLSearchParams(filtrosParaUrl(f))).filtros).toEqual(enxugar(f));
  });

  it("aparecem com o nome entre os critérios ativos", () => {
    expect(
      criteriosAtivos({ status: ["lost"], perdidoEm: { de: "2026-10-01" } }).map((c) => c.rotulo),
    ).toEqual(["Data de perda"]);
  });
});

describe("datas digitadas em dd/mm/aaaa", () => {
  it("viram AAAA-MM-DD; data que não existe é recusada", () => {
    expect(isoDaDataBr("15/10/2026")).toBe("2026-10-15");
    expect(isoDaDataBr(" 01/02/2026 ")).toBe("2026-02-01");
    expect(isoDaDataBr("31/02/2026")).toBeNull();
    expect(isoDaDataBr("2026-10-15")).toBeNull();
    expect(dataBrDoIso("2026-10-15")).toBe("15/10/2026");
    expect(dataBrDoIso(undefined)).toBe("");
  });
});
