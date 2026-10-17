import { readFileSync } from "node:fs";
import { join } from "node:path";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { PrazoDoCard } from "@/components/escale/configuracoes/PilulaDoPrazo";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import type { BoardData } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

const E1 = "aaaaaaaa-0000-4000-8000-000000000001";
const EG = "aaaaaaaa-0000-4000-8000-000000000003";
const lead = (stage: string) =>
  ({ id: "l1", pipeline_id: "f-1", stage_id: stage }) as unknown as Lead;

function comQuadro(alerta: unknown, filho: ReactNode) {
  const qc = new QueryClient();
  qc.setQueryData(chaveDoQuadro("f-1"), {
    pipeline: { id: "f-1", settings: { escale_alerta_tempo: alerta } },
    stages: [
      { id: E1, position: 1, is_won: false, is_lost: false },
      { id: EG, position: 2, is_won: true, is_lost: false },
    ],
    leads: [],
  } as unknown as BoardData);
  return render(<QueryClientProvider client={qc}>{filho}</QueryClientProvider>);
}

const REGRA = {
  geral: { atencao: 4, atencao_unidade: "horas", critico: 8, critico_unidade: "horas" },
  etapas: {},
};

describe("PrazoDoCard (B16)", () => {
  it("com regra: a pílula com o nível (cinza, âmbar, vermelho) e o tempo", () => {
    comQuadro(REGRA, <PrazoDoCard lead={lead(E1)} horasNaEtapa={2} tempo="2h" />);
    expect(screen.getByText("2h").closest("[data-prazo]")).toHaveAttribute("data-prazo", "ok");
  });
  it("passou da atenção e abaixo do crítico fica âmbar", () => {
    comQuadro(REGRA, <PrazoDoCard lead={lead(E1)} horasNaEtapa={5} tempo="5h" />);
    const pilula = screen.getByText("5h").closest("[data-prazo]");
    expect(pilula).toHaveAttribute("data-prazo", "atencao");
    expect(pilula).toHaveAttribute("title", "Tempo na etapa: passou de atenção");
  });
  it("passou da atenção e abaixo do crítico fica âmbar", () => {
    comQuadro(REGRA, <PrazoDoCard lead={lead(E1)} horasNaEtapa={5} tempo="5h" />);
    const pilula = screen.getByText("5h").closest("[data-prazo]");
    expect(pilula).toHaveAttribute("data-prazo", "atencao");
    expect(pilula).toHaveAttribute("title", "Tempo na etapa: passou de atenção");
  });
  it("passou do crítico fica vermelho, com nome acessível", () => {
    comQuadro(REGRA, <PrazoDoCard lead={lead(E1)} horasNaEtapa={9} tempo="9h" />);
    const pilula = screen.getByText("9h").closest("[data-prazo]");
    expect(pilula).toHaveAttribute("data-prazo", "critico");
    expect(pilula).toHaveAttribute("title", "Tempo na etapa: passou de crítico");
  });
  it("sem regra, na etapa de ganho ou sem cache: o relógio de sempre", () => {
    comQuadro(undefined, <PrazoDoCard lead={lead(E1)} horasNaEtapa={9} tempo="9h" />);
    expect(screen.getByText("9h").closest("[data-prazo]")).toBeNull();
    comQuadro(REGRA, <PrazoDoCard lead={lead(EG)} horasNaEtapa={99} tempo="4d" />);
    expect(screen.getByText("4d").closest("[data-prazo]")).toBeNull();
    render(<PrazoDoCard lead={lead(E1)} horasNaEtapa={9} tempo="7h" />);
    expect(screen.getByText("7h")).toBeInTheDocument();
  });
});

describe("o card da casca usa o prazo", () => {
  const fonte = () => readFileSync(join(__dirname, "..", "..", "components/escale/quadro/PecasDoCard.tsx"), "utf8");

  it("RodapeDoCard troca o relógio pelo PrazoDoCard", () => {
    expect(fonte()).toContain("<PrazoDoCard lead={lead} horasNaEtapa={card.hoursInStage} tempo={idade} />");
  });

  it("a pílula fica no lugar da idade: some com 'Idade do negócio' desligada (F21)", () => {
    expect(fonte()).toMatch(/\{itens\.idade && idade \? \(\s*\/\/ Fase 1F[^\n]*\n\s*<PrazoDoCard /);
  });
});
