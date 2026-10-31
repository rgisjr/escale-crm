/**
 * `remove_tag` tira as tags pedidas do LEAD do contexto (ou do contato, sem lead), lendo as tags
 * GRAVADAS no banco — não a foto do contexto — e gravando só filtrando `organization_id` e `id`.
 */
import { describe, expect, it } from "vitest";

import { getAction } from "@/lib/automation/actions";
import "@/lib/automation/actions/remove-tag";
import type { ActionCtx } from "@/lib/automation/types";

const ORG = "88800000-0000-4000-8000-000000000001";

/** Banco de mentira: tags por linha; registra o que foi gravado e os filtros usados. */
function banco(inicial: Record<string, string[]>) {
  const linhas: Record<string, string[]> = { ...inicial };
  const gravacoes: Array<{ tabela: string; tags: string[]; filtros: Record<string, string> }> = [];
  const admin = {
    from(tabela: string) {
      const filtros: Record<string, string> = {};
      const leitura = {
        eq(coluna: string, valor: string) {
          filtros[coluna] = valor;
          return leitura;
        },
        async maybeSingle() {
          const id = filtros.id ?? "";
          return { data: id in linhas ? { id, tags: linhas[id] } : null, error: null };
        },
      };
      return {
        select: () => leitura,
        update(payload: { tags: string[] }) {
          const escrita = {
            eq(coluna: string, valor: string) {
              filtros[coluna] = valor;
              return escrita;
            },
            then(resolve: (v: unknown) => void) {
              linhas[filtros.id ?? ""] = payload.tags;
              gravacoes.push({ tabela, tags: payload.tags, filtros: { ...filtros } });
              resolve({ error: null });
            },
          };
          return escrita;
        },
      };
    },
  } as unknown as ActionCtx["admin"];
  return { admin, linhas, gravacoes };
}

const executar = (admin: ActionCtx["admin"], context: Record<string, unknown>, config: Record<string, unknown>) =>
  getAction("remove_tag")!.execute(
    { admin, organizationId: ORG, ruleId: "r1", ruleName: "r", event: {} as never, context, requestId: "req" } as ActionCtx,
    config,
  );

describe("remove_tag", () => {
  it("tira a tag pedida e mantém as outras", async () => {
    const { admin, linhas } = banco({ L1: ["Tem interese", "Já testou"] });
    const r = await executar(admin, { lead: { id: "L1", tags: ["velha"] } }, { tags: ["Tem interese"] });
    expect(r.status).toBe("success");
    expect(linhas.L1).toEqual(["Já testou"]);
  });

  it("tag que o lead não tem: sucesso sem escrever (idempotente)", async () => {
    const { admin, gravacoes } = banco({ L1: ["Já testou"] });
    const r = await executar(admin, { lead: { id: "L1" } }, { tags: ["Tem interese"] });
    expect(r).toMatchObject({ status: "success", detail: { removed: [] } });
    expect(gravacoes).toHaveLength(0);
  });

  it("sem lead nem contato no contexto: skipped", async () => {
    const { admin } = banco({});
    const r = await executar(admin, {}, { tags: ["x"] });
    expect(r).toMatchObject({ status: "skipped", detail: { reason: "missing_input" } });
  });

  it("sem tags na config: skipped", async () => {
    const { admin } = banco({ L1: ["a"] });
    expect(await executar(admin, { lead: { id: "L1" } }, { tags: [] })).toMatchObject({ status: "skipped" });
  });

  it("grava filtrando organization_id e o id do lead", async () => {
    const { admin, gravacoes } = banco({ L1: ["a", "b"] });
    await executar(admin, { lead: { id: "L1" } }, { tags: ["a"] });
    expect(gravacoes[0]).toMatchObject({ tabela: "crm_leads", tags: ["b"], filtros: { id: "L1", organization_id: ORG } });
  });

  it("sem lead, tira do contato", async () => {
    const { admin, gravacoes } = banco({ C1: ["a", "b"] });
    await executar(admin, { contact: { id: "C1" } }, { tags: ["b"] });
    expect(gravacoes[0]).toMatchObject({ tabela: "contacts", tags: ["a"] });
  });

  it("compara sem diferenciar caixa, para a tag certa sair mesmo digitada diferente", async () => {
    const { admin, linhas } = banco({ L1: ["Tem Interese", "x"] });
    await executar(admin, { lead: { id: "L1" } }, { tags: ["tem interese"] });
    expect(linhas.L1).toEqual(["x"]);
  });
});
