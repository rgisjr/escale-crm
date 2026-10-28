import { describe, expect, it, vi } from "vitest";

import { chaveDoCache, comCache, limparCache } from "@/lib/escale/indicadores/motor/cache";
import { comVaga } from "@/lib/escale/indicadores/motor/fila";

function porta() {
  let abrir!: () => void;
  const fechada = new Promise<void>((r) => {
    abrir = r;
  });
  return { fechada, abrir };
}

describe("comVaga", () => {
  it("a 4ª chamada da mesma chave só começa quando uma termina", async () => {
    const { fechada, abrir } = porta();
    const iniciadas: number[] = [];
    const tarefa = (n: number) => () => {
      iniciadas.push(n);
      return fechada;
    };
    const todas = [1, 2, 3, 4].map((n) => comVaga("u-a", tarefa(n)));
    await Promise.resolve();
    expect(iniciadas).toEqual([1, 2, 3]);
    abrir();
    await Promise.all(todas);
    expect(iniciadas).toEqual([1, 2, 3, 4]);
  });

  it("recusa a 14ª simultânea e não trava outras chaves", async () => {
    const { fechada, abrir } = porta();
    const lote = Array.from({ length: 13 }, () => comVaga("u-b", () => fechada));
    await expect(comVaga("u-b", async () => 1)).rejects.toMatchObject({ codigo: "fila_cheia" });
    await expect(comVaga("u-c", async () => 2)).resolves.toBe(2);
    abrir();
    await Promise.all(lote);
    await expect(comVaga("u-b", async () => 3)).resolves.toBe(3);
  });

  it("libera a vaga quando a tarefa falha", async () => {
    await expect(comVaga("u-d", async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    await expect(comVaga("u-d", async () => 1)).resolves.toBe(1);
  });
});

describe("comCache", () => {
  it("devolve o mesmo resultado em 60 s e refaz depois", async () => {
    limparCache();
    let agora = 1_000;
    const fn = vi.fn(async () => ({ n: Math.random() }));
    const a = await comCache("k", 60_000, fn, () => agora);
    agora += 59_000;
    expect(await comCache("k", 60_000, fn, () => agora)).toBe(a);
    agora += 2_000;
    expect(await comCache("k", 60_000, fn, () => agora)).not.toBe(a);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("não guarda falha", async () => {
    limparCache();
    const fn = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce(7);
    await expect(comCache("f", 60_000, fn)).rejects.toThrow("x");
    await expect(comCache("f", 60_000, fn)).resolves.toBe(7);
  });

  it("a chave muda com a pergunta e com a pessoa, não com a ordem das chaves", () => {
    const p = { a: 1, b: [1, 2] };
    expect(chaveDoCache("o", "u1", p, undefined)).toBe(chaveDoCache("o", "u1", { b: [1, 2], a: 1 }, undefined));
    expect(chaveDoCache("o", "u1", p, undefined)).not.toBe(chaveDoCache("o", "u2", p, undefined));
    expect(chaveDoCache("o", "u1", p, undefined)).not.toBe(chaveDoCache("o", "u1", { ...p, a: 2 }, undefined));
    expect(chaveDoCache("o", "u1", p, undefined)).not.toBe(chaveDoCache("o", "u1", p, { tags: 1 }));
  });
});
