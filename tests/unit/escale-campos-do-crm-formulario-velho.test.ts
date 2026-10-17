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
import { mesclaComOCatalogo } from "@/lib/escale/campos-do-crm/mescla-com-o-catalogo";
import type { CustomFieldDef } from "@/lib/schemas/settings";
import { createClient } from "@/lib/supabase/server";

/**
 * FORK ESCALE · Fase 1F-a: tela velha (administrador B abriu antes de A renomear
 * ou apagar um campo) não pode desfazer o catálogo em todas as origens.
 */
const ORG = "aaaaaaaa-0000-4000-8000-0000000000aa";
const FUNIL = "aaaaaaaa-0000-4000-8000-0000000000f1";
const ETAPA = "bbbbbbbb-0000-4000-8000-0000000000e1";

const cpf: CustomFieldDef = { key: "cpf", label: "CPF", type: "text" };
const renda: CustomFieldDef = { key: "renda", label: "Renda", type: "number" };

describe("mesclaComOCatalogo", () => {
  it("campo intocado fica com a definição do catálogo agora (renomeado por outro administrador)", () => {
    const atual = { ...cpf, label: "CPF do titular" };
    const r = mesclaComOCatalogo({
      enviados: [cpf, renda],
      carregados: [cpf, renda],
      atuais: [atual, renda],
    });
    expect(r.fields).toEqual([atual, renda]);
    expect(r.desatualizado).toBe(true);
  });

  it("campo intocado que outro administrador apagou não é recriado", () => {
    const r = mesclaComOCatalogo({
      enviados: [cpf, renda],
      carregados: [cpf, renda],
      atuais: [renda],
    });
    expect(r.fields).toEqual([renda]);
    expect(r.desatualizado).toBe(true);
  });

  it("campo que a pessoa editou vale como ela editou", () => {
    const editado = { ...cpf, label: "Documento" };
    const r = mesclaComOCatalogo({
      enviados: [editado],
      carregados: [cpf],
      atuais: [{ ...cpf, label: "CPF do titular" }],
    });
    expect(r.fields).toEqual([editado]);
    expect(r.desatualizado).toBe(false);
  });

  it("campo novo da tela entra como veio", () => {
    const novo: CustomFieldDef = { key: "campo_3", label: "Novo campo", type: "text" };
    const r = mesclaComOCatalogo({ enviados: [cpf, novo], carregados: [cpf], atuais: [cpf] });
    expect(r.fields).toEqual([cpf, novo]);
    expect(r.desatualizado).toBe(false);
  });

  it("tudo igual ao catálogo: devolve igual e não avisa", () => {
    const r = mesclaComOCatalogo({
      enviados: [cpf, renda],
      carregados: [cpf, renda],
      atuais: [cpf, renda],
    });
    expect(r.fields).toEqual([cpf, renda]);
    expect(r.desatualizado).toBe(false);
  });

  it("obrigatorio_em é da origem: vale o da pessoa se ela mexeu, o atual se não", () => {
    const regra = { etapas: [ETAPA] };
    const mexeu = mesclaComOCatalogo({
      enviados: [{ ...cpf, obrigatorio_em: regra }],
      carregados: [cpf],
      atuais: [{ ...cpf, label: "CPF do titular" }],
    });
    expect(mexeu.fields).toEqual([{ ...cpf, label: "CPF do titular", obrigatorio_em: regra }]);

    const naoMexeu = mesclaComOCatalogo({
      enviados: [cpf],
      carregados: [cpf],
      atuais: [{ ...cpf, obrigatorio_em: regra }],
    });
    expect(naoMexeu.fields).toEqual([{ ...cpf, obrigatorio_em: regra }]);
  });

  it("a ordem das chaves e as opções iguais não contam como edição", () => {
    const sel: CustomFieldDef = {
      key: "uf",
      label: "UF",
      type: "select",
      options: [{ value: "sp", label: "SP" }],
    };
    const embaralhado = {
      options: [{ label: "SP", value: "sp" }],
      type: "select",
      label: "UF",
      key: "uf",
    } as CustomFieldDef;
    const r = mesclaComOCatalogo({
      enviados: [embaralhado],
      carregados: [sel],
      atuais: [{ ...sel, label: "Estado" }],
    });
    expect(r.fields).toEqual([{ ...sel, label: "Estado" }]);
  });
});

let gravado: Record<string, unknown> | null = null;

function banco(
  settings: Record<string, unknown>,
  erroAoGravar: { code?: string; message: string } | null = null,
) {
  gravado = null;
  const cliente = {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { vocabulary: {}, settings, organization_id: ORG },
            error: null,
          }),
        }),
      }),
      update: (valores: Record<string, unknown>) => ({
        eq: async () => {
          gravado = valores;
          return { error: erroAoGravar };
        },
      }),
    })),
  };
  vi.mocked(createClient).mockResolvedValue(cliente as never);
}

beforeEach(() => {
  vi.mocked(loadAuthUser).mockResolvedValue({ id: "u-1", support: null } as never);
  vi.mocked(resolveActiveOrg).mockResolvedValue({ orgId: ORG, role: "admin" } as never);
  vi.mocked(audit).mockClear();
});

describe("updatePipelineConfig com a tela velha", () => {
  it("não reverte o rótulo que outro administrador mudou nem recria o campo apagado, e avisa", async () => {
    banco({ fields: [{ ...cpf, label: "CPF do titular" }] });
    const r = await updatePipelineConfig(FUNIL, {
      fields: [cpf, renda],
      campos_carregados: [cpf, renda],
    });
    expect(r).toEqual({ ok: true, camposDesatualizados: true });
    expect((gravado?.settings as { fields: unknown }).fields).toEqual([
      { ...cpf, label: "CPF do titular" },
    ]);
    expect(vi.mocked(audit).mock.calls[0]?.[0]).toMatchObject({
      metadata: { campos_desatualizados: true },
    });
  });

  it("sem campos_carregados grava os campos como vieram (captação, API)", async () => {
    banco({ fields: [] });
    expect(await updatePipelineConfig(FUNIL, { fields: [cpf] })).toEqual({ ok: true });
    expect((gravado?.settings as { fields: unknown }).fields).toEqual([cpf]);
  });

  it("tela em dia grava igual e não avisa", async () => {
    banco({ fields: [cpf, renda] });
    expect(
      await updatePipelineConfig(FUNIL, { fields: [cpf, renda], campos_carregados: [cpf, renda] }),
    ).toEqual({ ok: true });
    expect((gravado?.settings as { fields: unknown }).fields).toEqual([cpf, renda]);
  });
});

describe("updatePipelineConfig e os erros do banco que a pessoa resolve", () => {
  it.each(["40P01", "40001"])(
    "%s (deadlock/serialização) vira campos_em_conflito",
    async (code) => {
      banco({ fields: [] }, { code, message: "deadlock detected" });
      expect(await updatePipelineConfig(FUNIL, { fields: [cpf] })).toEqual({
        ok: false,
        error: "campos_em_conflito",
      });
    },
  );

  it("23514 do gatilho do catálogo vira campo_invalido", async () => {
    banco(
      { fields: [] },
      { code: "23514", message: "definição inválida para o campo do CRM (cpf)" },
    );
    expect(await updatePipelineConfig(FUNIL, { fields: [cpf] })).toEqual({
      ok: false,
      error: "campo_invalido",
    });
  });

  it("23514 de outra constraint segue com a mensagem do banco", async () => {
    banco({ fields: [] }, { code: "23514", message: "outra_check violada" });
    expect(await updatePipelineConfig(FUNIL, { fields: [cpf] })).toEqual({
      ok: false,
      error: "outra_check violada",
    });
  });
});
