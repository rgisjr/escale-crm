import { describe, expect, it, vi } from "vitest";

/**
 * G6-3: a leitura de `cobranca_assinaturas` e a do tema de extensão não são
 * mais feitas uma atrás da outra. Prova: com a assinatura pendurada, a leitura
 * do tema já foi disparada.
 */
const estado = vi.hoisted(() => ({
  iniciadas: [] as string[],
  liberar: null as null | (() => void),
}));
const adminClient = {
  from: (tabela: string) => {
    const q: Record<string, unknown> = {};
    for (const n of ["select", "eq", "limit"]) q[n] = () => q;
    if (tabela === "organizations") {
      q.maybeSingle = async () => ({
        data: {
          onboarded_at: "2026-01-01",
          status: "active",
          settings: null,
          timezone: "America/Sao_Paulo",
        },
        error: null,
      });
    } else if (tabela === "cobranca_assinaturas") {
      q.maybeSingle = () => {
        estado.iniciadas.push(tabela);
        return new Promise((ok) => {
          estado.liberar = () => ok({ data: null, error: null });
        });
      };
    } else {
      q.then = (ok: (v: unknown) => unknown) => {
        estado.iniciadas.push(tabela);
        return Promise.resolve({ data: [], error: null }).then(ok);
      };
    }
    return q;
  },
};
vi.mock("@/lib/instalacao/modulos", () => ({ modulosLigados: async () => ["cobranca"] }));
vi.mock("@/lib/channels/health", () => ({ listarConexoesCaidas: async () => [] }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => adminClient }));
vi.mock("@/lib/auth/server", () => ({
  loadAuthUser: async () => ({
    id: "user-1",
    idioma: "pt-BR",
    is_platform_admin: false,
    support: null,
    organizations: [],
  }),
  resolveActiveOrg: async () => ({ orgId: "org-1", role: "admin", interface_settings: null }),
  isMfaEnrolled: async () => true,
  requiresMfa: async () => false,
}));
vi.mock("@/lib/auth/vinculo-revogado", () => ({ acessoFoiRevogado: async () => false }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`redirect:${destino}`);
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/branding/instalacao", () => ({ marcaDaInstalacao: async () => ({}) }));
vi.mock("@/lib/branding/organizacao", () => ({
  resolverMarcaDaOrganizacao: () => ({
    name: "Deskcomm",
    logoUrl: null,
    cor: "#000000",
    origens: { nome: "instalacao", logoUrl: "instalacao", cor: "instalacao" },
  }),
}));

describe("layout de /app: leituras pós-portão em paralelo", () => {
  it("o tema de extensão é lido enquanto a assinatura ainda não respondeu", async () => {
    const { default: AppLayout } = await import("@/app/app/layout");
    const render = AppLayout({ children: null });
    await vi.waitFor(() => expect(estado.iniciadas).toContain("organization_extensions"));
    expect(estado.liberar).not.toBeNull();
    estado.liberar?.();
    await expect(render).resolves.toBeTruthy();
  });
});
