import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { ErroDaLinha, gravarPlano, idsGravados, type DependenciasDaGravacao } from "@/lib/escale/importacao/aplicar";
import type { Plano } from "@/lib/escale/importacao/classificar";
import type { ContextoDaRodada, LinhaParaProcessar } from "@/lib/escale/importacao/contexto";
import { processarLinhas, type Dependencias } from "@/lib/escale/importacao/executar";
import { normalizarLinha } from "@/lib/escale/importacao/linhas";
import { decisoesDoNivel } from "@/lib/escale/importacao/regras";

type Resposta = { data: unknown; error: null };
type Chamada = { alvo: string; op: string; valor?: unknown };

/** Um cliente de mentira: anota insert/update/rpc e responde o mínimo que o motor lê. */
function bancoFalso() {
  const chamadas: Chamada[] = [];
  const r = (data: unknown): Resposta => ({ data, error: null });
  const consulta = (alvo: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "is", "order", "limit", "neq"]) q[m] = () => q;
    q.insert = (valor: unknown) => {
      chamadas.push({ alvo, op: "insert", valor });
      return q;
    };
    q.update = (valor: unknown) => {
      chamadas.push({ alvo, op: "update", valor });
      return q;
    };
    q.single = async () => r(alvo === "contacts" ? { id: "novo-1" } : null);
    q.maybeSingle = async () =>
      r(alvo === "companies" ? { city: null, state: "SP", cnpj: null, custom_fields: {} } : { custom_fields: { antigo: 1 } });
    q.then = (seguir: (x: Resposta) => unknown) => seguir(r(null));
    return q;
  };
  const rpc = async (nome: string, args: unknown) => {
    chamadas.push({ alvo: nome, op: "rpc", valor: args });
    return r(nome === "fn_escale_empresa_da_importacao" ? "emp-1" : null);
  };
  return { chamadas, db: { from: consulta, rpc } as unknown as SupabaseClient };
}

function deps(db: SupabaseClient): Dependencias {
  return {
    db,
    agora: () => 0,
    lerMembros: async () => [],
    mudarContato: vi.fn(async () => ({})),
    criarNegocio: vi.fn(async () => ({ id: "neg-1" })),
    mudarNegocio: vi.fn(async () => ({})),
    encerrar: vi.fn(async () => ({})),
    cpf: vi.fn(async () => ({ cpf_hash: "h", cpf_encrypted: new Uint8Array([1]) })),
  };
}
const ctx = { organization_id: "org-1", actor: { type: "user" as const, id: "u-1" }, requestId: "imp-1" };
const imp = { id: "imp-1", organization_id: "org-1", user_id: "u-1", podeGanhar: false };
const criar = (extra: Partial<Plano> = {}): Plano => ({
  contato: {
    tipo: "criar",
    dados: { nome: "Ana", email: "ana@x.com", telefone: null, instagram: "https://instagram.com/ana", nascimento: null, cpf: "12345678909", campos: {}, tags: ["feira"] },
  },
  empresa: null,
  negocio: null,
  ...extra,
});

describe("gravar o plano (Fase 2F)", () => {
  it("contato novo: insert como o importador do original e o evento contact.created", async () => {
    const { chamadas, db } = bancoFalso();
    const r = await gravarPlano(deps(db) as DependenciasDaGravacao, ctx, imp, criar());
    expect(r).toEqual({ contatoId: "novo-1", negocioId: null });
    expect(chamadas.find((c) => c.alvo === "contacts" && c.op === "insert")?.valor).toMatchObject({
      organization_id: "org-1",
      created_by_user_id: "u-1",
      name: "Ana",
      email: "ana@x.com",
      tags: ["feira"],
      custom_fields: { link_instagram: "https://instagram.com/ana" },
      source: "import_csv",
      source_metadata: { importacao_id: "imp-1" },
      cpf_hash: "h",
    });
    expect(chamadas.find((c) => c.alvo === "emit_event")?.valor).toMatchObject({ p_event_type: "contact.created", p_entity_id: "novo-1" });
  });

  it("contato existente: PATCH com o custom_fields inteiro", async () => {
    const { db } = bancoFalso();
    const d = deps(db);
    await gravarPlano(d, ctx, imp, {
      contato: { tipo: "atualizar", id: "c-1", mudancas: { campos: { plano: "ouro" }, instagram: "https://instagram.com/x", tags: ["a", "b"] } },
      empresa: null,
      negocio: null,
    });
    expect(d.mudarContato).toHaveBeenCalledWith(ctx, "c-1", {
      tags: ["a", "b"],
      custom_fields: { antigo: 1, plano: "ouro", link_instagram: "https://instagram.com/x" },
    });
  });

  it("empresa: acha ou cria pela função e só preenche os vazios", async () => {
    const { chamadas, db } = bancoFalso();
    await gravarPlano(deps(db), ctx, imp, criar({ empresa: { nome: "Acme", cnpj: null, campos: { cidade: "Goiânia", estado: "GO", segmento: "Varejo" } } }));
    expect(chamadas.find((c) => c.alvo === "fn_escale_empresa_da_importacao")?.valor).toMatchObject({
      p_org: "org-1",
      p_contato: "novo-1",
      p_nome: "Acme",
    });
    expect(chamadas.find((c) => c.alvo === "companies" && c.op === "update")?.valor).toEqual({
      city: "Goiânia",
      custom_fields: { segmento: "Varejo" },
    });
  });

  it("negócio ganho sem ser admin: erro antes de gravar qualquer coisa", async () => {
    const { chamadas, db } = bancoFalso();
    const plano = criar({
      negocio: { tipo: "criar", origemId: "o", etapaId: "e", titulo: "X", valorCentavos: null, donoId: null, campos: {}, status: "won", motivoDePerda: null, ganhoEm: null },
    });
    await expect(gravarPlano(deps(db), ctx, imp, plano)).rejects.toBeInstanceOf(ErroDaLinha);
    expect(chamadas).toEqual([]);
  });

  it("negócio perdido: cria pela planilha e encerra com o motivo", async () => {
    const { db } = bancoFalso();
    const d = deps(db);
    const r = await gravarPlano(d, ctx, imp, criar({
      negocio: { tipo: "criar", origemId: "o", etapaId: "e", titulo: "A", valorCentavos: 100, donoId: null, campos: {}, status: "lost", motivoDePerda: "other", ganhoEm: null },
    }));
    expect(r.negocioId).toBe("neg-1");
    expect(d.criarNegocio).toHaveBeenCalledWith(ctx, expect.objectContaining({
      pipeline_id: "o",
      stage_id: "e",
      title: "Novo negócio",
      contact_id: "novo-1",
      source: "importacao_planilha",
      via_planilha: true,
    }));
    expect(d.encerrar).toHaveBeenCalledWith(ctx, { leadId: "neg-1", desfecho: "lost", motivo: "other" });
  });
});

describe("falha no meio da linha guarda o que já foi gravado (Q5, B5-5)", () => {
  const negocioPerdido: Plano["negocio"] = {
    tipo: "criar", origemId: "o", etapaId: "e", titulo: "A", valorCentavos: 100, donoId: null, campos: {}, status: "lost", motivoDePerda: "other", ganhoEm: null,
  };

  it("encerrar falha depois de criar o negócio: o erro leva o contato e o negócio", async () => {
    const { db } = bancoFalso();
    const d = deps(db);
    d.encerrar = vi.fn(async () => {
      throw new Error("não deu para encerrar");
    });
    const erro = await gravarPlano(d, ctx, imp, criar({ negocio: negocioPerdido })).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDaLinha);
    expect((erro as Error).message).toBe("não deu para encerrar");
    expect(idsGravados(erro)).toEqual({ contatoId: "novo-1", negocioId: "neg-1" });
  });

  it("criar o negócio falha: só o contato já estava gravado", async () => {
    const { db } = bancoFalso();
    const d = deps(db);
    d.criarNegocio = vi.fn(async () => {
      throw new Error("sem etapa");
    });
    const erro = await gravarPlano(d, ctx, imp, criar({ negocio: negocioPerdido })).catch((e: unknown) => e);
    expect(idsGravados(erro)).toEqual({ contatoId: "novo-1" });
  });

  it("falha antes de gravar o contato não carrega id nenhum", () => {
    expect(idsGravados(new ErroDaLinha("x"))).toEqual({});
    expect(idsGravados(new Error("x"))).toEqual({});
  });
});

describe("processar as linhas (Fase 2F)", () => {
  const defs = { contato: {}, empresa: {}, negocio: {} };
  const linha = (id: string, celulas: string[], repetida: number | null = null): LinhaParaProcessar => ({
    id,
    numero: 2,
    normalizado: normalizarLinha(celulas, [{ csv: "n", para: "name" }, { csv: "e", para: "email" }], "contato", defs),
    repetida_de: repetida,
    resolucoes: {},
  });
  const rodada: ContextoDaRodada = {
    importacao: {
      id: "imp-1",
      organization_id: "org-1",
      user_id: "u-1",
      tipo: "contato",
      status: "importando",
      decisoes: decisoesDoNivel("conservador"),
      configuracao: { tags: [], origemId: null, etapaId: null, status: "open", motivoDePerda: null },
    },
    podeGanhar: false,
    origens: new Map(),
    origemPorNome: new Map(),
    membroPorTexto: new Map(),
  };

  it("importa a nova e pula a repetida, gravando o desfecho de cada linha", async () => {
    const { chamadas, db } = bancoFalso();
    await processarLinhas(deps(db), rodada, [linha("l-1", ["Ana", "ana@x.com"]), linha("l-2", ["Ana", "ana@x.com"], 2)]);
    const desfechos = chamadas.filter((c) => c.alvo === "crm_importacoes_linhas" && c.op === "update").map((c) => c.valor);
    expect(desfechos[0]).toMatchObject({ status: "importada", contato_id: "novo-1", com_aviso: false });
    expect(desfechos[1]).toMatchObject({ status: "pulada", motivo: "DUPLICATE_IN_BATCH" });
  });
});
