import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/lib/notifications/emit", () => ({ emitNotification: vi.fn() }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => null,
  useUser: () => ({ id: "eu" }),
}));
vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({ useRealtimeChannel: () => undefined }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));

import { toast } from "sonner";

import { entregarAvisoDaOrigem } from "@/hooks/escale/useAvisosDaOrigem";
import { emitNotification } from "@/lib/notifications/emit";
import { gravarCanal } from "@/lib/notifications/prefs";

const aviso = {
  category: "lead_assigned" as const,
  kind: "lead_assigned" as const,
  title: "Novo negócio",
  body: "Maria",
  href: "/app/escale/negocios?negocio=1",
};

describe("o aviso da origem (Fase 1K) igual à Clint", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("não abre pop-up na tela: a Clint não tem", () => {
    entregarAvisoDaOrigem(aviso);
    expect(toast).not.toHaveBeenCalled();
  });

  it("manda a notificação do sistema, com o destino do negócio", () => {
    entregarAvisoDaOrigem(aviso);
    expect(emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "lead_assigned", href: aviso.href, force: true }),
    );
  });

  it("respeita o push desligado nas preferências", () => {
    gravarCanal("lead_assigned", "push", false);
    entregarAvisoDaOrigem(aviso);
    expect(emitNotification).not.toHaveBeenCalled();
  });
});
