import { describe, expect, it } from "vitest";

import {
  atividadesDaVista,
  dadosDasVariaveis,
  dataNoPassado,
  diasDaColuna,
  dispositivoDeEnvio,
  etapasDoTrilho,
  gruposDaLista,
  gruposDoPlaybook,
  horaValida,
  juntarAtividades,
  linkDoAppWhatsapp,
  linkDoWhatsappWeb,
  mascararHora,
  podeExcluirAtividade,
  valorDoNegocio,
  type AtividadeDoNegocio,
} from "@/lib/escale/negocio/atividades";
import type { ModeloDaEtapa } from "@/lib/escale/playbook/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import type { Tarefa } from "@/lib/tarefas/tipos";

/** FORK ESCALE · Fase 1I (C19–C21): as regras puras da aba Atividades da ficha. */
const t = (s: string) => s;
const AGORA = new Date(2026, 9, 15, 12, 0);
const tarefa = (id: string, due: Date | null, extra: Partial<Tarefa> = {}): Tarefa =>
  ({
    id,
    organization_id: "o",
    title: `T ${id}`,
    description: null,
    due_date: due ? due.toISOString() : null,
    priority: "medium",
    status: "pending",
    lead_id: "n1",
    contact_id: "c1",
    demanda_id: null,
    assigned_to: null,
    created_by: null,
    created_at: AGORA.toISOString(),
    updated_at: AGORA.toISOString(),
    ...extra,
  }) as Tarefa;
const atv = (
  id: string,
  due: Date | null,
  extra: Partial<AtividadeDoNegocio> = {},
): AtividadeDoNegocio => ({
  ...tarefa(id, due),
  tipo: "whatsapp",
  visibilidade: "padrao",
  stage_id: "e1",
  atividade_id: null,
  concluida_por: null,
  concluida_em: null,
  ...extra,
});
const etapa = (id: string, position: number, extra: Partial<Stage> = {}): Stage =>
  ({
    id,
    name: id,
    position,
    is_won: false,
    is_lost: false,
    is_archived: false,
    ...extra,
  }) as Stage;

describe("juntar e escolher o que a lista mostra", () => {
  it("a tarefa sem linha do fork vira 'tarefa' padrão, sem etapa", () => {
    const [com, sem] = juntarAtividades(
      [tarefa("a", null), tarefa("b", null)],
      [
        {
          tarefa_id: "a",
          stage_id: "e2",
          atividade_id: "m1",
          tipo: "ligacao",
          visibilidade: "nao_listada",
          concluida_por: null,
          concluida_em: null,
        },
      ],
    );
    expect(com).toMatchObject({
      id: "a",
      tipo: "ligacao",
      visibilidade: "nao_listada",
      stage_id: "e2",
      atividade_id: "m1",
    });
    expect(sem).toMatchObject({
      id: "b",
      tipo: "tarefa",
      visibilidade: "padrao",
      stage_id: null,
      atividade_id: null,
    });
  });

  it("o trilho são as etapas abertas, na ordem", () => {
    const lista = etapasDoTrilho([
      etapa("e2", 2),
      etapa("g", 9, { is_won: true }),
      etapa("e1", 1),
      etapa("x", 3, { is_archived: true }),
    ]);
    expect(lista.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("na etapa atual entram também as sem etapa e as de etapa que saiu do trilho", () => {
    const lista = [
      atv("a", null),
      atv("b", null, { stage_id: "e2" }),
      atv("c", null, { stage_id: null }),
      atv("d", null, { stage_id: "velha" }),
    ];
    const trilho = new Set(["e1", "e2"]);
    expect(atividadesDaVista(lista, "e1", "e1", trilho).map((a) => a.id)).toEqual(["a", "c", "d"]);
    expect(atividadesDaVista(lista, "e2", "e1", trilho).map((a) => a.id)).toEqual(["b"]);
  });
});

describe("a coluna Dias e os grupos da lista", () => {
  const lista = [
    atv("a", new Date(2026, 9, 15, 16, 21)),
    atv("b", new Date(2026, 9, 15, 9, 0)),
    atv("c", new Date(2027, 9, 14, 16, 21)),
    atv("d", new Date(2026, 9, 10, 8, 0), { status: "done" }),
    atv("e", null),
  ];
  it("um chip por dia, em ordem, com o mês quando muda (e o ano quando não é o atual) e as atrasadas", () => {
    const dias = diasDaColuna(lista, AGORA, "pt-BR", t);
    expect(dias.map((d) => [d.dia, d.semana, d.mes, d.total, d.atrasadas])).toEqual([
      [10, "SÁB", "OUT", 1, 0],
      [15, "Hoje", null, 2, 1],
      [14, "QUI", "OUT 27", 1, 0],
    ]);
  });
  it("os grupos vão do mais cedo ao mais tarde; 'Hoje' no dia de hoje; sem prazo no fim", () => {
    const grupos = gruposDaLista(lista, AGORA, "pt-BR", t);
    expect(grupos.map((g) => [g.rotulo, g.itens.map((x) => x.id)])).toEqual([
      ["Sáb, 10 Out", ["d"]],
      ["Hoje, 15 Out", ["b", "a"]],
      ["Qui, 14 Out", ["c"]],
      [null, ["e"]],
    ]);
  });
  it("a etapa futura mostra o playbook por prazo relativo", () => {
    const modelo = (id: string, prazo: number): ModeloDaEtapa => ({
      id,
      stage_id: "e2",
      titulo: id,
      tipo: "tarefa",
      visibilidade: "padrao",
      prazo_minutos: prazo,
      ordem: 0,
      conteudo: null,
    });
    const grupos = gruposDoPlaybook(
      [modelo("x", 1440), modelo("y", 0), modelo("z", 120), modelo("w", 1440)],
      "e2",
      t,
    );
    expect(grupos.map((g) => [g.rotulo, g.modelos.map((m) => m.id)])).toEqual([
      ["Ao entrar na etapa", ["y"]],
      ["2ª hora", ["z"]],
      ["1º dia", ["w", "x"]],
    ]);
  });
});

describe("quem pode, dados e envio", () => {
  it("só a atividade criada à mão se exclui", () => {
    expect(podeExcluirAtividade(atv("a", null))).toBe(true);
    expect(podeExcluirAtividade(atv("a", null, { atividade_id: "m1" }))).toBe(false);
  });

  it("valor em reais e os dados das variáveis a partir do negócio", () => {
    const lead = {
      title: "Negócio da Ana",
      contact_id: "c1",
      value_cents: 150050,
      currency: "BRL",
      contact_email: "ana@x.com",
      contact_phone: "+5543999990000",
      custom_fields: {},
    } as unknown as Lead;
    expect(valorDoNegocio(lead)).toBe("R$ 1.500,50");
    expect(
      dadosDasVariaveis(
        lead,
        "Ana Souza",
        "1. Entrada Lead",
        { nome: "Régis", email: "r@e.com" },
        "Escale IA",
      ),
    ).toEqual({
      // Frente V: id do contato e do negócio, data, status e a conta entram nas fontes.
      contato: { nome: "Ana Souza", id: "c1", email: "ana@x.com", telefone: "+5543999990000" },
      negocio: { etapa: "1. Entrada Lead", valor: "R$ 1.500,50", id: null, criadoEm: null, status: null },
      usuario: { nome: "Régis", email: "r@e.com" },
      empresa: { nome: "Escale IA" },
      conta: { nome: "Escale IA" },
      campos: {},
    });
    const comCampo = dadosDasVariaveis(
      { ...lead, custom_fields: { plano: "ouro" } } as Lead,
      "Ana Souza",
      null,
      { nome: null, email: null },
      null,
      {
        defs: [
          {
            key: "plano",
            label: "Plano",
            type: "select",
            options: [{ value: "ouro", label: "Ouro" }],
          },
        ] as never,
        contato: { plano: "prata" },
        t,
      },
    );
    expect(comCampo.campos).toEqual({ "[DEAL.PLANO]": "Ouro", "[CONTACT.PLANO]": "prata" });
  });

  it("links do WhatsApp com só os dígitos e o texto codificado", () => {
    expect(linkDoWhatsappWeb("+55 (43) 99999-0000", "Olá Ana!")).toBe(
      "https://web.whatsapp.com/send?phone=5543999990000&text=Ol%C3%A1%20Ana!",
    );
    expect(linkDoAppWhatsapp("+5543999990000", "Oi")).toBe(
      "whatsapp://send?phone=5543999990000&text=Oi",
    );
  });

  it("o dispositivo é o primeiro canal WORKING, como o open-with-contact escolhe", () => {
    const s = (id: string, status: string, criado: string, extra = {}) => ({
      id,
      status,
      created_at: criado,
      ...extra,
    });
    expect(dispositivoDeEnvio([])).toEqual({ tipo: "nenhum" });
    expect(dispositivoDeEnvio([s("a", "STOPPED", "2026-01-01")])).toEqual({ tipo: "desconectado" });
    expect(
      dispositivoDeEnvio([
        s("b", "WORKING", "2026-02-01"),
        s("a", "WORKING", "2026-01-01"),
        s("c", "WORKING", "2025-01-01", { metadata: { disabled: true } }),
      ]),
    ).toEqual({ tipo: "conectado", sessaoId: "a" });
  });

  it("hora: máscara HH:mm, validação 24 h; data no passado com 1 minuto de folga", () => {
    expect(mascararHora("0930")).toBe("09:30");
    expect(mascararHora("9")).toBe("9");
    expect(mascararHora("12:3x")).toBe("12:3");
    expect(horaValida("23:59")).toEqual({ h: 23, m: 59 });
    expect(horaValida("24:00")).toBeNull();
    expect(horaValida("9:30")).toBeNull();
    expect(dataNoPassado(new Date(2026, 9, 15, 11, 59, 30), AGORA)).toBe(false);
    expect(dataNoPassado(new Date(2026, 9, 15, 11, 58), AGORA)).toBe(true);
  });
});
