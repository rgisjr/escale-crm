import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CabecaDaConfiguracao } from "@/components/escale/conversas/configuracoes/CabecaDaConfiguracao";
import { HubDeConfiguracoes } from "@/components/escale/conversas/configuracoes/HubDeConfiguracoes";
import { gravarCanal } from "@/lib/notifications/prefs";

let papel = "admin";
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: papel } }),
}));
vi.mock("@/lib/notifications/prefs", async (orig) => ({
  ...(await orig<typeof import("@/lib/notifications/prefs")>()),
  gravarCanal: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  papel = "admin";
  vi.mocked(gravarCanal).mockClear();
});

describe("CabecaDaConfiguracao (c37)", () => {
  it("as migalhas com a última em negrito e o X", () => {
    render(
      <CabecaDaConfiguracao
        migalhas={[{ rotulo: "Conversas", href: "/app/inbox" }, { rotulo: "Configurações" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Conversas" })).toHaveAttribute("href", "/app/inbox");
    expect(screen.getByText("Configurações")).toHaveClass("font-semibold");
    expect(screen.getByRole("link", { name: "Fechar" })).toHaveAttribute("href", "/app/inbox");
  });
});

describe("HubDeConfiguracoes (c37)", () => {
  it("os 9 cartões; 3 em breve; os links; o toggle de notificações grava in_app e push", () => {
    render(<HubDeConfiguracoes />);
    expect(screen.getByRole("link", { name: /Setores/ })).toHaveAttribute(
      "href",
      "/app/inbox/configuracoes/setores",
    );
    expect(screen.getByRole("link", { name: /Dispositivo/ })).toHaveAttribute(
      "href",
      "/app/inbox/configuracoes/canais",
    );
    expect(screen.getByText("Modelos de mensagem").closest("[aria-disabled]")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    fireEvent.click(screen.getByRole("switch", { name: "Notificações" }));
    expect(gravarCanal).toHaveBeenCalledWith("message", "in_app", expect.any(Boolean));
    expect(gravarCanal).toHaveBeenCalledWith("message", "push", expect.any(Boolean));
  });
  it("Usuários e Permissões fica apagado para quem não é admin", () => {
    papel = "agent";
    render(<HubDeConfiguracoes />);
    expect(screen.getByText("Usuários e Permissões").closest("[aria-disabled]")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
