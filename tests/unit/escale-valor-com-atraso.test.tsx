import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useValorComAtraso } from "@/hooks/escale/useValorComAtraso";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useValorComAtraso (G1-2 / B1-20)", () => {
  it("só entrega o valor depois da pausa na digitação", () => {
    const { result, rerender } = renderHook(({ v }) => useValorComAtraso(v, 300), {
      initialProps: { v: "" },
    });
    rerender({ v: "ma" });
    act(() => void vi.advanceTimersByTime(200));
    rerender({ v: "mar" });
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current).toBe("");
    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe("mar");
  });
});
