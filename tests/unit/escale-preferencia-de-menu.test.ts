import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/cookie-secure", () => ({ cookieSecure: () => false }));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "https://app.exemplo.com" } }));

import {
  COOKIE_DO_MENU,
  MENU_PADRAO,
  caminhoDaChave,
  destinoSeguro,
  lerPreferenciaDeMenu,
} from "@/lib/escale/preferencia-de-menu";
import { GET } from "@/app/app/escale/menu/route";

// Atrás do proxy, o servidor enxerga o próprio endereço interno (0.0.0.0:3000), não o público.
const req = (qs: string) => new NextRequest(`http://0.0.0.0:3000/app/escale/menu?${qs}`);

describe("preferência de menu", () => {
  it("o padrão é a lateral, e só 'topo' e 'lateral' são valores válidos", () => {
    expect(MENU_PADRAO).toBe("lateral");
    expect(lerPreferenciaDeMenu("topo")).toBe("topo");
    expect(lerPreferenciaDeMenu("lateral")).toBe("lateral");
    expect(lerPreferenciaDeMenu("qualquer")).toBe("lateral");
    expect(lerPreferenciaDeMenu(undefined)).toBe("lateral");
  });

  it("o destino de volta fica dentro do app", () => {
    expect(destinoSeguro("/app/inbox")).toBe("/app/inbox");
    expect(destinoSeguro("/app")).toBe("/app");
    expect(destinoSeguro("/app/pipelines/p-1?lead=x")).toBe("/app/pipelines/p-1?lead=x");
    expect(destinoSeguro("//evil.com")).toBe("/app");
    expect(destinoSeguro("https://evil.com")).toBe("/app");
    expect(destinoSeguro("/apple")).toBe("/app");
    expect(destinoSeguro("/app\\..\\x")).toBe("/app");
    expect(destinoSeguro("/app/../../../etc/passwd")).toBe("/app");
    expect(destinoSeguro("/app/contacts/joão..silva")).toBe("/app/contacts/joão..silva");
    expect(destinoSeguro(null)).toBe("/app");
  });

  it("monta o link da chave com a tela de volta codificada", () => {
    expect(caminhoDaChave("lateral", "/app/pipelines/p-1")).toBe(
      "/app/escale/menu?usar=lateral&voltar=%2Fapp%2Fpipelines%2Fp-1",
    );
  });
});

describe("GET /app/escale/menu", () => {
  it("usar=topo grava o cookie e volta para a tela de onde veio, pelo endereço público", () => {
    const res = GET(req("usar=topo&voltar=%2Fapp%2Finbox"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.exemplo.com/app/inbox");
    expect(res.cookies.get(COOKIE_DO_MENU)?.value).toBe("topo");
  });

  it("usar=lateral grava 'lateral'", () => {
    const res = GET(req("usar=lateral"));
    expect(res.cookies.get(COOKIE_DO_MENU)?.value).toBe("lateral");
    expect(res.headers.get("location")).toBe("https://app.exemplo.com/app");
  });

  it("valor desconhecido não grava nada, e destino de fora cai em /app", () => {
    const res = GET(req("usar=roxo&voltar=%2F%2Fevil.com"));
    expect(res.cookies.get(COOKIE_DO_MENU)).toBeUndefined();
    expect(res.headers.get("location")).toBe("https://app.exemplo.com/app");
  });
});
