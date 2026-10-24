import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/escale/useDetalheDaCampanha", () => ({ useNegociosDaCampanha: vi.fn() }));
vi.mock("@/lib/escale/exportar/baixar", () => ({ baixarCsv: vi.fn() }));

import { GavetaDeNegocios } from "@/components/escale/campanhas/detalhe/GavetaDeNegocios";
import { SumarioDaCampanha } from "@/components/escale/campanhas/detalhe/SumarioDaCampanha";
import { useNegociosDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import { csvDosNegocios } from "@/lib/escale/campanhas/detalhe/csv";
import type { DadosDoDetalhe, NegocioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";
import { baixarCsv } from "@/lib/escale/exportar/baixar";

const SP = "America/Sao_Paulo";
const DADOS: DadosDoDetalhe = {
  campanha: {
    id: "c1",
    nome: "10.09",
    status: "completed",
    numeroId: "n1",
    numerosExtras: [],
    mensagem: "Oi, {{primeiro_nome}}!",
    modelo: null,
    baseLegal: "consent",
    liaRef: null,
    ritmo: {
      intervaloSegundos: null,
      tetoDiario: null,
      tetoHorario: null,
      janelaInicioHora: null,
      janelaFimHora: null,
    },
    iniciadaEm: "2026-09-10T15:39:00Z",
    agendadaPara: null,
    criadaEm: "2026-09-10T12:00:00Z",
  },
  sumario: {
    adicionados: 30,
    enviados: 26,
    entregues: 23,
    lidas: 16,
    respondidas: 10,
    leuSemResposta: 6,
    erros: 4,
    naoEnviados: 0,
    aguardando: 0,
    foraDaLista: 2,
  },
  ritmo: [{ hora: "2026-09-10T12:00:00", envios: 26 }],
  motivos: [
    { codigo: "131049", quantidade: 2 },
    { codigo: null, quantidade: 1 },
    { codigo: "130429", quantidade: 1 },
  ],
  resultado: {
    negocios: 8,
    valorAbertoCentavos: 1_468_092,
    valorGanhoCentavos: 0,
    medianaSegundos: null,
    benchmark: 0.43,
    taxaDaCampanha: 0.3333,
  },
  fuso: SP,
};

function montar(dados: DadosDoDetalhe = DADOS) {
  const props = {
    aoVerContatos: vi.fn(),
    aoCriarCampanhaDosNaoEnviados: vi.fn(),
    aoAbrirNegocios: vi.fn(),
  };
  render(
    <SumarioDaCampanha dados={dados} colunaDireita={<p>coluna</p>} criando={false} {...props} />,
  );
  return props;
}

describe("Sumário: topo, funil, rosca e ritmo (009, 010)", () => {
  it("os 4 cartões, o funil em % sobre enviados, a rosca com o total e a barra do ritmo", () => {
    montar();
    expect(screen.getByText("Adicionados p/ envio")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
    const funil = screen.getByRole("region", { name: "Funil de conversão" });
    expect(within(funil).getByText("26 · 100%")).toBeInTheDocument();
    expect(within(funil).getByText("16 · 62%")).toBeInTheDocument();
    const rosca = screen.getByRole("region", { name: "Distribuição por status" });
    expect(within(rosca).getByText("30")).toBeInTheDocument();
    expect(within(rosca).getByText("contatos")).toBeInTheDocument();
    expect(within(rosca).getByText("Lida").nextSibling).toHaveTextContent("16");
    expect(within(rosca).queryByText("Aguardando envio")).toBeNull();
    const ritmo = screen.getByRole("region", { name: "Ritmo de envio" });
    expect(within(ritmo).getByText("12:00")).toBeInTheDocument();
    expect(screen.getByText("coluna")).toBeInTheDocument();
  });

  it("ritmo sem envio mostra o vazio", () => {
    montar({ ...DADOS, ritmo: [] });
    expect(
      within(screen.getByRole("region", { name: "Ritmo de envio" })).getByText(
        "Nenhum envio ainda",
      ),
    ).toBeInTheDocument();
  });
});

describe("Sumário: motivos, oportunidade e não enviados (010; C5, C6, C15)", () => {
  it("motivos: o selo, o resumo e a lista ao abrir", async () => {
    montar();
    const motivos = screen.getByRole("region", { name: "Motivos do erro" });
    expect(within(motivos).getByText("4 falhas")).toBeInTheDocument();
    expect(within(motivos).getByText("3 motivos em 4 falhas de envio")).toBeInTheDocument();
    await userEvent.click(within(motivos).getByRole("button", { name: "Ver motivos" }));
    expect(within(motivos).getByText("Meta optou por não entregar")).toBeInTheDocument();
    expect(within(motivos).getByText("2 · 50%")).toBeInTheDocument();
    expect(within(motivos).getByRole("button", { name: "Ocultar motivos" })).toBeInTheDocument();
  });

  it("sem falha, o bloco de motivos some", () => {
    montar({ ...DADOS, sumario: { ...DADOS.sumario, erros: 0 }, motivos: [] });
    expect(screen.queryByRole("region", { name: "Motivos do erro" })).toBeNull();
  });

  it("leu e não respondeu: 23% · 6 e 'Ver contatos' filtra por Lida", async () => {
    const p = montar();
    const bloco = screen.getByRole("region", { name: "Leu e não respondeu" });
    expect(within(bloco).getByText("23%")).toBeInTheDocument();
    expect(within(bloco).getByText("Oportunidade")).toBeInTheDocument();
    await userEvent.click(within(bloco).getByRole("button", { name: "Ver contatos" }));
    expect(p.aoVerContatos).toHaveBeenCalledWith({ situacoes: ["lida"] });
  });

  it("não enviados só com alguém; ver contatos e criar campanha", async () => {
    expect(screen.queryByRole("region", { name: "Não enviados" })).toBeNull();
    const p = montar({ ...DADOS, sumario: { ...DADOS.sumario, naoEnviados: 3 } });
    const bloco = screen.getByRole("region", { name: "Não enviados" });
    await userEvent.click(within(bloco).getByRole("button", { name: "Ver contatos" }));
    expect(p.aoVerContatos).toHaveBeenCalledWith({ situacoes: ["nao_enviado"] });
    await userEvent.click(within(bloco).getByRole("button", { name: "Criar campanha" }));
    expect(p.aoCriarCampanhaDosNaoEnviados).toHaveBeenCalled();
  });
});

describe("Sumário: resultado (011; C7–C9)", () => {
  it("negócios e valores abrem a gaveta; custos com traço; mediana; benchmark abaixo em vermelho; rodapé", async () => {
    const p = montar();
    expect(screen.getByRole("heading", { name: "Resultado" })).toBeInTheDocument();
    expect(screen.getByText("R$ 14.680,92")).toBeInTheDocument();
    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Valor em aberto/ }));
    expect(p.aoAbrirNegocios).toHaveBeenCalledWith("abertos");
    await userEvent.click(screen.getByRole("button", { name: /Negócios criados/ }));
    expect(p.aoAbrirNegocios).toHaveBeenCalledWith("todos");
    expect(screen.getByText("Custo real")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Não foi possível calcular o tempo de resposta.")).toBeInTheDocument();
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.getByText("33%")).toHaveAttribute("data-tom", "abaixo");
    expect(screen.getByText("Enviado em 10/09/2026 12:39")).toBeInTheDocument();
  });

  it("sem outras campanhas concluídas, o texto da Clint", () => {
    montar({ ...DADOS, resultado: { ...DADOS.resultado, benchmark: null } });
    expect(
      screen.getByText("Ainda não há outras campanhas concluídas da conta para comparar."),
    ).toBeInTheDocument();
  });
});

const NEGOCIO: NegocioDaCampanha = {
  id: "l1",
  contato: "Elza",
  telefone: "+5553984555965",
  origem: "Vendas",
  status: "won",
  valorCentavos: 150_000,
  criadoEm: "2026-09-11T12:00:00Z",
};

describe("Gaveta 'Negócios criados' (C7; material 2.3)", () => {
  it("o título da situação, a linha, '1 de 1' e o CSV", async () => {
    vi.mocked(useNegociosDaCampanha).mockReturnValue({
      data: { linhas: [NEGOCIO], total: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    render(
      <GavetaDeNegocios
        campanhaId="c1"
        nomeDaCampanha="10.09"
        situacao="ganhos"
        aoFechar={vi.fn()}
        fuso={SP}
      />,
    );
    const gaveta = screen.getByRole("dialog", {
      name: "Negócios ganhos criados por esta campanha",
    });
    expect(within(gaveta).getByText("1 negócios gerados por 10.09")).toBeInTheDocument();
    expect(within(gaveta).getByText("(53) 98455-5965")).toBeInTheDocument();
    expect(within(gaveta).getByText("Ganho")).toBeInTheDocument();
    expect(within(gaveta).getByText("R$ 1.500,00")).toBeInTheDocument();
    expect(within(gaveta).getByText("11/09/2026")).toBeInTheDocument();
    expect(within(gaveta).getByText("1 de 1")).toBeInTheDocument();
    await userEvent.click(within(gaveta).getByRole("button", { name: "Baixar CSV" }));
    expect(baixarCsv).toHaveBeenCalledWith(
      expect.stringMatching(/^negocios-campanha-10-09-\d{4}-\d{2}-\d{2}\.csv$/),
      expect.stringContaining("Elza"),
    );
  });

  it("vazio: os textos da Clint", () => {
    vi.mocked(useNegociosDaCampanha).mockReturnValue({
      data: { linhas: [], total: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    render(
      <GavetaDeNegocios
        campanhaId="c1"
        nomeDaCampanha="10.09"
        situacao="todos"
        aoFechar={vi.fn()}
      />,
    );
    expect(screen.getByText("Nenhum negócio encontrado")).toBeInTheDocument();
    expect(
      screen.getByText("Os negócios criados por esta campanha aparecerão aqui."),
    ).toBeInTheDocument();
  });

  it("o CSV dos negócios", () => {
    expect(csvDosNegocios([NEGOCIO], (s) => s, SP).split("\r\n")).toEqual([
      "Contato,Telefone,Origem,Status,Valor,Criado em",
      'Elza,(53) 98455-5965,Vendas,Ganho,"1500,00",11/09/2026',
    ]);
  });
});
