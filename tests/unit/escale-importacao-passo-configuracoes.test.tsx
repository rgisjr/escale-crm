import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org-1" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: ["vip", "feira"] }) }));

import { TooltipProvider } from "@/components/ui/tooltip";
import { PassoConfiguracoes, podeContinuarConfiguracoes } from "@/components/escale/importacao/PassoConfiguracoes";

const destinos = [
  { id: "o-1", nome: "Leads INSS Whatsapp", grupo: null, etapas: [{ id: "e-1", nome: "1. Entrada Lead" }], motivos: [{ valor: "price", rotulo: "Preço" }] },
];
const base = { tags: [], origemId: null, etapaId: null, status: "open" as const, motivoDePerda: null };

describe("passo Configurações (Fase 2F; print v2-09)", () => {
  it("Contatos: só as tags, com o subtítulo de contatos", () => {
    render(<PassoConfiguracoes tipo="contato" config={base} destinos={[]} podeGanhar={false} aoMudar={vi.fn()} />);
    expect(screen.getByText("Etiquete os contatos importados. Vale para todas as linhas do arquivo.")).toBeInTheDocument();
    expect(screen.queryByText("Origem de destino")).not.toBeInTheDocument();
  });

  it("Negócios: escolher a origem leva à primeira etapa; Ganho desligado para quem não é admin", () => {
    const aoMudar = vi.fn();
    render(
      <TooltipProvider>
        <PassoConfiguracoes tipo="negocio" config={base} destinos={destinos} podeGanhar={false} aoMudar={aoMudar} />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Origem de destino" }));
    fireEvent.click(screen.getByRole("option", { name: "Leads INSS Whatsapp" }));
    expect(aoMudar).toHaveBeenCalledWith({ ...base, origemId: "o-1", etapaId: "e-1", motivoDePerda: null });
    expect(screen.getByRole("button", { name: /Ganho/ })).toBeDisabled();
  });

  it("Perdido mostra o motivo; continuar exige origem e etapa em Negócios", () => {
    render(
      <PassoConfiguracoes tipo="negocio" config={{ ...base, origemId: "o-1", etapaId: "e-1", status: "lost" }} destinos={destinos} podeGanhar aoMudar={vi.fn()} />,
    );
    expect(screen.getByRole("combobox", { name: "Motivo de perda" })).toHaveTextContent("Não informar");
    expect(podeContinuarConfiguracoes("negocio", base)).toBe(false);
    expect(podeContinuarConfiguracoes("negocio", { ...base, origemId: "o-1", etapaId: "e-1" })).toBe(true);
    expect(podeContinuarConfiguracoes("contato", base)).toBe(true);
  });
});
