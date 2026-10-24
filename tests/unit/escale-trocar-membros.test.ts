import { describe, expect, it } from "vitest";

import { gravarExtras } from "@/lib/escale/conversas/respostas-banco";
import { trocarMembros } from "@/lib/escale/conversas/setores-banco";
import { ORG_ID, USER_ID } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

const SETOR = "a0000000-0000-4000-8000-000000000001";
const OUTRO = "b0000000-0000-4000-8000-000000000009";
const TEMPLATE = "e0000000-0000-4000-8000-000000000001";

describe("trocarMembros (B4-2 / B1-6)", () => {
  it("entram os novos primeiro e só depois saem os que ficaram de fora", async () => {
    const { db, escritas } = bancoPorTabela({});
    await trocarMembros(db as never, ORG_ID, SETOR, [USER_ID, OUTRO, USER_ID]);
    expect(escritas.map((e) => `${e.tabela}:${e.op}`)).toEqual([
      "crm_setores_membros:upsert",
      "crm_setores_membros:delete",
    ]);
    expect(escritas[0]!.valores).toEqual([
      { organization_id: ORG_ID, setor_id: SETOR, user_id: USER_ID },
      { organization_id: ORG_ID, setor_id: SETOR, user_id: OUTRO },
    ]);
  });

  it("se a entrada falha, nenhum membro antigo é apagado", async () => {
    const comErro = bancoPorTabela(
      {},
      { erros: { crm_setores_membros: { code: "23503", message: "fk" } } },
    );
    await expect(trocarMembros(comErro.db as never, ORG_ID, SETOR, [OUTRO])).rejects.toMatchObject({
      code: "23503",
    });
    expect(comErro.escritas.map((e) => e.op)).toEqual(["upsert"]);
  });

  it("lista vazia só apaga (esvaziar o setor continua possível)", async () => {
    const { db, escritas } = bancoPorTabela({});
    await trocarMembros(db as never, ORG_ID, SETOR, []);
    expect(escritas.map((e) => e.op)).toEqual(["delete"]);
  });
});

describe("gravarExtras (B1-6)", () => {
  const resposta = { canais: [], todos_os_setores: false, setores: [SETOR] };

  it("os setores novos entram antes de saírem os antigos", async () => {
    const { db, escritas } = bancoPorTabela({});
    await gravarExtras(db as never, ORG_ID, TEMPLATE, resposta as never);
    expect(escritas.map((e) => `${e.tabela}:${e.op}`)).toEqual([
      "crm_respostas_rapidas_extras:upsert",
      "crm_respostas_rapidas_setores:upsert",
      "crm_respostas_rapidas_setores:delete",
    ]);
  });

  it("se a entrada dos setores falha, os antigos não são apagados", async () => {
    const { db, escritas } = bancoPorTabela(
      {},
      { erros: { crm_respostas_rapidas_setores: { code: "23503", message: "fk" } } },
    );
    await expect(
      gravarExtras(db as never, ORG_ID, TEMPLATE, resposta as never),
    ).rejects.toMatchObject({ code: "23503" });
    expect(
      escritas.some((e) => e.tabela === "crm_respostas_rapidas_setores" && e.op === "delete"),
    ).toBe(false);
  });

  it("para todos os setores, apaga as linhas por setor sem inserir nada", async () => {
    const { db, escritas } = bancoPorTabela({});
    await gravarExtras(db as never, ORG_ID, TEMPLATE, {
      ...resposta,
      todos_os_setores: true,
    } as never);
    expect(
      escritas.filter((e) => e.tabela === "crm_respostas_rapidas_setores").map((e) => e.op),
    ).toEqual(["delete"]);
  });
});
