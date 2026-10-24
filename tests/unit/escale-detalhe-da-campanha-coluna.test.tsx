import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const salvar = vi.fn();
vi.mock("@/hooks/escale/useDetalheDaCampanha", () => ({
  useRitmoDaCampanha: () => ({ mutateAsync: salvar, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ColunaDaMensagem } from "@/components/escale/campanhas/detalhe/ColunaDaMensagem";
import type { InfoDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";

const CAMPANHA: InfoDaCampanha = {
  id: "c1",
  nome: "10.09",
  status: "running",
  numeroId: "n1",
  numerosExtras: ["n2"],
  mensagem: "Oi, {{primeiro_nome}}!",
  modelo: { nome: "msg1_ancca", idioma: "pt_BR", categoria: "MARKETING" },
  baseLegal: "legitimate_interest",
  liaRef: "LIA-2026-01",
  ritmo: {
    intervaloSegundos: 30,
    tetoDiario: null,
    tetoHorario: null,
    janelaInicioHora: 8,
    janelaFimHora: 20,
  },
  iniciadaEm: "2026-09-10T17:59:00Z",
  agendadaPara: null,
  criadaEm: "2026-09-10T12:00:00Z",
};
const nomes: Record<string, string> = { n1: "Naiara", n2: "Reserva" };
const nomeDoNumero = (id: string) => nomes[id] ?? "—";

describe("a coluna da mensagem (009, 010; C10, C13)", () => {
  it("a prévia com a conta e a hora; o modelo com o idioma e a categoria; o dispositivo", () => {
    render(
      <ColunaDaMensagem campanha={CAMPANHA} nomeDoNumero={nomeDoNumero} fuso="America/Sao_Paulo" />,
    );
    expect(screen.getAllByText("Naiara").length).toBe(2);
    expect(screen.getAllByText("14:59").length).toBeGreaterThan(0);
    expect(screen.getByText("Modelo utilizado")).toBeInTheDocument();
    expect(screen.getByText("msg1_ancca")).toBeInTheDocument();
    expect(screen.getByText("BR")).toBeInTheDocument();
    expect(screen.getByText("Marketing")).toBeInTheDocument();
    expect(screen.getByText("Dispositivo de envio")).toBeInTheDocument();
  });

  it("sem modelo, o texto da Clint", () => {
    render(
      <ColunaDaMensagem campanha={{ ...CAMPANHA, modelo: null }} nomeDoNumero={nomeDoNumero} />,
    );
    expect(
      screen.getByText("Esta campanha envia uma mensagem livre, sem modelo aprovado."),
    ).toBeInTheDocument();
  });

  it("Entrega: o ritmo, os números extras e a base legal; Editar só enquanto não terminou", () => {
    const { rerender } = render(
      <ColunaDaMensagem campanha={CAMPANHA} nomeDoNumero={nomeDoNumero} />,
    );
    const entrega = screen.getByRole("region", { name: "Entrega" });
    expect(within(entrega).getByText("30 s")).toBeInTheDocument();
    expect(within(entrega).getByText("08h às 20h")).toBeInTheDocument();
    expect(within(entrega).getByText("Reserva")).toBeInTheDocument();
    expect(within(entrega).getByText("Interesse legítimo (LIA-2026-01)")).toBeInTheDocument();
    expect(within(entrega).getByRole("button", { name: "Editar" })).toBeInTheDocument();
    rerender(
      <ColunaDaMensagem
        campanha={{ ...CAMPANHA, status: "completed" }}
        nomeDoNumero={nomeDoNumero}
      />,
    );
    expect(
      within(screen.getByRole("region", { name: "Entrega" })).queryByRole("button", {
        name: "Editar",
      }),
    ).toBeNull();
  });

  it("editar o ritmo: valida e salva pelo PATCH do original", async () => {
    salvar.mockResolvedValue({});
    render(<ColunaDaMensagem campanha={CAMPANHA} nomeDoNumero={nomeDoNumero} />);
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const janela = screen.getByRole("dialog", { name: "Ritmo de envio" });
    const intervalo = within(janela).getByLabelText("Intervalo entre mensagens (segundos)");
    await userEvent.clear(intervalo);
    await userEvent.type(intervalo, "0");
    await userEvent.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(within(janela).getByText("O intervalo vai de 1 a 86.400 segundos.")).toBeInTheDocument();
    expect(salvar).not.toHaveBeenCalled();
    await userEvent.clear(intervalo);
    await userEvent.type(intervalo, "45");
    await userEvent.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith({
      intervalo_segundos: 45,
      teto_diario: null,
      teto_horario: null,
      janela_inicio_hora: 8,
      janela_fim_hora: 20,
    });
  });
});
