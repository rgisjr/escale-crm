import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "o", role: "agent" }),
}));
const alvos = vi.hoisted(() => [] as unknown[]);
vi.mock("@/hooks/escale/useHistoricoDoNegocio", () => ({
  useHistorico: (alvo: unknown) => {
    alvos.push(alvo);
    return {
      itens: [
        {
          id: "1",
          type: "stage_changed",
          performed_at: "2026-10-10T10:00:00Z",
          payload: { from_stage_id: "e1", to_stage_id: "e2" },
          metadata: {},
          source_module: "crm",
          actor_kind: "user",
          actor_user_name: "Henrique",
          reason: "",
        },
      ],
      isLoading: false,
      isError: false,
      temMais: false,
      carregarMais: vi.fn(),
      carregandoMais: false,
    };
  },
}));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({
  useNotas: () => ({
    data: [
      {
        id: "ns",
        lead_id: null,
        contact_id: "c1",
        user_id: "u1",
        user_nome: "Ana",
        texto: "Ligar na segunda",
        created_at: "2026-10-12T10:00:00Z",
        updated_at: "2026-10-12T10:00:00Z",
      },
    ],
  }),
  useExcluirNota: () => ({ mutateAsync: vi.fn() }),
  useCriarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEditarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { AbaHistorico } from "@/components/escale/negocio/abas/AbaHistorico";

describe("Histórico do contato (Fase 2E, N8)", () => {
  it("lê pelo contato e mostra a nota solta junto da linha do tempo", async () => {
    render(<AbaHistorico alvo={{ tipo: "contato", id: "c1" }} nomesDasEtapas={{ e1: "Novo", e2: "Qualificação" }} />);
    expect(alvos[0]).toEqual({ tipo: "contato", id: "c1" });
    expect(screen.getByText("Mudou de etapa")).toBeInTheDocument();
    expect(screen.getByText("Qualificação")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver nota" }));
    expect(screen.getByText("Ligar na segunda")).toBeInTheDocument();
  });
});
