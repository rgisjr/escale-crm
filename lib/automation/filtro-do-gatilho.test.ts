import { describe, expect, it } from "vitest";

import { gatilhoCasaComAConfig, tagsDoGatilho } from "@/lib/automation/filtro-do-gatilho";
import { createAutomationRuleSchema } from "@/lib/schemas/webhooks";

const FUNIL = "11111111-1111-4111-8111-111111111111";
const OUTRO_FUNIL = "22222222-2222-4222-8222-222222222222";
const ETAPA = "33333333-3333-4333-8333-333333333333";
const ACAO = [{ type: "add_tag", config: { tags: ["x"] } }];

describe("gatilho de tag", () => {
  it("sem tags escolhidas dispara com qualquer tag (regras antigas seguem iguais)", () => {
    expect(gatilhoCasaComAConfig("contact.tag_added", {}, { added_tags: ["qualquer"] })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.tag_added", { tags: [] }, { added_tags: ["qualquer"] })).toBe(true);
  });

  it("com tags escolhidas só dispara quando uma delas foi adicionada, sem diferenciar caixa", () => {
    const config = { tags: ["VIP", "cliente"] };
    expect(gatilhoCasaComAConfig("contact.tag_added", config, { added_tags: ["vip"] })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.tag_added", config, { added_tags: ["novo", "Cliente"] })).toBe(true);
    expect(gatilhoCasaComAConfig("contact.tag_added", config, { added_tags: ["novo"] })).toBe(false);
    expect(gatilhoCasaComAConfig("contact.tag_added", config, {})).toBe(false);
  });

  it("configuração torta nunca dispara", () => {
    expect(gatilhoCasaComAConfig("contact.tag_added", { tags: "vip" }, { added_tags: ["vip"] })).toBe(false);
  });

  it("tagsDoGatilho devolve as tags gravadas, ou [] quando não há", () => {
    expect(tagsDoGatilho({ tags: [" vip ", "cliente"] })).toEqual(["vip", "cliente"]);
    expect(tagsDoGatilho({})).toEqual([]);
    expect(tagsDoGatilho(null)).toEqual([]);
    expect(tagsDoGatilho({ tags: [1, 2] })).toEqual([]);
  });
});

describe("gatilho Negócio criado", () => {
  it("sem origem dispara em qualquer criação, com ou sem fonte de formulário gravada", () => {
    expect(gatilhoCasaComAConfig("lead.created", {}, { pipeline_id: FUNIL, stage_id: ETAPA })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.created", { webhook_source_id: null }, { pipeline_id: FUNIL })).toBe(true);
  });

  it("com origem e etapa, só o negócio que nasceu ali", () => {
    const config = { pipeline_id: FUNIL, stage_id: ETAPA };
    expect(gatilhoCasaComAConfig("lead.created", config, { pipeline_id: FUNIL, stage_id: ETAPA })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.created", config, { pipeline_id: OUTRO_FUNIL, stage_id: ETAPA })).toBe(false);
    expect(gatilhoCasaComAConfig("lead.created", { pipeline_id: FUNIL }, { pipeline_id: FUNIL, stage_id: "outra" })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.created", config, { pipeline_id: FUNIL, stage_id: "outra" })).toBe(false);
  });

  it("sem origem no payload usa a do negócio", () => {
    expect(gatilhoCasaComAConfig("lead.created", { pipeline_id: FUNIL }, {}, { pipeline_id: FUNIL })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.created", { pipeline_id: FUNIL }, {}, null)).toBe(false);
  });

  it("outros gatilhos não são recortados aqui", () => {
    expect(gatilhoCasaComAConfig("lead.won", { tags: ["x"] }, {})).toBe(true);
  });
});

describe("a porta da regra", () => {
  const regra = (trigger_event: string, trigger_config: Record<string, unknown>) =>
    createAutomationRuleSchema.safeParse({ name: "r", trigger_event, conditions: [], actions: ACAO, trigger_config });

  it("aceita tags e origem/etapa válidas, e o null que limpa", () => {
    expect(regra("contact.tag_added", { tags: ["vip"] }).success).toBe(true);
    expect(regra("lead.created", { pipeline_id: FUNIL, stage_id: ETAPA, webhook_source_id: null }).success).toBe(true);
    expect(regra("lead.created", { pipeline_id: null, stage_id: null }).success).toBe(true);
  });

  it("recusa etapa sem origem, origem que não é uuid e tags demais", () => {
    expect(regra("lead.created", { stage_id: ETAPA }).success).toBe(false);
    expect(regra("lead.created", { pipeline_id: "vendas" }).success).toBe(false);
    expect(regra("lead.tag_added", { tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }).success).toBe(false);
  });
});
