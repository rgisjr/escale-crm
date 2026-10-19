import { describe, expect, it } from "vitest";

import { juntarEnrollments, silencioDaPausa } from "@/lib/escale/conversas/pausa";

const UMA_HORA = "2026-10-19T15:00:00.000Z";
const UM_DIA = "2026-10-20T14:00:00.000Z";

describe("silencioDaPausa", () => {
  it("o silêncio infinito do handoff não vira 1 hora", () => {
    expect(silencioDaPausa("infinity", UMA_HORA)).toBe("infinity");
  });
  it("não encurta um silêncio mais longo", () => {
    expect(silencioDaPausa(UM_DIA, UMA_HORA)).toBe(UM_DIA);
  });
  it("estende um silêncio mais curto ou vencido, e 'até retomar' vira infinity", () => {
    expect(silencioDaPausa(UMA_HORA, UM_DIA)).toBe(UM_DIA);
    expect(silencioDaPausa(null, UMA_HORA)).toBe(UMA_HORA);
    expect(silencioDaPausa(UMA_HORA, null)).toBe("infinity");
  });
});

describe("juntarEnrollments", () => {
  it("guarda os follow-ups da pausa anterior sem repetir", () => {
    expect(juntarEnrollments(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
});
