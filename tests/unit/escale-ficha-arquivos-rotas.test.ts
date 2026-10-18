// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "@/app/api/v1/contacts/[id]/arquivos/route";
import { DELETE, GET as BAIXAR } from "@/app/api/v1/contacts/[id]/arquivos/[arquivoId]/route";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

/** FORK ESCALE · Fase 1H (C17, N8): upload por rota, download por URL assinada, exclusão pela RLS. */
const ORG = "22222222-2222-4222-8222-222222222222";
const OUTRA_ORG = "99999999-9999-4999-8999-999999999999";
const USER = "11111111-1111-4111-8111-111111111111";
const CONTATO = "33333333-3333-4333-8333-333333333333";
const CONTATO_ANTIGO = "55555555-5555-4555-8555-555555555555";
const ARQ = "44444444-4444-4444-8444-444444444444";
const NEGOCIO = "66666666-6666-4666-8666-666666666666";

type Linha = Record<string, unknown>;
type Estado = { contatos: Linha[]; arquivos: Linha[]; negocios: Linha[] };
function fakeSupabase(estado: Estado, erroNoInsert?: { message: string }) {
  const op = {
    tabela: "",
    acao: "select" as "select" | "insert" | "delete",
    filtros: [] as [string, unknown][],
    valores: {} as Linha,
    colunas: "",
  };
  // O select de verdade devolve só as colunas pedidas; o falso faz o mesmo.
  const projetar = (l: Linha): Linha => {
    if (!op.colunas || op.colunas === "*") return l;
    const nomes = op.colunas.split(",").map((c) => c.trim());
    return Object.fromEntries(nomes.map((n) => [n, l[n]]));
  };
  const resolver = () => {
    const base =
      op.tabela === "contacts"
        ? estado.contatos
        : op.tabela === "crm_leads"
          ? estado.negocios
          : estado.arquivos;
    const linhas = base.filter((l) => op.filtros.every(([c, v]) => l[c] === v));
    if (op.acao === "insert") {
      const nova = { id: ARQ, created_at: "2026-10-17T10:00:00Z", ...op.valores };
      estado.arquivos.push(nova);
      return { data: projetar(nova), error: null };
    }
    if (op.acao === "delete") {
      estado.arquivos = estado.arquivos.filter((l) => !linhas.includes(l));
      return { data: linhas.map(projetar), error: null };
    }
    return { data: linhas.map(projetar), error: null };
  };
  const cadeia: Record<string, unknown> = {};
  const self = () => cadeia;
  Object.assign(cadeia, {
    from: (tabela: string) => (
      (op.tabela = tabela),
      (op.acao = "select"),
      (op.filtros = []),
      (op.valores = {}),
      (op.colunas = ""),
      cadeia
    ),
    select: (c?: string) => ((op.colunas = c ?? ""), cadeia),
    order: self,
    insert: (v: Linha) => ((op.acao = "insert"), (op.valores = v), cadeia),
    delete: () => ((op.acao = "delete"), cadeia),
    eq: (c: string, v: unknown) => (op.filtros.push([c, v]), cadeia),
    maybeSingle: async () => {
      const r = resolver();
      return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: null };
    },
    single: async () => {
      if (op.acao === "insert" && erroNoInsert) return { data: null, error: erroNoInsert };
      const r = resolver();
      return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: null };
    },
    then: (res: (v: unknown) => void) => res(resolver()),
  });
  // Só `from` sai daqui: a cadeia é "thenable" e `await createClient()` a consumiria.
  return { from: cadeia.from };
}

const storage = vi.hoisted(() => ({
  upload: vi.fn(async (..._args: unknown[]) => ({ data: { path: "x" }, error: null as unknown })),
  createSignedUrl: vi.fn(async (..._args: unknown[]) => ({
    data: { signedUrl: "https://assinada/x.pdf?token=1" } as { signedUrl: string } | null,
    error: null as unknown,
  })),
  remove: vi.fn(async (..._args: unknown[]) => ({ data: [], error: null as unknown })),
}));

function sessao(role: "viewer" | "agent" | "manager") {
  vi.mocked(requireRole).mockImplementation(async (min) => {
    const rank = { viewer: 1, agent: 2, manager: 3 };
    if (rank[role] < rank[min as "viewer" | "agent" | "manager"])
      return { ok: false, response: new Response(null, { status: 403 }) } as never;
    return {
      ok: true,
      user: { id: USER, full_name: "Ana", idioma: "pt-BR" },
      org: { orgId: ORG, role },
    } as never;
  });
}
const ctx = (extra: Record<string, string> = {}) => ({
  params: Promise.resolve({ id: CONTATO, arquivoId: ARQ, ...extra }),
});
const primeiroArquivo = (): Linha => estado.arquivos[0] as Linha;
function envio(nome: string, tipo: string, bytes: number, query = "") {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(bytes)], nome, { type: tipo }));
  return new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos${query}`, {
    method: "POST",
    body: fd,
  });
}
const urlDoArquivo = `http://localhost/api/v1/contacts/${CONTATO}/arquivos/${ARQ}`;

let estado: Estado;
beforeEach(() => {
  vi.clearAllMocks();
  storage.upload.mockResolvedValue({ data: { path: "x" }, error: null });
  storage.createSignedUrl.mockResolvedValue({
    data: { signedUrl: "https://assinada/x.pdf?token=1" },
    error: null,
  });
  storage.remove.mockResolvedValue({ data: [], error: null });
  estado = {
    contatos: [{ id: CONTATO, organization_id: ORG }],
    negocios: [{ id: NEGOCIO, organization_id: ORG, contact_id: CONTATO }],
    arquivos: [
      {
        id: ARQ,
        organization_id: ORG,
        contact_id: CONTATO,
        user_id: USER,
        nome: "contrato.pdf",
        extensao: "pdf",
        mime: "application/pdf",
        tamanho: 3,
        storage_path: `${ORG}/${CONTATO}/${ARQ}.pdf`,
      },
    ],
  };
  vi.mocked(createClient).mockResolvedValue(fakeSupabase(estado) as never);
  vi.mocked(createAdminClient).mockReturnValue({ storage: { from: () => storage } } as never);
});

describe("GET lista", () => {
  it("viewer lista os arquivos do contato, sem o storage_path", async () => {
    sessao("viewer");
    const res = await GET(
      new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos`),
      ctx(),
    );
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: Record<string, unknown>[] };
    expect(corpo.data[0]).toMatchObject({ nome: "contrato.pdf" });
    expect(corpo.data[0]).not.toHaveProperty("storage_path");
  });
});

describe("POST upload", () => {
  it("agent envia um PDF: grava no bucket em org/contato/id.ext e na tabela, como autor", async () => {
    sessao("agent");
    const res = await POST(envio("Proposta.pdf", "application/pdf", 3), ctx());
    expect(res.status).toBe(201);
    const corpo = (await res.json()) as { data: Record<string, unknown> };
    expect(corpo.data).toMatchObject({
      nome: "Proposta.pdf",
      extensao: "pdf",
      user_id: USER,
      user_nome: "Ana",
      tamanho: 3,
    });
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${ORG}/${CONTATO}/[0-9a-f-]{36}\\.pdf$`)),
      expect.anything(),
      expect.objectContaining({ contentType: "application/pdf", upsert: false }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "contact.file_added",
        organizationId: ORG,
        resourceType: "crm_arquivos_do_contato",
      }),
    );
  });
  it("a resposta do envio não vaza o caminho do bucket nem a organização", async () => {
    sessao("agent");
    const res = await POST(envio("Proposta.pdf", "application/pdf", 3), ctx());
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain("storage_path");
    expect(texto).not.toContain(ORG);
  });
  it("o mime vem da extensão, nunca do tipo que o cliente declara", async () => {
    sessao("agent");
    await POST(envio("Proposta.pdf", "text/html", 3), ctx());
    expect(storage.upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({ contentType: "application/pdf" }),
    );
    expect(estado.arquivos.at(-1)).toMatchObject({ mime: "application/pdf" });
  });
  it("o nome gravado é saneado (sem caminho, aspas ou quebra de linha)", async () => {
    sessao("agent");
    const res = await POST(envio('..\\..\\fa"tu\r\nra.pdf', "application/pdf", 3), ctx());
    expect(res.status).toBe(201);
    expect(estado.arquivos.at(-1)).toMatchObject({ nome: "fatura.pdf" });
  });
  it("organização, contato e autor vêm da sessão e da URL, não do corpo", async () => {
    sessao("agent");
    const fd = new FormData();
    fd.append("file", new File([new Uint8Array(3)], "a.pdf"));
    fd.append("organization_id", OUTRA_ORG);
    fd.append("contact_id", CONTATO_ANTIGO);
    fd.append("user_id", "00000000-0000-4000-8000-000000000000");
    fd.append("storage_path", "../../x");
    const req = new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos`, {
      method: "POST",
      body: fd,
    });
    expect((await POST(req, ctx())).status).toBe(201);
    expect(estado.arquivos.at(-1)).toMatchObject({
      organization_id: ORG,
      contact_id: CONTATO,
      user_id: USER,
    });
    expect(String(estado.arquivos.at(-1)?.storage_path)).toMatch(new RegExp(`^${ORG}/${CONTATO}/`));
  });
  it("viewer 403; extensão fora da lista 415; acima de 25 MB 413; contato de outra organização 404", async () => {
    sessao("viewer");
    expect((await POST(envio("a.pdf", "application/pdf", 1), ctx())).status).toBe(403);
    sessao("agent");
    expect((await POST(envio("virus.exe", "application/octet-stream", 1), ctx())).status).toBe(415);
    const grande = new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos`, {
      method: "POST",
      body: new FormData(),
      headers: { "content-length": String(30 * 1024 * 1024) },
    });
    expect((await POST(grande, ctx())).status).toBe(413);
    estado.contatos = [];
    expect((await POST(envio("a.pdf", "application/pdf", 1), ctx())).status).toBe(404);
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it("o corpo que passa do limite sem content-length também é recusado (413), sem gravar nada", async () => {
    sessao("agent");
    const bytes = new Uint8Array(27 * 1024 * 1024);
    const req = new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos`, {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      body: new ReadableStream({
        start(c) {
          c.enqueue(bytes);
          c.close();
        },
      }),
      duplex: "half",
    });
    expect((await POST(req, ctx())).status).toBe(413);
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it("negócio (query) que não é do contato nesta organização é recusado e nada sobe", async () => {
    sessao("agent");
    const res = await POST(
      envio("a.pdf", "application/pdf", 1, "?negocio=77777777-7777-4777-8777-777777777777"),
      ctx(),
    );
    expect(res.status).toBe(404);
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it("negócio válido do contato fica gravado em lead_id", async () => {
    sessao("agent");
    const res = await POST(envio("a.pdf", "application/pdf", 1, `?negocio=${NEGOCIO}`), ctx());
    expect(res.status).toBe(201);
    expect(estado.arquivos.at(-1)).toMatchObject({ lead_id: NEGOCIO });
  });
  it("se a tabela recusar, o objeto do bucket é removido", async () => {
    sessao("agent");
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(estado, { message: "rls" }) as never);
    const res = await POST(envio("a.pdf", "application/pdf", 1), ctx());
    expect(res.status).toBe(500);
    expect(storage.remove).toHaveBeenCalled();
  });
  it("se a tabela recusar e a limpeza do bucket também falhar, registra o caminho solto", async () => {
    sessao("agent");
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(estado, { message: "rls" }) as never);
    storage.remove.mockResolvedValueOnce({ data: [], error: { message: "storage fora" } });
    const res = await POST(envio("a.pdf", "application/pdf", 1), ctx());
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      "arquivos.limpar_objeto_orfao",
      expect.objectContaining({ storage_path: expect.stringContaining(`${ORG}/${CONTATO}/`) }),
    );
  });
});

describe("GET download e DELETE", () => {
  it("o download é um 302 para a URL assinada, sem cache", async () => {
    sessao("viewer");
    const res = await BAIXAR(new NextRequest(urlDoArquivo), ctx({ arquivoId: ARQ }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://assinada/x.pdf?token=1");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(storage.createSignedUrl).toHaveBeenCalledWith(`${ORG}/${CONTATO}/${ARQ}.pdf`, 60, {
      download: "contrato.pdf",
    });
  });
  it("arquivo de contato mesclado: o caminho guarda o contato antigo e o download continua valendo", async () => {
    sessao("viewer");
    primeiroArquivo().storage_path = `${ORG}/${CONTATO_ANTIGO}/${ARQ}.pdf`;
    const res = await BAIXAR(new NextRequest(urlDoArquivo), ctx({ arquivoId: ARQ }));
    expect(res.status).toBe(302);
    expect(storage.createSignedUrl).toHaveBeenCalledWith(
      `${ORG}/${CONTATO_ANTIGO}/${ARQ}.pdf`,
      60,
      expect.anything(),
    );
  });
  it("caminho gravado fora da pasta da organização nunca é assinado", async () => {
    sessao("viewer");
    for (const ruim of [`${OUTRA_ORG}/${CONTATO}/${ARQ}.pdf`, `${ORG}/../${OUTRA_ORG}/x.pdf`]) {
      primeiroArquivo().storage_path = ruim;
      const res = await BAIXAR(new NextRequest(urlDoArquivo), ctx({ arquivoId: ARQ }));
      expect(res.status).toBe(404);
    }
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });
  it("arquivo que a RLS não devolve (outra organização ou outro contato) é 404 e não assina", async () => {
    sessao("viewer");
    estado.arquivos = [];
    const res = await BAIXAR(new NextRequest(urlDoArquivo), ctx({ arquivoId: ARQ }));
    expect(res.status).toBe(404);
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });
  it("se o storage não assina, é 500 sem vazar detalhe", async () => {
    sessao("viewer");
    storage.createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: "segredo" } });
    const res = await BAIXAR(new NextRequest(urlDoArquivo), ctx({ arquivoId: ARQ }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("segredo");
  });
  it("excluir apaga a linha (a RLS decide) e depois o objeto; zero linhas é 404", async () => {
    sessao("agent");
    const res = await DELETE(
      new NextRequest(urlDoArquivo, { method: "DELETE" }),
      ctx({ arquivoId: ARQ }),
    );
    expect(res.status).toBe(204);
    expect(storage.remove).toHaveBeenCalledWith([`${ORG}/${CONTATO}/${ARQ}.pdf`]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contact.file_removed", resourceId: ARQ }),
    );
    const outra = await DELETE(
      new NextRequest(urlDoArquivo, { method: "DELETE" }),
      ctx({ arquivoId: ARQ }),
    );
    expect(outra.status).toBe(404);
  });
  it("excluir arquivo de contato mesclado remove o objeto do caminho antigo", async () => {
    sessao("agent");
    primeiroArquivo().storage_path = `${ORG}/${CONTATO_ANTIGO}/${ARQ}.pdf`;
    const res = await DELETE(
      new NextRequest(urlDoArquivo, { method: "DELETE" }),
      ctx({ arquivoId: ARQ }),
    );
    expect(res.status).toBe(204);
    expect(storage.remove).toHaveBeenCalledWith([`${ORG}/${CONTATO_ANTIGO}/${ARQ}.pdf`]);
  });
  it("se o bucket falhar ao remover, devolve erro, registra o caminho solto e ainda audita a linha apagada", async () => {
    sessao("agent");
    storage.remove.mockResolvedValueOnce({ data: [], error: { message: "storage fora" } });
    const res = await DELETE(
      new NextRequest(urlDoArquivo, { method: "DELETE" }),
      ctx({ arquivoId: ARQ }),
    );
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      "arquivos.remover_objeto",
      expect.objectContaining({ storage_path: `${ORG}/${CONTATO}/${ARQ}.pdf` }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "contact.file_removed",
        metadata: expect.objectContaining({ objeto_removido: false }),
      }),
    );
  });
  it("caminho fora da pasta da organização nunca vai ao remove do bucket", async () => {
    sessao("agent");
    primeiroArquivo().storage_path = `${OUTRA_ORG}/${CONTATO}/${ARQ}.pdf`;
    const res = await DELETE(
      new NextRequest(urlDoArquivo, { method: "DELETE" }),
      ctx({ arquivoId: ARQ }),
    );
    expect(res.status).toBe(500);
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it("viewer não exclui (403)", async () => {
    sessao("viewer");
    const res = await DELETE(
      new NextRequest(urlDoArquivo, { method: "DELETE" }),
      ctx({ arquivoId: ARQ }),
    );
    expect(res.status).toBe(403);
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
