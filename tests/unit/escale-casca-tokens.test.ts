import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * OS TOKENS DA CASCA IGUAL À CLINT (fork Escale, V1).
 *
 * Cada token `casca-*` mora em três lugares:
 *  1. `:root` do `globals.css`, com um fallback que é SEMPRE um token do
 *     original — sem a casca, o utilitário pinta uma cor que já existia;
 *  2. a ponte `@theme inline`, que é o que faz o Tailwind gerar a classe;
 *  3. o valor de verdade no `escale-tema.css`, só dentro de
 *     `body:has([data-escale-casca])` (e do bloco escuro dele).
 *
 * Os valores claros são os do contrato
 * (docs/superpowers/plans/2026-10-16-contrato-casca-igual-a-clint.md), medidos
 * nos prints da Clint. O escuro da Clint nunca foi visto: aqui só se exige que
 * ele exista e seja legível.
 */
const RAIZ = join(__dirname, "..", "..");
const GLOBAIS = readFileSync(join(RAIZ, "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");
const TEMA = readFileSync(join(RAIZ, "app", "escale-tema.css"), "utf8").replace(/\r\n/g, "\n");

const CLARO_DA_CASCA = "body:has([data-escale-casca])";
const ESCURO_DA_CASCA = '[data-theme="dark"] body:has([data-escale-casca])';

const CORES: Record<string, string> = {
  "--color-casca-texto": "#2f2c5d",
  "--color-casca-texto-2": "#3e3a6f",
  "--color-casca-suave": "#686d86",
  "--color-casca-meta": "#8c89b0",
  "--color-casca-sobrelinha": "#828282",
  "--color-casca-borda": "#e8e4f5",
  "--color-casca-raia": "#eff3ff",
  "--color-casca-caixa-msg": "#eff6ff",
  "--color-casca-borda-msg": "#e3ebff",
  "--color-casca-busca": "#f6f8ff",
  "--color-casca-contador": "#e8e4f5",
  "--color-casca-cinza-selo": "#e0e0e0",
  "--color-casca-novo": "#597eff",
  "--color-casca-alerta": "#ff4b4c",
  "--color-casca-escuro": "#2f2c5d",
  "--color-casca-chevron": "#7489a8",
  "--color-casca-divisoria": "#ebebeb",
  "--color-casca-seta": "#cccccc",
  "--color-casca-caixa": "#dfe2fd",
  "--color-casca-caixa-borda": "#d5dcff",
  "--color-casca-marca": "var(--color-accent)",
  "--color-casca-marca-forte": "color-mix(in oklab, var(--color-accent) 85%, black)",
  "--color-casca-marca-suave": "color-mix(in oklab, var(--color-accent) 8%, white)",
  "--color-casca-marca-media": "color-mix(in oklab, var(--color-accent) 18%, white)",
  "--color-casca-dia": "color-mix(in oklab, var(--color-accent) 4%, white)",
};
const RAIOS: Record<string, string> = {
  "--radius-casca-gatilho": "6px",
  "--radius-casca-card": "10px",
  "--radius-casca-raia": "16px",
};
const SOMBRA = "--shadow-casca-painel";
const SOMBRA_CLARA = "0 8px 16px rgb(17 24 39 / 0.1), 0 0 1px rgb(17 24 39 / 0.3)";
const TODOS = [...Object.keys(CORES), ...Object.keys(RAIOS), SOMBRA];
const TONS_DA_MARCA = [
  "--color-casca-marca",
  "--color-casca-marca-forte",
  "--color-casca-marca-suave",
  "--color-casca-marca-media",
  "--color-casca-dia",
];

/** Bloco do globals.css com o seletor sozinho na linha — o critério de branding-tema-claro-escopavel. */
function blocoDoGlobais(seletor: string): Map<string, string> {
  const linhas = GLOBAIS.split("\n");
  const inicio = linhas.findIndex((l) => l.trim() === `${seletor} {`);
  if (inicio === -1) throw new Error(`não achei \`${seletor} {\` no globals.css`);
  const decls = new Map<string, string>();
  for (let i = inicio + 1; i < linhas.length; i += 1) {
    const linha = (linhas[i] ?? "").trim();
    if (linha === "}") return decls;
    const m = /^(--[a-z0-9-]+)\s*:\s*(.+);$/.exec(linha);
    if (m) decls.set(m[1]!, m[2]!.trim());
  }
  throw new Error(`o bloco \`${seletor}\` não fecha`);
}

/** Bloco do escale-tema.css — o critério de escale-tema.test.ts (primeira ocorrência até a primeira chave). */
function blocoDoTema(seletor: string): Map<string, string> {
  const abre = `${seletor} {`;
  const i = TEMA.indexOf(abre);
  if (i < 0) throw new Error(`bloco ${seletor} não encontrado`);
  const corpo = TEMA.slice(i + abre.length, TEMA.indexOf("}", i));
  return new Map([...corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

function resolver(valor: string, mapa: Map<string, string>, passos = 0): string {
  const m = /^var\((--[\w-]+)\)$/.exec(valor);
  if (!m) return valor;
  if (passos > 8) throw new Error(`ciclo ao resolver ${valor}`);
  const proximo = mapa.get(m[1]!);
  if (proximo === undefined) throw new Error(`token ${m[1]} sem valor`);
  return resolver(proximo, mapa, passos + 1);
}

function luminancia(hex: string): number {
  const h = hex.replace("#", "");
  const canais = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

describe("tokens da casca no globals.css (o original)", () => {
  it(":root declara todos, e o fallback de cada cor é um token do próprio original", () => {
    const raiz = blocoDoGlobais(":root");
    expect(TODOS.filter((t) => !raiz.has(t))).toEqual([]);
    for (const cor of Object.keys(CORES)) {
      const fallback = raiz.get(cor) ?? "";
      const ref = /^var\((--color-[a-z0-9-]+)\)$/.exec(fallback)?.[1];
      expect(ref, `${cor} = ${fallback}`).toBeDefined();
      expect(ref!.startsWith("--color-casca-"), cor).toBe(false);
      // Sem a casca, o utilitário da casca pinta uma cor que o original já tinha.
      expect(resolver(fallback, raiz), cor).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const [raio, px] of Object.entries(RAIOS)) expect(raiz.get(raio), raio).toBe(px);
    expect(raiz.get(SOMBRA)).toBe(SOMBRA_CLARA);
  });

  it("nenhum token da casca entra na régua da marca (nem grau da rampa, nem nome -soft/-fg)", () => {
    // extrairRegua (lib/branding/contraste.ts) conta todo `var(--color-accent-NNN)`
    // e todo `-soft`/`-fg` do :root como par a medir, e branding-pares-pintados
    // exige exatamente 18 pares no claro e 26 no escuro.
    const raiz = blocoDoGlobais(":root");
    for (const t of TODOS) {
      expect(t).not.toMatch(/-(soft|fg)$/);
      expect(raiz.get(t) ?? "", t).not.toMatch(/var\(\s*--color-accent-\d/);
    }
  });

  it("o @theme inline faz a ponte de cada um", () => {
    const ponte = blocoDoGlobais("@theme inline");
    expect(TODOS.filter((t) => ponte.get(t) !== `var(${t})`)).toEqual([]);
  });

  it("os blocos de tema do original não ganham token da casca", () => {
    // branding-tema-claro-escopavel exige que o claro espelhe exatamente o
    // escuro; o escuro da casca mora no escale-tema.css, não aqui.
    for (const seletor of ['[data-theme="light"]', '[data-theme="dark"]']) {
      const chaves = [...blocoDoGlobais(seletor).keys()];
      expect(chaves.filter((k) => k.includes("casca")), seletor).toEqual([]);
    }
  });
});

describe("tokens da casca no escale-tema.css (só com a casca ligada)", () => {
  it("o tema claro da casca tem os valores do contrato e a sombra da Clint", () => {
    const claro = blocoDoTema(CLARO_DA_CASCA);
    const errados = Object.entries(CORES)
      .filter(([t, v]) => (claro.get(t) ?? "").toLowerCase() !== v.toLowerCase())
      .map(([t]) => `${t} = ${claro.get(t) ?? "(ausente)"}`);
    expect(errados).toEqual([]);
    expect(claro.get(SOMBRA)).toBe(SOMBRA_CLARA);
  });

  it("o tema escuro da casca redefine todas as cores e a sombra", () => {
    const escuro = blocoDoTema(ESCURO_DA_CASCA);
    expect([...Object.keys(CORES), SOMBRA].filter((t) => !escuro.has(t))).toEqual([]);
  });

  it("os tons da marca derivam de var(--color-accent) no próprio body, nos dois temas", () => {
    // Declarados no body, resolvem com o --color-accent do body — e a marca da
    // organização (body:has([data-marca-org]), injetada depois) é quem o define.
    for (const bloco of [blocoDoTema(CLARO_DA_CASCA), blocoDoTema(ESCURO_DA_CASCA)]) {
      for (const t of TONS_DA_MARCA) expect(bloco.get(t) ?? "", t).toContain("var(--color-accent)");
    }
  });

  it("sem a casca nada muda: todo token do escale-tema.css está dentro de body:has([data-escale-casca])", () => {
    const semComentario = TEMA.replace(/\/\*[\s\S]*?\*\//g, "");
    const regras = [...semComentario.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      seletor: m[1]!.trim(),
      corpo: m[2]!,
    }));
    expect(regras.length).toBeGreaterThan(2);
    const fora = regras
      .filter((r) => /--[\w-]+\s*:/.test(r.corpo) && !r.seletor.includes(CLARO_DA_CASCA))
      .map((r) => r.seletor);
    expect(fora).toEqual([]);
  });

  it("o texto da casca é legível nos dois temas", () => {
    const claro = blocoDoTema(CLARO_DA_CASCA);
    const escuro = blocoDoTema(ESCURO_DA_CASCA);
    for (const t of ["--color-casca-texto", "--color-casca-texto-2", "--color-casca-suave"]) {
      expect(contraste(claro.get(t)!, claro.get("--color-surface")!), t).toBeGreaterThanOrEqual(4.5);
    }
    for (const t of ["--color-casca-texto", "--color-casca-suave"]) {
      expect(contraste(escuro.get(t)!, escuro.get("--color-surface")!), t).toBeGreaterThanOrEqual(4.5);
    }
    // gatilho de filtro aberto: texto branco sobre o escuro
    expect(contraste("#ffffff", claro.get("--color-casca-escuro")!)).toBeGreaterThanOrEqual(4.5);
    expect(contraste("#ffffff", escuro.get("--color-casca-escuro")!)).toBeGreaterThanOrEqual(4.5);
  });
});
