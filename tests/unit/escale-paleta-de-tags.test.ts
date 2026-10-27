import { describe, expect, it } from "vitest";

import { razaoDeContraste } from "@/lib/branding/contraste";
import { deltaEOklab } from "@/lib/branding/rampa";
import {
  PALETA_DA_CASCA,
  TOM_ANTIGO,
  chaveAutomatica,
  tomDaTag,
} from "@/lib/escale/tags/paleta";

describe("a paleta de 16 tons da casca", () => {
  it("tem 16 tons com chaves e nomes únicos", () => {
    expect(PALETA_DA_CASCA).toHaveLength(16);
    expect(new Set(PALETA_DA_CASCA.map((t) => t.chave)).size).toBe(16);
    expect(new Set(PALETA_DA_CASCA.map((t) => t.nome)).size).toBe(16);
  });

  it.each(PALETA_DA_CASCA.map((t) => [t.nome, t] as const))(
    "%s: texto sobre o fundo passa de 4,5",
    (_nome, tom) => {
      expect(razaoDeContraste(tom.texto, tom.fundo)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("nenhum par de tons fica parecido: fundos separados por ΔE OKLab ≥ 0,07", () => {
    for (let i = 0; i < PALETA_DA_CASCA.length; i++)
      for (let j = i + 1; j < PALETA_DA_CASCA.length; j++) {
        const [a, b] = [PALETA_DA_CASCA[i]!, PALETA_DA_CASCA[j]!];
        expect(deltaEOklab(a.fundo, b.fundo), `${a.nome} x ${b.nome}`).toBeGreaterThanOrEqual(0.07);
      }
  });

  it("os 8 tons antigos viram um dos 16", () => {
    const chaves = new Set(PALETA_DA_CASCA.map((t) => t.chave));
    expect(Object.keys(TOM_ANTIGO)).toHaveLength(8);
    for (const nova of Object.values(TOM_ANTIGO)) expect(chaves.has(nova)).toBe(true);
    expect(tomDaTag("#CF3716").nome).toBe("Vermelho");
  });

  it("tag sem cor ganha um tom fixo pelo nome, igual em toda tela", () => {
    expect(chaveAutomatica("VIP ")).toBe(chaveAutomatica("vip"));
    expect(tomDaTag(null, "vip").chave).toBe(chaveAutomatica("vip"));
    const usados = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map(chaveAutomatica));
    expect(usados.size).toBeGreaterThan(3);
  });

  it("cor desconhecida ou inválida cai no automático, nunca quebra", () => {
    expect(tomDaTag("#123456", "vip").chave).toBe(chaveAutomatica("vip"));
    expect(tomDaTag("lixo", "vip").chave).toBe(chaveAutomatica("vip"));
    expect(tomDaTag(null).chave).toBe(PALETA_DA_CASCA[11]!.chave);
  });
});
