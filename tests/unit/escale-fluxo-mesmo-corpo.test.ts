import { describe, expect, it } from "vitest";

import { desenhoDaRegra, organizar, validarDesenho, type RegraGravada } from "@/lib/automation/desenho-da-regra";
import { achatar, agrupar } from "@/lib/escale/automacoes/fluxo/grupos";
import { organizarNaHorizontal } from "@/lib/escale/automacoes/fluxo/layout";

/**
 * O RISCO DA FASE 5B (PRD, seção 12): o fluxo da casca gravar um corpo diferente
 * do designer de hoje. Os dois desenham a MESMA regra e passam pelo MESMO
 * `validarDesenho`; aqui a prova em 5 regras, inclusive `ai_decide` e condição
 * avançada. A arrumação (vertical ou horizontal) não pode mudar o corpo.
 */
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const U3 = "33333333-3333-4333-8333-333333333333";

type Exemplo = { name: string } & RegraGravada;

const EXEMPLOS: Exemplo[] = [
  {
    name: "Tag de contato",
    trigger_event: "contact.tag_added",
    trigger_config: {},
    conditions: [{ field: "event.added_tags", op: "contains", value: "vip" }],
    actions: [{ type: "add_tag", config: { tags: ["atendido"] } }],
  },
  {
    name: "Formulário com fonte",
    trigger_event: "lead.created",
    trigger_config: { webhook_source_id: U1 },
    conditions: [],
    actions: [{ type: "create_or_move_lead", config: { pipeline_id: U2, stage_id: U3 } }],
  },
  {
    name: "Data do funil",
    trigger_event: "lead.date_field_due",
    trigger_config: { pipeline_id: U2, campo: "casamento", dias: -60 },
    conditions: [{ field: "lead.tags", op: "contains", value: "noiva" }],
    actions: [{ type: "send_whatsapp_message", config: { channel_session_id: U1, template: "Oi [CONTACT.FIRST_NAME]" } }],
  },
  {
    name: "Silêncio do cliente",
    trigger_event: "lead.silent_for",
    trigger_config: { dias: 3, direcao: "do_cliente", proteger_pela_agenda: true },
    conditions: [],
    actions: [
      { type: "create_task", config: { titulo: "Ligar", vence_em_dias: 1, atribuir_a: "dono_do_lead", prioridade: "medium" } },
    ],
  },
  {
    name: "A IA decide",
    trigger_event: "lead.stage_changed",
    trigger_config: {},
    conditions: [{ field: "lead.custom_fields.x", op: "eq", value: "1" }],
    actions: [
      {
        type: "ai_decide",
        config: {
          custo_de_token: true,
          instrucao: "Escolha a tag pelo interesse.",
          opcoes: [
            { id: "a", rotulo: "Quente", acao: { type: "add_tag", config: { tags: ["quente"] } } },
            { id: "b", rotulo: "Frio", acao: { type: "add_tag", config: { tags: ["frio"] } } },
          ],
        },
      },
      { type: "assign_owner", config: { user_id: U3 } },
    ],
  },
];

describe("o fluxo da casca grava o mesmo corpo do designer de hoje", () => {
  for (const r of EXEMPLOS) {
    it(r.name, () => {
      const { name, ...regra } = r;
      const daCasca = validarDesenho({ nome: name, desenho: organizarNaHorizontal(desenhoDaRegra(regra)), regraGravada: regra });
      const deHoje = validarDesenho({ nome: name, desenho: organizar(desenhoDaRegra(regra)), regraGravada: regra });
      // O fluxo da casca agrupa as ações em passos "Ações" na tela e as achata ao gravar.
      const comGrupos = validarDesenho({
        nome: name,
        desenho: achatar(organizarNaHorizontal(agrupar(desenhoDaRegra(regra)))),
        regraGravada: regra,
      });
      expect(comGrupos.ok, JSON.stringify(comGrupos.problemas)).toBe(true);
      expect(comGrupos.corpo).toEqual(deHoje.corpo);
      expect(daCasca.ok, JSON.stringify(daCasca.problemas)).toBe(true);
      expect(daCasca.corpo).toEqual(deHoje.corpo);
      expect(daCasca.corpo).toEqual({
        name,
        trigger_event: regra.trigger_event,
        trigger_config: regra.trigger_config,
        conditions: regra.conditions,
        actions: regra.actions,
      });
    });
  }
});
