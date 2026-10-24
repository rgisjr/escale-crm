import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EventRow } from "@/lib/event-log/dispatcher";
import { POS_ENVIO_PADRAO, type PosEnvio } from "@/lib/escale/campanhas/assistente";
import {
  EVENTO_DO_POS_ENVIO,
  pedirPosEnvio,
  processarPosEnvio,
  temAlgoParaFazer,
  type DependenciasDoPosEnvio,
} from "@/lib/escale/campanhas/pos-envio";
import { bancoDeMentira, chamadasDe } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID } from "@/tests/helpers/stages-db-double";

const CAMPANHA = "dddddddd-0000-4000-8000-000000000001";
const C1 = "bbbbbbbb-0000-4000-8000-000000000001";
const CONV = "ffffffff-0000-4000-8000-000000000001";
const ORIGEM = "cccccccc-0000-4000-8000-000000000001";
const ETAPA = "cccccccc-0000-4000-8000-000000000002";
const DONO = "11111111-1111-4111-8111-111111111112";
const ATENDENTE = "11111111-1111-4111-8111-111111111113";
const CRIADOR = "11111111-1111-4111-8111-111111111111";

const linha = (): EventRow =>
  ({
    id: "ev-1",
    organization_id: ORG_ID,
    event_type: EVENTO_DO_POS_ENVIO,
    entity_kind: "campaign",
    entity_id: CAMPANHA,
    payload: { campaign_id: CAMPANHA },
    metadata: {},
    consumed_by: [],
    attempts: 0,
  }) as EventRow;

function cenario(
  pos: PosEnvio,
  extra: { conversa?: Record<string, unknown>; negocioAberto?: boolean } = {},
) {
  let marcados = false;
  const banco = bancoDeMentira({
    tabelas: {
      campaigns: [
        {
          id: CAMPANHA,
          name: "Reativação",
          status: "completed",
          created_by: CRIADOR,
          started_at: "2026-11-20T10:00:00.000Z",
          escale_pos_envio: pos,
          escale_pos_envio_feito_em: null,
        },
      ],
      campaign_recipients: (c) => {
        if (c.op === "update") {
          marcados = true;
          return [{ id: "r1" }];
        }
        return marcados ? [] : [{ id: "r1", contact_id: C1, conversation_id: CONV }];
      },
      contacts: [
        {
          id: C1,
          name: "Ana",
          display_name: null,
          phone_number: "+5511999990001",
          tags: ["antiga"],
        },
      ],
      conversations: [
        {
          id: CONV,
          status: "open",
          assigned_to_user_id: null,
          created_at: "2026-11-20T10:05:00.000Z",
          metadata: {},
          ...extra.conversa,
        },
      ],
      crm_leads: extra.negocioAberto ? [{ id: "lead-velho", owner_user_id: DONO }] : [],
    },
  });
  const deps: DependenciasDoPosEnvio = {
    db: banco.db as never,
    agora: () => 0,
    mudarContato: vi.fn().mockResolvedValue({}),
    criarNegocio: vi.fn().mockResolvedValue({ id: "lead-novo", owner_user_id: DONO }),
  };
  return { banco, deps };
}

beforeEach(() => vi.clearAllMocks());

describe("temAlgoParaFazer", () => {
  it("o padrão (só 'Em aberto') não pede pós-envio", () => {
    expect(temAlgoParaFazer(POS_ENVIO_PADRAO)).toBe(false);
    expect(temAlgoParaFazer({ ...POS_ENVIO_PADRAO, tags: ["x"] })).toBe(true);
    expect(temAlgoParaFazer({ ...POS_ENVIO_PADRAO, statusDaConversa: "fechada" })).toBe(true);
  });
});

describe("pedirPosEnvio", () => {
  it("emite o evento uma vez quando há o que fazer; não emite no padrão", async () => {
    const com = bancoDeMentira({
      tabelas: { campaigns: [{ escale_pos_envio: { ...POS_ENVIO_PADRAO, tags: ["x"] } }] },
    });
    await pedirPosEnvio(com.db as never, CAMPANHA, ORG_ID);
    expect(com.rpcs).toEqual([
      expect.objectContaining({
        nome: "emit_event",
        args: expect.objectContaining({ p_event_type: EVENTO_DO_POS_ENVIO, p_entity_id: CAMPANHA }),
      }),
    ]);
    const sem = bancoDeMentira({
      tabelas: { campaigns: [{ escale_pos_envio: POS_ENVIO_PADRAO }] },
    });
    await pedirPosEnvio(sem.db as never, CAMPANHA, ORG_ID);
    expect(sem.rpcs).toEqual([]);
  });
});

describe("processarPosEnvio", () => {
  it("tag pelo caminho do contato (emite contact.tag_added), sem repetir as que já tem", async () => {
    const { deps } = cenario({ ...POS_ENVIO_PADRAO, tags: ["antiga", "Reativados"] });
    expect((await processarPosEnvio(linha(), deps)).status).toBe("ok");
    expect(deps.mudarContato).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { type: "webhook_source", id: `campaign:${CAMPANHA}` } }),
      C1,
      { tags: ["antiga", "reativados"] },
    );
    const ctx = vi.mocked(deps.mudarContato).mock.calls[0]![0];
    expect(ctx.requestId.startsWith("rule:")).toBe(false);
  });

  it("negócio na origem com fonte 'campanha', só para quem não tem um aberto nela", async () => {
    const pos = { ...POS_ENVIO_PADRAO, origemId: ORIGEM, etapaId: ETAPA };
    const novo = cenario(pos);
    await processarPosEnvio(linha(), novo.deps);
    expect(novo.deps.criarNegocio).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        pipeline_id: ORIGEM,
        stage_id: ETAPA,
        contact_id: C1,
        source: "campanha",
        source_metadata: { campaign_id: CAMPANHA, campaign_name: "Reativação" },
      }),
    );
    const ja = cenario(pos, { negocioAberto: true });
    await processarPosEnvio(linha(), ja.deps);
    expect(ja.deps.criarNegocio).not.toHaveBeenCalled();
  });

  it("atendente: o dono do negócio quando pedido; senão o escolhido; 'routing'", async () => {
    const { banco, deps } = cenario({
      ...POS_ENVIO_PADRAO,
      origemId: ORIGEM,
      etapaId: ETAPA,
      donoDoNegocio: true,
      atendenteId: ATENDENTE,
    });
    await processarPosEnvio(linha(), deps);
    expect(banco.rpcs).toContainEqual({
      nome: "fn_conversation_assign",
      args: {
        p_organization_id: ORG_ID,
        p_conversation_id: CONV,
        p_to_user_id: DONO,
        p_reason: "routing",
      },
    });
  });

  it("'manter o mesmo atendente' não mexe em atendimento existente que já tem atendente", async () => {
    const { banco, deps } = cenario(
      { ...POS_ENVIO_PADRAO, atendenteId: ATENDENTE, manterAtendente: true },
      { conversa: { assigned_to_user_id: DONO, created_at: "2026-11-01T00:00:00.000Z" } },
    );
    await processarPosEnvio(linha(), deps);
    expect(banco.rpcs.find((r) => r.nome === "fn_conversation_assign")).toBeUndefined();
  });

  it("status: fechar pelo serviço; em espera com o criador; 'manter' respeita o existente", async () => {
    const fechar = cenario({ ...POS_ENVIO_PADRAO, statusDaConversa: "fechada" });
    await processarPosEnvio(linha(), fechar.deps);
    expect(fechar.banco.rpcs).toContainEqual({
      nome: "fn_service_status",
      args: { p_org: ORG_ID, p_conversation: CONV, p_status: "closed" },
    });

    const espera = cenario({ ...POS_ENVIO_PADRAO, statusDaConversa: "em_espera" });
    await processarPosEnvio(linha(), espera.deps);
    const [update] = chamadasDe(espera.banco.chamadas, "conversations", "update");
    expect(update!.dados).toMatchObject({ snoozed_by_user_id: CRIADOR });

    const manter = cenario(
      { ...POS_ENVIO_PADRAO, statusDaConversa: "fechada", manterStatus: true },
      { conversa: { created_at: "2026-11-01T00:00:00.000Z" } },
    );
    await processarPosEnvio(linha(), manter.deps);
    expect(manter.banco.rpcs.find((r) => r.nome === "fn_service_status")).toBeUndefined();
  });

  it("marca o destinatário ANTES de agir e fecha a campanha no fim", async () => {
    const { banco, deps } = cenario({ ...POS_ENVIO_PADRAO, tags: ["x"] });
    await processarPosEnvio(linha(), deps);
    const updates = chamadasDe(banco.chamadas, "campaign_recipients", "update");
    expect(updates[0]!.dados).toHaveProperty("escale_pos_envio_em");
    expect(updates[0]!.filtros).toContainEqual(["is", "escale_pos_envio_em", null]);
    const [fim] = chamadasDe(banco.chamadas, "campaigns", "update");
    expect(fim!.dados).toHaveProperty("escale_pos_envio_feito_em");
  });

  it("campanha que não concluiu ou já foi tratada é pulada", async () => {
    const { deps } = cenario({ ...POS_ENVIO_PADRAO, tags: ["x"] });
    const banco = bancoDeMentira({
      tabelas: {
        campaigns: [{ id: CAMPANHA, status: "cancelled", escale_pos_envio: { tags: ["x"] } }],
      },
    });
    expect((await processarPosEnvio(linha(), { ...deps, db: banco.db as never })).status).toBe(
      "skipped",
    );
  });

  it("orçamento estourado pede para voltar depois", async () => {
    const { deps } = cenario({ ...POS_ENVIO_PADRAO, tags: ["x"] });
    let t = 0;
    const r = await processarPosEnvio(linha(), { ...deps, agora: () => (t += 30_000) });
    expect(r.status).toBe("retry");
  });
});
