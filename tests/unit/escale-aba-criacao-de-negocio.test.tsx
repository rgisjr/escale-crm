import { fireEvent, render as renderizar, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "o1", role: "admin" } }),
}));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip"] }),
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { AbaCriacaoDeNegocio } from "@/components/escale/conversas/configuracoes/canais/AbaCriacaoDeNegocio";
import { novaRegra } from "@/lib/escale/conversas/criacao-de-negocio";

// A janela do dispositivo vive dentro da tela de configurações, que já tem o provedor das dicas.
const render = (ui: ReactElement) => renderizar(<TooltipProvider>{ui}</TooltipProvider>);

const origens = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    nome: "INSS",
    etapas: [{ id: "a0000000-0000-4000-8000-000000000002", nome: "Entrada" }],
  },
];

describe("AbaCriacaoDeNegocio (16/10-01, c105–c108)", () => {
  it("desligada: o cartão e o aviso de quem nunca configurou; ligar cria a Condição 1", () => {
    const aoMudar = vi.fn();
    render(
      <AbaCriacaoDeNegocio
        rascunho={{ ligado: false, regras: [] }}
        aoMudar={aoMudar}
        configurado={false}
        origens={origens}
        podeEditar
      />,
    );
    expect(screen.getByText("Criar um negócio automaticamente")).toBeInTheDocument();
    expect(screen.getByText(/nascem na origem padrão/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Criar um negócio automaticamente" }));
    expect(aoMudar).toHaveBeenCalledWith(
      expect.objectContaining({
        ligado: true,
        regras: [expect.objectContaining({ nome: "Condição 1", tipo: "igual" })],
      }),
    );
  });

  it("ligada: a condição abre; a segunda tem a lixeira com a confirmação; '+ Adicionar nova condição'", () => {
    const aoMudar = vi.fn();
    const r1 = novaRegra(1);
    const r2 = novaRegra(2);
    render(
      <AbaCriacaoDeNegocio
        rascunho={{ ligado: true, regras: [r1, r2] }}
        aoMudar={aoMudar}
        configurado
        origens={origens}
        podeEditar
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Excluir condição Condição 1" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir condição Condição 2" }));
    expect(screen.getByText("Tem certeza que deseja excluir essa condição?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sim" }));
    expect(aoMudar).toHaveBeenCalledWith({ ligado: true, regras: [r1] });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar nova condição/ }));
    expect(aoMudar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        regras: expect.arrayContaining([expect.objectContaining({ nome: "Condição 3" })]),
      }),
    );
  });

  it("dentro da condição: Enter adiciona a mensagem; 'Qualquer mensagem' esconde o campo", () => {
    const aoMudar = vi.fn();
    render(
      <AbaCriacaoDeNegocio
        rascunho={{ ligado: true, regras: [novaRegra(1)] }}
        aoMudar={aoMudar}
        configurado
        origens={origens}
        podeEditar
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Condição 1" }));
    const campo = screen.getByPlaceholderText("Digite uma ou mais mensagens");
    fireEvent.change(campo, { target: { value: "Quero orçamento" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(aoMudar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        regras: [expect.objectContaining({ mensagens: ["Quero orçamento"] })],
      }),
    );
  });
});
