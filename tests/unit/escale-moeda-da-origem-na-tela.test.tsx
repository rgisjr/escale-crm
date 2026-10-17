import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(async () => ({ data: [] })), post: vi.fn(), patch: vi.fn() },
}));

import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import type { BoardData } from "@/lib/kanban/types";
import { simboloDaMoeda } from "@/lib/money";

const FUNIL = "44444444-4444-4444-8444-444444444444";
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function abrir(settings: Record<string, unknown>) {
  const qc = new QueryClient();
  qc.setQueryData(chaveDoQuadro(FUNIL), {
    pipeline: { id: FUNIL, settings },
    stages: [],
    leads: [],
  } as unknown as BoardData);
  render(
    <QueryClientProvider client={qc}>
      <NewLeadDialog
        open
        onOpenChange={() => {}}
        pipelineId={FUNIL}
        stages={[{ id: "aaaaaaaa-0000-4000-8000-000000000001", name: "Novo" } as never]}
      />
    </QueryClientProvider>,
  );
}

describe("novo negócio na moeda da origem", () => {
  it("origem em dólar: o valor fala dólar", () => {
    abrir({ escale_moeda: "USD" });
    expect(
      screen.getByText(new RegExp(`Valor \\(${escapar(simboloDaMoeda("USD"))}\\)`)),
    ).toBeTruthy();
  });

  it("origem sem moeda: continua a da organização", () => {
    abrir({});
    expect(screen.getByText(/Valor \(R\$\)/)).toBeTruthy();
  });
});

describe("o filtro de valor compara na moeda da origem", () => {
  const ler = (caminho: string) => readFileSync(join(__dirname, "..", "..", caminho), "utf8");

  it("funil, Visualização e o rótulo do filtro leem a moeda da origem", () => {
    expect(ler("app/app/pipelines/[id]/_client.tsx")).toContain(
      "moedaDaOrigem(data.pipeline.settings) ?? orgAtiva?.currency ?? null",
    );
    expect(ler("components/escale/visualizacoes/QuadroDaVisualizacao.tsx")).toContain(
      "moedaDaOrigem(q.pipeline.settings) ?? orgAtiva?.currency ?? null",
    );
    expect(ler("components/escale/filtros/SecaoNegocio.tsx")).toContain(
      "simboloDaMoeda(moedaDaOrigem(settings) ?? org?.currency ?? MOEDA_PADRAO)",
    );
  });

  it("o formulário de novo negócio usa o hook do fork", () => {
    const fonte = ler("components/kanban/NewLeadDialog.tsx");
    expect(fonte).toContain("FORK ESCALE · Fase 1F");
    expect(fonte).toContain("const moedaDoValor = moedaDaOrigem ?? org?.currency ?? MOEDA_PADRAO;");
  });
});
