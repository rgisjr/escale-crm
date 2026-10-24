import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/campanhas-da-casca/[id]/csv/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { csvDaCampanha, nomeDoCsvDaCampanha } from "@/lib/escale/campanhas/detalhe/csv";
import type { LinhaDeDestinatario } from "@/lib/escale/campanhas/detalhe/tipos";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

const t = (s: string) => s;
const SP = "America/Sao_Paulo";
const ID = "e5ca1e00-8c00-4000-8000-0000000000c1";
const LINHAS: LinhaDeDestinatario[] = [
  {
    id: "r1",
    contatoId: "k1",
    telefone: "+5553984555965",
    nome: "Elza Maria",
    email: null,
    situacao: "lida",
    motivo: null,
    enviadoEm: "2026-09-10T15:40:00Z",
  },
  {
    id: "r2",
    contatoId: "k2",
    telefone: "+5551992241821",
    nome: "=HYPERLINK(1)",
    email: "a@b.com",
    situacao: "erro",
    motivo: "131049",
    enviadoEm: null,
  },
];

describe("o CSV da campanha", () => {
  it("cabeçalho, telefone formatado, status, motivo, data BR e a guarda de fórmula", () => {
    expect(csvDaCampanha(LINHAS, t, SP).split("\r\n")).toEqual([
      "Telefone,Nome,Email,Status,Motivo,Enviado em",
      "(53) 98455-5965,Elza Maria,,Lido,,10/09/2026 12:40",
      "(51) 99224-1821,'=HYPERLINK(1),a@b.com,Erro,Meta optou por não entregar,",
    ]);
  });

  it("o nome do arquivo, sem acento, com o dia no fuso", () => {
    expect(nomeDoCsvDaCampanha("Reativação de Junho!", new Date("2026-10-19T02:00:00Z"), SP)).toBe(
      "campanha-reativacao-de-junho-2026-10-18.csv",
    );
    expect(nomeDoCsvDaCampanha("!!!", new Date("2026-10-19T12:00:00Z"), SP)).toBe(
      "campanha-campanha-2026-10-19.csv",
    );
  });
});

function banco(campanha: unknown, linhas: unknown[]) {
  const db = {
    rpc: vi.fn((_nome: string, args?: { p_limite?: number; p_deslocamento?: number }) =>
      Promise.resolve({
        data: args?.p_limite
          ? linhas.slice(args.p_deslocamento ?? 0, (args.p_deslocamento ?? 0) + args.p_limite)
          : linhas,
        error: null,
      }),
    ),
    from: vi.fn((tabela: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi
        .fn()
        .mockResolvedValue(
          tabela === "organizations"
            ? { data: { timezone: SP }, error: null }
            : { data: campanha, error: null },
        );
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockReset();
});

describe("GET /api/v1/campanhas-da-casca/[id]/csv", () => {
  it("campanha com mais de 1.000 destinatários: lê em páginas e o arquivo sai inteiro", async () => {
    authOk("manager");
    const muitas = Array.from({ length: 2500 }, (_, i) => ({
      destinatario_id: `r${i}`,
      contato_id: `k${i}`,
      telefone: "+5553984555965",
      nome: `Pessoa ${i}`,
      email: null,
      situacao: "lida",
      motivo: null,
      enviado_em: null,
      total: "2500",
    }));
    const db = banco({ id: ID, name: "grande" }, muitas);
    const r = await GET(new NextRequest(new URL("http://x/csv")), {
      params: Promise.resolve({ id: ID }),
    });
    expect(r.status).toBe(200);
    const linhasDoArquivo = (await r.text()).split(String.fromCharCode(13, 10)).filter(Boolean);
    expect(linhasDoArquivo).toHaveLength(2501); // cabeçalho + 2.500
    const paginas = db.rpc.mock.calls.filter(([n]) => n === "fn_escale_destinatarios_da_campanha");
    expect(paginas).toHaveLength(3);
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { linhas: 2500, parcial: false } }),
    );
  });

  it("baixa a campanha inteira (até 20.000), com o nome do arquivo, e audita", async () => {
    authOk("manager");
    const db = banco({ id: ID, name: "10.09" }, [
      {
        destinatario_id: "r1",
        contato_id: "k1",
        telefone: "+5553984555965",
        nome: "Elza Maria",
        email: null,
        situacao: "lida",
        motivo: null,
        enviado_em: "2026-09-10T15:40:00Z",
        total: "1",
      },
    ]);
    const r = await GET(new NextRequest(new URL("http://x/csv")), {
      params: Promise.resolve({ id: ID }),
    });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/csv");
    expect(r.headers.get("content-disposition")).toMatch(
      /attachment; filename="campanha-10-09-\d{4}-\d{2}-\d{2}\.csv"/,
    );
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_destinatarios_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_filtros: {},
      p_limite: 1000,
      p_deslocamento: 0,
    });
    expect((await r.text()).split("\r\n")[1]).toBe(
      "(53) 98455-5965,Elza Maria,,Lido,,10/09/2026 12:40",
    );
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "campaign.exported",
        resourceId: ID,
        metadata: { linhas: 1, parcial: false },
      }),
    );
  });

  it("campanha que não existe é 404", async () => {
    authOk("manager");
    banco(null, []);
    const r = await GET(new NextRequest(new URL("http://x/csv")), {
      params: Promise.resolve({ id: ID }),
    });
    expect(r.status).toBe(404);
  });
});
