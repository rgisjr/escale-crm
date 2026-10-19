import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaDoDispositivo } from "@/components/escale/conversas/configuracoes/canais/JanelaDoDispositivo";
import { TelaConfiguracaoDeCanais } from "@/components/escale/conversas/configuracoes/canais/TelaConfiguracaoDeCanais";
import { TelaDoCanal } from "@/components/escale/conversas/configuracoes/canais/TelaDoCanal";

const gravarRoteamento = vi.fn();
const setorDoDispositivo = vi.fn();
const renomear = vi.fn();
const excluir = vi.fn();
const sessoes = [
  {
    id: "d1",
    provider: "waha",
    display_name: "Sara - 2230",
    phone_number: "+551153042230",
    status: "WORKING",
  },
  {
    id: "d2",
    provider: "waha",
    display_name: "Bathuly - 3062",
    phone_number: "+551153043062",
    status: "STOPPED",
  },
  {
    id: "d3",
    provider: "meta_cloud",
    display_name: "Suporte SAO",
    phone_number: "+556292000286",
    status: "WORKING",
  },
];
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: sessoes, isLoading: false }),
}));
vi.mock("@/hooks/escale/useDispositivosDaCasca", () => ({
  useRoteamentoDosCanais: () => ({
    data: {
      channels: [
        { id: "d1", user_ids: ["u2"], mode: "restricted" },
        { id: "d2", user_ids: [], mode: "legacy_unconfigured" },
      ],
      members: [],
    },
  }),
  useGravarRoteamento: () => ({ mutate: gravarRoteamento, isPending: false }),
  useRenomearDispositivo: () => ({ mutateAsync: renomear, isPending: false }),
  useExcluirDispositivo: () => ({ mutate: excluir, isPending: false }),
}));
const criacaoLida = vi.hoisted(() => ({
  data: { configurado: false, criacao: { ligado: false, regras: [] } },
}));
vi.mock("@/hooks/escale/useCriacaoDeNegocio", () => ({
  useCriacaoDeNegocio: () => criacaoLida,
  useOrigensDaCriacao: () => ({ data: [] }),
  useSalvarCriacaoDeNegocio: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({
    data: [
      {
        id: "s1",
        nome: "Atendimento",
        cor: "#0EA5C6",
        membros: [],
        dispositivos: 1,
        ids_dos_dispositivos: ["d1"],
      },
    ],
  }),
  useSetorDoDispositivo: () => ({ mutateAsync: setorDoDispositivo, isPending: false }),
  useRemoverSetor: () => ({ mutate: vi.fn() }),
  useSalvarSetor: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({
  useMinhasPermissoes: () => ({ CHAT_VIEW_CHANNEL_ACCOUNT: true, CHAT_EDIT_TEAMS: true }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "admin" } }),
}));
vi.mock("@/hooks/team/useTeamMembers", () => ({
  useTeamMembers: () => ({
    data: {
      data: [
        {
          user_id: "u1",
          role: "admin",
          full_name: "Régis",
          email: "regis@x.com",
          revoked_at: null,
        },
        {
          user_id: "u2",
          role: "agent",
          full_name: "Camilly",
          email: "camilly@x.com",
          revoked_at: null,
        },
        {
          user_id: "u3",
          role: "agent",
          full_name: "Clayton",
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
  for (const f of [gravarRoteamento, setorDoDispositivo, renomear, excluir]) f.mockReset();
  setorDoDispositivo.mockResolvedValue(undefined);
  renomear.mockResolvedValue(undefined);
});

describe("TelaConfiguracaoDeCanais (c98)", () => {
  it("só os canais que a organização tem, com 'API oficial' e 'Instalado'", () => {
    wrap(<TelaConfiguracaoDeCanais />);
    const links = screen.getAllByRole("link", { name: /WhatsApp/ });
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/app/inbox/configuracoes/canais/whatsapp-oficial",
      "/app/inbox/configuracoes/canais/whatsapp",
    ]);
    expect(screen.getByText("API oficial")).toBeInTheDocument();
    expect(screen.getAllByText("Instalado")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /Instagram/ })).toBeNull();
  });
});

describe("TelaDoCanal (c99, c100)", () => {
  it("abas, os dispositivos do canal com status, setor e usuários; o QR do desconectado; o ⋮", () => {
    wrap(<TelaDoCanal canal="whatsapp" />);
    for (const a of ["Dispositivos", "Usuários e Permissões", "Setores"])
      expect(screen.getByRole("tab", { name: a })).toBeInTheDocument();
    const sara = screen.getByRole("row", { name: /Sara - 2230/ });
    expect(within(sara).getByText("Conectado")).toBeInTheDocument();
    expect(within(sara).getByText("Atendimento")).toBeInTheDocument();
    const bathuly = screen.getByRole("row", { name: /Bathuly - 3062/ });
    expect(within(bathuly).getByText("Desconectado")).toBeInTheDocument();
    expect(within(bathuly).getByRole("link", { name: "Conectar" })).toHaveAttribute(
      "href",
      "/app/connections",
    );
    expect(within(bathuly).getAllByTitle(/Régis|Camilly|Clayton/)).toHaveLength(3);
    expect(screen.queryByRole("row", { name: /Suporte SAO/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Novo dispositivo" })).toHaveAttribute(
      "href",
      "/app/connections",
    );
  });
});

describe("JanelaDoDispositivo (c101, c102)", () => {
  it("nome, número, setor, atendentes; admin travado; ligar um atendente grava o roteamento; salvar grava nome e setor", async () => {
    const fechar = vi.fn();
    wrap(
      <JanelaDoDispositivo aberta aoFechar={fechar} dispositivo={(sessoes[0] ?? null) as never} />,
    );
    expect(screen.getByText("Informações do dispositivo")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Criação de negócio" })).toBeInTheDocument();
    expect(screen.getByText("(11) 5304-2230")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Membros do time que estão no setor selecionado terão acesso a esse dispositivo.",
      ),
    ).toBeInTheDocument();
    const admin = screen.getByRole("switch", { name: "Régis" });
    expect(admin).toBeDisabled();
    expect(admin).toHaveAttribute("title", "Usuário administrador");
    expect(screen.getByRole("switch", { name: "Camilly" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("switch", { name: "Clayton" }));
    expect(gravarRoteamento).toHaveBeenCalledWith({
      channel_session_id: "d1",
      user_ids: ["u2", "u3"],
    });
    fireEvent.change(screen.getByDisplayValue("Sara - 2230"), { target: { value: "Sara" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await vi.waitFor(() => expect(renomear).toHaveBeenCalledWith({ id: "d1", nome: "Sara" }));
    expect(setorDoDispositivo).not.toHaveBeenCalled();
  });

  it("a aba Criação de negócio mostra o cartão e o rodapé traz Remover dispositivo (3E)", () => {
    wrap(
      <JanelaDoDispositivo aberta aoFechar={vi.fn()} dispositivo={(sessoes[0] ?? null) as never} />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Criação de negócio" }));
    expect(screen.getByText("Criar um negócio automaticamente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remover dispositivo/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
  });
});
