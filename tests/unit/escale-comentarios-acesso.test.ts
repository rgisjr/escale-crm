import { describe, expect, it } from "vitest";

import { podeApagarComentario, podeAtenderAConta } from "@/lib/escale/comentarios/acesso";
import type { CanalDoRoteamento } from "@/lib/escale/conversas/canais";

const canal = (mode: CanalDoRoteamento["mode"], user_ids: string[] = []): CanalDoRoteamento => ({ id: "c", user_ids, mode });

describe("podeAtenderAConta (D7)", () => {
  it("admin sem política atende", () => {
    expect(podeAtenderAConta({ papel: "admin", userId: "u", canal: null })).toBe(true);
  });
  it("admin atende mesmo fora da lista", () => {
    expect(podeAtenderAConta({ papel: "admin", userId: "u", canal: canal("restricted", ["x"]) })).toBe(true);
  });
  it("leitor nunca vê", () => {
    expect(podeAtenderAConta({ papel: "viewer", userId: "u", canal: null })).toBe(false);
  });
  it("agente com legacy_unconfigured atende", () => {
    expect(podeAtenderAConta({ papel: "agent", userId: "u", canal: canal("legacy_unconfigured") })).toBe(true);
  });
  it("agente em restricted: só quem está na lista", () => {
    expect(podeAtenderAConta({ papel: "agent", userId: "u", canal: canal("restricted", ["u"]) })).toBe(true);
    expect(podeAtenderAConta({ papel: "agent", userId: "u", canal: canal("restricted", ["x"]) })).toBe(false);
  });
  it("restricted_empty não atende ninguém (exceto admin)", () => {
    expect(podeAtenderAConta({ papel: "agent", userId: "u", canal: canal("restricted_empty") })).toBe(false);
    expect(podeAtenderAConta({ papel: "manager", userId: "u", canal: canal("restricted_empty") })).toBe(false);
  });
  it("gerente segue a lista do dispositivo", () => {
    expect(podeAtenderAConta({ papel: "manager", userId: "u", canal: canal("restricted", ["u"]) })).toBe(true);
    expect(podeAtenderAConta({ papel: "manager", userId: "u", canal: canal("restricted", ["x"]) })).toBe(false);
  });
});

describe("podeApagarComentario", () => {
  it("agente não, gerente e admin sim", () => {
    expect(podeApagarComentario("agent")).toBe(false);
    expect(podeApagarComentario("manager")).toBe(true);
    expect(podeApagarComentario("admin")).toBe(true);
  });
});
