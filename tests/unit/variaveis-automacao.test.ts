import { beforeEach, describe, expect, it, vi } from "vitest";

const { carregarFontes } = vi.hoisted(() => ({
  carregarFontes: vi.fn(async () => ({
    contato: { id: "c-1", nome: "Ana Paula", email: null, telefone: null },
    usuario: { nome: "Régis Marques", email: null },
  })),
}));
vi.mock("@/lib/variaveis/fontes", () => ({ carregarFontes }));

import { fontesDaAutomacao } from "@/lib/automation/fontes-da-automacao";
import { renderTemplate } from "@/lib/automation/template";

/** FORK ESCALE · Frente V (Task 5): o envio da automação com os tokens da Clint. */
const ctx = {
  admin: {} as never,
  organizationId: "org-1",
  context: { contact: { id: "c-1", name: "Ana Paula" }, lead: { id: "l-1", owner_user_id: "u-1" } },
};

describe("fontesDaAutomacao", () => {
  beforeEach(() => carregarFontes.mockClear());

  it("texto só com o formato antigo não consulta nada", async () => {
    expect(await fontesDaAutomacao(ctx, ["Oi {{nome}}", "{{lead.title}}"])).toBeNull();
    expect(carregarFontes).not.toHaveBeenCalled();
  });

  it("com token novo, carrega com o contato, o negócio e o responsável (D3)", async () => {
    const fontes = await fontesDaAutomacao(ctx, ["Oi [CONTACT.FIRST_NAME]", "sou [USER.FIRST_NAME]"]);
    expect(carregarFontes).toHaveBeenCalledWith(
      ctx.admin,
      ctx.admin,
      "org-1",
      { contactId: "c-1", leadId: "l-1", usuarioId: "u-1" },
      ["CONTACT.FIRST_NAME", "USER.FIRST_NAME"],
    );
    expect(renderTemplate("Oi [CONTACT.FIRST_NAME] ({{nome}}), sou [USER.FIRST_NAME]", ctx.context, undefined, fontes)).toBe(
      "Oi Ana (Ana Paula), sou Régis",
    );
  });
});
