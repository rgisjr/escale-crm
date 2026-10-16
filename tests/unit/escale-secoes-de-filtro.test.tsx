import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u-ana", full_name: "Ana" }] }),
}));

import { SecaoConversas } from "@/components/escale/filtros/SecaoConversas";
import { SecaoOutros } from "@/components/escale/filtros/SecaoOutros";
import { SecaoTags } from "@/components/escale/filtros/SecaoTags";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

// Polyfills que o Radix exige e o jsdom não tem (mesmo padrão dos testes da 1D).
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const LEADS = [negocio("l1", { tags: ["vip"], contact_tags: ["quente"] })];
const novoUsuario = () => userEvent.setup({ pointerEventsCheck: 0 });

function montar(secao: "conversas" | "tags" | "outros", filtros: FiltrosDoQuadro) {
  const onMudar = vi.fn();
  if (secao === "conversas") render(<SecaoConversas filtros={filtros} onMudar={onMudar} />);
  else if (secao === "tags")
    render(<SecaoTags filtros={filtros} onMudar={onMudar} leads={LEADS} />);
  else render(<SecaoOutros filtros={filtros} onMudar={onMudar} />);
  return { onMudar, u: novoUsuario() };
}

describe("seções de filtro com os controles da casca (Casca V4)", () => {
  it("Conversas: não lidas pela caixinha e 'Sem conversa' pelo seletor da casca", async () => {
    const { onMudar, u } = montar("conversas", { status: ["open"] });
    await u.click(screen.getByRole("checkbox", { name: "Não lidas" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], conversa: { naoLidas: true } });
    await u.click(screen.getByRole("combobox", { name: "Conversa" }));
    await u.click(screen.getByRole("option", { name: "Sem conversa" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], conversa: { existe: "sem" } });
  });

  it("Conversas com 'sem conversa': os outros critérios somem", () => {
    montar("conversas", { status: ["open"], conversa: { existe: "sem" } });
    expect(screen.queryByRole("checkbox", { name: "Não lidas" })).not.toBeInTheDocument();
  });

  it("Conversas: atendente da equipe pela caixinha", async () => {
    const { onMudar, u } = montar("conversas", { status: ["open"] });
    await u.click(screen.getByRole("checkbox", { name: "Ana" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      conversa: { atendentes: ["u-ana"] },
    });
  });

  it("Tags: as três caixas do card viram opções, e marcar uma grava a tag", async () => {
    const { onMudar, u } = montar("tags", { status: ["open"] });
    expect(screen.getByRole("checkbox", { name: "quente" })).toBeInTheDocument();
    await u.click(screen.getByRole("checkbox", { name: "vip" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip"] });
  });

  it("Tags com duas escolhidas: o E/OU é um segmentado com papel de rádio", async () => {
    const { onMudar, u } = montar("tags", { status: ["open"], tags: ["vip", "quente"] });
    expect(screen.getByRole("radio", { name: "Todas (E)" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await u.click(screen.getByRole("radio", { name: "Qualquer uma (OU)" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      tags: ["vip", "quente"],
      modoDasTags: "ou",
    });
  });

  it("Outros: atividades concluídas e a unidade do tempo pelo seletor da casca", async () => {
    const { onMudar, u } = montar("outros", { status: ["open"] });
    await u.type(screen.getByRole("textbox", { name: "Atividades concluídas: Mín." }), "2");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      atividadesConcluidas: { min: 2 },
    });
    await u.click(screen.getByRole("combobox", { name: "Tempo na etapa: Unidade" }));
    await u.click(screen.getByRole("option", { name: "horas na etapa" }));
    await u.type(screen.getByRole("textbox", { name: "Tempo na etapa: Máx." }), "10");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      tempoNaEtapa: { max: 10, unidade: "horas" },
    });
  });

  it("nenhuma seção usa seleção, data, caixinha ou rádio nativos", () => {
    const filtros: FiltrosDoQuadro = {
      status: ["open"],
      tags: ["vip", "quente"],
      conversa: { naoLidas: true },
    };
    const onMudar = vi.fn();
    render(
      <>
        <SecaoConversas filtros={filtros} onMudar={onMudar} />
        <SecaoTags filtros={filtros} onMudar={onMudar} leads={LEADS} />
        <SecaoOutros filtros={filtros} onMudar={onMudar} />
      </>,
    );
    expect(
      document.querySelector(
        'select, input[type="date"], input[type="checkbox"], input[type="radio"]',
      ),
    ).toBeNull();
  });
});
