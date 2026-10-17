import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O TEMA ESCALE SÓ VALE NA CASCA NOVA, E TEM DE SER LEGÍVEL NOS DOIS TEMAS.
 *
 * `app/escale-tema.css` redefine os tokens do original dentro de
 * `body:has([data-escale-casca])` — o marcador que a casca põe na página quando a
 * pessoa liga o menu do topo. Sem marcador, nada muda (o original fica intacto).
 */
const RAIZ = join(__dirname, "..", "..");
const CSS = readFileSync(join(RAIZ, "app", "escale-tema.css"), "utf8");
const LAYOUT_RAIZ = readFileSync(join(RAIZ, "app", "layout.tsx"), "utf8");

const SELETOR_CLARO = "body:has([data-escale-casca])";
const SELETOR_ESCURO = '[data-theme="dark"] body:has([data-escale-casca])';

function bloco(seletor: string): Record<string, string> {
  const abre = seletor + " {";
  const i = CSS.indexOf(abre);
  if (i < 0) throw new Error(`bloco ${seletor} não encontrado`);
  const fim = CSS.indexOf("}", i);
  const corpo = CSS.slice(i + abre.length, fim);
  return Object.fromEntries(
    [...corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
  );
}

// O bloco claro vem ANTES do escuro no arquivo; `indexOf` acha o claro primeiro.
const CLARO = bloco(SELETOR_CLARO);
const ESCURO = bloco(SELETOR_ESCURO);

function resolver(valor: string, mapa: Record<string, string>): string {
  const m = /^var\((--[\w-]+)\)$/.exec(valor);
  if (!m) return valor;
  const proximo = mapa[m[1]!];
  if (proximo === undefined) throw new Error(`token ${m[1]} sem valor`);
  return resolver(proximo, mapa);
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

const PAPEIS = [
  "--color-bg",
  "--color-surface",
  "--color-surface-elevated",
  "--color-text",
  "--color-text-muted",
  "--color-text-subtle",
  "--color-border",
  "--color-border-strong",
  "--color-accent",
  "--color-accent-fg",
  "--color-accent-soft",
  "--color-accent-hover",
  "--color-warning",
  "--color-warning-bg",
  "--color-warning-fg",
  "--color-ai",
  "--color-ai-soft",
  "--color-ai-fg",
  "--color-escale-marca",
  "--color-neutral-50",
  "--color-neutral-100",
  "--color-neutral-200",
  "--color-neutral-300",
  "--color-neutral-400",
  "--color-neutral-500",
  "--color-neutral-600",
  "--color-neutral-700",
  "--color-neutral-800",
  "--color-neutral-900",
  "--color-neutral-950",
];

describe("tema Escale", () => {
  it("o layout raiz carrega o tema da Escale depois do tema do original", () => {
    const original = LAYOUT_RAIZ.indexOf('import "./globals.css";');
    const escale = LAYOUT_RAIZ.indexOf('import "./escale-tema.css";');
    expect(original).toBeGreaterThan(-1);
    expect(escale).toBeGreaterThan(original);
  });

  it("o tema claro redefine todos os papéis e a rampa azul", () => {
    const faltando = [...PAPEIS, "--color-accent-400", "--color-accent-600", "--font-atkinson", "--font-mono"].filter(
      (t) => CLARO[t] === undefined,
    );
    expect(faltando).toEqual([]);
  });

  it("o tema escuro redefine os mesmos papéis", () => {
    expect(PAPEIS.filter((t) => ESCURO[t] === undefined)).toEqual([]);
  });

  it("texto do botão sobre a cor de ação passa AA (4,5:1) nos dois temas", () => {
    const mapaEscuro = { ...CLARO, ...ESCURO };
    expect(contraste(resolver(CLARO["--color-accent"]!, CLARO), CLARO["--color-accent-fg"]!)).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(resolver(ESCURO["--color-accent"]!, mapaEscuro), ESCURO["--color-accent-fg"]!),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("texto principal e secundário sobre o fundo passam AA nos dois temas", () => {
    for (const tema of [CLARO, ESCURO]) {
      expect(contraste(tema["--color-text"]!, tema["--color-bg"]!)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(tema["--color-text-muted"]!, tema["--color-bg"]!)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("as fontes do @font-face existem no repositório e são woff2 de verdade", () => {
    const urls = [...CSS.matchAll(/url\("\.\/(fonts\/[^"]+)"\)/g)].map((m) => m[1]!);
    expect(urls).toEqual([
      "fonts/poppins-300-latin.woff2",
      "fonts/poppins-400-latin.woff2",
      "fonts/poppins-500-latin.woff2",
      "fonts/poppins-600-latin.woff2",
      "fonts/jetbrains-mono-100-800-latin.woff2",
    ]);
    expect(urls.filter((u) => !existsSync(join(RAIZ, "app", u)))).toEqual([]);
    // Uma página de erro salva com o nome .woff2 passaria no existsSync.
    for (const u of urls) {
      expect(readFileSync(join(RAIZ, "app", u)).subarray(0, 4).toString("latin1"), u).toBe("wOF2");
    }
  });

  it("a casca usa a Poppins da Clint, nos pesos 300 (só a janela da origem, F17 da 1F), 400, 500 e 600", () => {
    expect(CLARO["--font-atkinson"]).toMatch(/^"Escale Poppins",/);
    const pesos = [...CSS.matchAll(/font-family:\s*"Escale Poppins";[^}]*?font-weight:\s*(\d+);/g)].map(
      (m) => m[1],
    );
    expect(pesos).toEqual(["300", "400", "500", "600"]);
    expect(CSS).not.toContain("Figtree");
  });

  it("a casca põe o marcador do tema só no modo topo, e o layout lê a chave do cookie", () => {
    const shell = readFileSync(join(RAIZ, "app", "app", "_components", "AppShell.tsx"), "utf8");
    const layoutApp = readFileSync(join(RAIZ, "app", "app", "layout.tsx"), "utf8");
    expect(shell).toContain('data-escale-casca={menu === "topo" ? "" : undefined}');
    expect(shell).toContain("<MenuDoTopo />");
    expect(layoutApp).toContain("lerPreferenciaDeMenu(store.get(COOKIE_DO_MENU)?.value)");
    expect(layoutApp).toContain("menu={menu}");
  });
});
