// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { Interativo } from "@/lib/channels/interativo";
import { enviarPassos, passosSchema, resolverReferenciaDeAtivo, type EnviadorDePassos } from "@/lib/automation/envio-de-passos";

const ATIVO = "11111111-1111-4111-8111-111111111111";

function enviador(falharNo?: number): EnviadorDePassos & { chamadas: string[] } {
  const chamadas: string[] = [];
  let n = 0;
  const registrar = async (o: string): Promise<void> => {
    n += 1;
    if (n === falharNo) throw new Error("meta_131026");
    chamadas.push(o);
  };
  return {
    chamadas,
    texto: vi.fn(async (corpo: string, chave: string) => registrar(`texto:${corpo}:${chave}`)),
    midia: vi.fn(async (m: { assetId: string }, chave: string) => registrar(`midia:${m.assetId}:${chave}`)),
    interativo: vi.fn(async (i: { corpo: string; tipo: string }, chave: string) =>
      registrar(`interativo:${i.tipo}:${i.corpo}:${chave}`),
    ),
  };
}

describe("passosSchema", () => {
  const texto = { tipo: "texto", texto: "oi" } as const;
  it("aceita de 1 a 5 passos", () => {
    expect(passosSchema.safeParse([texto]).success).toBe(true);
    expect(passosSchema.safeParse(Array(6).fill(texto)).success).toBe(false);
    expect(passosSchema.safeParse([]).success).toBe(false);
  });
  it("mídia aceita uuid ou var:<chave> e recusa o resto", () => {
    expect(passosSchema.safeParse([{ tipo: "midia", asset: ATIVO }]).success).toBe(true);
    expect(passosSchema.safeParse([{ tipo: "midia", asset: "var:bv1" }]).success).toBe(true);
    expect(passosSchema.safeParse([{ tipo: "midia", asset: "../x" }]).success).toBe(false);
  });
  it("não existe pausa configurável (o espaçamento anti-ban separa as mensagens)", () => {
    expect(passosSchema.safeParse([{ ...texto, pausa_ms: 4000 }]).success).toBe(false);
  });
});

describe("resolverReferenciaDeAtivo", () => {
  it("uuid passa, var:<chave> lê o número, ausente é null", () => {
    expect(resolverReferenciaDeAtivo(ATIVO, {})).toBe(ATIVO);
    expect(resolverReferenciaDeAtivo("var:bv1", { bv1: "do-numero" })).toBe("do-numero");
    expect(resolverReferenciaDeAtivo("var:nao_tem", {})).toBeNull();
  });
});

describe("enviarPassos", () => {
  const deps = (e: EnviadorDePassos) => ({
    enviador: e,
    ativosDoCanal: { bv1: "ativo-bv1" },
    renderizar: (t: string) => t.replace("{{canal.pix_chave}}", "519"),
    chaveBase: "job-1",
  });

  it("envia na ordem, renderiza o texto e dá uma chave por passo", async () => {
    const e = enviador();
    const r = await enviarPassos(
      [{ tipo: "midia", asset: "var:bv1" }, { tipo: "texto", texto: "PIX {{canal.pix_chave}}" }],
      deps(e),
    );
    expect(r).toEqual({ ok: true, enviados: 2 });
    expect(e.chamadas).toEqual(["midia:ativo-bv1:job-1:0", "texto:PIX 519:job-1:1"]);
  });

  it("variável de ativo ausente no número interrompe antes de enviar qualquer coisa", async () => {
    const e = enviador();
    const r = await enviarPassos([{ tipo: "texto", texto: "oi" }, { tipo: "midia", asset: "var:bv9" }], deps(e));
    expect(r).toEqual({ ok: false, enviados: 0, erro: "ativo_ausente_no_numero:bv9" });
    expect(e.chamadas).toEqual([]);
  });

  it("falha num passo interrompe os seguintes e diz qual", async () => {
    const e = enviador(2);
    const r = await enviarPassos(
      [{ tipo: "texto", texto: "a" }, { tipo: "texto", texto: "b" }, { tipo: "texto", texto: "c" }],
      deps(e),
    );
    expect(r).toEqual({ ok: false, enviados: 1, erro: "passo_falhou:1:meta_131026" });
    expect(e.chamadas).toEqual(["texto:a:job-1:0"]);
  });

  it("texto que fica vazio depois de renderizado não é enviado vazio", async () => {
    const e = enviador();
    const r = await enviarPassos([{ tipo: "texto", texto: "{{canal.x}}" }], { ...deps(e), renderizar: () => "  " });
    expect(r).toEqual({ ok: false, enviados: 0, erro: "texto_vazio:0" });
  });
});

describe("passo interativo", () => {
  const lista: Interativo = {
    tipo: "lista",
    corpo: "Aparelho de {{canal.marca}}?",
    botaoDaLista: "Escolher",
    linhas: [{ id: "a", titulo: "TV" }],
  };

  it("o schema aceita lista válida e recusa lista com 11 linhas", () => {
    expect(passosSchema.safeParse([{ tipo: "interativo", interativo: lista }]).success).toBe(true);
    const linhas = Array.from({ length: 11 }, (_, i) => ({ id: `l${i}`, titulo: `L${i}` }));
    expect(passosSchema.safeParse([{ tipo: "interativo", interativo: { ...lista, linhas } }]).success).toBe(false);
  });
  it("chama o enviador na posição certa, com o corpo renderizado", async () => {
    const e = enviador();
    const r = await enviarPassos([{ tipo: "texto", texto: "oi" }, { tipo: "interativo", interativo: lista }], {
      enviador: e,
      ativosDoCanal: {},
      renderizar: (t) => t.replace("{{canal.marca}}", "Samsung"),
      chaveBase: "job-1",
    });
    expect(r).toEqual({ ok: true, enviados: 2 });
    expect(e.chamadas[1]).toBe("interativo:lista:Aparelho de Samsung?:job-1:1");
  });
});
