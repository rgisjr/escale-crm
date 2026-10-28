import type pg from "pg";
import { describe, expect, it, vi } from "vitest";

import { ErroDoMotor } from "@/lib/escale/indicadores/motor/erros";
import { consultar, type Sessao } from "@/lib/escale/indicadores/motor/executar";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const SESSAO: Sessao = { orgId: "o1", userId: "u1", fuso: "America/Sao_Paulo" };
const pergunta = (o: unknown) => perguntaSchema.parse(o);

function poolFalso(opcoes: { rows?: unknown[][]; falhaNa?: (texto: string) => unknown } = {}) {
  const chamadas: { texto: string; valores?: unknown[] }[] = [];
  const release = vi.fn();
  const cliente = {
    query: vi.fn(async (q: string | { text: string; values?: unknown[] }, valores?: unknown[]) => {
      const texto = typeof q === "string" ? q : q.text;
      chamadas.push({ texto, valores: typeof q === "string" ? valores : q.values });
      const erro = opcoes.falhaNa?.(texto);
      if (erro) throw erro;
      return { rows: texto.startsWith("select") && !texto.startsWith("select set_config") ? (opcoes.rows ?? []) : [] };
    }),
    release,
  };
  const connect = vi.fn(async () => cliente);
  return { pool: { connect } as unknown as pg.Pool, chamadas, release, connect };
}

describe("consultar", () => {
  it("roda na sessão da pessoa, na ordem certa, e sempre desfaz e devolve a conexão", async () => {
    const { pool, chamadas, release } = poolFalso({ rows: [[3]] });
    const r = await consultar(pool, SESSAO, pergunta({ indicadores: ["negocio.ganhos"] }));
    expect(chamadas.map((c) => c.texto.split(" ").slice(0, 3).join(" "))).toEqual([
      "begin read only",
      "set local role",
      "select set_config('request.jwt.claims', $1,",
      "set local statement_timeout",
      "select count(*) filter",
      "rollback",
    ]);
    expect(chamadas[2]?.valores).toEqual(['{"sub":"u1","role":"authenticated"}']);
    expect(chamadas[3]?.texto).toBe("set local statement_timeout = '8000'");
    expect(release).toHaveBeenCalledWith(undefined);
    expect(r.linhas).toEqual([{ i0: 3 }]);
  });

  it("desfaz e devolve a conexão mesmo quando a consulta lança", async () => {
    const { pool, chamadas, release } = poolFalso({ falhaNa: (t) => (t.startsWith("select count") ? new Error("boom") : null) });
    await expect(consultar(pool, SESSAO, pergunta({ indicadores: ["negocio.ganhos"] }))).rejects.toMatchObject({ codigo: "banco_indisponivel" });
    expect(chamadas.at(-1)?.texto).toBe("rollback");
    expect(release).toHaveBeenCalled();
  });

  it("tradução do erro de tempo esgotado", async () => {
    const { pool } = poolFalso({ falhaNa: (t) => (t.startsWith("select count") ? Object.assign(new Error("x"), { code: "57014" }) : null) });
    await expect(consultar(pool, SESSAO, pergunta({ indicadores: ["negocio.ganhos"] }))).rejects.toMatchObject({ codigo: "consulta_demorou" });
  });

  it("sem userId não pega conexão", async () => {
    const { pool, connect } = poolFalso();
    await expect(consultar(pool, { ...SESSAO, userId: "" }, pergunta({ indicadores: ["negocio.ganhos"] }))).rejects.toBeInstanceOf(ErroDoMotor);
    expect(connect).not.toHaveBeenCalled();
  });

  it("corta a linha sentinela e marca truncado", async () => {
    const linhas = Array.from({ length: 1001 }, (_, i) => [`v${i}`, "1"]);
    const { pool } = poolFalso({ rows: linhas });
    const r = await consultar(pool, SESSAO, pergunta({ indicadores: ["negocio.ganhos"], variaveis: ["negocio.status"], limite: 1000 }));
    expect(r.truncado).toBe(true);
    expect(r.linhas).toHaveLength(1000);
  });

  it("anula o indicador monetário da linha com moedas misturadas e avisa", async () => {
    const { pool } = poolFalso({ rows: [["10", "99.5", 2]] });
    const r = await consultar(pool, SESSAO, pergunta({ indicadores: ["negocio.ganhos", "negocio.soma_de_valores"] }));
    expect(r.linhas).toEqual([{ i0: 10, i1: null }]);
    expect(r.avisos).toContain("moedas_diferentes");
    expect(r.colunas.some((c) => c.papel === "moedas")).toBe(false);
  });

  it("avisa quando o filtro do painel foi ignorado", async () => {
    const { pool } = poolFalso({ rows: [["4"]] });
    const r = await consultar(pool, SESSAO, pergunta({ indicadores: ["conversa.iniciadas"] }), { origens: ["22222222-2222-2222-2222-222222222222"] });
    expect(r.avisos).toEqual(["filtro_do_painel_ignorado"]);
  });
});
