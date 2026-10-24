import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/escale/useModelosDeMensagem", () => ({ useModelosDeMensagem: vi.fn() }));
vi.mock("@/hooks/campanhas/useConfiguracao", () => ({ useTextosSalvos: vi.fn() }));

import { PassoConfigurar } from "@/components/escale/campanhas/assistente/PassoConfigurar";
import { VariaveisDoModelo } from "@/components/escale/campanhas/assistente/VariaveisDoModelo";
import { useTextosSalvos } from "@/hooks/campanhas/useConfiguracao";
import { useModelosDeMensagem } from "@/hooks/escale/useModelosDeMensagem";
import type { MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import {
  ASSISTENTE_VAZIO,
  estadoInicial,
  type EstadoDoAssistente,
} from "@/lib/escale/campanhas/estado-do-assistente";
import { mensagemDoModelo, modeloEscolhivel } from "@/lib/escale/campanhas/modelos-da-meta";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";

const OFICIAL: NumeroDaCampanha = {
  id: "n1",
  nome: "Bathully",
  telefone: "+551153043062",
  conectado: true,
  oficial: true,
  provider: "p",
  setor: null,
};
const LIVRE: NumeroDaCampanha = { ...OFICIAL, id: "n2", nome: "Naiara", oficial: false };
const COMPONENTES = [{ type: "BODY", text: "Oi, {{1}}! Tudo bem?" }];
const MODELOS = [
  {
    name: "msg1_ancca",
    language: "pt_BR",
    status: "APPROVED",
    category: "MARKETING",
    components: COMPONENTES,
    slots: [{ key: "1", expects: "text", onde: "body", valueKey: "1" }],
  },
];

const estado = (dados: Partial<EstadoDoAssistente["dados"]> = {}): EstadoDoAssistente => ({
  ...estadoInicial(),
  dados: { ...ASSISTENTE_VAZIO, ...dados },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useModelosDeMensagem).mockReturnValue({
    modelos: MODELOS,
    carregando: false,
    recarregar: vi.fn(),
    fonte: "oficial",
    recentes: ["msg1_ancca"],
    marcarUsado: vi.fn(),
  } as never);
  vi.mocked(useTextosSalvos).mockReturnValue({
    data: [{ id: "t1", name: "Boas-vindas", body: "Olá {{nome}}!", created_at: "" }],
    isLoading: false,
  } as never);
});

describe("modelos da Meta", () => {
  it("modelo com mídia sem valor salvo não pode ser escolhido; com valor salvo pode", () => {
    const comMidia = {
      ...MODELOS[0]!,
      slots: [{ key: "1", expects: "image", onde: "header", valueKey: "header:1" }],
    };
    expect(modeloEscolhivel(comMidia)).toBe(false);
    expect(modeloEscolhivel({ ...comMidia, savedValues: { "header:1": "https://x/y.png" } })).toBe(
      true,
    );
    expect(
      modeloEscolhivel({
        ...comMidia,
        slots: [{ key: "1", expects: "text", onde: "header", valueKey: "header:1" }],
      }),
    ).toBe(false);
  });

  it("a mensagem nasce com o corpo e os valores de mídia salvos", () => {
    const m = mensagemDoModelo({
      ...MODELOS[0]!,
      slots: [
        ...MODELOS[0]!.slots,
        { key: "1", expects: "image", onde: "header", valueKey: "header:1" },
      ],
      savedValues: { "header:1": "https://x/y.png" },
    });
    expect(m).toEqual({
      tipo: "modelo",
      nome: "msg1_ancca",
      idioma: "pt_BR",
      categoria: "MARKETING",
      corpo: "Oi, {{1}}! Tudo bem?",
      variaveis: { "header:1": { fonte: "fixo", valor: "https://x/y.png" } },
    });
  });
});

describe("PassoConfigurar", () => {
  it("título conforme o número; escolher o número despacha a troca", async () => {
    const despachar = vi.fn();
    const { rerender } = render(
      <PassoConfigurar
        estado={estado()}
        despachar={despachar}
        numeros={[OFICIAL, LIVRE]}
        personalizados={[]}
        podeSincronizar={false}
      />,
    );
    expect(screen.getByRole("heading", { name: "Mensagem de WhatsApp" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Selecionar conta/ }));
    await userEvent.click(screen.getByRole("option", { name: /Bathully/ }));
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudar",
      campos: expect.objectContaining({ numeroId: "n1" }),
    });
    rerender(
      <PassoConfigurar
        estado={estado({
          numeroId: "n1",
          mensagem: {
            tipo: "modelo",
            nome: "",
            idioma: "",
            categoria: null,
            corpo: "",
            variaveis: {},
          },
        })}
        despachar={despachar}
        numeros={[OFICIAL, LIVRE]}
        personalizados={[]}
        podeSincronizar={false}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Mensagem de WhatsApp Oficial" }),
    ).toBeInTheDocument();
  });

  it("número oficial: o modal 'Escolher mensagem' com os recentes, a prévia e o Selecionar", async () => {
    const despachar = vi.fn();
    render(
      <PassoConfigurar
        estado={estado({
          numeroId: "n1",
          mensagem: {
            tipo: "modelo",
            nome: "",
            idioma: "",
            categoria: null,
            corpo: "",
            variaveis: {},
          },
        })}
        despachar={despachar}
        numeros={[OFICIAL]}
        personalizados={[]}
        podeSincronizar={false}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "+ Selecionar modelo existente" }));
    expect(screen.getByText("USADOS RECENTEMENTE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar" })).toBeDisabled();
    await userEvent.click(screen.getAllByRole("option", { name: /msg1_ancca/ })[0]!);
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudar",
      campos: {
        mensagem: expect.objectContaining({
          tipo: "modelo",
          nome: "msg1_ancca",
          corpo: "Oi, {{1}}! Tudo bem?",
        }),
      },
    });
  });

  it("número não oficial: texto livre com 'Usar texto salvo'", async () => {
    const despachar = vi.fn();
    render(
      <PassoConfigurar
        estado={estado({ numeroId: "n2" })}
        despachar={despachar}
        numeros={[LIVRE]}
        personalizados={[]}
        podeSincronizar={false}
      />,
    );
    await userEvent.type(screen.getByLabelText("Mensagem"), "Oi");
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudar",
      campos: { mensagem: { tipo: "texto", texto: "O" } },
    });
    await userEvent.click(screen.getByRole("button", { name: "Usar texto salvo" }));
    await userEvent.click(screen.getByRole("option", { name: /Boas-vindas/ }));
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudar",
      campos: { mensagem: { tipo: "texto", texto: "Olá {{nome}}!" } },
    });
  });

  it("'Criar agendamento' mostra a data e hora; 'Interesse legítimo' pede a LIA", async () => {
    const despachar = vi.fn();
    const { rerender } = render(
      <PassoConfigurar
        estado={estado({ numeroId: "n2" })}
        despachar={despachar}
        numeros={[LIVRE]}
        personalizados={[]}
        podeSincronizar={false}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: /Criar agendamento/ }));
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudar",
      campos: { quando: { modo: "agendar", em: expect.any(String) } },
    });
    rerender(
      <PassoConfigurar
        estado={estado({
          numeroId: "n2",
          quando: { modo: "agendar", em: "2026-11-20T15:00:00.000Z" },
          baseLegal: "legitimate_interest",
        })}
        despachar={despachar}
        numeros={[LIVRE]}
        personalizados={[]}
        podeSincronizar={false}
      />,
    );
    expect(screen.getByText("Data e horário")).toBeInTheDocument();
    expect(screen.getByLabelText("Referência da avaliação (LIA)")).toBeInTheDocument();
  });

  it("com 'tentou', os avisos aparecem", () => {
    render(
      <PassoConfigurar
        estado={{ ...estado(), tentou: true }}
        despachar={vi.fn()}
        numeros={[LIVRE]}
        personalizados={[]}
        podeSincronizar={false}
      />,
    );
    expect(screen.getByText("Escolha o dispositivo de WhatsApp.")).toBeInTheDocument();
    expect(
      screen.getByText("O nome da campanha deve ter pelo menos 3 caracteres."),
    ).toBeInTheDocument();
  });
});

describe("VariaveisDoModelo", () => {
  const MODELO: MensagemDeModelo = {
    tipo: "modelo",
    nome: "m",
    idioma: "pt_BR",
    categoria: null,
    corpo: "Oi, {{1}}! Tudo bem? Aqui é a Naiara.",
    variaveis: {},
  };

  it("trecho, 0 de 1, valor fixo e texto alternativo", async () => {
    const aoMudar = vi.fn();
    const { rerender } = render(
      <VariaveisDoModelo mensagem={MODELO} personalizados={[]} aoMudar={aoMudar} />,
    );
    expect(screen.getByText("0 de 1 resolvida")).toBeInTheDocument();
    expect(screen.getByText(/Oi,/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Valor fixo" }));
    expect(aoMudar).toHaveBeenCalledWith({ "1": { fonte: "fixo", valor: "" } });
    rerender(
      <VariaveisDoModelo
        mensagem={{
          ...MODELO,
          variaveis: { "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null } },
        }}
        personalizados={[]}
        aoMudar={aoMudar}
      />,
    );
    expect(screen.getByText("1 de 1 resolvida")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "+ Definir texto alternativo" }));
    expect(
      screen.getByPlaceholderText("Texto usado quando o contato não tem o dado"),
    ).toBeInTheDocument();
  });
});
