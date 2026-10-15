import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import { comDadosDosFiltros } from "@/lib/escale/filtros/ler-dados-do-quadro";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

type Resposta = { data: unknown[] | null; error: { message: string } | null };

/** Um cliente mínimo: registra cada leitura (tabela e filtros) e responde o que a tabela tem. */
function clienteFalso(tabelas: Record<string, unknown[]>, rpc: Resposta) {
  const chamadas: Array<{ alvo: string; filtros: Array<[string, unknown]> }> = [];
  const from = (alvo: string) => {
    const registro = { alvo, filtros: [] as Array<[string, unknown]> };
    chamadas.push(registro);
    const b = {
      select: () => b,
      eq: (coluna: string, valor: unknown) => {
        registro.filtros.push([coluna, valor]);
        return b;
      },
      in: (coluna: string, valor: unknown) => {
        registro.filtros.push([coluna, valor]);
        return b;
      },
      order: () => b,
      then: (ok: (r: Resposta) => unknown, falha?: (e: unknown) => unknown) =>
        Promise.resolve({ data: tabelas[alvo] ?? [], error: null }).then(ok, falha),
    };
    return b;
  };
  const rpcFn = (nome: string, args: Record<string, unknown>) => {
    chamadas.push({ alvo: `rpc:${nome}`, filtros: Object.entries(args) });
    return Promise.resolve(rpc);
  };
  return { client: { from, rpc: rpcFn } as never, chamadas };
}

describe("comDadosDosFiltros", () => {
  it("conta pela função do banco e lê nome e conversa, sempre pela organização do funil", async () => {
    const { client, chamadas } = clienteFalso(
      {
        contacts: [{ id: "c1", name: "Ana", display_name: null, is_anonymized: false }],
        conversations: [
          {
            contact_id: "c1",
            status: "open",
            channel: "whatsapp",
            assigned_to_user_id: null,
            last_inbound_at: null,
            last_outbound_at: null,
            last_message_at: "2026-10-14T10:00:00Z",
          },
        ],
      },
      { data: [{ lead_id: "a", total: 2 }], error: null },
    );
    const r = await comDadosDosFiltros(client, "org-1", [negocio("a", { contact_id: "c1" }), negocio("b")]);
    expect(r.error).toBeNull();
    expect(dadosDeFiltro(r.leads[0]!)).toEqual({
      atividades_concluidas: 2,
      contato_nome: "Ana",
      conversa: { status: "open", canal: "whatsapp", atendente_id: null, ultima_entrada: null, ultima_saida: null },
    });
    expect(dadosDeFiltro(r.leads[1]!)?.atividades_concluidas).toBe(0);
    expect(chamadas.find((c) => c.alvo === "rpc:fn_escale_atividades_concluidas")?.filtros).toEqual([
      ["p_org", "org-1"],
      ["p_leads", ["a", "b"]],
    ]);
    expect(chamadas.find((c) => c.alvo === "contacts")?.filtros).toEqual([
      ["organization_id", "org-1"],
      ["id", ["c1"]],
    ]);
    expect(chamadas.find((c) => c.alvo === "conversations")?.filtros).toEqual([
      ["organization_id", "org-1"],
      ["contact_id", ["c1"]],
    ]);
  });

  it("erro do banco sobe com a mensagem, e os negócios voltam como vieram", async () => {
    const { client } = clienteFalso({}, { data: null, error: { message: "boom" } });
    const r = await comDadosDosFiltros(client, "org-1", [negocio("a")]);
    expect(r.error).toBe("boom");
    expect(dadosDeFiltro(r.leads[0]!)).toBeUndefined();
  });

  it("quadro vazio não consulta nada; sem contato, só a contagem", async () => {
    const vazio = clienteFalso({}, { data: [], error: null });
    expect((await comDadosDosFiltros(vazio.client, "org-1", [])).leads).toEqual([]);
    expect(vazio.chamadas).toEqual([]);

    const semContato = clienteFalso({}, { data: [], error: null });
    await comDadosDosFiltros(semContato.client, "org-1", [negocio("a")]);
    expect(semContato.chamadas.map((c) => c.alvo)).toEqual(["rpc:fn_escale_atividades_concluidas"]);
  });
});

describe("a fiação na rota do quadro", () => {
  const rota = readFileSync("app/api/v1/pipelines/[id]/board/route.ts", "utf8");

  it("chama comDadosDosFiltros com o resultado das tarefas e entrega o dela às conversas", () => {
    expect(rota).toMatch(/leadsComFiltros\s*=\s*await comDadosDosFiltros\(\s*supabase,[\s\S]*?leadsComTarefas\.leads/);
    expect(rota).toMatch(/if \(leadsComFiltros\.error\)/);
    expect(rota).toMatch(/withConversas\(\s*supabase,[\s\S]*?leadsComFiltros\.leads/);
  });

  it("a cadeia que as cercas do quadro vigiam continua: conversas → marcadores → resposta", () => {
    expect(rota).toMatch(/leadsComConversa\s*=\s*await withConversas/);
    expect(rota).toMatch(/withMarcadoresDoContato\(\s*supabase,[\s\S]*?leadsComConversa\.leads/);
    expect(rota).toMatch(/leads:\s*leadsComMarcadores\.leads/);
  });
});
