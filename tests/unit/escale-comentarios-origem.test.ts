import { describe, expect, it } from "vitest";

import {
  colunasDaPublicacao,
  linkDaPublicacao,
  miniaturaSegura,
} from "@/lib/escale/comentarios/origem";

describe("linkDaPublicacao", () => {
  it.each([
    "https://www.instagram.com/reel/abc/",
    "https://m.facebook.com/123_456",
    "https://fb.com/x",
  ])("aceita %s", (link) => {
    expect(linkDaPublicacao(link)).toBe(link);
  });

  it.each([
    "http://instagram.com/p/x",
    "https://instagram.com.evil.io/p",
    "https://evilinstagram.com/p",
    "javascript:alert(1)",
    "",
    "não é link",
    `https://instagram.com/${"a".repeat(2001)}`,
  ])("recusa %s", (link) => {
    expect(linkDaPublicacao(link)).toBeNull();
  });

  it("recusa null e undefined", () => {
    expect(linkDaPublicacao(null)).toBeNull();
    expect(linkDaPublicacao(undefined)).toBeNull();
  });
});

describe("miniaturaSegura", () => {
  it("aceita https", () => {
    expect(miniaturaSegura("https://scontent.cdninstagram.com/a.jpg")).toBe(
      "https://scontent.cdninstagram.com/a.jpg",
    );
  });

  it("recusa http, data: e URL longa", () => {
    expect(miniaturaSegura("http://scontent.cdninstagram.com/a.jpg")).toBeNull();
    expect(miniaturaSegura("data:image/png;base64,AAAA")).toBeNull();
    expect(miniaturaSegura(`https://x.com/${"a".repeat(2001)}`)).toBeNull();
    expect(miniaturaSegura(null)).toBeNull();
  });
});

describe("colunasDaPublicacao", () => {
  it("corta a legenda em 300 e sanea link e miniatura", () => {
    const entrada = Object.freeze({
      legenda: "a".repeat(400),
      miniatura: "http://x.com/a.jpg",
      link: "https://www.instagram.com/reel/abc/",
    });
    expect(colunasDaPublicacao(entrada)).toEqual({
      publicacao_legenda: "a".repeat(300),
      publicacao_miniatura: null,
      publicacao_link: "https://www.instagram.com/reel/abc/",
    });
  });

  it("legenda só com espaços vira null", () => {
    expect(colunasDaPublicacao({ legenda: "  ", miniatura: null, link: null })).toEqual({
      publicacao_legenda: null,
      publicacao_miniatura: null,
      publicacao_link: null,
    });
  });
});
