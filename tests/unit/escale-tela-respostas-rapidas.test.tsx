import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaRespostaRapida } from "@/components/escale/conversas/configuracoes/respostas/JanelaRespostaRapida";
import { TelaRespostasRapidas } from "@/components/escale/conversas/configuracoes/respostas/TelaRespostasRapidas";

const salvar = vi.fn();
const excluir = vi.fn();
let papel = "agent";
let permissoes: Record<string, boolean> = { CHAT_SHARE_QUICK_RESPONSE: true };
const respostas = [
  {
    id: "r1",
    atalho: "Enquanto isso",
    corpo: "Enquanto isso, vou te passar o Instagram",
    canais: ["whatsapp", "instagram"],
    compartilhada: true,
    todos_os_setores: true,
    setores: [],
    dono: null,
    criada_por: "u9",
    atualizada_em: "",
  },
  {
    id: "r2",
    atalho: "pix",
    corpo: "Chave pix: 123",
    canais: ["whatsapp"],
    compartilhada: false,
    todos_os_setores: false,
    setores: ["s1"],
    dono: "u1",
    criada_por: "u1",
    atualizada_em: "",
  },
];
const filtrosUsados: unknown[] = [];
vi.mock("@/hooks/escale/useRespostasRapidas", () => ({
  useRespostasRapidas: (f: unknown) => {
    filtrosUsados.push(f);
    return {
      data: { data: respostas, meta: { total: 2, pagina: 1, por_pagina: 10 } },
      isLoading: false,
    };
  },
  useSalvarResposta: () => ({ mutateAsync: salvar, isPending: false }),
  useExcluirResposta: () => ({ mutate: excluir, isPending: false }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({
    data: [
      {
        id: "s1",
        nome: "Atendimento",
        cor: "#0EA5C6",
        membros: [],
        dispositivos: 0,
        ids_dos_dispositivos: [],
      },
    ],
  }),
}));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({
  useMinhasPermissoes: () => permissoes,
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: papel } }),
}));
vi.mock("@/components/inbox/composer/EmojiButton", () => ({
  EmojiButton: ({ onPick }: { onPick: (e: string) => void }) => (
    <button type="button" aria-label="Emoji" onClick={() => onPick("😀")} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: { href: string; children: ReactNode }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let qc: QueryClient;
const wrap = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  qc = new QueryClient();
  salvar.mockReset().mockResolvedValue({ data: { id: "r9" } });
  excluir.mockClear();
  papel = "agent";
  permissoes = { CHAT_SHARE_QUICK_RESPONSE: true };
  filtrosUsados.length = 0;
});

describe("TelaRespostasRapidas (c41, c97)", () => {
  it("colunas, '/atalho', setores 'Todos', o ⋮ só onde pode mexer; filtro Setor", () => {
    wrap(<TelaRespostasRapidas />);
    for (const c of ["Atalho", "Conteúdo", "Setores", "Canais"])
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    const r1 = screen.getByRole("row", { name: /Enquanto isso/ });
    expect(within(r1).getByText("/Enquanto isso")).toBeInTheDocument();
    expect(within(r1).getByText("Todos")).toBeInTheDocument();
    expect(within(r1).queryByRole("button", { name: "Mais ações" })).toBeNull();
    const r2 = screen.getByRole("row", { name: /pix/ });
    expect(within(r2).getByText("Atendimento")).toBeInTheDocument();
    expect(within(r2).getByRole("button", { name: "Mais ações" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Setor" }));
    fireEvent.click(screen.getByRole("option", { name: "Pessoais" }));
    expect(filtrosUsados.at(-1)).toMatchObject({ setor: "pessoais", pagina: 1 });
  });
});

describe("JanelaRespostaRapida (c96)", () => {
  it("cria com atalho, conteúdo, canais, compartilhar e setores", async () => {
    const fechar = vi.fn();
    wrap(<JanelaRespostaRapida aberta aoFechar={fechar} resposta={null} />);
    expect(
      screen.getByText("Você pode criar respostas rápidas para utilizar no chat de atendimento"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Escreva uma mensagem..."), {
      target: { value: "Olá" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Emoji" }));
    fireEvent.change(screen.getByPlaceholderText("Digite o atalho"), { target: { value: "ola" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Instagram" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Compartilhar com outros usuários" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(salvar).toHaveBeenCalledWith({
        atalho: "ola",
        corpo: "Olá😀",
        canais: ["whatsapp"],
        compartilhar: true,
        todos_os_setores: true,
        setores: [],
      }),
    );
    expect(fechar).toHaveBeenCalled();
  });
  it("sem permissão de compartilhar, a caixinha fica desligada; editar carrega a resposta", () => {
    permissoes = {};
    wrap(<JanelaRespostaRapida aberta aoFechar={vi.fn()} resposta={respostas[1] as never} />);
    expect(screen.getByText("Editar Resposta rápida")).toBeInTheDocument();
    expect(screen.getByDisplayValue("pix")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Compartilhar com outros usuários" }),
    ).toBeDisabled();
  });
});
