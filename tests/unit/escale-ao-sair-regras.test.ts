import { describe, expect, it } from "vitest";

import { ehAvanco, faltandoAoEncerrar, faltandoAoMover } from "@/lib/escale/configuracoes/ao-sair";
import type { BoardData, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

const E1 = "aaaaaaaa-0000-4000-8000-000000000001";
const E2 = "aaaaaaaa-0000-4000-8000-000000000002";
const E3 = "aaaaaaaa-0000-4000-8000-000000000003";
const GANHO = "aaaaaaaa-0000-4000-8000-0000000000a1";
const PERDA = "aaaaaaaa-0000-4000-8000-0000000000a2";

function etapa(id: string, position: number, extra: Partial<Stage> = {}): Stage {
  return {
    id,
    organization_id: "o",
    pipeline_id: "p",
    name: id,
    slug: id,
    position,
    color: null,
    is_won: false,
    is_lost: false,
    is_archived: false,
    expected_duration_hours: null,
    ...extra,
  } as Stage;
}

const ETAPAS = [
  etapa(E1, 1),
  etapa(E2, 2),
  etapa(E3, 3),
  etapa(GANHO, 4, { is_won: true }),
  etapa(PERDA, 0.5, { is_lost: true }),
];

const SETTINGS = {
  fields: [
    { key: "proposta", label: "Proposta", type: "text" },
    { key: "cnpj", label: "CNPJ", type: "text", obrigatorio_em: { etapas: [E3] } },
    {
      key: "oculto",
      label: "Oculto",
      type: "text",
      mostrar_quando: { campo: "cnpj", operador: "igual", valor: "x" },
    },
    { key: "aceite", label: "Aceite", type: "boolean", obrigatorio_em: { ao_perder: true } },
  ],
  escale_ao_sair: { proposta: [E1], oculto: [E1] },
};

const QUADRO = { pipeline: { settings: SETTINGS }, stages: ETAPAS } as unknown as BoardData;

function negocio(stageId: string, campos: Record<string, unknown> = {}): Lead {
  return {
    id: "l1",
    stage_id: stageId,
    custom_fields: campos,
    won_reason: null,
  } as unknown as Lead;
}

describe("ehAvanco", () => {
  it("para a direita é avanço; para a esquerda e a mesma etapa, não", () => {
    expect(ehAvanco(ETAPAS, E1, E2)).toBe(true);
    expect(ehAvanco(ETAPAS, E2, E1)).toBe(false);
    expect(ehAvanco(ETAPAS, E1, E1)).toBe(false);
  });

  it("ganho e perda são avanço, mesmo com a perda à esquerda", () => {
    expect(ehAvanco(ETAPAS, E2, GANHO)).toBe(true);
    expect(ehAvanco(ETAPAS, E2, PERDA)).toBe(true);
  });

  it("sair do ganho ou da perda (reabrir) não é avanço; etapa desconhecida também não", () => {
    expect(ehAvanco(ETAPAS, GANHO, E3)).toBe(false);
    expect(ehAvanco(ETAPAS, E1, "x")).toBe(false);
  });
});

describe("faltandoAoMover", () => {
  it("avançar da etapa com 'ao sair' pede o campo; o campo escondido não é cobrado", () => {
    expect(faltandoAoMover({ quadro: QUADRO, lead: negocio(E1), paraStageId: E2 })).toEqual([
      { chave: "proposta", rotulo: "Proposta", tipo: "text" },
    ]);
  });

  it("voltar para trás passa livre", () => {
    const lead = negocio(E2);
    const quadro = {
      ...QUADRO,
      pipeline: { settings: { ...SETTINGS, escale_ao_sair: { proposta: [E2] } } },
    } as unknown as BoardData;
    expect(faltandoAoMover({ quadro, lead, paraStageId: E1 })).toEqual([]);
  });

  it("junta o 'ao sair' da etapa atual com o 'ao entrar' do destino, sem repetir", () => {
    const quadro = {
      ...QUADRO,
      pipeline: { settings: { ...SETTINGS, escale_ao_sair: { proposta: [E2], cnpj: [E2] } } },
    } as unknown as BoardData;
    expect(
      faltandoAoMover({ quadro, lead: negocio(E2), paraStageId: E3 }).map((c) => c.chave),
    ).toEqual(["proposta", "cnpj"]);
  });

  it("os valores que o diálogo trouxe contam como preenchidos", () => {
    expect(
      faltandoAoMover({
        quadro: QUADRO,
        lead: negocio(E1),
        paraStageId: E2,
        customFieldsPropostos: { proposta: "PDF" },
      }),
    ).toEqual([]);
  });

  it("mover dentro da mesma etapa nunca pede nada", () => {
    expect(faltandoAoMover({ quadro: QUADRO, lead: negocio(E3), paraStageId: E3 })).toEqual([]);
  });

  it("'Todas as etapas' no ao sair vale para qualquer etapa aberta", () => {
    const quadro = {
      ...QUADRO,
      pipeline: { settings: { ...SETTINGS, escale_ao_sair: { proposta: ["all"] } } },
    } as unknown as BoardData;
    expect(
      faltandoAoMover({ quadro, lead: negocio(E2), paraStageId: E3 }).map((c) => c.chave),
    ).toEqual(["proposta", "cnpj"]);
  });
});

describe("faltandoAoEncerrar", () => {
  it("perder pede o 'ao sair' da etapa atual e o 'ao perder'", () => {
    expect(
      faltandoAoEncerrar({
        settings: SETTINGS,
        stages: ETAPAS,
        lead: negocio(E1),
        desfecho: "lost",
      }).map((c) => c.chave),
    ).toEqual(["proposta", "aceite"]);
  });

  it("ganhar pede o 'ao sair', mas nunca o motivo do ganho (esse é do fluxo de ganhar)", () => {
    const settings = { ...SETTINGS, won_reason_required: true };
    expect(
      faltandoAoEncerrar({ settings, stages: ETAPAS, lead: negocio(E1), desfecho: "won" }).map(
        (c) => c.chave,
      ),
    ).toEqual(["proposta"]);
  });

  it("negócio já na etapa de ganho não tem 'ao sair'", () => {
    expect(
      faltandoAoEncerrar({
        settings: SETTINGS,
        stages: ETAPAS,
        lead: negocio(GANHO),
        desfecho: "won",
      }),
    ).toEqual([]);
  });
});
