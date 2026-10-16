import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/contacts/NewContactDialog", () => ({
  NewContactDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Novo contato" /> : null),
}));

import { AjudaDoTopo } from "@/components/escale/menu/AjudaDoTopo";
import { BotaoDaIa } from "@/components/escale/menu/BotaoDaIa";
import { NovoDoTopo } from "@/components/escale/menu/NovoDoTopo";
import { ACOES_DE_CRIAR } from "@/lib/escale/menu-do-topo";

const u = () => userEvent.setup({ pointerEventsCheck: 0 });
const CONTATO_E_CAMPANHA = ACOES_DE_CRIAR.filter((a) => a.id !== "proposta");

describe("✦ (IA)", () => {
  it("leva ao hub de IA", () => {
    render(<BotaoDaIa destino="/app/ai" />);
    expect(screen.getByRole("link", { name: "Agente de IA" })).toHaveAttribute("href", "/app/ai");
  });

  it("sem tela de IA visível, some", () => {
    render(<BotaoDaIa destino={null} />);
    expect(screen.queryByRole("link", { name: "Agente de IA" })).toBeNull();
  });
});

describe('"?" (ajuda)', () => {
  it("abre o painel com os atalhos que existem", async () => {
    const ator = u();
    render(<AjudaDoTopo />);
    expect(screen.getByRole("button", { name: "Ajuda" })).toHaveTextContent("?");
    await ator.click(screen.getByRole("button", { name: "Ajuda" }));
    expect(screen.getByText("Atalhos do teclado")).toBeInTheDocument();
    expect(screen.getByText("Buscar uma tela")).toBeInTheDocument();
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    expect(screen.getByText("Trocar o tema")).toBeInTheDocument();
    expect(screen.getByText("⌘⇧L")).toBeInTheDocument();
  });
});

describe('"Novo +"', () => {
  it("lista o que a pessoa pode criar; campanha vai para a tela de criar", async () => {
    const ator = u();
    render(<NovoDoTopo acoes={CONTATO_E_CAMPANHA} />);
    await ator.click(screen.getByRole("button", { name: "Novo" }));
    expect(screen.getByRole("menuitem", { name: "Contato" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Campanha" })).toHaveAttribute("href", "/app/campaigns/new");
    expect(screen.queryByRole("menuitem", { name: "Proposta" })).toBeNull();
  });

  it("Contato abre a janela de novo contato na própria tela", async () => {
    const ator = u();
    render(<NovoDoTopo acoes={CONTATO_E_CAMPANHA} />);
    await ator.click(screen.getByRole("button", { name: "Novo" }));
    await ator.click(screen.getByRole("menuitem", { name: "Contato" }));
    expect(await screen.findByRole("dialog", { name: "Novo contato" })).toBeInTheDocument();
  });

  it("sem nada para criar, o botão some", () => {
    render(<NovoDoTopo acoes={[]} />);
    expect(screen.queryByRole("button", { name: "Novo" })).toBeNull();
  });
});
