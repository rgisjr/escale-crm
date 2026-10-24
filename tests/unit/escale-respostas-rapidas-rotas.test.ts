import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as EXCLUIR, PATCH as EDITAR } from "@/app/api/v1/respostas-rapidas/[id]/route";
import { GET as DA_CONVERSA } from "@/app/api/v1/respostas-rapidas/da-conversa/route";
import { GET as LISTAR, POST as CRIAR } from "@/app/api/v1/respostas-rapidas/route";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const T1 = "f0000000-0000-4000-8000-000000000001";
const S1 = "a0000000-0000-4000-8000-000000000001";
const CV = "c0000000-0000-4000-8000-000000000001";
const OUTRO = "b0000000-0000-4000-8000-000000000009";
const tpl = (extra: Record<string, unknown> = {}) => ({
  id: T1,
  organization_id: ORG_ID,
  owner_user_id: USER_ID,
  title: "oi",
  body: "Olá",
  shortcut: "oi",
  created_by_user_id: USER_ID,
  updated_at: "2026-10-18T10:00:00Z",
  ...extra,
});
function usar(tabelas: Parameters<typeof bancoPorTabela>[0], pode: Record<string, boolean> = {}) {
  const sessao = bancoPorTabela(tabelas, {
    rpc: (nome, args) =>
      nome === "fn_crm_pode"
        ? { data: pode[(args as { p_chave: string }).p_chave] ?? false, error: null }
        : { data: null, error: null },
  });
  const admin = bancoPorTabela(tabelas);
  vi.mocked(createClient).mockResolvedValue(sessao.db as never);
  vi.mocked(createAdminClient).mockReturnValue(admin.db as never);
  return { sessao, admin };
}
const req = (metodo: string, url: string, corpo?: unknown) =>
  new NextRequest(url, {
    method: metodo,
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  } as never);
const nova = {
  atalho: "oi",
  corpo: "Olá {{nome}}",
  canais: ["whatsapp"],
  compartilhar: false,
  todos_os_setores: false,
  setores: [S1],
};

beforeEach(() => {
  vi.mocked(audit).mockClear();
  authOk("agent");
});

describe("listar", () => {
  it("junta extras e setores; sem extras = os dois canais e todos os setores; filtra por setor", async () => {
    usar({
      message_templates: [
        tpl(),
        tpl({ id: "t2", owner_user_id: null, shortcut: "tchau", title: "tchau", body: "Tchau" }),
      ],
      crm_respostas_rapidas_extras: [
        { template_id: T1, canais: ["whatsapp"], todos_os_setores: false },
      ],
      crm_respostas_rapidas_setores: [{ template_id: T1, setor_id: S1 }],
    });
    const r = await LISTAR(req("GET", "http://x/api/v1/respostas-rapidas?pagina=1&por_pagina=10"));
    const { data, meta } = (await r.json()) as {
      data: Array<Record<string, unknown>>;
      meta: unknown;
    };
    expect(data[0]).toMatchObject({
      id: T1,
      atalho: "oi",
      corpo: "Olá",
      canais: ["whatsapp"],
      compartilhada: false,
      todos_os_setores: false,
      setores: [S1],
    });
    expect(data[1]).toMatchObject({
      id: "t2",
      canais: ["whatsapp", "instagram"],
      compartilhada: true,
      todos_os_setores: true,
      setores: [],
    });
    expect(meta).toEqual({ total: 2, pagina: 1, por_pagina: 10 });
    const p = await LISTAR(req("GET", "http://x/api/v1/respostas-rapidas?setor=pessoais"));
    expect(((await p.json()) as { data: unknown[] }).data).toHaveLength(1);
  });
});

describe("criar", () => {
  it("a própria pela sessão com extras e setores; compartilhar sem permissão → 403; com permissão → service role", async () => {
    const { sessao } = usar({ message_templates: [tpl()] });
    expect((await CRIAR(req("POST", "http://x", nova))).status).toBe(201);
    expect(sessao.escritas[0]).toMatchObject({
      tabela: "message_templates",
      op: "insert",
      valores: {
        organization_id: ORG_ID,
        owner_user_id: USER_ID,
        title: "oi",
        shortcut: "oi",
        body: "Olá {{nome}}",
      },
    });
    expect(
      sessao.escritas.find((e) => e.tabela === "crm_respostas_rapidas_extras")!.valores,
    ).toMatchObject({ template_id: T1, canais: ["whatsapp"], todos_os_setores: false });
    expect(
      sessao.escritas.find(
        (e) => e.tabela === "crm_respostas_rapidas_setores" && e.op === "upsert",
      )!.valores,
    ).toEqual([{ template_id: T1, setor_id: S1, organization_id: ORG_ID }]);
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "quick_reply.created",
    });
    usar({ message_templates: [tpl()] }, { CHAT_SHARE_QUICK_RESPONSE: false });
    expect((await CRIAR(req("POST", "http://x", { ...nova, compartilhar: true }))).status).toBe(
      403,
    );
    const { admin } = usar(
      { message_templates: [tpl({ owner_user_id: null })] },
      { CHAT_SHARE_QUICK_RESPONSE: true },
    );
    expect((await CRIAR(req("POST", "http://x", { ...nova, compartilhar: true }))).status).toBe(
      201,
    );
    expect(admin.escritas[0]).toMatchObject({
      tabela: "message_templates",
      valores: { owner_user_id: null },
    });
  });
});

describe("editar e excluir", () => {
  it("a própria pela sessão; a de outra pessoa só com 'Editar ou excluir respostas rápidas'", async () => {
    const { sessao } = usar({ message_templates: [tpl()] });
    expect(
      (await EDITAR(req("PATCH", "http://x", nova), { params: Promise.resolve({ id: T1 }) }))
        .status,
    ).toBe(200);
    expect(sessao.escritas[0]).toMatchObject({ tabela: "message_templates", op: "update" });
    usar(
      { message_templates: [tpl({ owner_user_id: OUTRO })] },
      { CHAT_EDIT_QUICK_RESPONSE: false },
    );
    expect(
      (await EXCLUIR(req("DELETE", "http://x"), { params: Promise.resolve({ id: T1 }) })).status,
    ).toBe(403);
    const { admin } = usar(
      { message_templates: [tpl({ owner_user_id: OUTRO })] },
      { CHAT_EDIT_QUICK_RESPONSE: true },
    );
    expect(
      (await EXCLUIR(req("DELETE", "http://x"), { params: Promise.resolve({ id: T1 }) })).status,
    ).toBe(204);
    expect(admin.escritas[0]).toMatchObject({ tabela: "message_templates", op: "delete" });
  });

  it("o atendente com 'Compartilhar' compartilha a própria resposta pelo service role", async () => {
    const { sessao, admin } = usar(
      { message_templates: [tpl()] },
      { CHAT_SHARE_QUICK_RESPONSE: true },
    );
    const r = await EDITAR(req("PATCH", "http://x", { ...nova, compartilhar: true }), {
      params: Promise.resolve({ id: T1 }),
    });
    expect(r.status).toBe(200);
    expect(sessao.escritas.filter((e) => e.tabela === "message_templates")).toHaveLength(0);
    expect(admin.escritas[0]).toMatchObject({
      tabela: "message_templates",
      op: "update",
      valores: { owner_user_id: null },
    });
  });

  it("editar a resposta pessoal de outra pessoa não troca o dono", async () => {
    const { admin } = usar(
      { message_templates: [tpl({ owner_user_id: OUTRO })] },
      { CHAT_EDIT_QUICK_RESPONSE: true },
    );
    const r = await EDITAR(req("PATCH", "http://x", nova), { params: Promise.resolve({ id: T1 }) });
    expect(r.status).toBe(200);
    expect(admin.escritas[0]).toMatchObject({
      tabela: "message_templates",
      valores: { owner_user_id: OUTRO },
    });
  });
});

describe("as da conversa", () => {
  it("só as do canal e do setor efetivo, mais as de todos os setores", async () => {
    usar(
      {
        conversations: [
          {
            id: CV,
            organization_id: ORG_ID,
            channel_session_id: "cs",
            channel_sessions: { provider: "waha", social_platform: null },
          },
        ],
        crm_setor_da_conversa: [],
        crm_setor_do_dispositivo: [{ channel_session_id: "cs", setor_id: "outro-setor" }],
        message_templates: [tpl(), tpl({ id: "t2", owner_user_id: null })],
        crm_respostas_rapidas_extras: [
          { template_id: T1, canais: ["whatsapp"], todos_os_setores: false },
        ],
        crm_respostas_rapidas_setores: [{ template_id: T1, setor_id: S1 }],
      },
      { CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS: true },
    );
    const r = await DA_CONVERSA(req("GET", `http://x?conversation_id=${CV}`));
    const { data } = (await r.json()) as {
      data: {
        respostas: Array<{ id: string }>;
        setorDaConversa: string;
        podeOutrosSetores: boolean;
      };
    };
    expect(data.respostas.map((x) => x.id)).toEqual(["t2"]);
    expect(data.setorDaConversa).toBe("outro-setor");
    expect(data.podeOutrosSetores).toBe(true);
    const r2 = await DA_CONVERSA(req("GET", `http://x?conversation_id=${CV}&setor=${S1}`));
    expect(
      ((await r2.json()) as { data: { respostas: Array<{ id: string }> } }).data.respostas.map(
        (x) => x.id,
      ),
    ).toEqual([T1, "t2"]);
  });
});
