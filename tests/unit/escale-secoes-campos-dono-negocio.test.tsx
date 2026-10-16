import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
const equipe = vi.hoisted(() => ({
  membros: [{ user_id: "u-ana", full_name: "Ana" }] as { user_id: string; full_name: string }[],
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: equipe.membros }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({ data: [] }),
}));

import { SecaoCampos } from "@/components/escale/filtros/SecaoCampos";
import { SecaoDono } from "@/components/escale/filtros/SecaoDono";
import { SecaoNegocio } from "@/components/escale/filtros/SecaoNegocio";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
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
const LEADS = [negocio("l1"), negocio("l2", { status: "lost", lost_reason: "price" })];
const CAMPOS = camposFiltraveis([
  {
    fields: [
      { key: "renda", label: "Renda", type: "number" },
      { key: "nascimento", label: "Nascimento", type: "date" },
      {
        key: "porte",
        label: "Porte",
        type: "select",
        options: [
          { value: "pequeno", label: "Pequeno" },
          { value: "grande", label: "Grande" },
        ],
      },
    ],
  },
]);

function campos(filtros: FiltrosDoQuadro, lista = CAMPOS) {
  const onMudar = vi.fn();
  render(<SecaoCampos filtros={filtros} onMudar={onMudar} campos={lista} />);
  return { onMudar, u: novoUsuario() };
}

describe("Campos (Casca V4)", () => {
  it("adicionar uma condição começa pelo primeiro campo do negócio", async () => {
    const { onMudar, u } = campos({ status: ["open"] });
    await u.click(screen.getByRole("button", { name: "Adicionar condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "renda", op: "entre" }],
    });
  });

  it("a condição mostra campo, operador e valor pelos seletores da casca, e sai pelo X", async () => {
    const { onMudar, u } = campos({
      status: ["open"],
      campos: [{ alvo: "contato", chave: "nome", op: "contem", valor: "ana" }],
    });
    expect(screen.getByRole("combobox", { name: "Campo" })).toHaveTextContent("Nome do contato");
    expect(screen.getByRole("combobox", { name: "Operador" })).toHaveTextContent("contém");
    expect(screen.getByRole("textbox", { name: "Valor" })).toHaveValue("ana");
    await u.click(screen.getByRole("button", { name: "Remover condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], campos: undefined });
  });

  it("escolher de novo o operador ou o campo atual não apaga nada", async () => {
    const { onMudar, u } = campos({
      status: ["open"],
      campos: [{ alvo: "contato", chave: "nome", op: "contem", valor: "ana" }],
    });
    await u.click(screen.getByRole("combobox", { name: "Operador" }));
    await u.click(screen.getByRole("option", { name: "contém" }));
    await u.click(screen.getByRole("combobox", { name: "Campo" }));
    await u.click(screen.getByRole("option", { name: "Nome do contato" }));
    expect(onMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Valor" })).toHaveValue("ana");
  });

  it("campo de opção escolhe o valor pelo seletor; trocar o campo recomeça a condição", async () => {
    const { onMudar, u } = campos({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "porte", op: "igual" }],
    });
    await u.click(screen.getByRole("combobox", { name: "Valor" }));
    await u.click(screen.getByRole("option", { name: "Grande" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "porte", op: "igual", valor: "grande" }],
    });
    await u.click(screen.getByRole("combobox", { name: "Campo" }));
    await u.click(screen.getByRole("option", { name: "Renda" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "renda", op: "entre" }],
    });
  });

  it("campo de data 'entre' recebe dd/mm/aaaa e guarda AAAA-MM-DD; data impossível não muda nada", async () => {
    const { onMudar, u } = campos({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "nascimento", op: "entre" }],
    });
    await u.type(screen.getByRole("textbox", { name: "De" }), "01/10/2026");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "nascimento", op: "entre", valor: "2026-10-01" }],
    });
    onMudar.mockClear();
    await u.type(screen.getByRole("textbox", { name: "Até" }), "31/02/2026");
    await u.tab();
    expect(onMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Até" })).toHaveValue("");
  });

  it("campo do negócio com o nome de um do contato ganha o grupo no rótulo do contato", async () => {
    const lista = camposFiltraveis([
      { fields: [{ key: "nome_contato", label: "Nome do contato", type: "text" }] },
    ]);
    const { u } = campos(
      { status: ["open"], campos: [{ alvo: "negocio", chave: "nome_contato", op: "contem" }] },
      lista,
    );
    await u.click(screen.getByRole("combobox", { name: "Campo" }));
    expect(screen.getByRole("option", { name: "Contato · Nome do contato" })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "Nome do contato" })).toHaveLength(1);
  });
});

describe("Dono do negócio (Casca V4)", () => {
  it("lista Todos, Eu, Sem responsável e a equipe; escolher grava e avisa quem fecha o painel", async () => {
    const onMudar = vi.fn();
    const onEscolher = vi.fn();
    render(<SecaoDono filtros={{ status: ["open"] }} onMudar={onMudar} onEscolher={onEscolher} />);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Todos",
      "Eu",
      "Sem responsável",
      "Ana",
    ]);
    expect(screen.getByRole("option", { name: "Todos" })).toHaveAttribute("aria-selected", "true");
    await novoUsuario().click(screen.getByRole("option", { name: "Ana" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: "u-ana" });
    expect(onEscolher).toHaveBeenCalled();
  });

  it("o dono escolhido aparece marcado; Todos desfaz o filtro", async () => {
    const onMudar = vi.fn();
    render(<SecaoDono filtros={{ status: ["open"], dono: "u-ana" }} onMudar={onMudar} />);
    expect(screen.getByRole("option", { name: "Ana" })).toHaveAttribute("aria-selected", "true");
    await novoUsuario().click(screen.getByRole("option", { name: "Todos" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: undefined });
  });

  it("com 8 ou mais opções aparece a busca, que ignora acento", async () => {
    const original = equipe.membros;
    equipe.membros = Array.from({ length: 7 }, (_, i) => ({
      user_id: `u-${i}`,
      full_name: i === 3 ? "Zélia Souza" : `Pessoa ${i}`,
    }));
    try {
      const onMudar = vi.fn();
      render(<SecaoDono filtros={{ status: ["open"] }} onMudar={onMudar} />);
      const u = novoUsuario();
      await u.type(screen.getByRole("searchbox", { name: "Buscar…" }), "zelia");
      expect(screen.queryByRole("option", { name: "Pessoa 0" })).not.toBeInTheDocument();
      await u.click(screen.getByRole("option", { name: "Zélia Souza" }));
      expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: "u-3" });
    } finally {
      equipe.membros = original;
    }
  });
});

describe("Negócio, dentro de Mais filtros (Casca V4)", () => {
  it("valor digitado em reais vira centavos; atrasados pela caixinha; sem dono nem data aqui", async () => {
    const onMudar = vi.fn();
    render(
      <SecaoNegocio filtros={{ status: ["open"] }} onMudar={onMudar} leads={LEADS} settings={{}} />,
    );
    const u = novoUsuario();
    await u.type(screen.getByRole("textbox", { name: "Mínimo" }), "1.500");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], valor: { min: 150000 } });
    await u.click(screen.getByRole("checkbox", { name: "Apenas atrasados" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], atrasados: true });
    expect(screen.queryByRole("combobox", { name: "Dono do negócio" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Criado a partir de")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Motivo de perda" })).not.toBeInTheDocument();
  });

  it("com perdidos no status, o motivo de perda vem dos cards perdidos", async () => {
    const onMudar = vi.fn();
    render(
      <SecaoNegocio
        filtros={{ status: ["open", "lost"] }}
        onMudar={onMudar}
        leads={LEADS}
        settings={{}}
      />,
    );
    const u = novoUsuario();
    await u.click(screen.getByRole("combobox", { name: "Motivo de perda" }));
    await u.click(screen.getByRole("option", { name: "Preço" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open", "lost"], motivoDePerda: "price" });
  });
});

describe("sem controle nativo", () => {
  it("Campos, Dono e Negócio não usam seleção, data, caixinha nem rádio nativos", () => {
    const onMudar = vi.fn();
    render(
      <>
        <SecaoCampos
          filtros={{
            status: ["lost"],
            campos: [{ alvo: "negocio", chave: "nascimento", op: "entre" }],
          }}
          onMudar={onMudar}
          campos={CAMPOS}
        />
        <SecaoDono filtros={{ status: ["open"] }} onMudar={onMudar} />
        <SecaoNegocio
          filtros={{ status: ["lost"] }}
          onMudar={onMudar}
          leads={LEADS}
          settings={{}}
        />
      </>,
    );
    expect(
      document.querySelector(
        'select, input[type="date"], input[type="checkbox"], input[type="radio"]',
      ),
    ).toBeNull();
  });
});
