import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";
import type { ModuloOpcional } from "@/lib/instalacao/modulos";
import { NAV_GROUPS, searchable } from "@/lib/navigation/registry";
import {
  ITENS_DO_TOPO,
  destinoAtivo,
  itemAtivo,
  montarMenuDoTopo,
} from "@/lib/escale/menu-do-topo";

const COM_EMPRESAS: ModuloOpcional[] = ["crm_b2b"];
const ADMIN = searchable(false, "admin", undefined, COM_EMPRESAS, []);
const AGENT = searchable(false, "agent", undefined, [], []);

describe("menu do topo", () => {
  it("admin com o módulo de empresas vê os 9 itens, na ordem combinada", () => {
    expect(montarMenuDoTopo(ADMIN).topo.map((i) => i.rotulo)).toEqual([
      "Negócios",
      "Conversas",
      "Contatos",
      "Empresas",
      "Atividades",
      "Agenda",
      "Agentes IA",
      "Automações",
      "Indicadores",
    ]);
  });

  it("item que o papel ou o módulo não permite não aparece (mesma regra da lateral)", () => {
    expect(montarMenuDoTopo(AGENT).topo.map((i) => i.href)).toEqual([
      "/app/kanban",
      "/app/inbox",
      "/app/contacts",
      "/app/tasks",
      "/app/agenda",
      "/app/metrics",
    ]);
  });

  it("toda tela visível aparece exatamente uma vez: no topo ou no Mais", () => {
    for (const visiveis of [ADMIN, AGENT]) {
      const menu = montarMenuDoTopo(visiveis);
      const alcancaveis = [
        ...menu.topo.map((i) => i.href),
        ...menu.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens.map((d) => d.href))),
      ];
      expect(new Set(alcancaveis).size).toBe(alcancaveis.length);
      expect([...alcancaveis].sort()).toEqual(visiveis.map((d) => d.href).sort());
    }
  });

  it("o Mais segue a ordem dos grupos do registro e não repete o topo", () => {
    const menu = montarMenuDoTopo(ADMIN);
    const ordem = NAV_GROUPS.map((g) => g.id);
    const vistos = menu.mais.map((g) => g.grupo.id);
    expect(vistos).toEqual(ordem.filter((id) => vistos.includes(id)));
    const noTopo = new Set(menu.topo.map((i) => i.href));
    const repetidos = menu.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens)).filter((d) => noTopo.has(d.href));
    expect(repetidos).toEqual([]);
  });

  it("o item fica ativo também nas telas de dentro dele", () => {
    const [negocios, conversas] = ITENS_DO_TOPO;
    expect(itemAtivo("/app/pipelines/p-1", negocios!)).toBe(true);
    expect(itemAtivo("/app/leads/l-1", negocios!)).toBe(true);
    expect(itemAtivo("/app/kanban", negocios!)).toBe(true);
    expect(itemAtivo("/app/inbox/c-9", conversas!)).toBe(true);
    expect(itemAtivo("/app/inboxx", conversas!)).toBe(false);
    expect(destinoAtivo("/app/webhooks/regra-1", "/app/webhooks")).toBe(true);
    expect(destinoAtivo("/app/webhooksx", "/app/webhooks")).toBe(false);
  });

  it("todo rótulo do topo tem espanhol no dicionário", () => {
    expect(ITENS_DO_TOPO.filter((i) => !DICIONARIO[i.rotulo]?.es).map((i) => i.rotulo)).toEqual([]);
  });
});
