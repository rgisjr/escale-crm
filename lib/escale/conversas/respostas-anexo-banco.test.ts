// @vitest-environment node
import { describe, expect, it } from "vitest";

import { gravarExtras } from "@/lib/escale/conversas/respostas-banco";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

const ORG = "11111111-1111-4111-8111-111111111111";
const base = { atalho: "oi", corpo: "Olá", canais: ["whatsapp" as const], compartilhar: true, todos_os_setores: true, setores: [] };

describe("gravarExtras com anexo", () => {
  it("anexo informado grava por template_id com a organização", async () => {
    const banco = bancoPorTabela({});
    await gravarExtras(banco.db as never, ORG, "t1", { ...base, anexo: { asset: "var:bv1" } });
    const gravou = banco.escritas.find((e) => e.tabela === "crm_respostas_rapidas_anexos");
    expect(gravou).toMatchObject({ op: "upsert", valores: { template_id: "t1", organization_id: ORG, asset: "var:bv1" } });
  });
  it("anexo null apaga a linha da resposta", async () => {
    const banco = bancoPorTabela({});
    await gravarExtras(banco.db as never, ORG, "t1", { ...base, anexo: null });
    const apagou = banco.escritas.find((e) => e.tabela === "crm_respostas_rapidas_anexos");
    expect(apagou?.op).toBe("delete");
    expect(apagou?.filtros).toEqual(expect.arrayContaining([["eq:organization_id", ORG], ["eq:template_id", "t1"]]));
  });
  it("anexo ausente não mexe no que já está", async () => {
    const banco = bancoPorTabela({});
    await gravarExtras(banco.db as never, ORG, "t1", base);
    expect(banco.escritas.some((e) => e.tabela === "crm_respostas_rapidas_anexos")).toBe(false);
  });
});
