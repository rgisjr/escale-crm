import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  processarAcaoDaFila,
  type DependenciasDaMassa,
} from "@/lib/escale/conversas/massa/executar";
import type { EventRow } from "@/lib/event-log/dispatcher";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

const ORG = "a0000000-0000-4000-8000-0000000000aa";
const PESSOA = "b0000000-0000-4000-8000-0000000000bb";
const ACAO = "c0000000-0000-4000-8000-0000000000cc";
const CV1 = "d0000000-0000-4000-8000-000000000001";
const linhaDaAcao = (acao: string, parametros: Record<string, unknown>) => ({
  id: ACAO,
  organization_id: ORG,
  user_id: PESSOA,
  acao,
  parametros,
  status: "na_fila",
  total: 1,
  feitos: 0,
  falhas: 0,
  erros: [],
});
const conversa = (extra: Record<string, unknown> = {}) => ({
  id: CV1,
  organization_id: ORG,
  status: "closed",
  service_revision: 3,
  assigned_to_user_id: null,
  snooze_until: null,
  metadata: {},
  contact_id: "ct1",
  channel_session_id: "cs1",
  ...extra,
});
const row = {
  id: "e1",
  organization_id: ORG,
  payload: { acao_id: ACAO },
  attempts: 1,
} as unknown as EventRow;

/**
 * O banco de mentira devolve as linhas sem olhar os filtros; os itens da ação só
 * vêm nas duas primeiras leituras (a do lote e a que os marca feitos) e depois
 * vêm vazios, como no banco de verdade com `feito = false`.
 */
function deps(tabelas: Parameters<typeof bancoPorTabela>[0]) {
  const itens = tabelas.crm_acoes_em_massa_conversas_itens ?? [];
  let leituras = 0;
  const comItensUmaVez: typeof tabelas = { ...tabelas };
  Object.defineProperty(comItensUmaVez, "crm_acoes_em_massa_conversas_itens", {
    enumerable: true,
    get: () => ((leituras += 1) <= 2 ? itens : []),
  });
  const b = bancoPorTabela(comItensUmaVez, { rpc: () => ({ data: [{}], error: null }) });
  const d: DependenciasDaMassa = {
    db: b.db as never,
    agora: () => 0,
    mudarContato: vi.fn(async () => undefined),
    transferirSetor: vi.fn(async () => "transferida" as const),
  };
  return { ...b, d };
}

beforeEach(() => vi.clearAllMocks());

describe("processarAcaoDaFila (N14)", () => {
  it("Em aberto: reabre a fechada pela fn_service_status, grava o evento e conclui", async () => {
    const { db, d, escritas } = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("status", { status: "em_aberto" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa()],
    });
    const r = await processarAcaoDaFila(row, d);
    expect(r.status).toBe("ok");
    expect(db.rpc).toHaveBeenCalledWith("fn_service_status", {
      p_org: ORG,
      p_conversation: CV1,
      p_status: "open",
      p_expected: 3,
    });
    expect(escritas.find((e) => e.tabela === "crm_eventos_da_conversa")?.valores).toMatchObject({
      tipo: "reaberto",
      user_id: PESSOA,
    });
    expect(escritas.at(-1)).toMatchObject({
      tabela: "crm_acoes_em_massa_conversas",
      valores: { status: "concluida", feitos: 1, falhas: 0 },
    });
  });

  it("Em espera: o snooze sem fim da 3B", async () => {
    const { d, escritas } = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("status", { status: "em_espera" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "open" })],
    });
    await processarAcaoDaFila(row, d);
    expect(escritas.find((e) => e.tabela === "conversations")?.valores).toMatchObject({
      snooze_until: "9999-12-31T00:00:00.000Z",
    });
  });

  it("Atendente: transfer para a pessoa, release para 'Sem atendente'", async () => {
    const { db, d } = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("atendente", { user_id: null })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "claimed", assigned_to_user_id: PESSOA })],
    });
    await processarAcaoDaFila(row, d);
    expect(db.rpc).toHaveBeenCalledWith(
      "fn_conversation_assign",
      expect.objectContaining({ p_conversation_id: CV1, p_to_user_id: null, p_reason: "release" }),
    );
  });

  it("Setor e tag usam as peças comuns; arquivada falha com o motivo", async () => {
    const setor = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("setor", { setor_id: "s1" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "open" })],
    });
    await processarAcaoDaFila(row, setor.d);
    expect(setor.d.transferirSetor).toHaveBeenCalledWith(
      expect.anything(),
      ORG,
      expect.objectContaining({ id: CV1 }),
      "s1",
      PESSOA,
    );

    const tag = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("incluir_tag", { tag: "VIP" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "open" })],
      contacts: [{ id: "ct1", tags: ["lead"] }],
    });
    await processarAcaoDaFila(row, tag.d);
    expect(tag.d.mudarContato).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: ORG }),
      "ct1",
      { tags: ["lead", "vip"] },
    );

    const arq = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("status", { status: "fechado" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "archived" })],
    });
    await processarAcaoDaFila(row, arq.d);
    expect(arq.escritas.at(-1)?.valores).toMatchObject({
      status: "concluida",
      feitos: 0,
      falhas: 1,
      erros: [{ conversa: CV1, motivo: "A conversa está arquivada." }],
    });
  });

  it("ação que não está na fila é pulada", async () => {
    const { d } = deps({
      crm_acoes_em_massa_conversas: [
        { ...linhaDaAcao("status", { status: "fechado" }), status: "concluida" },
      ],
    });
    expect((await processarAcaoDaFila(row, d)).status).toBe("ok");
  });
});
