import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// O DnD de verdade precisa de mouse e layout; aqui o teste guarda o `onDragEnd`
// e solta "na mão", como a biblioteca faria. O atributo `data-arrastavel` vem da
// alça falsa e mostra quais linhas viraram arrastáveis.
const dnd = vi.hoisted(() => ({ soltar: null as null | ((r: unknown) => void) }));
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragEnd }: { children: ReactNode; onDragEnd: (r: unknown) => void }) => {
    dnd.soltar = onDragEnd;
    return <>{children}</>;
  },
  Droppable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
  Draggable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children(
      { innerRef: () => {}, draggableProps: {}, dragHandleProps: { "data-arrastavel": "", role: "button", tabIndex: 0 } },
      { isDragging: false },
    ),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn(), push }),
}));
vi.mock("@/lib/escale/origens/guardar-preferencia", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { moverNaLista } from "@/lib/escale/origens/mover";
import type { Origens } from "@/lib/escale/origens/regras";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { PainelOrigens } from "@/components/escale/origens/PainelOrigens";

const G_OBRAS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const G_CRED = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const ORIGENS: Origens = {
  grupos: [
    { id: G_OBRAS, name: "INSS de obras", color: null, icon: "iniciais", is_archived: false },
    { id: G_CRED, name: "Credenciados", color: null, icon: "iniciais", is_archived: false },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: G_OBRAS, is_archived: false, is_default: false },
    { id: "f-nayara", name: "Funil Nayara", group_id: G_CRED, is_archived: false, is_default: false },
    { id: "f-turma", name: "Turma 12", group_id: G_CRED, is_archived: false, is_default: false },
  ],
};
const ABERTO: PreferenciasDoPainel = {
  painelAberto: true,
  listaAberta: true,
  visualizacoesAbertas: true,
  recentesAbertos: false,
  ocultos: [],
};

async function renderizar(podeGerenciar = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <PainelOrigens origens={ORIGENS} visualizacoes={[]} podeGerenciar={podeGerenciar} preferencias={ABERTO} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  // INSS de obras já vem aberto (tem a origem aberta); abre Credenciados também.
  await user.click(screen.getByRole("button", { name: "Abrir Credenciados" }));
}

const lista = () => screen.getByRole("navigation", { name: "Funis por grupo" });
const nomes = () => within(lista()).getAllByRole("link").map((l) => l.textContent);

function soltar(id: string, de: [string, number], para: [string, number]) {
  return act(async () => {
    dnd.soltar?.({
      draggableId: id,
      type: "origem",
      reason: "DROP",
      mode: "FLUID",
      combine: null,
      source: { droppableId: de[0], index: de[1] },
      destination: { droppableId: para[0], index: para[1] },
    });
  });
}

beforeEach(() => {
  dnd.soltar = null;
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("<PainelOrigens> — arrastar origens", () => {
  it("só quem gerencia arrasta", async () => {
    await renderizar(false);
    expect(lista().querySelectorAll("[data-arrastavel]")).toHaveLength(0);
  });

  it("a linha arrastável segue sendo item de lista, com o link dentro", async () => {
    await renderizar();
    const linha = within(lista()).getByRole("link", { name: "Turma 12" }).closest("li");
    expect(linha).not.toHaveAttribute("role", "button");
    expect(within(lista()).getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
  });

  it("subir no grupo grava a posição e mostra a nova ordem", async () => {
    const depois = moverNaLista(ORIGENS, { id: "f-turma", grupoNovo: null, depoisDe: "f-leads" });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.get).mockResolvedValue({ data: depois });
    await renderizar();
    expect(lista().querySelectorAll("[data-arrastavel]")).toHaveLength(3);
    expect(nomes()).toEqual(["Funil Nayara", "Turma 12", "Leads INSS WhatsApp"]);

    await soltar("f-turma", [G_CRED, 1], [G_CRED, 0]);

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-turma", { depois_de: "f-leads" }),
    );
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(nomes()).toEqual(["Turma 12", "Funil Nayara", "Leads INSS WhatsApp"]);
  });

  it("levar para outro grupo troca o grupo antes de gravar a posição", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: ORIGENS });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.get).mockResolvedValue({
      data: moverNaLista(ORIGENS, { id: "f-nayara", grupoNovo: G_OBRAS, depoisDe: "f-leads" }),
    });
    await renderizar();

    await soltar("f-nayara", [G_CRED, 0], [G_OBRAS, 1]);

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara", { depois_de: "f-leads" }),
    );
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara/grupo", { group_id: G_OBRAS });
    expect(vi.mocked(apiClient.put).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(apiClient.patch).mock.invocationCallOrder[0]!,
    );
    expect(nomes()).toEqual(["Turma 12", "Leads INSS WhatsApp", "Funil Nayara"]);
  });

  it("se a gravação falha, a origem volta ao lugar e a mensagem aparece", async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(new Error("Os funis desta lista estão empatados na ordenação."));
    await renderizar();

    await soltar("f-turma", [G_CRED, 1], [G_CRED, 0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("empatados na ordenação");
    expect(nomes()).toEqual(["Funil Nayara", "Turma 12", "Leads INSS WhatsApp"]);
  });

  it("soltar no mesmo lugar ou fora da lista não grava nada", async () => {
    await renderizar();

    await soltar("f-nayara", [G_CRED, 0], [G_CRED, 0]);
    await act(async () => {
      dnd.soltar?.({
        draggableId: "f-nayara",
        type: "origem",
        reason: "DROP",
        mode: "FLUID",
        combine: null,
        source: { droppableId: G_CRED, index: 0 },
        destination: null,
      });
    });

    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(apiClient.put).not.toHaveBeenCalled();
  });
});
