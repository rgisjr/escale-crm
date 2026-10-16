import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutacoes = vi.hoisted(() => ({ criar: vi.fn(), mudar: vi.fn(), excluir: vi.fn() }));
const lista = vi.hoisted(() => ({ atual: [] as unknown[], erro: false }));

vi.mock("@/hooks/escale/useFiltrosSalvos", () => ({
  useFiltrosSalvos: () => ({ data: lista.atual, isError: lista.erro }),
  useCriarFiltroSalvo: () => ({ mutate: mutacoes.criar, isPending: false }),
  useMudarFiltroSalvo: () => ({ mutate: mutacoes.mudar, isPending: false }),
  useExcluirFiltroSalvo: () => ({ mutate: mutacoes.excluir, isPending: false }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from "sonner";
import { MenuDeFiltrosSalvos } from "@/components/escale/filtros/MenuDeFiltrosSalvos";
import type { FiltroSalvo } from "@/lib/escale/filtros/filtros-salvos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const QUENTES: FiltroSalvo = {
  id: "11111111-1111-4111-8111-111111111111",
  nome: "Quentes",
  compartilhado: false,
  meu: true,
  criterios: { status: ["open"], tags: ["vip"] },
};
const DO_TIME: FiltroSalvo = {
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Do time",
  compartilhado: true,
  meu: false,
  criterios: { status: ["open", "won"] },
};

function menu(filtroSalvoId: string | null = null, filtros: FiltrosDoQuadro = { status: ["open"] }) {
  const onAplicar = vi.fn();
  render(<MenuDeFiltrosSalvos alvo={{ tipo: "origem", id: "p-1" }} filtros={filtros} filtroSalvoId={filtroSalvoId} onAplicar={onAplicar} />);
  return { onAplicar, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

const abrirMenu = (u: ReturnType<typeof userEvent.setup>) => u.click(screen.getByTestId("filtros-salvos"));

beforeEach(() => {
  lista.atual = [QUENTES, DO_TIME];
  lista.erro = false;
  for (const m of Object.values(mutacoes)) m.mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("<MenuDeFiltrosSalvos>", () => {
  it("lista os meus e os compartilhados; aplicar leva os critérios e o id", async () => {
    const { onAplicar, u } = menu();
    await abrirMenu(u);
    expect(screen.getByText("Meus filtros")).toBeInTheDocument();
    expect(screen.getByText("Compartilhados com você")).toBeInTheDocument();
    await u.click(screen.getByRole("menuitem", { name: "Do time" }));
    expect(onAplicar).toHaveBeenCalledWith(DO_TIME.criterios, DO_TIME.id);
  });

  it("filtro meu aplicado e mexido: o botão avisa, e o menu salva as alterações", async () => {
    const { u } = menu(QUENTES.id, { status: ["open"] });
    expect(screen.getByTestId("filtros-salvos")).toHaveTextContent("Quentes");
    expect(screen.getByTestId("filtros-salvos")).toHaveTextContent("(alterado)");
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar alterações neste filtro" }));
    expect(mutacoes.mudar).toHaveBeenCalledWith({ id: QUENTES.id, mudanca: { criterios: { status: ["open"] } } }, expect.anything());
  });

  it("aplicado sem mudança: sem aviso nem 'salvar alterações'; renomear e excluir aparecem", async () => {
    const { u } = menu(QUENTES.id, QUENTES.criterios);
    expect(screen.getByTestId("filtros-salvos")).not.toHaveTextContent("(alterado)");
    await abrirMenu(u);
    expect(screen.queryByRole("menuitem", { name: "Salvar alterações neste filtro" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Renomear ou compartilhar…" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Excluir filtro" })).toBeInTheDocument();
  });

  it("salvar o filtro atual, compartilhado, cria com os filtros da tela e já o aplica", async () => {
    mutacoes.criar.mockImplementation((_novo: unknown, opcoes: { onSuccess: () => void }) => opcoes.onSuccess());
    const atuais: FiltrosDoQuadro = { status: ["open"], atrasados: true };
    const { onAplicar, u } = menu(null, atuais);
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar filtro atual…" }));
    const janela = await screen.findByRole("dialog", { name: "Salvar filtro" });
    await u.type(within(janela).getByRole("textbox", { name: "Nome do filtro" }), "Fechando");
    await u.click(within(janela).getByRole("checkbox", { name: "Compartilhar com quem vê esta origem" }));
    await u.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(mutacoes.criar).toHaveBeenCalledWith(
      { id: expect.any(String), nome: "Fechando", compartilhado: true, criterios: atuais },
      expect.anything(),
    );
    const { id } = mutacoes.criar.mock.calls[0]![0] as { id: string };
    expect(onAplicar).toHaveBeenCalledWith(atuais, id);
  });

  it("nome repetido entre os meus é recusado na janela, sem chamar a rota", async () => {
    const { u } = menu();
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar filtro atual…" }));
    const janela = await screen.findByRole("dialog", { name: "Salvar filtro" });
    await u.type(within(janela).getByRole("textbox", { name: "Nome do filtro" }), "quentes");
    await u.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(within(janela).getByRole("alert")).toHaveTextContent("Você já tem um filtro com esse nome aqui.");
    expect(mutacoes.criar).not.toHaveBeenCalled();
  });

  it("no limite de 20 filtros meus, avisa com o texto da Clint e não abre a janela", async () => {
    lista.atual = Array.from({ length: 20 }, (_, i) => ({ ...QUENTES, id: `id-${i}`, nome: `Filtro ${i}` }));
    const { u } = menu();
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar filtro atual…" }));
    expect(toast.error).toHaveBeenCalledWith("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("excluir pede confirmação e solta o filtro aplicado", async () => {
    mutacoes.excluir.mockImplementation((_id: string, opcoes: { onSuccess: () => void }) => opcoes.onSuccess());
    const { onAplicar, u } = menu(QUENTES.id, QUENTES.criterios);
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Excluir filtro" }));
    const confirmacao = await screen.findByRole("alertdialog", { name: "Excluir o filtro «Quentes»?" });
    await u.click(within(confirmacao).getByRole("button", { name: "Excluir" }));
    expect(mutacoes.excluir).toHaveBeenCalledWith(QUENTES.id, expect.anything());
    expect(onAplicar).toHaveBeenCalledWith(QUENTES.criterios, null);
  });

  it("erro ao carregar aparece no menu", async () => {
    lista.atual = [];
    lista.erro = true;
    const { u } = menu();
    await abrirMenu(u);
    expect(screen.getByText("Não consegui carregar os filtros salvos.")).toBeInTheDocument();
  });

  // Notas cruzadas da 1D: o painel emite filtros sem enxugar, e a ordem dos itens
  // das listas não é critério.
  it("as mesmas listas em outra ordem não contam como alterado", () => {
    lista.atual = [{ ...QUENTES, criterios: { status: ["open"], tags: ["vip", "novo"], conversa: { canais: ["whatsapp", "instagram"] } } }];
    menu(QUENTES.id, { status: ["open"], tags: ["novo", "vip"], conversa: { canais: ["instagram", "whatsapp"] } });
    expect(screen.getByTestId("filtros-salvos")).not.toHaveTextContent("(alterado)");
  });

  it("uma tag a mais conta como alterado", () => {
    menu(QUENTES.id, { status: ["open"], tags: ["vip", "outra"] });
    expect(screen.getByTestId("filtros-salvos")).toHaveTextContent("(alterado)");
  });

  it("a ordenação mantém o significado: outra ordem dos critérios é alterado", () => {
    lista.atual = [
      {
        ...QUENTES,
        criterios: {
          status: ["open"],
          ordem: [
            { campo: "negocio.valor", direcao: "asc" },
            { campo: "negocio.criado", direcao: "desc" },
          ],
        },
      },
    ];
    menu(QUENTES.id, {
      status: ["open"],
      ordem: [
        { campo: "negocio.criado", direcao: "desc" },
        { campo: "negocio.valor", direcao: "asc" },
      ],
    });
    expect(screen.getByTestId("filtros-salvos")).toHaveTextContent("(alterado)");
  });

  it("seção aberta e vazia no painel não conta como alterado", () => {
    menu(QUENTES.id, { status: ["open"], tags: ["vip"], campos: [], conversa: {} });
    expect(screen.getByTestId("filtros-salvos")).not.toHaveTextContent("(alterado)");
  });

  it("salvar alterações e salvar novo guardam o filtro enxugado", async () => {
    mutacoes.criar.mockImplementation((_n: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    const sujo: FiltrosDoQuadro = { status: ["open"], atrasados: true, tags: [], campos: [], conversa: {} };
    const { u } = menu(QUENTES.id, sujo);
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar alterações neste filtro" }));
    expect(mutacoes.mudar).toHaveBeenCalledWith(
      { id: QUENTES.id, mudanca: { criterios: { status: ["open"], atrasados: true } } },
      expect.anything(),
    );
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar filtro atual…" }));
    const janela = await screen.findByRole("dialog", { name: "Salvar filtro" });
    await u.type(within(janela).getByRole("textbox", { name: "Nome do filtro" }), "Atrasados");
    await u.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(mutacoes.criar).toHaveBeenCalledWith(
      { id: expect.any(String), nome: "Atrasados", compartilhado: false, criterios: { status: ["open"], atrasados: true } },
      expect.anything(),
    );
  });
});
