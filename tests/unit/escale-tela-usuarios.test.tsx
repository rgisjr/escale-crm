import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaDoUsuario } from "@/components/escale/conversas/configuracoes/usuarios/JanelaDoUsuario";
import { TelaUsuarios } from "@/components/escale/conversas/configuracoes/usuarios/TelaUsuarios";

const gravarPermissoes = vi.fn();
const resetar = vi.fn();
const mudarPapel = vi.fn();
const gravarSetores = vi.fn();
const gravarRoteamento = vi.fn();
const membros = [
  {
    user_id: "u1",
    role: "admin",
    full_name: "Régis Marques",
    email: "regis@x.com",
    revoked_at: null,
    accepted_at: "2026-01-01",
    invited_at: null,
    created_at: "",
    last_sign_in_at: null,
  },
  {
    user_id: "u2",
    role: "agent",
    full_name: "Henrique Fraga Negrão Pereira",
    email: "henrique@x.com",
    revoked_at: null,
    accepted_at: null,
    invited_at: null,
    created_at: "",
    last_sign_in_at: null,
  },
];
let excecoes: Record<string, boolean> = {};
// o react-query devolve o MESMO objeto enquanto o dado não muda; o mock também (senão o efeito da aba reinicia sem parar)
let respostaDasPermissoes: {
  fonte: Record<string, boolean>;
  valor: { data: { excecoes: Record<string, boolean> } };
} | null = null;
vi.mock("@/hooks/team/useTeamMembers", () => ({
  useTeamMembers: () => ({ data: { data: membros } }),
}));
vi.mock("@/hooks/team/useChangeRole", () => ({
  useChangeRole: () => ({ mutateAsync: mudarPapel, isPending: false }),
}));
vi.mock("@/hooks/escale/useUsuariosDaCasca", () => ({
  useUsuariosDaCasca: () => ({ u2: { setores: ["s1"], excecoes: Object.keys(excecoes).length } }),
  useGravarSetoresDoUsuario: () => ({ mutateAsync: gravarSetores, isPending: false }),
}));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({
  usePermissoesDoUsuario: () => {
    if (respostaDasPermissoes?.fonte !== excecoes)
      respostaDasPermissoes = { fonte: excecoes, valor: { data: { excecoes } } };
    return respostaDasPermissoes.valor;
  },
  useGravarPermissoes: () => ({ mutateAsync: gravarPermissoes, isPending: false }),
  useResetarPermissoes: () => ({ mutateAsync: resetar, isPending: false }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({
    data: [
      {
        id: "s1",
        nome: "Atendimento",
        cor: "#0EA5C6",
        membros: ["u2"],
        dispositivos: 1,
        ids_dos_dispositivos: ["d1"],
      },
    ],
  }),
}));
vi.mock("@/hooks/escale/useDispositivosDaCasca", () => ({
  useRoteamentoDosCanais: () => ({
    data: {
      channels: [
        { id: "d1", user_ids: ["u2"], mode: "restricted" },
        { id: "d2", user_ids: [], mode: "restricted_empty" },
      ],
      members: [],
    },
  }),
  useGravarRoteamento: () => ({ mutate: gravarRoteamento, isPending: false }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({
    data: [
      {
        id: "d1",
        provider: "waha",
        display_name: "Thiago - Credenciados",
        phone_number: null,
        status: "WORKING",
      },
      {
        id: "d2",
        provider: "waha",
        display_name: "BOT Regis",
        phone_number: null,
        status: "WORKING",
      },
    ],
  }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    activeOrg: { orgId: "o1", role: "admin", visibility_mode: "own_and_unassigned" },
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
  for (const f of [gravarPermissoes, resetar, mudarPapel, gravarSetores, gravarRoteamento])
    f.mockReset().mockResolvedValue(undefined);
  excecoes = {};
});

describe("TelaUsuarios (c40)", () => {
  it("colunas, grupo e busca; 'Adicionar usuário' vai ao convite do original", () => {
    excecoes = { CHAT_BULK_ACTIONS: true };
    wrap(<TelaUsuarios />);
    for (const c of ["Usuário", "Dispositivo", "Permissões de atendimento"])
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Régis Marques/ })).getByText("Administrador"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Henrique/ })).getByText("Personalizado"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar por nome, e-mail ou telefone"), {
      target: { value: "henri" },
    });
    expect(screen.queryByRole("row", { name: /Régis Marques/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Adicionar usuário" })).toHaveAttribute(
      "href",
      "/app/team/invite",
    );
  });
});

describe("JanelaDoUsuario (c90–c95)", () => {
  it("Geral: nome e sobrenome do full_name, telefone em breve, setores salvam", async () => {
    wrap(<JanelaDoUsuario aberta aoFechar={vi.fn()} membro={membros[1] as never} />);
    expect(screen.getByDisplayValue("Henrique")).toBeDisabled();
    expect(screen.getByDisplayValue("Fraga Negrão Pereira")).toBeDisabled();
    expect(screen.getByLabelText("Telefone")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
  });
  it("Permissões: as 19, travas, mudar um toggle e 'Desativar todos' gravam no salvar", async () => {
    wrap(<JanelaDoUsuario aberta aoFechar={vi.fn()} membro={membros[1] as never} />);
    fireEvent.click(screen.getByRole("tab", { name: "Permissões" }));
    expect(screen.getAllByRole("switch")).toHaveLength(19);
    expect(screen.getByRole("switch", { name: "Visualização de atendimento" })).toBeDisabled();
    fireEvent.click(screen.getByRole("switch", { name: "Ações em massa" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() =>
      expect(gravarPermissoes).toHaveBeenCalledWith({
        user_id: "u2",
        valores: { CHAT_BULK_ACTIONS: true },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Desativar todos" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() =>
      expect(gravarPermissoes).toHaveBeenLastCalledWith({
        user_id: "u2",
        valores: expect.objectContaining({
          CHAT_VIEW_TEAM: false,
          CHAT_SHARE_QUICK_RESPONSE: false,
          CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS: false,
          CHAT_BULK_ACTIONS: null,
        }),
      }),
    );
  });
  it("Permissões: trocar o grupo para Gerente muda o papel e apaga as exceções", async () => {
    excecoes = { CHAT_BULK_ACTIONS: true };
    wrap(<JanelaDoUsuario aberta aoFechar={vi.fn()} membro={membros[1] as never} />);
    fireEvent.click(screen.getByRole("tab", { name: "Permissões" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Grupo de permissão:" }));
    fireEvent.click(await screen.findByRole("option", { name: "Gerente" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(mudarPapel).toHaveBeenCalledWith({ userId: "u2", role: "manager" }));
    expect(resetar).toHaveBeenCalledWith("u2");
  });
  it("Contas e dispositivos: um toggle por dispositivo do canal, grava na hora; 'Fechar'", () => {
    const fechar = vi.fn();
    wrap(<JanelaDoUsuario aberta aoFechar={fechar} membro={membros[1] as never} />);
    fireEvent.click(screen.getByRole("tab", { name: "Contas e dispositivos" }));
    expect(screen.getByText("Contas e dispositivos que usuário tem acesso.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Thiago - Credenciados" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("switch", { name: "BOT Regis" }));
    expect(gravarRoteamento).toHaveBeenCalledWith({ channel_session_id: "d2", user_ids: ["u2"] });
    fireEvent.click(screen.getByText("Fechar", { selector: "button" }));
    expect(fechar).toHaveBeenCalled();
  });
});
