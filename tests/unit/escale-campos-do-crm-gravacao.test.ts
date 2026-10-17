import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map([["x-request-id", "req-1"]])),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/impersonate/support", () => ({ supportWriteError: vi.fn(() => null) }));
vi.mock("@/lib/auth/server", () => ({ loadAuthUser: vi.fn(), resolveActiveOrg: vi.fn() }));
vi.mock("@/lib/auth/pode-administrar-empresa", () => ({
  podeAdministrarEmpresa: vi.fn(() => true),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { updatePipelineConfig } from "@/app/actions/settings/updatePipelineConfig";
import { audit } from "@/lib/audit";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { CAMPOS_DO_CRM_MAX, pipelineConfigPatchSchema } from "@/lib/schemas/settings";
import { createClient } from "@/lib/supabase/server";

/**
 * FORK ESCALE · Fase 1F-a: os campos são do CRM. Remover em Configurações ›
 * Funis apaga do catálogo (vale em toda origem); gravar sem a chave não apagaria.
 */
const ORG = "aaaaaaaa-0000-4000-8000-0000000000aa";
const FUNIL = "aaaaaaaa-0000-4000-8000-0000000000f1";
let passos: string[] = [];

function banco(erroAoApagar: string | null = null) {
  passos = [];
  const cliente = {
    from: vi.fn((tabela: string) => {
      if (tabela === "crm_campos_do_negocio") {
        return {
          delete: () => ({
            eq: (coluna: string, valor: string) => ({
              in: async (col: string, chaves: string[]) => {
                passos.push(`apagar ${coluna}=${valor} ${col}=${chaves.join(",")}`);
                return { error: erroAoApagar ? { message: erroAoApagar } : null };
              },
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { vocabulary: {}, settings: { fields: [] }, organization_id: ORG },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: async () => {
            passos.push("gravar a origem");
            return { error: null };
          },
        }),
      };
    }),
  };
  vi.mocked(createClient).mockResolvedValue(cliente as never);
}

beforeEach(() => {
  vi.mocked(loadAuthUser).mockResolvedValue({ id: "u-1", support: null } as never);
  vi.mocked(resolveActiveOrg).mockResolvedValue({ orgId: ORG, role: "admin" } as never);
  vi.mocked(audit).mockClear();
});

describe("updatePipelineConfig e o catálogo do CRM", () => {
  it("sem campos_removidos não apaga nada", async () => {
    banco();
    expect(await updatePipelineConfig(FUNIL, { fields: [] })).toEqual({ ok: true });
    expect(passos).toEqual(["gravar a origem"]);
  });

  it("com campos_removidos apaga do catálogo da organização ANTES de gravar, e audita", async () => {
    banco();
    expect(
      await updatePipelineConfig(FUNIL, { fields: [], campos_removidos: ["cpf", "renda"] }),
    ).toEqual({ ok: true });
    expect(passos).toEqual([`apagar organization_id=${ORG} chave=cpf,renda`, "gravar a origem"]);
    expect(vi.mocked(audit).mock.calls[0]?.[0]).toMatchObject({
      metadata: { campos_removidos: ["cpf", "renda"] },
    });
  });

  it("se apagar falha, não grava a origem e devolve o erro", async () => {
    banco("falhou");
    expect(await updatePipelineConfig(FUNIL, { fields: [], campos_removidos: ["cpf"] })).toEqual({
      ok: false,
      error: "falhou",
    });
    expect(passos).toEqual([`apagar organization_id=${ORG} chave=cpf`]);
  });
});

describe("o patch aceita o catálogo inteiro", () => {
  const campo = (i: number) => ({ key: `c${i}`, label: `C${i}`, type: "text" as const });

  it("até CAMPOS_DO_CRM_MAX campos, e não mais", () => {
    expect(CAMPOS_DO_CRM_MAX).toBe(200);
    expect(
      pipelineConfigPatchSchema.safeParse({
        fields: Array.from({ length: 200 }, (_, i) => campo(i)),
      }).success,
    ).toBe(true);
    expect(
      pipelineConfigPatchSchema.safeParse({
        fields: Array.from({ length: 201 }, (_, i) => campo(i)),
      }).success,
    ).toBe(false);
  });

  it("campos_removidos só aceita chave válida", () => {
    expect(pipelineConfigPatchSchema.safeParse({ campos_removidos: ["cpf"] }).success).toBe(true);
    expect(pipelineConfigPatchSchema.safeParse({ campos_removidos: ["1x"] }).success).toBe(false);
  });
});
