import { describe, expect, it } from "vitest";

import {
  GRUPOS_DO_HISTORICO,
  casaComABusca,
  grupoDoEvento,
  textoDoEvento,
  tiposDoGrupo,
} from "@/lib/escale/negocio/historico";
import { secoesDoHistorico } from "@/lib/escale/negocio/regras";
import type { TimelineItemView } from "@/lib/types/contacts";

/** FORK ESCALE · Fase 1H (C18, N12): os grupos, os textos e a busca do Histórico da Clint. */
const t = (s: string) => s;
const etapas = { e1: "1. Entrada Lead", e2: "2. Qualificação" };
const item = (type: string, extra: Partial<TimelineItemView> = {}): TimelineItemView =>
  ({
    id: type,
    type,
    performed_at: "2026-10-17T10:00:00Z",
    payload: {},
    metadata: {},
    source_module: "crm",
    actor_kind: "user",
    actor_user_name: "Ana",
    reason: "",
    ...extra,
  }) as TimelineItemView;

describe("grupos (os 16 da Clint, na ordem do print 12)", () => {
  it("a lista começa por Todos e tem os 16 rótulos", () => {
    expect(GRUPOS_DO_HISTORICO.map((g) => g.rotulo)).toEqual([
      "Todos",
      "Agendamentos",
      "Automações",
      "Atividades",
      "Notas",
      "Email",
      "Lembretes",
      "Ligação",
      "Negócio criado",
      "Clique para WhatsApp",
      "Alterações negócio",
      "Alteração de campos",
      "Integrações",
      "Campanhas",
      "Mescla de contatos",
      "Anexos",
    ]);
  });
  it("tiposDoGrupo: todos = sem filtro; automações = na tela; os outros têm a lista de types", () => {
    expect(tiposDoGrupo("todos")).toBeNull();
    expect(tiposDoGrupo("automacoes")).toBeNull();
    expect(tiposDoGrupo("notas")).toEqual(["note"]);
    expect(tiposDoGrupo("negocio_criado")).toEqual(["lead_created"]);
    expect(tiposDoGrupo("ligacao")).toEqual([
      "voice_call",
      "voice_call_missed",
      "voice_call_unanswered",
    ]);
    expect(tiposDoGrupo("email")).toEqual([]);
  });
  it("grupoDoEvento: pelo type; automação pelo source_module webhook", () => {
    expect(grupoDoEvento(item("task_completed"))).toBe("atividades");
    expect(grupoDoEvento(item("stage_changed"))).toBe("alteracoes_negocio");
    expect(grupoDoEvento(item("lead_edited"))).toBe("alteracao_de_campos");
    expect(
      grupoDoEvento(item("stage_changed", { source_module: "webhook", actor_kind: "system" })),
    ).toBe("automacoes");
    expect(grupoDoEvento(item("contacts_merged"))).toBe("mescla_de_contatos");
    expect(grupoDoEvento(item("xyz_desconhecido"))).toBe("alteracoes_negocio");
  });
});

describe("textoDoEvento", () => {
  it("etapa: título e corpo da Clint com os nomes do quadro", () => {
    const r = textoDoEvento(
      item("stage_changed", { payload: { from_stage_id: "e1", to_stage_id: "e2" } }),
      etapas,
      t,
    );
    expect(r.titulo).toBe("Mudou de etapa");
    expect(r.trechos).toEqual([
      { texto: "Esta oportunidade passou da etapa " },
      { texto: "1. Entrada Lead", negrito: true },
      { texto: " para a etapa " },
      { texto: "2. Qualificação", negrito: true },
    ]);
  });
  it("campos: um ou vários; dono vira 'Mudou de usuário'", () => {
    expect(
      textoDoEvento(
        item("lead_edited", { payload: { fields: ["value_cents"] }, reason: "Alterou valor" }),
        etapas,
        t,
      ).titulo,
    ).toBe("Campo do negócio alterado");
    expect(
      textoDoEvento(
        item("lead_edited", {
          payload: { fields: ["value_cents", "tags"] },
          reason: "Alterou valor, tags",
        }),
        etapas,
        t,
      ).titulo,
    ).toBe("Campos do negócio alterados");
    expect(
      textoDoEvento(item("lead_edited", { payload: { fields: ["owner_user_id"] } }), etapas, t)
        .titulo,
    ).toBe("Mudou de usuário");
  });
  it("nota, negócio criado e origem; o resto usa o rótulo do original e o reason", () => {
    expect(textoDoEvento(item("note"), etapas, t).titulo).toBe("Nova nota");
    expect(textoDoEvento(item("lead_created"), etapas, t).titulo).toBe("Negócio criado");
    expect(
      textoDoEvento(item("moved_from_pipeline", { reason: "Veio do funil X" }), etapas, t),
    ).toEqual({ titulo: "Mudou de origem", trechos: [{ texto: "Veio do funil X" }] });
    expect(
      textoDoEvento(item("task_completed", { reason: "Ligação feita" }), etapas, t).trechos,
    ).toEqual([{ texto: "Ligação feita" }]);
  });
});

describe("busca na tela", () => {
  it("acha no título, no corpo e no autor, sem acento", () => {
    const i = item("stage_changed", { payload: { from_stage_id: "e1", to_stage_id: "e2" } });
    expect(casaComABusca(i, "qualificacao", t, etapas)).toBe(true);
    expect(casaComABusca(i, "mudou de etapa", t, etapas)).toBe(true);
    expect(casaComABusca(i, "ana", t, etapas)).toBe(true);
    expect(casaComABusca(i, "xyz", t, etapas)).toBe(false);
    expect(casaComABusca(i, "", t, etapas)).toBe(true);
  });
});

describe("seções: Hoje, Ontem, Esta semana e a data (Clint)", () => {
  it("rotula pelo dia do evento em relação a agora", () => {
    const agora = new Date(2026, 9, 17, 12); // sábado 17/10/2026
    const s = secoesDoHistorico(
      [
        { id: "a", performed_at: new Date(2026, 9, 17, 9).toISOString() },
        { id: "b", performed_at: new Date(2026, 9, 16, 9).toISOString() },
        { id: "c", performed_at: new Date(2026, 9, 13, 9).toISOString() },
        { id: "d", performed_at: new Date(2026, 8, 15, 9).toISOString() },
      ],
      agora,
    );
    expect(s.map((x) => x.rotulo)).toEqual(["Hoje", "Ontem", "Esta semana", "15 Set"]);
  });
});
