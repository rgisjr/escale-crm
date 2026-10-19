import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaDoSetor } from "@/components/escale/conversas/configuracoes/setores/JanelaDoSetor";
import { TelaSetores } from "@/components/escale/conversas/configuracoes/setores/TelaSetores";

const salvar = vi.fn();
const remover = vi.fn();
let setores = [
  {
    id: "s1",
    nome: "Atendimento",
    cor: "#0EA5C6",
    membros: ["u1", "u2"],
    dispositivos: 13,
    ids_dos_dispositivos: [],
  },
  {
    id: "s2",
    nome: "Suporte SAO",
    cor: "#F7DB5A",
    membros: ["u1"],
    dispositivos: 1,
    ids_dos_dispositivos: [],
  },
];
let permissoes: Record<string, boolean> = { CHAT_EDIT_TEAMS: true };
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({ data: setores, isLoading: false }),
  useSalvarSetor: () => ({ mutateAsync: salvar, isPending: false }),
  useRemoverSetor: () => ({ mutate: remover, isPending: false }),
}));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({
  useMinhasPermissoes: () => permissoes,
}));
vi.mock("@/hooks/team/useTeamMembers", () => ({
  useTeamMembers: () => ({
    data: {
      data: [
        {
          user_id: "u1",
          role: "agent",
          full_name: "Bathuly Bueno",
          email: "bathuly@x.com",
          revoked_at: null,
        },
        {
          user_id: "u2",
          role: "agent",
          full_name: "Camilly Victória",
          email: "camilly@x.com",
          revoked_at: null,
        },
        {
          user_id: "u3",
          role: "manager",
          full_name: "Clayton Bielau",
          email: "clayton@x.com",
          revoked_at: null,
        },
      ],
    },
  }),
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
  salvar.mockReset().mockResolvedValue({ data: { id: "s9" } });
  remover.mockClear();
  permissoes = { CHAT_EDIT_TEAMS: true };
  setores = [
    {
      id: "s1",
      nome: "Atendimento",
      cor: "#0EA5C6",
      membros: ["u1", "u2"],
      dispositivos: 13,
      ids_dos_dispositivos: [],
    },
    {
      id: "s2",
      nome: "Suporte SAO",
      cor: "#F7DB5A",
      membros: ["u1"],
      dispositivos: 1,
      ids_dos_dispositivos: [],
    },
  ];
});

describe("TelaSetores (c38, c87)", () => {
  it("migalhas, colunas, monograma, contagens; a busca filtra; o ⋮ edita e remove com confirmação", async () => {
    wrap(<TelaSetores />);
    expect(screen.getByText("Configurações")).toBeInTheDocument();
    for (const c of ["Setor", "Conta/Dispositivo", "Atendentes"])
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    const linha = screen.getByRole("row", { name: /Atendimento/ });
    expect(within(linha).getByText("AT")).toBeInTheDocument();
    expect(within(linha).getByText("13")).toBeInTheDocument();
    expect(within(linha).getByText("2")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar por setor..."), {
      target: { value: "sup" },
    });
    expect(screen.queryByRole("row", { name: /Atendimento/ })).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Buscar por setor..."), { target: { value: "" } });
    fireEvent.pointerDown(
      within(screen.getByRole("row", { name: /Atendimento/ })).getByRole("button", {
        name: "Mais ações",
      }),
      { button: 0 },
    );
    fireEvent.click(await screen.findByText("Remover setor"));
    fireEvent.click(await screen.findByRole("button", { name: "Remover" }));
    expect(remover).toHaveBeenCalledWith("s1", expect.anything());
  });
  it("sem permissão some o 'Novo setor' e o ⋮; vazio mostra o texto da Clint", () => {
    permissoes = {};
    setores = [];
    wrap(<TelaSetores />);
    expect(screen.queryByRole("button", { name: "Novo setor" })).toBeNull();
    expect(screen.getByText("Você ainda não tem nenhum setor cadastrado!")).toBeInTheDocument();
  });
});

describe("JanelaDoSetor (c42, c88)", () => {
  it("cria: nome, adiciona pessoa pelo seletor, escolhe cor e salva", async () => {
    const fechar = vi.fn();
    wrap(<JanelaDoSetor aberta aoFechar={fechar} setor={null} />);
    expect(screen.getByText("Crie um setor")).toBeInTheDocument();
    expect(screen.getByText("Você ainda não adicionou usuários")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Digite um nome para o setor"), {
      target: { value: "Vendas" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Adicione um usuário no setor" }));
    fireEvent.click(await screen.findByRole("option", { name: /Clayton Bielau/ }));
    expect(screen.getByText("clayton@x.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "#F0384B" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar setor" }));
    await waitFor(() =>
      expect(salvar).toHaveBeenCalledWith({ nome: "Vendas", cor: "#F0384B", membros: ["u3"] }),
    );
    expect(fechar).toHaveBeenCalled();
  });
  it("edita: carrega membros, a lixeira tira, a busca filtra, 'Salvar alterações'", async () => {
    wrap(<JanelaDoSetor aberta aoFechar={vi.fn()} setor={setores[0] ?? null} />);
    expect(screen.getByText("Editar setor")).toBeInTheDocument();
    expect(screen.getByText("Usuários selecionados")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar por nome ou e-mail"), {
      target: { value: "cam" },
    });
    expect(screen.queryByText("Bathuly Bueno")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remover Camilly Victória" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() =>
      expect(salvar).toHaveBeenCalledWith({
        id: "s1",
        nome: "Atendimento",
        cor: "#0EA5C6",
        membros: ["u1"],
      }),
    );
  });
});
