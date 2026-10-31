// @vitest-environment node
import { describe, expect, it } from "vitest";

import { renderizarVariaveisDoCanal } from "@/lib/canais/variaveis";
import { renderTemplate } from "@/lib/automation/template";
import { renderizarTextoDeFollowup } from "@/lib/automation/texto-do-followup";

const contexto = {
  contact: { name: "Maria Souza" },
  canal: { pix_chave: "51999600190", pix_banco: "Mercado Pago", nome: "joao vendas1" },
  atendente: { nome: "Teresinha" },
};

describe("{{canal.*}} e {{atendente.*}} no template", () => {
  it("renderiza as variáveis do canal", () => {
    const texto = "PIX: {{canal.pix_chave}} ({{canal.pix_banco}}) — {{atendente.nome}}";
    expect(renderTemplate(texto, contexto)).toBe("PIX: 51999600190 (Mercado Pago) — Teresinha");
  });
  it("variável sem valor fica vazia, sem lançar", () => {
    expect(renderTemplate("x{{canal.nao_existe}}y", contexto)).toBe("xy");
  });
  it("o texto do follow-up também resolve o canal", () => {
    expect(renderizarTextoDeFollowup("Oi {{primeiro_nome}}, PIX {{canal.pix_chave}}", contexto)).toBe(
      "Oi Maria, PIX 51999600190",
    );
  });
});

describe("renderizarVariaveisDoCanal", () => {
  it("troca só canal.* e atendente.*, deixando o resto para quem conhece o contato", () => {
    const texto = "Oi {{nome}}, PIX {{canal.pix_chave}} com {{ atendente.nome }} [DEAL.STAGE]";
    expect(renderizarVariaveisDoCanal(texto, contexto)).toBe("Oi {{nome}}, PIX 51999600190 com Teresinha [DEAL.STAGE]");
  });
  it("variável sem valor vira vazio", () => {
    expect(renderizarVariaveisDoCanal("a{{canal.x}}b", contexto)).toBe("ab");
  });
  it("não anda no protótipo", () => {
    expect(renderizarVariaveisDoCanal("{{canal.constructor}}", contexto)).toBe("");
  });
});

describe("regraUsaVariavelDoCanal", () => {
  it("só a regra que escreve {{canal.*}} ou {{atendente.*}} paga as leituras", async () => {
    const { regraUsaVariavelDoCanal } = await import("@/lib/automation/engine");
    const com = [{ type: "send_whatsapp_message", config: { template: "PIX {{ canal.pix_chave }}" } }];
    const sem = [{ type: "send_whatsapp_message", config: { template: "Oi {{nome}}" } }];
    expect(regraUsaVariavelDoCanal(com)).toBe(true);
    expect(regraUsaVariavelDoCanal([{ type: "x", config: { t: "{{atendente.nome}}" } }])).toBe(true);
    expect(regraUsaVariavelDoCanal(sem)).toBe(false);
  });
  it("{{canal.*}} dentro de uma sequência de passos também conta", async () => {
    const { regraUsaVariavelDoCanal } = await import("@/lib/automation/engine");
    const passos = [
      { type: "send_whatsapp_message", config: { passos: [{ tipo: "texto", texto: "PIX {{canal.pix_chave}}" }] } },
    ];
    expect(regraUsaVariavelDoCanal(passos)).toBe(true);
  });
});
