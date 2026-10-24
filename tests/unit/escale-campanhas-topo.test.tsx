import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbasDasCampanhas } from "@/components/escale/campanhas/AbasDasCampanhas";
import { BarraDeFiltrosDasCampanhas } from "@/components/escale/campanhas/BarraDeFiltrosDasCampanhas";
import { CabecalhoDasCampanhas } from "@/components/escale/campanhas/CabecalhoDasCampanhas";
import { FaixaDoResumo } from "@/components/escale/campanhas/FaixaDoResumo";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const NUMEROS = [
  { valor: "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b", rotulo: "Comercial" },
  { valor: "1d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b", rotulo: "Suporte" },
];

afterEach(() => vi.useRealTimers());

describe("CabecalhoDasCampanhas (002)", () => {
  it("WhatsApp, a engrenagem e 'Enviar WhatsApp' (até a 8B, o formulário do original)", () => {
    render(<CabecalhoDasCampanhas aba="whatsapp" />);
    expect(screen.getByRole("heading", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar WhatsApp" })).toHaveAttribute(
      "href",
      "/app/campaigns/new",
    );
    expect(screen.getByRole("link", { name: "Configuração de campanhas" })).toHaveAttribute(
      "href",
      "/app/campaigns/settings",
    );
  });

  it("na aba Prospecção, só o título", () => {
    render(<CabecalhoDasCampanhas aba="prospeccao" />);
    expect(screen.getByRole("heading", { name: "Prospecção" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Enviar WhatsApp" })).not.toBeInTheDocument();
  });
});

describe("AbasDasCampanhas", () => {
  it("a ativa marcada; clicar troca", () => {
    const aoMudar = vi.fn();
    render(
      <AbasDasCampanhas abas={["whatsapp", "prospeccao"]} valor="whatsapp" aoMudar={aoMudar} />,
    );
    expect(screen.getByRole("tab", { name: "WhatsApp" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Prospecção" }));
    expect(aoMudar).toHaveBeenCalledWith("prospeccao");
  });
});

describe("BarraDeFiltrosDasCampanhas (002, 004, 005)", () => {
  it("os cinco campos na ordem da Clint", () => {
    render(<BarraDeFiltrosDasCampanhas filtros={{}} numeros={NUMEROS} aoMudar={vi.fn()} />);
    expect(screen.getByPlaceholderText("Buscar campanha")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filtrar por data do agendamento" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtrar por data de criação" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Número" })).toBeInTheDocument();
  });

  it("a busca espera 500 ms", () => {
    vi.useFakeTimers();
    const aoMudar = vi.fn();
    render(<BarraDeFiltrosDasCampanhas filtros={{}} numeros={NUMEROS} aoMudar={aoMudar} />);
    fireEvent.change(screen.getByPlaceholderText("Buscar campanha"), { target: { value: "Reat" } });
    act(() => vi.advanceTimersByTime(499));
    expect(aoMudar).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(aoMudar).toHaveBeenCalledWith({ busca: "Reat" });
  });

  it("Status com caixinhas na ordem alfabética; Número de escolha única", async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<BarraDeFiltrosDasCampanhas filtros={{}} numeros={NUMEROS} aoMudar={aoMudar} />);
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    const caixas = screen.getAllByRole("checkbox").map((c) => c.textContent);
    expect(caixas).toEqual([
      "Agendado",
      "Cancelado",
      "Concluído",
      "Envio em Andamento",
      "Erro de Processamento",
      "Pausada",
      "Pronta para enviar",
      "Rascunho",
    ]);
    await user.click(screen.getByRole("checkbox", { name: "Agendado" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ status: ["scheduled"] });
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("combobox", { name: "Número" }));
    await user.click(screen.getByRole("option", { name: "Suporte" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ numero: NUMEROS[1]!.valor });
  });
});

describe("FaixaDoResumo (003)", () => {
  const resumo = { adicionados: 14989, enviados: 9922, entregues: 9110, lidos: 2408, erros: 4087 };

  it("fechada só o botão; aberta, os 5 cartões com os números brasileiros", () => {
    const aoAlternar = vi.fn();
    const { rerender } = render(
      <FaixaDoResumo
        aberta={false}
        aoAlternar={aoAlternar}
        resumo={undefined}
        carregando={false}
      />,
    );
    const botao = screen.getByRole("button", { name: "Resumo das campanhas" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(botao);
    expect(aoAlternar).toHaveBeenCalled();
    rerender(<FaixaDoResumo aberta aoAlternar={aoAlternar} resumo={resumo} carregando={false} />);
    for (const r of ["Adicionados para envio", "Enviados", "Entregues", "Lidas", "Erros"]) {
      expect(screen.getByText(r)).toBeInTheDocument();
    }
    expect(screen.getByText("14.989")).toBeInTheDocument();
    expect(screen.getByText("66%")).toBeInTheDocument();
    expect(screen.getByText("9.922")).toBeInTheDocument();
  });

  it("carregando: 5 esqueletos", () => {
    const { container } = render(
      <FaixaDoResumo aberta aoAlternar={vi.fn()} resumo={undefined} carregando />,
    );
    expect(container.querySelectorAll("[data-esqueleto]")).toHaveLength(5);
  });
});
