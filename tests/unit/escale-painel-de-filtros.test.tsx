import { fireEvent, render, screen } from "@testing-library/react";
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

import { PainelDeFiltros } from "@/components/escale/filtros/PainelDeFiltros";
import { ResumoDosFiltros } from "@/components/escale/filtros/ResumoDosFiltros";
import { StatusDoQuadro } from "@/components/escale/filtros/StatusDoQuadro";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

// Polyfills que o Radix exige e o jsdom não tem (mesmo padrão de trocar-funil.test.tsx).
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const LEADS = [
  negocio("l1", { tags: ["vip"], contact_tags: ["quente"] }),
  negocio("l2", { status: "lost", lost_reason: "price" }),
];
const CAMPOS = camposFiltraveis([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);
const novoUsuario = () => userEvent.setup({ pointerEventsCheck: 0 });

function painel(filtros: FiltrosDoQuadro) {
  const onMudar = vi.fn();
  render(
    <PainelDeFiltros
      filtros={filtros}
      onMudar={onMudar}
      leads={LEADS}
      campos={CAMPOS}
      settings={{}}
    />,
  );
  return { onMudar, u: novoUsuario() };
}

async function abrir(u: ReturnType<typeof novoUsuario>, secao?: RegExp) {
  await u.click(screen.getByRole("button", { name: /Filtros/ }));
  if (secao) await u.click(await screen.findByRole("button", { name: secao }));
}

describe("<StatusDoQuadro>", () => {
  it("mostra Em aberto, junta Ganhos, não deixa o último sair e mostra todos", async () => {
    const onMudar = vi.fn();
    render(<StatusDoQuadro status={["open"]} onMudar={onMudar} />);
    const u = novoUsuario();
    await u.click(screen.getByRole("button", { name: /Em aberto/ }));
    await u.click(screen.getByRole("menuitemcheckbox", { name: "Ganhos" }));
    expect(onMudar).toHaveBeenLastCalledWith(["open", "won"]);
    await u.click(screen.getByRole("menuitemcheckbox", { name: "Em aberto" }));
    expect(onMudar).toHaveBeenCalledTimes(1);
    await u.click(screen.getByRole("menuitem", { name: "Mostrar todos" }));
    expect(onMudar).toHaveBeenLastCalledWith(["open", "won", "lost"]);
  });

  it("o rótulo resume o que está marcado", () => {
    const { rerender } = render(<StatusDoQuadro status={["open", "lost"]} onMudar={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("Em aberto + Perdidos");
    rerender(<StatusDoQuadro status={["open", "won", "lost"]} onMudar={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("Todos os status");
  });
});

describe("<PainelDeFiltros>", () => {
  it("o botão conta os critérios, e o X de uma seção limpa só ela", async () => {
    const { onMudar, u } = painel({
      status: ["open"],
      conversa: { naoLidas: true },
      tags: ["vip"],
    });
    expect(screen.getByRole("button", { name: /Filtros/ })).toHaveTextContent(/Filtros\s*2/);
    await abrir(u);
    await u.click(screen.getByRole("button", { name: "Limpar: Conversas" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open"], tags: ["vip"] });
  });

  it("Negócio: dono, valor (digitado em reais, guardado em centavos) e data de criação", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u);
    await u.selectOptions(screen.getByRole("combobox", { name: "Dono do negócio" }), "u-ana");
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: "u-ana" });
    await u.type(screen.getByRole("textbox", { name: "Mínimo" }), "1.500");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], valor: { min: 150000 } });
    fireEvent.change(screen.getByLabelText("Criado a partir de"), {
      target: { value: "2026-10-01" },
    });
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], criadoEm: { de: "2026-10-01" } });
    expect(screen.queryByRole("combobox", { name: "Motivo de perda" })).not.toBeInTheDocument();
  });

  it("Negócio com perdidos no status: o motivo de perda vem dos cards perdidos", async () => {
    const { onMudar, u } = painel({ status: ["open", "lost"] });
    await abrir(u);
    await u.selectOptions(screen.getByRole("combobox", { name: "Motivo de perda" }), "price");
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open", "lost"], motivoDePerda: "price" });
  });

  it("Conversas: não lidas e sem conversa; 'sem conversa' esconde o resto", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u, /^Conversas/);
    await u.click(screen.getByRole("checkbox", { name: "Não lidas" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], conversa: { naoLidas: true } });
    await u.selectOptions(screen.getByRole("combobox", { name: "Conversa" }), "sem");
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], conversa: { existe: "sem" } });
  });

  it("Conversas com 'sem conversa' marcado: os outros critérios somem", async () => {
    const { u } = painel({ status: ["open"], conversa: { existe: "sem" } });
    await abrir(u, /^Conversas/);
    expect(screen.queryByRole("checkbox", { name: "Não lidas" })).not.toBeInTheDocument();
  });

  it("Tags: as três caixas do card viram opções, e marcar uma grava a tag", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u, /^Tags/);
    expect(screen.getByRole("checkbox", { name: /quente/ })).toBeInTheDocument();
    await u.click(screen.getByRole("checkbox", { name: /vip/ }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip"] });
  });

  it("Tags com duas escolhidas: o OU", async () => {
    const { onMudar, u } = painel({ status: ["open"], tags: ["vip", "quente"] });
    await abrir(u, /^Tags/);
    await u.click(screen.getByRole("radio", { name: "Qualquer uma (OU)" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      tags: ["vip", "quente"],
      modoDasTags: "ou",
    });
  });

  it("Campos: adicionar uma condição começa pelo primeiro campo do negócio", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u, /^Campos/);
    await u.click(screen.getByRole("button", { name: "Adicionar condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "renda", op: "entre" }],
    });
  });

  it("Campos: a condição mostra campo, operador e valor, e sai pelo X", async () => {
    const { onMudar, u } = painel({
      status: ["open"],
      campos: [{ alvo: "contato", chave: "nome", op: "contem", valor: "ana" }],
    });
    await abrir(u, /^Campos/);
    expect(screen.getByRole("combobox", { name: "Campo" })).toHaveValue("contato:nome");
    expect(screen.getByRole("combobox", { name: "Operador" })).toHaveValue("contem");
    expect(screen.getByRole("textbox", { name: "Valor" })).toHaveValue("ana");
    await u.click(screen.getByRole("button", { name: "Remover condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], campos: undefined });
  });

  it("Outros: atividades concluídas e tempo na etapa com a unidade escolhida", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u, /^Outros/);
    await u.type(screen.getByRole("textbox", { name: "Atividades concluídas: Mín." }), "2");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      atividadesConcluidas: { min: 2 },
    });
    await u.selectOptions(
      screen.getByRole("combobox", { name: "Tempo na etapa: Unidade" }),
      "horas",
    );
    await u.type(screen.getByRole("textbox", { name: "Tempo na etapa: Máx." }), "10");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      tempoNaEtapa: { max: 10, unidade: "horas" },
    });
  });
});

describe("<ResumoDosFiltros>", () => {
  it("mostra os critérios ativos, tira um por vez e limpa tudo", async () => {
    const onMudar = vi.fn();
    const onLimpar = vi.fn();
    render(
      <ResumoDosFiltros
        filtros={{
          status: ["open"],
          tags: ["vip", "quente"],
          tempoNaEtapa: { min: 2, unidade: "dias" },
        }}
        onMudar={onMudar}
        onLimpar={onLimpar}
      />,
    );
    expect(screen.getByText("2 tags")).toBeInTheDocument();
    expect(screen.getByText("Tempo na etapa")).toBeInTheDocument();
    const u = novoUsuario();
    await u.click(screen.getByRole("button", { name: "Remover filtro: 2 tags" }));
    expect(onMudar).toHaveBeenCalledWith({
      status: ["open"],
      tempoNaEtapa: { min: 2, unidade: "dias" },
    });
    await u.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onLimpar).toHaveBeenCalled();
  });

  it("sem critério nenhum, não aparece", () => {
    const { container } = render(
      <ResumoDosFiltros filtros={{ status: ["open"] }} onMudar={vi.fn()} onLimpar={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
