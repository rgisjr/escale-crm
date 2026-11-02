import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutacoes = vi.hoisted(() => ({
  responder: { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false },
  direct: { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false },
  ocultar: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
  apagar: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useAcoesNoComentario", () => ({
  useResponderComentario: () => mutacoes.responder,
  useDirectDoComentario: () => mutacoes.direct,
  useOcultarComentario: () => mutacoes.ocultar,
  useApagarComentario: () => mutacoes.apagar,
}));

import { toast } from "sonner";

import { AcoesDoComentario } from "@/components/escale/conversas/comentarios/AcoesDoComentario";
import { ComentariosDaPublicacao } from "@/components/escale/conversas/comentarios/ComentariosDaPublicacao";
import { CompositorDoComentario } from "@/components/escale/conversas/comentarios/CompositorDoComentario";
import { ItemDoComentario } from "@/components/escale/conversas/comentarios/ItemDoComentario";
import { PainelDoComentario } from "@/components/escale/conversas/comentarios/PainelDoComentario";
import type { ComentarioDaCaixa, PublicacaoDaCaixa } from "@/lib/escale/comentarios/caixa";

/** Fase 10A: o item, as ações, o compositor, o painel e a confirmação de apagar. */
const CONTA = { id: "canal-1", nome: "@oregis", plataforma: "instagram" as const, conectada: true, podeApagar: true };
const AGORA = new Date("2026-11-02T15:00:00Z");
const comentario = (id: string, extra: Partial<ComentarioDaCaixa> = {}): ComentarioDaCaixa => ({
  id,
  texto: `Texto ${id}`,
  comentadoEm: "2026-11-02T12:00:00Z",
  autor: { id: "u1", usuario: "ana", nome: "Ana Souza", foto: null, daPropriaConta: false },
  oculto: false,
  curtido: null,
  curtidas: null,
  respostas: [],
  respondido: false,
  contato: null,
  direct: { liberado: true },
  ...extra,
});
const PUBLICACAO: PublicacaoDaCaixa = {
  id: "post-1",
  legenda: "Meu Reels",
  miniatura: null,
  link: "https://www.instagram.com/p/abc",
  tipo: null,
  publicadaEm: "2026-10-30T12:00:00Z",
  ultimoComentarioEm: null,
  comentarios: 2,
  semResposta: null,
};
const acoes = () => ({
  aoEscolher: vi.fn(),
  aoResponder: vi.fn(),
  aoMandarDirect: vi.fn(),
  aoOcultar: vi.fn(),
  aoApagar: vi.fn(),
});

beforeEach(() => vi.clearAllMocks());

describe("ItemDoComentario", () => {
  it("chips, texto e respostas aninhadas", () => {
    const c = comentario("c1", {
      contato: { id: "k1", nome: "Ana" },
      oculto: true,
      respostas: [comentario("r1", { autor: { id: "conta", usuario: "oregis", nome: null, foto: null, daPropriaConta: true } })],
    });
    render(<ItemDoComentario comentario={c} conta={CONTA} escolhido={false} nivel={0} agora={AGORA} {...acoes()} />);
    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("Texto c1")).toBeInTheDocument();
    expect(screen.getByText("Contato")).toBeInTheDocument();
    expect(screen.getByText("Oculto")).toBeInTheDocument();
    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByText("Texto r1")).toBeInTheDocument();
    expect(screen.getAllByText("Sem resposta")).toHaveLength(1);
  });

  it("clicar no corpo escolhe o comentário", async () => {
    const a = acoes();
    const c = comentario("c1");
    render(<ItemDoComentario comentario={c} conta={CONTA} escolhido={false} nivel={0} agora={AGORA} {...a} />);
    await userEvent.click(screen.getByText("Texto c1"));
    expect(a.aoEscolher).toHaveBeenCalledWith(c);
  });
});

describe("AcoesDoComentario", () => {
  const montar = (c: ComentarioDaCaixa, conta = CONTA) => {
    const a = acoes();
    render(<AcoesDoComentario comentario={c} conta={conta} aoResponder={a.aoResponder} aoMandarDirect={a.aoMandarDirect} aoOcultar={a.aoOcultar} aoApagar={a.aoApagar} />);
    return a;
  };

  it("direct desligado mostra o motivo e não dispara", async () => {
    const a = montar(comentario("c1", { direct: { liberado: false, motivo: "prazo_vencido" } }));
    const botao = screen.getByRole("button", { name: "Mandar direct" });
    expect(botao).toHaveAttribute("aria-disabled", "true");
    expect(botao).toHaveAttribute("title", "O Instagram só aceita o direct até 7 dias depois do comentário.");
    await userEvent.click(botao);
    expect(a.aoMandarDirect).not.toHaveBeenCalled();
  });

  it("direct liberado dispara; cada motivo tem o seu texto", async () => {
    const a = montar(comentario("c1"));
    await userEvent.click(screen.getByRole("button", { name: "Mandar direct" }));
    expect(a.aoMandarDirect).toHaveBeenCalled();
  });

  it("sem Apagar para quem não pode; comentário da própria conta sem direct", () => {
    montar(comentario("c1", { autor: { id: "conta", usuario: "oregis", nome: null, foto: null, daPropriaConta: true } }), { ...CONTA, podeApagar: false });
    expect(screen.queryByRole("button", { name: "Apagar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mandar direct" })).toBeNull();
    expect(screen.getByRole("button", { name: "Responder" })).toBeInTheDocument();
  });

  it("Ocultar vira Reexibir e manda o valor novo", async () => {
    const a = montar(comentario("c1", { oculto: true }));
    await userEvent.click(screen.getByRole("button", { name: "Reexibir" }));
    expect(a.aoOcultar).toHaveBeenCalledWith(false);
  });
});

describe("CompositorDoComentario", () => {
  const montar = (alvo: ComentarioDaCaixa | null, modo: "responder" | "direct" = "responder", enviar = vi.fn().mockResolvedValue(undefined)) => {
    render(<CompositorDoComentario alvo={alvo} modo={modo} aoMudarModo={vi.fn()} aoCancelar={vi.fn()} aoEnviar={enviar} />);
    return enviar;
  };

  it("sem alvo a caixa fica desligada com o aviso", () => {
    montar(null);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByPlaceholderText("Escolha um comentário para responder.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enviar/ })).toBeDisabled();
  });

  it("contador e Ctrl+Enter enviam o texto sem espaços e limpam", async () => {
    const enviar = montar(comentario("c1"));
    await userEvent.type(screen.getByRole("textbox"), "  Obrigada!  ");
    expect(screen.getByText("13/1.000")).toBeInTheDocument();
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    expect(enviar).toHaveBeenCalledWith("responder", "Obrigada!");
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("acima de 1.000 caracteres desliga o Enviar", async () => {
    montar(comentario("c1"));
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.paste("a".repeat(1001));
    expect(screen.getByText("1.001/1.000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enviar/ })).toBeDisabled();
  });

  it("erro mantém o texto", async () => {
    montar(comentario("c1"), "responder", vi.fn().mockRejectedValue(new Error("falhou")));
    await userEvent.type(screen.getByRole("textbox"), "oi");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(screen.getByRole("textbox")).toHaveValue("oi");
  });

  it("modo direct mostra a nota; direct bloqueado mostra a explicação e desliga o Enviar", () => {
    montar(comentario("c1"), "direct");
    expect(screen.getByText(/Uma mensagem por comentário, até 7 dias depois dele/)).toBeInTheDocument();
  });

  it("direct bloqueado: explicação no lugar da caixa", () => {
    montar(comentario("c1", { direct: { liberado: false, motivo: "ja_usado" } }), "direct");
    expect(screen.getByText("Este comentário já recebeu um direct. O Instagram aceita um só por comentário.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: /Enviar/ })).toBeDisabled();
  });
});

describe("PainelDoComentario", () => {
  it("sem comentário mostra a publicação com o link", () => {
    render(<PainelDoComentario conta={CONTA} publicacao={PUBLICACAO} comentario={null} />);
    expect(screen.getByText("Meu Reels")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver no Instagram/ })).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("com contato: nome e 'Abrir ficha' para a ficha", () => {
    render(<PainelDoComentario conta={CONTA} publicacao={PUBLICACAO} comentario={comentario("c1", { contato: { id: "k1", nome: "Ana Souza" } })} />);
    expect(screen.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute("href", "/app/contacts/k1");
  });

  it("sem contato: 'Ainda não é contato' e a data-limite do direct", () => {
    render(<PainelDoComentario conta={CONTA} publicacao={PUBLICACAO} comentario={comentario("c1")} />);
    expect(screen.getByText("Ainda não é contato")).toBeInTheDocument();
    expect(screen.getByText(/Pode receber um direct até \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("direct usado mostra o motivo", () => {
    render(<PainelDoComentario conta={CONTA} publicacao={PUBLICACAO} comentario={comentario("c1", { direct: { liberado: false, motivo: "ja_usado" } })} />);
    expect(screen.getByText(/já recebeu um direct/)).toBeInTheDocument();
  });
});

describe("ComentariosDaPublicacao", () => {
  const montar = (comentarios: ComentarioDaCaixa[]) =>
    render(
      <ComentariosDaPublicacao
        conta={CONTA}
        publicacao={PUBLICACAO}
        comentarios={comentarios}
        carregando={false}
        comErro={false}
        temMais={false}
        carregandoMais={false}
        aoCarregarMais={vi.fn()}
        atualizando={false}
        aoAtualizar={vi.fn()}
        escolhidoId={null}
        aoEscolher={vi.fn()}
        agora={AGORA}
      />,
    );

  it("cabeçalho com data BR e 'sem resposta' contado; lista em ordem crescente de data", () => {
    montar([comentario("novo", { comentadoEm: "2026-11-02T14:00:00Z" }), comentario("velho", { comentadoEm: "2026-11-01T10:00:00Z" })]);
    expect(screen.getByText(/Publicada em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByText(/· 2 sem resposta/)).toBeInTheDocument();
    const textos = screen.getAllByText(/^Texto /).map((n) => n.textContent);
    expect(textos).toEqual(["Texto velho", "Texto novo"]);
  });

  it("apagar pede confirmação; cancelar não chama a rota; confirmar apaga", async () => {
    const c = comentario("c1");
    montar([c]);
    await userEvent.click(screen.getByRole("button", { name: "Apagar" }));
    const janela = screen.getByRole("dialog");
    expect(within(janela).getByText("Apagar comentário?")).toBeInTheDocument();
    expect(within(janela).getByText("O comentário some do Instagram para todos. Não dá para desfazer.")).toBeInTheDocument();
    await userEvent.click(within(janela).getByRole("button", { name: "Cancelar" }));
    expect(mutacoes.apagar.mutate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Apagar" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Apagar/ }));
    expect(mutacoes.apagar.mutate).toHaveBeenCalledWith({ comentario: c }, expect.anything());
  });

  it("filtro sem resultado mostra o aviso e 'Limpar filtro'", async () => {
    montar([comentario("c1")]);
    await userEvent.type(screen.getByLabelText("Buscar por @ ou texto"), "zzzz");
    expect(await screen.findByText("Nenhum comentário corresponde ao filtro.", undefined, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar filtro" })).toBeInTheDocument();
  });

  it("direct bem-sucedido mostra o toast com 'Abrir conversa'; erro mantém e avisa", async () => {
    const c = comentario("c1");
    mutacoes.direct.mutateAsync.mockResolvedValueOnce({ conversationId: "conv-1" });
    montar([c]);
    await userEvent.click(screen.getByRole("button", { name: "Mandar direct" }));
    await userEvent.type(screen.getByLabelText("Escreva a mensagem do direct"), "Oi!");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(mutacoes.direct.mutateAsync).toHaveBeenCalledWith({ comentario: c, texto: "Oi!" });
    expect(toast.success).toHaveBeenCalledWith("Direct enviado.", expect.objectContaining({ action: expect.objectContaining({ label: "Abrir conversa" }) }));

    mutacoes.direct.mutateAsync.mockRejectedValueOnce(new Error("O Instagram recusou"));
    await userEvent.type(screen.getByLabelText("Escreva a mensagem do direct"), "De novo");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(toast.error).toHaveBeenCalledWith("O Instagram recusou");
    expect(screen.getByLabelText("Escreva a mensagem do direct")).toHaveValue("De novo");
  });
});
