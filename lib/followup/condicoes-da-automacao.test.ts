// @vitest-environment node
import { describe, expect, it } from "vitest";

import { grupoQueCasou } from "@/lib/followup/condicoes-da-automacao";

const relogio = { agora: new Date("2026-11-04T15:00:00Z"), fuso: "America/Sao_Paulo" };
const util = {
  id: "g1",
  modo: "todas" as const,
  linhas: [
    {
      field: "agora.hora",
      op: "entre" as const,
      value: '{"de":"09:30","ate":"23:00","dias":[1,2,3,4,5]}',
    },
  ],
};
const fds = {
  id: "g2",
  modo: "todas" as const,
  linhas: [
    {
      field: "agora.hora",
      op: "entre" as const,
      value: '{"de":"09:30","ate":"22:00","dias":[0,6]}',
    },
  ],
};

describe("grupoQueCasou", () => {
  it("devolve o primeiro grupo que casa, na ordem", () => {
    expect(grupoQueCasou([util, fds], {}, relogio)).toBe("g1");
  });

  it("nenhum grupo casa: null", () => {
    const noite = { agora: new Date("2026-11-05T04:00:00Z"), fuso: "America/Sao_Paulo" };
    expect(grupoQueCasou([util, fds], {}, noite)).toBeNull();
  });

  it("'qualquer' casa com uma linha só", () => {
    const grupo = {
      id: "g3",
      modo: "qualquer" as const,
      linhas: [
        { field: "lead.tags", op: "contains" as const, value: "vip" },
        { field: "lead.tags", op: "contains" as const, value: "quente" },
      ],
    };
    expect(grupoQueCasou([grupo], { lead: { tags: ["quente"] } }, relogio)).toBe("g3");
  });
});
