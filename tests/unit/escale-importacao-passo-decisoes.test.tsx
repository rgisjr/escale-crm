import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PassoDecisoes } from "@/components/escale/importacao/PassoDecisoes";
import { decisoesDoNivel } from "@/lib/escale/importacao/regras";

const mapa = [
  { csv: "Celular", para: "phone" },
  { csv: "Email", para: "email" },
];

describe("passo Decisões (Fase 2F; print v2-10)", () => {
  it("os três níveis com as contagens do print", () => {
    render(<PassoDecisoes tipo="negocio" mapa={mapa} decisoes={decisoesDoNivel("conservador")} aoMudar={vi.fn()} />);
    const conservador = screen.getByRole("button", { name: /Conservador/ });
    expect(within(conservador).getByText("Recomendado")).toBeInTheDocument();
    expect(conservador).toHaveTextContent("2 auto");
    expect(conservador).toHaveTextContent("6 revisar");
    expect(screen.getByRole("button", { name: /Padrão/ })).toHaveTextContent("4 auto");
    expect(screen.getByRole("button", { name: /Agressivo/ })).toHaveTextContent("2 revisar");
    expect(screen.getByText('Partindo do preset "Conservador"')).toBeInTheDocument();
  });

  it("escolher um nível troca tudo; um botão muda só a situação", () => {
    const aoMudar = vi.fn();
    render(<PassoDecisoes tipo="negocio" mapa={mapa} decisoes={decisoesDoNivel("conservador")} aoMudar={aoMudar} />);
    fireEvent.click(screen.getByRole("button", { name: /Padrão/ }));
    expect(aoMudar).toHaveBeenLastCalledWith(decisoesDoNivel("padrao"));
    const telefone = screen.getByRole("group", { name: "Telefone inválido" });
    fireEvent.click(within(telefone).getByRole("button", { name: "Descartar" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ ...decisoesDoNivel("conservador"), INVALID_PHONE_FORMAT: "SKIP_ROW" });
  });

  it("Contatos sem telefone: as situações de telefone e de negócio somem; a nota das travadas também", () => {
    render(<PassoDecisoes tipo="contato" mapa={[{ csv: "Email", para: "email" }]} decisoes={decisoesDoNivel("conservador")} aoMudar={vi.fn()} />);
    expect(screen.queryByRole("group", { name: "Telefone inválido" })).not.toBeInTheDocument();
    expect(screen.queryByText("Negócios")).not.toBeInTheDocument();
    expect(screen.queryByText(/Linhas que batem com dois contatos/)).not.toBeInTheDocument();
  });
});
