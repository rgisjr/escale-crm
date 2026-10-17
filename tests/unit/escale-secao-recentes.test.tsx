import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...resto
  }: {
    href: string;
    children: ReactNode;
    onClick?: (e: unknown) => void;
  }) => (
    <a
      href={href}
      {...resto}
      onClick={(e) => {
        // O jsdom não navega: o clique só chega ao `onClick` do link.
        e.preventDefault();
        onClick?.(e);
      }}
    >
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { toast } from "sonner";

import { SecaoRecentes } from "@/components/escale/origens/SecaoRecentes";
import { chaveDosRecentes, type NegocioRecente } from "@/lib/escale/recentes/regras";

const CHAVE = chaveDosRecentes("org-1", "u-1");
const ORIGEM = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const id = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const r = (n: number, extra: Partial<NegocioRecente> = {}): NegocioRecente => ({
  id: id(n),
  titulo: `Negócio ${n}`,
  origemId: ORIGEM,
  origem: "Vendas",
  telefone: null,
  foto: null,
  ...extra,
});

function guardar(recentes: NegocioRecente[], fixados: NegocioRecente[] = []) {
  window.localStorage.setItem(CHAVE, JSON.stringify({ fixados, recentes }));
}
const guardado = () =>
  JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}") as {
    fixados: NegocioRecente[];
    recentes: NegocioRecente[];
  };
// O texto do link leva a inicial do quadradinho (aria-hidden) na frente: o nome é o último filho.
const nomesDosLinks = () => screen.getAllByRole("link").map((a) => a.lastElementChild?.textContent);

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(toast.error).mockClear();
});

describe("<SecaoRecentes>", () => {
  it("aberta e vazia: o título e o aviso da Clint", () => {
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Recentes" })).toBeInTheDocument();
    expect(screen.getByText("Você não possui negócios recém trabalhados.")).toBeInTheDocument();
  });

  it("com 7 recentes: 5 links; Ver mais mostra os 7 e vira Ver menos; o link abre o negócio no quadro dele", () => {
    guardar(Array.from({ length: 7 }, (_, i) => r(i + 1)));
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      `/app/negocios/${id(1)}`,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ver mais" }));
    expect(screen.getAllByRole("link")).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: "Ver menos" }));
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  it("Fixar no terceiro: ele vai para o bloco de cima, separado por um separator, e o botão vira Desafixar", () => {
    guardar([r(1), r(2), r(3)]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    expect(screen.queryByRole("separator")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Fixar" })[2]!);
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(nomesDosLinks()).toEqual(["Negócio 3", "Negócio 1", "Negócio 2"]);
    expect(screen.getByRole("button", { name: "Desafixar" })).toBeInTheDocument();
    expect(guardado().fixados.map((x) => x.id)).toEqual([id(3)]);
  });

  it("Ver detalhes: a origem, Sem empresa e o link Ligar com tel:", () => {
    guardar([r(1, { telefone: "+5511999990000" })]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    expect(screen.queryByText("Sem empresa")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes" }));
    expect(screen.getByText("Vendas")).toBeInTheDocument();
    expect(screen.getByText("Sem empresa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ligar" })).toHaveAttribute(
      "href",
      "tel:+5511999990000",
    );
    fireEvent.click(screen.getByRole("button", { name: "Esconder detalhes" }));
    expect(screen.queryByText("Sem empresa")).toBeNull();
  });

  it("sem telefone, o detalhe não tem link: o ícone cinza diz Sem telefone", () => {
    guardar([r(1)]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes" }));
    expect(screen.queryByRole("link", { name: "Ligar" })).toBeNull();
    expect(screen.getByRole("img", { name: "Sem telefone" })).toBeInTheDocument();
    expect(screen.getByTitle("Sem telefone")).toBeInTheDocument();
  });

  it("telefone em branco guardado no navegador não vira link tel: vivo; com espaços nas pontas, vira o número limpo", () => {
    guardar([r(1, { telefone: "   " }), r(2, { telefone: " +5511999990000 " })]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalhes" })[0]!);
    expect(screen.queryByRole("link", { name: "Ligar" })).toBeNull();
    expect(screen.getByRole("img", { name: "Sem telefone" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes" }));
    expect(screen.getByRole("link", { name: "Ligar" })).toHaveAttribute(
      "href",
      "tel:+5511999990000",
    );
  });

  it("a seta do detalhe aponta (aria-controls) para a caixa do detalhe aberta", () => {
    guardar([r(1)]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    const seta = screen.getByRole("button", { name: "Ver detalhes" });
    expect(seta).not.toHaveAttribute("aria-controls");
    fireEvent.click(seta);
    const alvo = screen.getByRole("button", { name: "Esconder detalhes" }).getAttribute("aria-controls");
    expect(alvo).toBeTruthy();
    const caixa = document.getElementById(alvo!);
    expect(caixa).not.toBeNull();
    expect(caixa).toHaveTextContent("Sem empresa");
  });

  it("getItem que lança: a seção abre vazia, sem quebrar", () => {
    guardar([r(1)]);
    const leitura = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    try {
      render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
      expect(screen.getByText("Você não possui negócios recém trabalhados.")).toBeInTheDocument();
      expect(screen.queryByRole("link")).toBeNull();
    } finally {
      leitura.mockRestore();
    }
  });

  it("setItem que lança (cota cheia, aba anônima): fixar e abrir não quebram e a lista fica como estava", () => {
    guardar([r(1), r(2)]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    const gravacao = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cota cheia");
    });
    try {
      fireEvent.click(screen.getAllByRole("button", { name: "Fixar" })[0]!);
      fireEvent.click(screen.getByRole("link", { name: "Negócio 2" }));
      expect(nomesDosLinks()).toEqual(["Negócio 1", "Negócio 2"]);
      expect(screen.queryByRole("separator")).toBeNull();
    } finally {
      gravacao.mockRestore();
    }
  });

  it("o evento storage (outra aba mudou a lista) atualiza a seção", () => {
    guardar([r(1)]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    expect(nomesDosLinks()).toEqual(["Negócio 1"]);
    act(() => {
      guardar([r(5), r(1)]);
      window.dispatchEvent(new StorageEvent("storage", { key: CHAVE }));
    });
    expect(nomesDosLinks()).toEqual(["Negócio 5", "Negócio 1"]);
  });

  it("o mesmo id duas vezes na lista guardada aparece uma vez só", () => {
    guardar([r(1), r(1), r(2)]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    expect(nomesDosLinks()).toEqual(["Negócio 1", "Negócio 2"]);
  });

  it("só um detalhe fica aberto por vez", () => {
    guardar([r(1), r(2)]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalhes" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalhes" })[0]!);
    expect(screen.getAllByText("Sem empresa")).toHaveLength(1);
  });

  it("com 5 fixados, Fixar num sexto avisa o limite e não grava", () => {
    guardar(
      [r(6)],
      [1, 2, 3, 4, 5].map((n) => r(n)),
    );
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    const linhas = screen.getAllByRole("listitem");
    fireEvent.click(within(linhas[5]!).getByRole("button", { name: "Fixar" }));
    expect(toast.error).toHaveBeenCalledWith(
      "Você atingiu o limite. Desafixe algo pra fixar mais.",
    );
    expect(guardado().fixados).toHaveLength(5);
  });

  it("o fixado mostra o alfinete em repouso, e o 5 + Ver mais vale para cada bloco", () => {
    guardar(
      Array.from({ length: 6 }, (_, i) => r(i + 10)),
      [r(1), r(2)],
    );
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Desafixar" })).toHaveLength(2);
    expect(screen.getAllByRole("link")).toHaveLength(7);
    expect(screen.getAllByRole("button", { name: "Ver mais" })).toHaveLength(1);
  });

  it("recolhida: nada listado, e o chevron Abrir os recentes chama onAlternar", () => {
    guardar([r(1)]);
    const onAlternar = vi.fn();
    render(<SecaoRecentes chave={CHAVE} aberta={false} onAlternar={onAlternar} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("Você não possui negócios recém trabalhados.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir os recentes" }));
    expect(onAlternar).toHaveBeenCalledTimes(1);
  });

  it("clicar num recente que não é o primeiro sobe ele para o topo", () => {
    guardar([r(1), r(2), r(3)]);
    render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    fireEvent.click(screen.getByRole("link", { name: "Negócio 3" }));
    expect(guardado().recentes.map((x) => x.id)).toEqual([id(3), id(1), id(2)]);
    expect(nomesDosLinks()).toEqual(["Negócio 3", "Negócio 1", "Negócio 2"]);
  });

  it("a foto do contato é um quadrado de raio 5; sem foto, o quadrado da inicial", () => {
    const avatar = `/api/v1/contacts/${id(7)}/avatar`;
    guardar([r(1, { foto: avatar }), r(2)]);
    const { container } = render(<SecaoRecentes chave={CHAVE} aberta onAlternar={vi.fn()} />);
    const foto = container.querySelector("img");
    expect(foto).toHaveAttribute("src", avatar);
    expect(foto).toHaveClass("size-5", "rounded-[5px]");
    expect(screen.getByText("N", { selector: "span" })).toHaveClass("size-5", "rounded-[5px]");
  });
});
