import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u-ana", full_name: "Ana" }] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({ data: [] }),
}));
// O calendário é da V1 e tem teste próprio: aqui só importa o que a barra entrega a ele e faz com a resposta.
type PeriodoFalso = { tipo: "criacao" | "ganho" | "perda" | "agendado"; de?: string; ate?: string };
vi.mock("@/components/escale/ui/CalendarioDePeriodo", () => ({
  CalendarioDePeriodo: ({
    valor,
    aoMudar,
    tiposDisponiveis,
  }: {
    valor: PeriodoFalso;
    aoMudar: (p: PeriodoFalso) => void;
    tiposDisponiveis?: string[];
  }) => (
    <div>
      <p>{`valor: ${valor.tipo} ${valor.de ?? "-"} ${valor.ate ?? "-"}`}</p>
      <p>{`tipos: ${(tiposDisponiveis ?? []).join(",")}`}</p>
      <button
        type="button"
        onClick={() => aoMudar({ tipo: "criacao", de: "2026-10-01", ate: "2026-10-15" })}
      >
        escolher outubro
      </button>
      <button type="button" onClick={() => aoMudar({ tipo: "ganho" })}>
        aba ganho
      </button>
    </div>
  ),
}));

import { FiltroDeData } from "@/components/escale/filtros/FiltroDeData";
import {
  GatilhoDeCampos,
  GatilhoDeTags,
  GatilhoDoDono,
  GatilhoMaisFiltros,
} from "@/components/escale/filtros/GatilhosDoQuadro";
import { StatusDoQuadro } from "@/components/escale/filtros/StatusDoQuadro";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const novoUsuario = () => userEvent.setup({ pointerEventsCheck: 0 });
const LEADS = [negocio("l1", { tags: ["vip"], contact_tags: ["quente"] })];
const CAMPOS = camposFiltraveis([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);

describe("Data (Casca V4)", () => {
  it("abre o calendário com criação, ganho e perda; escolher um período filtra pela criação", async () => {
    const onMudar = vi.fn();
    render(<FiltroDeData filtros={{ status: ["open"] }} onMudar={onMudar} />);
    const u = novoUsuario();
    await u.click(screen.getByTestId("filtro-data"));
    expect(screen.getByText("tipos: criacao,ganho,perda")).toBeInTheDocument();
    expect(screen.getByText("valor: criacao - -")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "escolher outubro" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      criadoEm: { de: "2026-10-01", ate: "2026-10-15" },
    });
  });

  it("com período: o selo conta 1, trocar de aba leva o período e pede ganhos, e Limpar tira o Data", async () => {
    const onMudar = vi.fn();
    render(
      <FiltroDeData
        filtros={{ status: ["open"], criadoEm: { de: "2026-10-01", ate: "2026-10-15" } }}
        onMudar={onMudar}
      />,
    );
    const gatilho = screen.getByTestId("filtro-data");
    expect(gatilho).toHaveTextContent("1");
    const u = novoUsuario();
    await u.click(gatilho);
    expect(screen.getByText("valor: criacao 2026-10-01 2026-10-15")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "aba ganho" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open", "won"],
      ganhoEm: { de: "2026-10-01", ate: "2026-10-15" },
    });
    await u.click(screen.getByRole("button", { name: "Limpar" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"] });
  });
});

describe("Status (Casca V4)", () => {
  it("'Status' com o selo da contagem; junta Ganhos; o último não sai; Mostrar todos", async () => {
    const onMudar = vi.fn();
    render(<StatusDoQuadro status={["open"]} onMudar={onMudar} />);
    const gatilho = screen.getByTestId("status-do-quadro");
    expect(gatilho).toHaveTextContent(/Status\s*1/);
    const u = novoUsuario();
    await u.click(gatilho);
    await u.click(screen.getByRole("checkbox", { name: "Ganhos" }));
    expect(onMudar).toHaveBeenLastCalledWith(["open", "won"]);
    await u.click(screen.getByRole("checkbox", { name: "Em aberto" }));
    expect(onMudar).toHaveBeenCalledTimes(1);
    await u.click(screen.getByRole("button", { name: "Mostrar todos" }));
    expect(onMudar).toHaveBeenLastCalledWith(["open", "won", "lost"]);
  });
});

describe("Dono, Tags, Campos e Mais filtros (Casca V4)", () => {
  it("Dono do negócio: escolher alguém filtra e fecha o painel; o selo conta 1", async () => {
    const onMudar = vi.fn();
    const { rerender } = render(<GatilhoDoDono filtros={{ status: ["open"] }} onMudar={onMudar} />);
    const u = novoUsuario();
    await u.click(screen.getByRole("button", { name: /^Dono do negócio/ }));
    await u.click(screen.getByRole("option", { name: "Ana" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: "u-ana" });
    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "Dono do negócio" })).not.toBeInTheDocument(),
    );
    rerender(<GatilhoDoDono filtros={{ status: ["open"], dono: "u-ana" }} onMudar={onMudar} />);
    expect(screen.getByRole("button", { name: /^Dono do negócio/ })).toHaveTextContent("1");
  });

  it("Tags: o selo conta as tags; marcar outra soma; Limpar tira só as tags", async () => {
    const onMudar = vi.fn();
    render(
      <GatilhoDeTags
        filtros={{ status: ["open"], tags: ["vip"] }}
        onMudar={onMudar}
        leads={LEADS}
      />,
    );
    const gatilho = screen.getByRole("button", { name: /^Tags/ });
    expect(gatilho).toHaveTextContent("1");
    const u = novoUsuario();
    await u.click(gatilho);
    await u.click(screen.getByRole("checkbox", { name: "quente" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip", "quente"] });
    await u.click(screen.getByRole("button", { name: "Limpar" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"] });
  });

  it("Campos: o painel monta as condições", async () => {
    const onMudar = vi.fn();
    render(<GatilhoDeCampos filtros={{ status: ["open"] }} onMudar={onMudar} campos={CAMPOS} />);
    const u = novoUsuario();
    await u.click(screen.getByRole("button", { name: /^Campos/ }));
    await u.click(screen.getByRole("button", { name: "Adicionar condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "renda", op: "entre" }],
    });
  });

  it("Mais filtros: Conversas, Negócio e Outros num painel só; o selo soma; Limpar tira só os dele", async () => {
    const onMudar = vi.fn();
    render(
      <GatilhoMaisFiltros
        filtros={{ status: ["open"], tags: ["vip"], conversa: { naoLidas: true }, atrasados: true }}
        onMudar={onMudar}
        leads={LEADS}
        settings={{}}
      />,
    );
    const gatilho = screen.getByRole("button", { name: /^Mais filtros/ });
    expect(gatilho).toHaveTextContent("2");
    const u = novoUsuario();
    await u.click(gatilho);
    const painel = screen.getByRole("dialog", { name: "Mais filtros" });
    expect(within(painel).getByRole("heading", { name: "Conversas" })).toBeInTheDocument();
    expect(within(painel).getByRole("heading", { name: "Negócio" })).toBeInTheDocument();
    expect(within(painel).getByRole("heading", { name: "Outros" })).toBeInTheDocument();
    await u.click(within(painel).getByRole("button", { name: "Limpar" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip"] });
  });
});
