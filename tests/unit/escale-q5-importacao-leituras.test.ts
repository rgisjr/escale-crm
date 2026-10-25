import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { ContextoDaRodada, LinhaParaProcessar } from "@/lib/escale/importacao/contexto";
import { lerContextoDoLote } from "@/lib/escale/importacao/contexto";
import { membrosParaAImportacao } from "@/lib/escale/importacao/executar";
import { normalizarLinha } from "@/lib/escale/importacao/linhas";
import { decisoesDoNivel } from "@/lib/escale/importacao/regras";

describe("G5-1: membros só para a importação de negócio", () => {
  it.each([
    ["contato", 0],
    ["negocio", 1],
  ] as const)("tipo %s lê os membros %i vez(es)", async (tipo, vezes) => {
    let chamadas = 0;
    const lerMembros = async () => {
      chamadas += 1;
      return [{ userId: "u", email: null, nome: null }];
    };
    const r = await membrosParaAImportacao({ lerMembros }, { tipo, organization_id: "org-1" });
    expect(chamadas).toBe(vezes);
    expect(r).toHaveLength(vezes);
  });
});

describe("G5-5: leituras do lote em paralelo", () => {
  it("empresas, WhatsApp e negócios saem juntos, e só companies espera company_people", async () => {
    const emVoo = new Set<string>();
    const juntas: string[][] = [];
    const dados: Record<string, unknown[]> = {
      contacts: [
        {
          id: "c1",
          email: "ana@x.com",
          phone_number: null,
          person_id: "p1",
          tags: [],
          custom_fields: {},
        },
      ],
      company_people: [{ company_id: "e1", person_id: "p1" }],
      companies: [{ id: "e1", trade_name: "Acme", legal_name: null }],
    };
    const db = {
      from: (tabela: string) => {
        const q: Record<string, unknown> = {};
        for (const m of ["select", "eq", "in", "is", "order", "limit", "neq"]) q[m] = () => q;
        q.then = (seguir: (x: unknown) => unknown) =>
          (async () => {
            emVoo.add(tabela);
            juntas.push([...emVoo]);
            await new Promise((ok) => setTimeout(ok, 0));
            emVoo.delete(tabela);
            return { data: dados[tabela] ?? [], error: null };
          })().then(seguir);
        return q;
      },
    } as unknown as SupabaseClient;
    const defs = { contato: {}, empresa: {}, negocio: {} };
    const base = normalizarLinha(
      ["Ana", "ana@x.com"],
      [
        { csv: "n", para: "name" },
        { csv: "e", para: "email" },
      ],
      "contato",
      defs,
    );
    const linha: LinhaParaProcessar = {
      id: "l1",
      numero: 2,
      normalizado: { ...base, negocio: { id: "neg-1" } } as never,
      repetida_de: null,
      resolucoes: {},
    };
    const rodada: ContextoDaRodada = {
      importacao: {
        id: "imp-1",
        organization_id: "org-1",
        user_id: "u-1",
        tipo: "negocio",
        status: "importando",
        decisoes: decisoesDoNivel("conservador"),
        configuracao: {
          tags: [],
          origemId: null,
          etapaId: null,
          status: "open",
          motivoDePerda: null,
        },
      },
      podeGanhar: false,
      origens: new Map(),
      origemPorNome: new Map(),
      membroPorTexto: new Map(),
    };
    const contexto = await lerContextoDoLote(db, rodada, [linha]);
    expect(contexto(linha).porEmail?.empresa).toEqual({ id: "e1", nome: "Acme" });
    // company_people, conversations e crm_leads (por id e abertos) estiveram em voo ao mesmo tempo.
    expect(
      juntas.some(
        (j) =>
          j.includes("company_people") && j.includes("conversations") && j.includes("crm_leads"),
      ),
    ).toBe(true);
  });
});
