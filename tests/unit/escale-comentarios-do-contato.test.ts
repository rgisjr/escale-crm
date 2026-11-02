// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { comentariosDoContato } from "@/lib/escale/comentarios/do-contato";

/** Fase 10C: a origem e os comentários mais recentes do contato (Supabase dublado por tabela). */
const CONTATO = "11111111-2222-4333-8444-555555555555";

type Linha = Record<string, unknown>;
type Programa = {
  contato?: Linha | null;
  disparos?: Linha[];
  regras?: Linha[];
  erro?: { tabela: string };
};

function banco(p: Programa) {
  const leituras: string[] = [];
  const sb = {
    from: (tabela: string) => {
      leituras.push(tabela);
      let ascendente = false;
      let limite = Infinity;
      const q: Record<string, unknown> = {};
      const resultado = () => {
        if (p.erro?.tabela === tabela) return { data: null, error: { message: "boom" }, count: null };
        if (tabela === "contacts") return { data: p.contato ?? null, error: null };
        if (tabela === "automation_rules") return { data: p.regras ?? [], error: null };
        const ordenadas = [...(p.disparos ?? [])].sort((a, b) =>
          ascendente
            ? String(a.created_at).localeCompare(String(b.created_at))
            : String(b.created_at).localeCompare(String(a.created_at)),
        );
        return { data: ordenadas.slice(0, limite), error: null, count: (p.disparos ?? []).length };
      };
      for (const m of ["select", "eq", "in"]) q[m] = () => q;
      q.order = (_: string, o: { ascending: boolean }) => {
        ascendente = o.ascending;
        return q;
      };
      q.limit = (n: number) => {
        limite = n;
        return q;
      };
      q.maybeSingle = async () => resultado();
      q.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) => Promise.resolve(resultado()).then(ok, erro);
      return q;
    },
  } as unknown as SupabaseClient;
  return { sb, leituras };
}

const disparo = (n: number, extra: Linha = {}): Linha => ({
  id: `d${n}`,
  rule_id: "r1",
  plataforma: "instagram",
  texto: `comentário ${n}`,
  comentado_em: `2026-11-01T10:${String(n).padStart(2, "0")}:00.000Z`,
  repetido: false,
  publicacao_id: "p1",
  publicacao_legenda: "Meu reels",
  publicacao_miniatura: null,
  publicacao_link: "https://www.instagram.com/reel/abc/",
  created_at: `2026-11-01T10:${String(n).padStart(2, "0")}:00.000Z`,
  ...extra,
});

describe("comentariosDoContato", () => {
  it("contato de outra organização → null", async () => {
    const { sb } = banco({ contato: null });
    expect(await comentariosDoContato(sb, "o1", CONTATO)).toBeNull();
  });

  it("sem disparo → vazio, sem ler automation_rules", async () => {
    const { sb, leituras } = banco({ contato: { id: CONTATO }, disparos: [] });
    expect(await comentariosDoContato(sb, "o1", CONTATO)).toEqual({ origem: null, recentes: [], total: 0 });
    expect(leituras).not.toContain("automation_rules");
  });

  it("com 12 disparos: origem é o mais antigo, recentes são 10 do mais novo ao mais velho", async () => {
    const { sb } = banco({
      contato: { id: CONTATO },
      disparos: Array.from({ length: 12 }, (_, i) => disparo(i + 1, i === 0 ? { publicacao_link: "javascript:x" } : {})),
      regras: [{ id: "r1", name: "Quero o Reels" }],
    });
    const r = await comentariosDoContato(sb, "o1", CONTATO);
    expect(r?.total).toBe(12);
    expect(r?.origem?.id).toBe("d1");
    expect(r?.origem?.publicacao.link).toBeNull();
    expect(r?.origem?.automacao).toEqual({ id: "r1", nome: "Quero o Reels" });
    expect(r?.recentes).toHaveLength(10);
    expect(r?.recentes[0]?.id).toBe("d12");
    expect(r?.recentes[9]?.id).toBe("d3");
    expect(r?.recentes[0]?.publicacao.link).toBe("https://www.instagram.com/reel/abc/");
  });

  it("regra sem nome achado → nome vazio", async () => {
    const { sb } = banco({ contato: { id: CONTATO }, disparos: [disparo(1)], regras: [] });
    const r = await comentariosDoContato(sb, "o1", CONTATO);
    expect(r?.origem?.automacao.nome).toBe("");
  });

  it("erro do Supabase lança", async () => {
    const { sb } = banco({ contato: { id: CONTATO }, disparos: [disparo(1)], erro: { tabela: "escale_disparos_de_comentario" } });
    await expect(comentariosDoContato(sb, "o1", CONTATO)).rejects.toBeTruthy();
  });
});
