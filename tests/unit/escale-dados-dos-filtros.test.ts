import { describe, expect, it } from "vitest";

import { anexarDadosDosFiltros, dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

const conversa = (contact_id: string, last_message_at: string | null, over: Record<string, unknown> = {}) => ({
  contact_id,
  status: "open",
  channel: "whatsapp",
  assigned_to_user_id: null,
  last_inbound_at: null,
  last_outbound_at: null,
  last_message_at,
  ...over,
});

describe("anexarDadosDosFiltros", () => {
  it("conta as concluídas por negócio; quem não tem fica com zero", () => {
    const [a, b] = anexarDadosDosFiltros([negocio("a"), negocio("b")], {
      concluidas: [{ lead_id: "a", total: 3 }],
      contatos: [],
      conversas: [],
    });
    expect(dadosDeFiltro(a!)?.atividades_concluidas).toBe(3);
    expect(dadosDeFiltro(b!)?.atividades_concluidas).toBe(0);
  });

  it("o nome do contato prefere o nome de exibição e some quando o contato foi anonimizado", () => {
    const leads = anexarDadosDosFiltros(
      [negocio("a", { contact_id: "c1" }), negocio("b", { contact_id: "c2" }), negocio("c", { contact_id: "c3" }), negocio("d")],
      {
        concluidas: [],
        conversas: [],
        contatos: [
          { id: "c1", name: "Ana Souza", display_name: "Aninha", is_anonymized: false },
          { id: "c2", name: "Bruno", display_name: "  ", is_anonymized: false },
          { id: "c3", name: "Carla", display_name: null, is_anonymized: true },
        ],
      },
    );
    expect(leads.map((l) => dadosDeFiltro(l)?.contato_nome)).toEqual(["Aninha", "Bruno", null, null]);
  });

  it("a conversa é a mais recente do contato — a mesma da capa —, venha na ordem que vier", () => {
    const [lead] = anexarDadosDosFiltros([negocio("a", { contact_id: "c1" })], {
      concluidas: [],
      contatos: [],
      conversas: [
        conversa("c1", "2026-10-10T10:00:00Z", { channel: "instagram" }),
        conversa("c1", null, { channel: "facebook" }),
        conversa("c1", "2026-10-14T10:00:00Z", {
          status: "resolved",
          assigned_to_user_id: "u-1",
          last_inbound_at: "2026-10-14T10:00:00Z",
          last_outbound_at: "2026-10-13T10:00:00Z",
        }),
      ],
    });
    expect(dadosDeFiltro(lead!)?.conversa).toEqual({
      status: "resolved",
      canal: "whatsapp",
      atendente_id: "u-1",
      ultima_entrada: "2026-10-14T10:00:00Z",
      ultima_saida: "2026-10-13T10:00:00Z",
    });
  });

  it("negócio sem contato ou contato sem conversa: conversa nula", () => {
    const leads = anexarDadosDosFiltros([negocio("a"), negocio("b", { contact_id: "c9" })], {
      concluidas: [],
      contatos: [],
      conversas: [],
    });
    expect(leads.map((l) => dadosDeFiltro(l)?.conversa)).toEqual([null, null]);
  });

  it("não muda o negócio de entrada", () => {
    const original = negocio("a");
    anexarDadosDosFiltros([original], { concluidas: [{ lead_id: "a", total: 1 }], contatos: [], conversas: [] });
    expect(dadosDeFiltro(original)).toBeUndefined();
  });
});
