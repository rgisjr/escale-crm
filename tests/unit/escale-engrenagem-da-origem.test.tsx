import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-1",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/app/actions/escale/origens", () => ({
  guardarPreferenciaDeOrigens: vi.fn(async () => undefined),
}));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { LinhaDeContagem } from "@/components/escale/filtros/LinhaDeContagem";
import { PainelOrigens } from "@/components/escale/origens/PainelOrigens";
import { apiClient } from "@/lib/api/client";
import {
  EVENTO_DAS_CONFIGURACOES,
  abrirConfiguracoesDaOrigem,
  useAoAbrirConfiguracoesDaOrigem,
  useEngrenagemDaOrigem,
} from "@/lib/escale/configuracoes/abrir";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1F (F20): a engrenagem da linha de contagem abre as configurações da origem (print 15 da 1E). */
function Escuta({ aoAbrir }: { aoAbrir: (id: string, aba: "geral" | "etapas") => void }) {
  useAoAbrirConfiguracoesDaOrigem(aoAbrir);
  return null;
}

describe("a engrenagem da linha de contagem", () => {
  it("com configurar: ligada, com a dica da Clint, e o clique chama", async () => {
    const configurar = vi.fn();
    render(
      <LinhaDeContagem
        contagem={3}
        ordemAtiva={false}
        onAtualizar={() => {}}
        configurar={configurar}
      />,
    );
    const engrenagem = screen.getByRole("button", { name: "Configurações da origem" });
    expect(engrenagem).toBeEnabled();
    expect(engrenagem).toHaveAttribute("title", "Configurações da origem");
    await userEvent.click(engrenagem);
    expect(configurar).toHaveBeenCalledTimes(1);
  });

  it("sem configurar: desligada, com a dica pedida ou 'Em breve'", () => {
    const { unmount } = render(
      <LinhaDeContagem
        contagem={3}
        ordemAtiva={false}
        onAtualizar={() => {}}
        dicaDaEngrenagem="Sem permissão"
      />,
    );
    expect(screen.getByRole("button", { name: "Configurações da origem" })).toHaveAttribute(
      "title",
      "Sem permissão",
    );
    expect(screen.getByRole("button", { name: "Configurações da origem" })).toBeDisabled();
    unmount();
    render(<LinhaDeContagem contagem={3} ordemAtiva={false} onAtualizar={() => {}} />);
    expect(screen.getByRole("button", { name: "Configurações da origem" })).toHaveAttribute(
      "title",
      "Em breve",
    );
  });

  it("o evento leva o id da origem a quem escuta, e parar de escutar desliga", () => {
    const aoAbrir = vi.fn();
    const { unmount } = render(<Escuta aoAbrir={aoAbrir} />);
    abrirConfiguracoesDaOrigem("f-1");
    expect(aoAbrir).toHaveBeenCalledWith("f-1", "geral");
    unmount();
    window.dispatchEvent(new CustomEvent(EVENTO_DAS_CONFIGURACOES, { detail: { id: "f-2" } }));
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it("a aba pedida vai junto (Fase 1I: a engrenagem da ficha abre em Etapas e atividades)", () => {
    const aoAbrir = vi.fn();
    render(<Escuta aoAbrir={aoAbrir} />);
    abrirConfiguracoesDaOrigem("f-1", "etapas");
    expect(aoAbrir).toHaveBeenCalledWith("f-1", "etapas");
  });
});

/** A engrenagem como o quadro a monta: liga só com o painel Origens montado e papel de gerente ou acima. */
function Engrenagem({ gerente }: { gerente: boolean }) {
  const { aoConfigurar, dicaDaEngrenagem } = useEngrenagemDaOrigem("f-1", gerente);
  return (
    <LinhaDeContagem
      contagem={3}
      ordemAtiva={false}
      onAtualizar={() => {}}
      configurar={aoConfigurar}
      dicaDaEngrenagem={dicaDaEngrenagem}
    />
  );
}
const NOME = { name: "Configurações da origem" };

describe("a engrenagem do quadro (F20): só liga com o painel Origens por perto", () => {
  it("sem ninguém escutando, desligada com 'Em breve', até para gerente", () => {
    render(<Engrenagem gerente />);
    expect(screen.getByRole("button", NOME)).toBeDisabled();
    expect(screen.getByRole("button", NOME)).toHaveAttribute("title", "Em breve");
  });

  it("com o painel e gerente: ligada, e o clique leva o id a quem escuta", async () => {
    const aoAbrir = vi.fn();
    render(
      <>
        <Escuta aoAbrir={aoAbrir} />
        <Engrenagem gerente />
      </>,
    );
    const engrenagem = screen.getByRole("button", NOME);
    expect(engrenagem).toBeEnabled();
    await userEvent.click(engrenagem);
    expect(aoAbrir).toHaveBeenCalledWith("f-1", "geral");
  });

  it("com o painel e abaixo de gerente: desligada com 'Sem permissão'", () => {
    render(
      <>
        <Escuta aoAbrir={() => {}} />
        <Engrenagem gerente={false} />
      </>,
    );
    expect(screen.getByRole("button", NOME)).toBeDisabled();
    expect(screen.getByRole("button", NOME)).toHaveAttribute("title", "Sem permissão");
  });

  it("o painel sai de cena e a engrenagem desliga de novo", () => {
    const cena = (painel: boolean) => (
      <>
        {painel ? <Escuta aoAbrir={() => {}} /> : null}
        <Engrenagem gerente />
      </>
    );
    const { rerender } = render(cena(true));
    expect(screen.getByRole("button", NOME)).toBeEnabled();
    rerender(cena(false));
    expect(screen.getByRole("button", NOME)).toBeDisabled();
    expect(screen.getByRole("button", NOME)).toHaveAttribute("title", "Em breve");
  });
});

describe("a engrenagem abre a janela do PainelOrigens (integração)", () => {
  const ORIGENS: Origens = {
    grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
    funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
  };
  const PREFERENCIAS = {
    painelAberto: true,
    listaAberta: true,
    visualizacoesAbertas: true,
    recentesAbertos: false,
    ocultos: [],
  };

  it("o evento com o id abre a JanelaDaOrigem com o nome daquela origem", async () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Engrenagem gerente />
        <PainelOrigens
          origens={ORIGENS}
          visualizacoes={[]}
          podeGerenciar
          preferencias={PREFERENCIAS}
        />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", NOME));
    expect(await screen.findByRole("dialog", { name: "Clayton" })).toBeInTheDocument();
  });
});
