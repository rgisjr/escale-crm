import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as PREPARAR } from "@/app/api/v1/respostas-rapidas/[id]/anexo/route";
import { lerRespostas } from "@/lib/escale/conversas/respostas-banco";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

const { copiar, lerAtivos } = vi.hoisted(() => ({ copiar: vi.fn(), lerAtivos: vi.fn() }));
vi.mock("@/lib/midia/ativos-banco", () => ({ copiarAtivoParaConversa: copiar }));
vi.mock("@/lib/canais/ativos-do-canal", () => ({ lerAtivosDoCanal: lerAtivos }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const T1 = "f0000000-0000-4000-8000-000000000001";
const CV = "c0000000-0000-4000-8000-000000000001";
const CANAL = "d0000000-0000-4000-8000-000000000001";
const ATIVO_DO_CORPO = "e0000000-0000-4000-8000-0000000000ff";
const tpl = {
  id: T1,
  organization_id: ORG_ID,
  owner_user_id: USER_ID,
  title: "oi",
  body: "Olá",
  shortcut: "oi",
  created_by_user_id: USER_ID,
  updated_at: "2026-10-18T10:00:00Z",
};

function usar(tabelas: Parameters<typeof bancoPorTabela>[0]) {
  const sessao = bancoPorTabela(tabelas);
  vi.mocked(createClient).mockResolvedValue(sessao.db as never);
  vi.mocked(createAdminClient).mockReturnValue(bancoPorTabela(tabelas).db as never);
  return sessao;
}
const chamar = (corpo: unknown) =>
  PREPARAR(
    new NextRequest("http://x", { method: "POST", body: JSON.stringify(corpo) } as never),
    { params: Promise.resolve({ id: T1 }) },
  );

beforeEach(() => {
  authOk("agent");
  copiar.mockReset().mockResolvedValue({ storagePath: `${ORG_ID}/${CV}/auto-x.ogg`, mime: "audio/ogg", tipo: "audio" });
  lerAtivos.mockReset().mockResolvedValue({ bv1: "ativo-do-numero" });
});

describe("POST /respostas-rapidas/[id]/anexo", () => {
  it("var:<chave> resolve pelo número da conversa e copia para a pasta dela", async () => {
    usar({
      message_templates: [tpl],
      crm_respostas_rapidas_anexos: [{ template_id: T1, asset: "var:bv1" }],
      conversations: [{ id: CV, channel_session_id: CANAL }],
    });
    const r = await chamar({ conversation_id: CV });
    expect(r.status).toBe(200);
    expect(lerAtivos).toHaveBeenCalledWith(expect.anything(), ORG_ID, CANAL);
    expect(copiar).toHaveBeenCalledWith(expect.anything(), { organizationId: ORG_ID, assetId: "ativo-do-numero", conversationId: CV });
    const { data } = (await r.json()) as { data: Record<string, unknown> };
    expect(data).toEqual({ media_storage_path: `${ORG_ID}/${CV}/auto-x.ogg`, media_mime: "audio/ogg", type: "audio" });
  });
  it("resposta sem anexo → 404", async () => {
    usar({ message_templates: [tpl], crm_respostas_rapidas_anexos: [], conversations: [{ id: CV, channel_session_id: CANAL }] });
    expect((await chamar({ conversation_id: CV })).status).toBe(404);
    expect(copiar).not.toHaveBeenCalled();
  });
  it("conversa que não é da organização (a leitura não acha) → 404", async () => {
    usar({
      message_templates: [tpl],
      crm_respostas_rapidas_anexos: [{ template_id: T1, asset: "var:bv1" }],
      conversations: [],
    });
    expect((await chamar({ conversation_id: CV })).status).toBe(404);
    expect(copiar).not.toHaveBeenCalled();
  });
  it("o corpo não escolhe o arquivo: só vale o anexo gravado na resposta", async () => {
    usar({
      message_templates: [tpl],
      crm_respostas_rapidas_anexos: [{ template_id: T1, asset: "var:bv1" }],
      conversations: [{ id: CV, channel_session_id: CANAL }],
    });
    await chamar({ conversation_id: CV, asset: ATIVO_DO_CORPO });
    expect(copiar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ assetId: "ativo-do-numero" }));
  });
  it("número sem a variável do arquivo → 404, sem copiar", async () => {
    lerAtivos.mockResolvedValue({});
    usar({
      message_templates: [tpl],
      crm_respostas_rapidas_anexos: [{ template_id: T1, asset: "var:bv1" }],
      conversations: [{ id: CV, channel_session_id: CANAL }],
    });
    expect((await chamar({ conversation_id: CV })).status).toBe(404);
    expect(copiar).not.toHaveBeenCalled();
  });
});

describe("anexo na leitura e na escrita da resposta", () => {
  it("lerRespostas traz o anexo de quem tem e null das demais, com UMA consulta a mais por lote", async () => {
    const banco = bancoPorTabela({
      message_templates: [tpl, { ...tpl, id: "t2", shortcut: "tchau" }],
      crm_respostas_rapidas_extras: [],
      crm_respostas_rapidas_setores: [],
      crm_respostas_rapidas_anexos: [{ template_id: T1, asset: "var:bv1" }],
    });
    const r = await lerRespostas(banco.db as never, ORG_ID);
    expect(r.find((x) => x.id === T1)!.anexo).toEqual({ asset: "var:bv1" });
    expect(r.find((x) => x.id === "t2")!.anexo).toBeNull();
    const idas = banco.db.from.mock.calls.filter((c: unknown[]) => c[0] === "crm_respostas_rapidas_anexos");
    expect(idas).toHaveLength(1);
  });
});
