// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertUrl, audit } = vi.hoisted(() => ({ assertUrl: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/messaging/media/url-de-midia-externa", () => ({ assertUrlDeMidiaSegura: assertUrl }));
vi.mock("@/lib/audit", () => ({ audit }));

import { copiarAtivoParaConversa, subirAtivoPorUrl } from "@/lib/midia/ativos-banco";

const ORG = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";

interface Opcoes {
  ativo?: { storage_path: string; mime: string } | null;
  conversa?: { id: string } | null;
}

function admin(op: Opcoes = {}) {
  const uploads: string[] = [];
  const copias: Array<[string, string]> = [];
  const inserts: Array<Record<string, unknown>> = [];
  const db = {
    storage: {
      from: () => ({
        upload: async (caminho: string) => {
          uploads.push(caminho);
          return { error: null };
        },
        copy: async (de: string, para: string) => {
          copias.push([de, para]);
          return { error: null };
        },
        remove: async () => ({ error: null }),
      }),
    },
    from: (tabela: string) => {
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.insert = async (v: Record<string, unknown>) => {
        inserts.push(v);
        return { error: null };
      };
      q.maybeSingle = async () => ({
        data: tabela === "org_media_assets" ? (op.ativo ?? null) : (op.conversa ?? null),
        error: null,
      });
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, uploads, copias, inserts };
}

function resposta(mime: string, bytes: number, extra: Record<string, string> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": mime, ...extra }),
      arrayBuffer: async () => new ArrayBuffer(bytes),
    })),
  );
}

const entrada = { organizationId: ORG, nome: "bv1.ogg", url: "https://x.test/a.ogg", requestId: "r", actorUserId: null };

beforeEach(() => {
  assertUrl.mockReset().mockResolvedValue(undefined);
  vi.unstubAllGlobals();
});

describe("subirAtivoPorUrl", () => {
  it("guarda no bucket e registra na organização do contexto", async () => {
    resposta("audio/ogg", 10);
    const { db, uploads, inserts } = admin();
    const r = await subirAtivoPorUrl(db, entrada);
    expect(r.tipo).toBe("audio");
    expect(uploads[0]).toMatch(new RegExp(`^${ORG}/assets/[0-9a-f-]{36}/bv1.ogg$`));
    expect(inserts[0]).toMatchObject({ organization_id: ORG, mime: "audio/ogg", size_bytes: 10 });
  });
  it("áudio que não é ogg é recusado sem upload", async () => {
    resposta("audio/wav", 10);
    const { db, uploads } = admin();
    await expect(subirAtivoPorUrl(db, entrada)).rejects.toThrow("audio_precisa_ser_ogg_opus");
    expect(uploads).toHaveLength(0);
  });
  it("acima de 16 MB é recusado sem upload", async () => {
    resposta("audio/ogg", 10, { "content-length": "17000000" });
    const { db, uploads } = admin();
    await expect(subirAtivoPorUrl(db, entrada)).rejects.toThrow("ativo_grande_demais");
    expect(uploads).toHaveLength(0);
  });
  it("URL recusada pela guarda anti-SSRF não chega ao fetch", async () => {
    assertUrl.mockRejectedValue(new Error("url_bloqueada"));
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { db } = admin();
    await expect(subirAtivoPorUrl(db, entrada)).rejects.toThrow("url_bloqueada");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("copiarAtivoParaConversa", () => {
  const dados = { organizationId: ORG, assetId: "a1", conversationId: CONV };
  it("ativo de outra organização: não copia", async () => {
    const { db, copias } = admin({ ativo: null, conversa: { id: CONV } });
    await expect(copiarAtivoParaConversa(db, dados)).rejects.toThrow("ativo_nao_encontrado");
    expect(copias).toHaveLength(0);
  });
  it("conversa de outra organização: não copia", async () => {
    const { db, copias } = admin({ ativo: { storage_path: `${ORG}/assets/a1/bv1.ogg`, mime: "audio/ogg" }, conversa: null });
    await expect(copiarAtivoParaConversa(db, dados)).rejects.toThrow("conversa_nao_encontrada");
    expect(copias).toHaveLength(0);
  });
  it("caminho feliz copia para a pasta da conversa", async () => {
    const { db, copias } = admin({ ativo: { storage_path: `${ORG}/assets/a1/bv1.ogg`, mime: "audio/ogg" }, conversa: { id: CONV } });
    const r = await copiarAtivoParaConversa(db, dados);
    expect(copias[0]![0]).toBe(`${ORG}/assets/a1/bv1.ogg`);
    expect(copias[0]![1]).toMatch(new RegExp(`^${ORG}/${CONV}/auto-[0-9a-f-]{36}\\.ogg$`));
    expect(r).toEqual({ storagePath: copias[0]![1], mime: "audio/ogg", tipo: "audio" });
  });
});
