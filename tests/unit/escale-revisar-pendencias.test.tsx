import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/escale/useCatalogoDeCampos", () => ({ useCatalogoDeCampos: () => ({ catalogo: { grupos: [], campos: [] } }) }));
const pendencias = [
  {
    id: "l-1", numero: 5, status: "revisar", motivo: "MATCH_PHONE_DIFFERS", normalizado: { nome: "Ana" },
    detalhe: { casouPor: "email", telefoneAtual: "+5564999446816", telefoneDoArquivo: "+5511988887777", contato: { id: "c", nome: "Ana", email: "ana@x.com", telefone: "+5564999446816", casouPor: "email", whatsapp: false }, avisos: {} },
    resolucoes: {}, mensagem: null, com_aviso: false,
  },
  {
    id: "l-2", numero: 6, status: "revisar", motivo: "MERGE_HINT_EMAIL_PHONE_SPLIT", normalizado: { nome: "Bia", email: "bia@x.com", telefone: "+5511977776666" },
    detalhe: { contatos: [{ id: "a", nome: "Bia A", email: "bia@x.com", telefone: null, casouPor: "email", whatsapp: false }, { id: "b", nome: "Bia B", email: null, telefone: "+5511977776666", casouPor: "telefone", whatsapp: true }], avisos: {} },
    resolucoes: {}, mensagem: null, com_aviso: false,
  },
];
const resolver = vi.fn(async () => ({ status: "importada", motivo: null, importacao: "aguardando_revisao" }));
const lote = vi.fn(async () => ({ linhas: 1 }));
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useImportacao: () => ({ data: { id: "imp-1", tipo: "contato", status: "aguardando_revisao" } }),
  useLinhasDaImportacao: () => ({ data: pendencias, isLoading: false, refetch: vi.fn() }),
  useResolverLinha: () => ({ mutateAsync: resolver, isPending: false }),
  useResolverEmLote: () => ({ mutateAsync: lote, isPending: false }),
  useDestinosDaImportacao: () => ({ data: [] }),
}));

import { RevisarPendencias } from "@/components/escale/importacao/RevisarPendencias";

describe("Revisar pendências (Fase 2F)", () => {
  it("a lista, o detalhe da primeira e resolver por comparação", async () => {
    render(<RevisarPendencias id="imp-1" />);
    expect(screen.getByRole("heading", { name: "Revisar pendências" })).toBeInTheDocument();
    expect(screen.getByText("2 linhas para revisar")).toBeInTheDocument();
    expect(screen.getByText("No sistema")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Substituir pelo arquivo" }));
    await waitFor(() => expect(resolver).toHaveBeenCalledWith({ linhaId: "l-1", resolucao: { acao: "OVERWRITE" } }));
    expect(await screen.findByText("1 de 2 resolvidas")).toBeInTheDocument();
  });

  it("bate com dois contatos: os cartões A e B, e Juntar desligado 'em breve'", () => {
    render(<RevisarPendencias id="imp-1" />);
    fireEvent.click(screen.getByText("Bia"));
    expect(screen.getByText("A · e-mail")).toBeInTheDocument();
    expect(screen.getByText("B · telefone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Juntar os dois contatos · em breve/ })).toBeDisabled();
  });

  it("em lote, com um motivo escolhido", async () => {
    render(<RevisarPendencias id="imp-1" />);
    fireEvent.click(screen.getByRole("tab", { name: /Telefone diferente do cadastrado/ }));
    expect(screen.getByText("Aplicar a todas as 1 deste motivo:")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manter atual" }));
    await waitFor(() => expect(lote).toHaveBeenCalledWith({ motivo: "MATCH_PHONE_DIFFERS", acao: "KEEP_DB" }));
  });
});
