import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/cookie-secure", () => ({ cookieSecure: () => false }));

import { POST } from "@/app/app/escale/preferencia-de-origens/route";

const post = (corpo: unknown) =>
  POST(
    new NextRequest("http://localhost/app/escale/preferencia-de-origens", {
      method: "POST",
      body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
    }),
  );

describe("POST /app/escale/preferencia-de-origens", () => {
  it("grava o cookie httpOnly sem Server Action e responde 204", async () => {
    const res = await post({ nome: "painel", valor: "fechado" });
    expect(res.status).toBe(204);
    const cookie = res.cookies.get("escale_origens_painel");
    expect(cookie?.value).toBe("fechado");
    expect(cookie?.httpOnly).toBe(true);
  });

  it("recusa nome ou valor fora da lista e corpo que não é JSON", async () => {
    expect((await post({ nome: "x", valor: "y" })).status).toBe(400);
    expect((await post({ nome: "ultimo_funil", valor: "nao-e-uuid" })).status).toBe(400);
    expect((await post("{")).status).toBe(400);
  });
});
