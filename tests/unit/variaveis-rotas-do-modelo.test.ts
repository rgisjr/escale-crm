import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as valores } from "@/app/api/v1/channels/templates/valores/route";
import { PATCH } from "@/app/api/v1/channels/templates/variaveis/route";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { fontesDaConversa } from "@/lib/variaveis/fontes-da-conversa";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/variaveis/fontes-da-conversa", () => ({ fontesDaConversa: vi.fn() }));

/** FORK ESCALE · Frente V (Task 9): salvar o mapeamento e usá-lo na conversa. */
const COMPONENTES = [
  { type: "BODY", text: "Olá {{1}}, sobre {{2}}." },
  { type: "BUTTONS", buttons: [{ type: "URL", text: "Ver", url: "https://x.com/{{1}}" }] },
];
const linha = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: "oi",
  language: "pt_BR",
  parameter_format: "POSITIONAL",
  components: COMPONENTES,
  contract_hash: "h1",
  variaveis: {},
  variaveis_contrato: null,
  ...extra,
});
const CV = "c0000000-0000-4000-8000-000000000001";
const patch = (corpo: unknown) =>
  new NextRequest("http://x", { method: "PATCH", body: JSON.stringify(corpo) } as never);
const post = (corpo: unknown) =>
  new NextRequest("http://x", { method: "POST", body: JSON.stringify(corpo) } as never);

const MAPA = {
  "1": { fonte: "campo", campo: "[CONTACT.FIRST_NAME]", alternativo: "cliente" },
  "2": { fonte: "fixo", valor: "sua obra" },
};

describe("PATCH /api/v1/channels/templates/variaveis", () => {
  beforeEach(() => authOk("admin"));

  it("o portão é de administrador e a sessão de suporte é barrada", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({}, { status: 403 }),
    } as never);
    expect((await PATCH(patch({ name: "oi", language: "pt_BR", variaveis: MAPA }))).status).toBe(403);
    expect(vi.mocked(requireRole).mock.calls.at(-1)![0]).toBe("admin");
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(NextResponse.json({}, { status: 403 }) as never);
    expect((await PATCH(patch({ name: "oi", language: "pt_BR", variaveis: MAPA }))).status).toBe(403);
  });

  it("modelo de outra organização (ou que não existe): 404", async () => {
    vi.mocked(createAdminClient).mockReturnValue(bancoPorTabela({ meta_templates: [] }).db as never);
    expect((await PATCH(patch({ name: "oi", language: "pt_BR", variaveis: MAPA }))).status).toBe(404);
  });

  it("mapeamento inválido (fixo no botão) não grava nada", async () => {
    const b = bancoPorTabela({ meta_templates: [linha("m1"), linha("m2")] });
    vi.mocked(createAdminClient).mockReturnValue(b.db as never);
    const r = await PATCH(
      patch({ name: "oi", language: "pt_BR", variaveis: { "button0:1": { fonte: "fixo", valor: "x" } } }),
    );
    expect(r.status).toBe(422);
    expect(b.escritas).toEqual([]);
  });

  it("grava em todas as linhas do nome e idioma, com o contrato de hoje e a organização da sessão", async () => {
    const b = bancoPorTabela({ meta_templates: [linha("m1"), linha("m2")] });
    vi.mocked(createAdminClient).mockReturnValue(b.db as never);
    const r = await PATCH(patch({ name: "oi", language: "pt_BR", variaveis: MAPA }));
    expect(r.status).toBe(200);
    expect(b.escritas).toHaveLength(2);
    for (const e of b.escritas) {
      expect(e.valores).toEqual({ variaveis: MAPA, variaveis_contrato: "h1" });
      expect(e.filtros).toContainEqual(["eq:organization_id", ORG_ID]);
    }
  });
});

describe("POST /api/v1/channels/templates/valores", () => {
  beforeEach(() => {
    authOk("agent");
    vi.mocked(fontesDaConversa).mockReset();
  });

  it("resolve pelo mapeamento atual; o slot sem mapa volta em slotsSemMapa", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoPorTabela({ meta_templates: [linha("m1", { variaveis: MAPA, variaveis_contrato: "h1" })] }).db as never,
    );
    vi.mocked(fontesDaConversa).mockResolvedValue({ contato: { id: "c", nome: "", email: null, telefone: null } });
    const r = await valores(post({ name: "oi", language: "pt_BR", conversation_id: CV }));
    expect(await r.json()).toMatchObject({
      data: { valores: { "1": "cliente", "2": "sua obra" }, faltando: [], slotsSemMapa: ["button0:1"] },
    });
    expect(vi.mocked(fontesDaConversa).mock.calls[0]![5]).toEqual(["CONTACT.FIRST_NAME"]);
  });

  it("mapeamento de outro contrato é ignorado (D12)", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoPorTabela({ meta_templates: [linha("m1", { variaveis: MAPA, variaveis_contrato: "h0" })] }).db as never,
    );
    vi.mocked(fontesDaConversa).mockResolvedValue({});
    const r = await valores(post({ name: "oi", language: "pt_BR", conversation_id: CV }));
    expect(await r.json()).toMatchObject({ data: { valores: {}, slotsSemMapa: ["1", "2", "button0:1"] } });
  });

  it("conversa fora do alcance: 404", async () => {
    vi.mocked(createAdminClient).mockReturnValue(bancoPorTabela({ meta_templates: [linha("m1")] }).db as never);
    vi.mocked(fontesDaConversa).mockResolvedValue(null);
    expect((await valores(post({ name: "oi", language: "pt_BR", conversation_id: CV }))).status).toBe(404);
  });
});
