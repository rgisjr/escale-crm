import { describe, expect, it } from "vitest";

import { inlinar } from "../helpers/sql-com-parametros";

describe("inlinar", () => {
  it("troca $n por literal, dobrando aspas", () => {
    expect(inlinar("a = $1 and b = $2", ["x'y", 3])).toBe("a = 'x''y' and b = 3");
  });
  it("não confunde $10 com $1", () => {
    const valores = Array.from({ length: 10 }, (_, i) => i + 1);
    expect(inlinar("$1 $10", valores)).toBe("1 10");
  });
  it("converte arrays, booleanos e nulos", () => {
    expect(inlinar("$1 $2 $3 $4", [["a", "b"], true, null, []])).toBe("array['a','b'] true null '{}'");
  });
});
