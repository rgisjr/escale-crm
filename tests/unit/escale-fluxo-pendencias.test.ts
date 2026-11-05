import { describe, expect, it } from "vitest";

import type { Desenho } from "@/lib/automation/desenho-da-regra";
import { RECUSA_JANELA_DO_ATRASO } from "@/lib/escale/automacoes/fluxo/caixas";
import { pendenciasDasCaixas } from "@/lib/escale/automacoes/fluxo/pendencias";

const desenho = (caixas: Desenho["caixas"]): Desenho => ({ caixas, ligacoes: [] });
const atraso = (id: string, janela: unknown) => ({
  id,
  type: "atraso" as const,
  position: { x: 0, y: 0 },
  data: { kind: "atraso" as const, quantidade: 5, unidade: "minutos" as const, janela: janela as never },
});
const msg = (id: string, config: Record<string, unknown>) => ({
  id,
  type: "acao" as const,
  position: { x: 0, y: 0 },
  data: { kind: "acao" as const, acao: { type: "send_whatsapp_message", config } },
});

describe("pendenciasDasCaixas", () => {
  it("Atraso com janela incompleta é pendência; janela certa ou sem janela não", () => {
    expect(pendenciasDasCaixas(desenho([atraso("a1", { de: "08:00", ate: "", dias: [1] })]))).toEqual([
      { caixa: "a1", mensagem: RECUSA_JANELA_DO_ATRASO },
    ]);
    expect(pendenciasDasCaixas(desenho([atraso("a1", { de: "08:00", ate: "19:00", dias: [] })]))).toHaveLength(1);
    expect(pendenciasDasCaixas(desenho([atraso("a1", { de: "08:00", ate: "19:00", dias: [1, 2] }), atraso("a2", null)]))).toEqual([]);
  });

  it("mensagem não é conferida aqui: o schema da ação confere na publicação", () => {
    expect(pendenciasDasCaixas(desenho([msg("m1", { channel_session_id: "conversation", template: "" })]))).toEqual([]);
  });
});
