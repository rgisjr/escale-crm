import { beforeEach, describe, expect, it, vi } from "vitest";

/** FORK ESCALE · Fase 1G (C1, N1, N3, N14): a rota da ficha e os redirecionamentos, com e sem a casca. */
const estado = vi.hoisted(() => ({
  menu: "topo" as string | undefined,
  linhas: {} as Record<string, Record<string, unknown> | null>,
  contagem: 0,
  contou: false,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) =>
      nome === "escale_menu" && estado.menu ? { value: estado.menu } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: "agent" })),
}));
function consulta(tabela: string) {
  const q: Record<string, unknown> = {};
  q.select = (_colunas: string, opcoes?: { head?: boolean }) => {
    if (!opcoes?.head) return q;
    estado.contou = true;
    return { eq: () => ({ eq: async () => ({ count: estado.contagem, error: null }) }) };
  };
  q.eq = () => q;
  q.order = async () => ({ data: [], error: null });
  q.maybeSingle = async () => ({ data: estado.linhas[tabela] ?? null, error: null });
  return q;
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: (t: string) => consulta(t) })),
}));
vi.mock("@/components/escale/negocio/FichaDoNegocio", () => ({ FichaDoNegocio: () => null }));
vi.mock("@/app/app/pipelines/[id]/_client", () => ({ PipelinePageClient: () => null }));

import LeadPage from "@/app/app/leads/[id]/page";
import NegocioPage from "@/app/app/negocios/[id]/page";
import PipelinePage from "@/app/app/pipelines/[id]/page";

const LEAD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const ORIGEM = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const GRUPO = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  estado.menu = "topo";
  estado.contagem = 3;
  estado.contou = false;
  estado.linhas = {
    crm_leads: { id: LEAD, pipeline_id: ORIGEM, contact_id: "contato-1" },
    crm_pipelines: { id: ORIGEM, name: "Leads INSS Whatsapp", group_id: GRUPO, vocabulary: null },
    crm_pipeline_groups: { name: "INSS Vendas" },
  };
});

describe("/app/negocios/[id]", () => {
  it("com a casca: a ficha com a origem, o grupo e quantos negócios o contato tem", async () => {
    const el = (await NegocioPage(params(LEAD))) as { props: Record<string, unknown> };
    expect(el.props).toEqual({
      negocioId: LEAD,
      origem: { id: ORIGEM, nome: "Leads INSS Whatsapp" },
      grupo: "INSS Vendas",
      negociosDoContato: 3,
    });
  });

  it("sem a casca: o link estável do original (que leva ao quadro com ?lead=)", async () => {
    estado.menu = undefined;
    await expect(NegocioPage(params(LEAD))).rejects.toThrow(`REDIRECT /app/leads/${LEAD}`);
  });

  it("id inválido, negócio de outra organização ou sem origem: 404", async () => {
    await expect(NegocioPage(params("nao-e-uuid"))).rejects.toThrow("NOT_FOUND");
    estado.linhas.crm_leads = null;
    await expect(NegocioPage(params(LEAD))).rejects.toThrow("NOT_FOUND");
  });

  it("negócio sem contato: contador zero, sem contar no banco", async () => {
    estado.linhas.crm_leads = { id: LEAD, pipeline_id: ORIGEM, contact_id: null };
    const el = (await NegocioPage(params(LEAD))) as { props: Record<string, unknown> };
    expect(el.props.negociosDoContato).toBe(0);
    expect(estado.contou).toBe(false);
  });

  it("origem sem grupo: grupo nulo", async () => {
    estado.linhas.crm_pipelines = { id: ORIGEM, name: "O", group_id: null };
    const el = (await NegocioPage(params(LEAD))) as { props: Record<string, unknown> };
    expect(el.props.grupo).toBeNull();
  });
});

describe("as portas antigas", () => {
  it("/app/leads/[id]: com a casca, a ficha; sem, o quadro com ?lead= (como sempre)", async () => {
    await expect(LeadPage(params(LEAD))).rejects.toThrow(`REDIRECT /app/negocios/${LEAD}`);
    estado.menu = undefined;
    await expect(LeadPage(params(LEAD))).rejects.toThrow(
      `REDIRECT /app/pipelines/${ORIGEM}?lead=${LEAD}`,
    );
  });

  it("quadro com ?lead=: com a casca, a ficha, levando os filtros", async () => {
    await expect(
      PipelinePage({
        ...params(ORIGEM),
        searchParams: Promise.resolve({ lead: LEAD, st: "open" }),
      }),
    ).rejects.toThrow(`REDIRECT /app/negocios/${LEAD}?st=open`);
  });

  it("quadro com ?lead=: sem a casca, o quadro abre e o dossiê segue igual", async () => {
    estado.menu = undefined;
    const el = (await PipelinePage({
      ...params(ORIGEM),
      searchParams: Promise.resolve({ lead: LEAD }),
    })) as {
      props: { cascaNova: boolean };
    };
    expect(el.props.cascaNova).toBe(false);
  });

  it("quadro sem ?lead=, com a casca: abre normal", async () => {
    const el = (await PipelinePage({ ...params(ORIGEM), searchParams: Promise.resolve({}) })) as {
      props: { cascaNova: boolean };
    };
    expect(el.props.cascaNova).toBe(true);
  });
});
