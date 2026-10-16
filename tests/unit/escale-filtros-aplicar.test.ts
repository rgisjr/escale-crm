import { describe, expect, it } from "vitest";

import { aplicarFiltrosDoQuadro, etapasVisiveis, recortarQuadro, type ContextoDoRecorte } from "@/lib/escale/filtros/aplicar";
import {
  camposFiltraveis,
  condicaoNova,
  numeroDoValor,
  operadoresDoTipo,
  passaCondicao,
  type CampoFiltravel,
} from "@/lib/escale/filtros/campos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import type { BoardData, Stage } from "@/lib/kanban/types";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import type { Lead } from "@/lib/types/leads";
import { AGORA, horasAtras, negocio } from "@/tests/helpers/negocio-do-quadro";

const SETTINGS = {
  fields: [
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "plano", label: "Plano", type: "select", options: [{ value: "ouro", label: "Ouro" }, { value: "prata", label: "Prata" }] },
    { key: "interesses", label: "Interesses", type: "multiselect", options: [{ value: "a", label: "A" }] },
    { key: "renda", label: "Renda", type: "currency" },
    { key: "nascimento", label: "Nascimento", type: "date" },
    { key: "vip", label: "VIP", type: "boolean" },
  ],
};
const CAMPOS = camposFiltraveis([SETTINGS]);
const CTX: ContextoDoRecorte = { moeda: "BRL", campos: CAMPOS, agora: AGORA };
const campo = (chave: string): CampoFiltravel => CAMPOS.find((c) => c.chave === chave)!;
const aplicar = (leads: Lead[], f: Partial<FiltrosDoQuadro>) =>
  aplicarFiltrosDoQuadro(leads, { status: ["open", "won", "lost"], ...f }, CTX).map((l) => l.id);
const etapa = (id: string, over: Partial<Stage> = {}) =>
  ({ id, pipeline_id: "p-1", name: id, position: 1, is_won: false, is_lost: false, is_archived: false, color: null, ...over }) as Stage;

describe("campos filtráveis", () => {
  it("os do negócio vêm das origens (o primeiro com a chave vence) e os do contato vêm sempre", () => {
    const campos = camposFiltraveis([
      SETTINGS,
      { fields: [{ key: "cidade", label: "Município", type: "text" }, { key: "novo", label: "Novo", type: "number" }] },
      null,
    ]);
    expect(campos.map((c) => `${c.alvo}:${c.chave}:${c.tipo}`)).toEqual([
      "negocio:cidade:texto",
      "negocio:plano:opcao",
      "negocio:interesses:opcoes",
      "negocio:renda:numero",
      "negocio:nascimento:data",
      "negocio:vip:booleano",
      "negocio:novo:numero",
      "contato:nome:texto",
      "contato:email:texto",
      "contato:telefone:texto",
    ]);
    expect(campos[0]!.rotulo).toBe("Cidade");
  });

  it("cada tipo tem os seus operadores, e a condição nova nasce com o primeiro", () => {
    expect(operadoresDoTipo("booleano")).toEqual(["igual"]);
    expect(operadoresDoTipo("numero")).toEqual(["entre", "preenchido", "vazio"]);
    expect(condicaoNova(campo("vip"))).toEqual({ alvo: "negocio", chave: "vip", op: "igual", valor: "true" });
    expect(condicaoNova(campo("cidade"))).toEqual({ alvo: "negocio", chave: "cidade", op: "contem" });
  });

  it("lê número escrito como número ou como texto", () => {
    expect(numeroDoValor(12)).toBe(12);
    expect(numeroDoValor("1.500,00")).toBe(1500);
    expect(numeroDoValor("1500.5")).toBe(1500.5);
    expect(numeroDoValor("1.000")).toBe(1000);
    expect(numeroDoValor("R$ 10")).toBe(10);
    expect(numeroDoValor("abc")).toBeNull();
    expect(numeroDoValor("")).toBeNull();
    expect(numeroDoValor(true)).toBeNull();
  });
});

describe("passaCondicao", () => {
  const com = (custom_fields: Record<string, unknown>) => negocio("x", { custom_fields });

  it("texto: contém, sem olhar acento nem caixa; condição sem valor não restringe", () => {
    const lead = com({ cidade: "São Gonçalo" });
    expect(passaCondicao(lead, { alvo: "negocio", chave: "cidade", op: "contem", valor: "sao" }, campo("cidade"))).toBe(true);
    expect(passaCondicao(lead, { alvo: "negocio", chave: "cidade", op: "contem", valor: "rio" }, campo("cidade"))).toBe(false);
    expect(passaCondicao(lead, { alvo: "negocio", chave: "cidade", op: "contem", valor: " " }, campo("cidade"))).toBe(true);
  });

  it("opção: é igual a; várias opções: contém a escolhida", () => {
    expect(passaCondicao(com({ plano: "ouro" }), { alvo: "negocio", chave: "plano", op: "igual", valor: "ouro" }, campo("plano"))).toBe(true);
    expect(passaCondicao(com({ plano: "prata" }), { alvo: "negocio", chave: "plano", op: "igual", valor: "ouro" }, campo("plano"))).toBe(false);
    expect(
      passaCondicao(com({ interesses: ["a", "b"] }), { alvo: "negocio", chave: "interesses", op: "contem", valor: "a" }, campo("interesses")),
    ).toBe(true);
  });

  it("número e data: está entre, com valor escrito como texto; vazio não passa", () => {
    const entre = (valor: string, ate: string) => ({ alvo: "negocio" as const, chave: "renda", op: "entre" as const, valor, ate });
    expect(passaCondicao(com({ renda: "1.500,00" }), entre("1000", "2000"), campo("renda"))).toBe(true);
    expect(passaCondicao(com({ renda: "1.500,00" }), entre("1000", "1200"), campo("renda"))).toBe(false);
    expect(passaCondicao(com({}), entre("1000", ""), campo("renda"))).toBe(false);
    expect(
      passaCondicao(
        com({ nascimento: "1990-05-10" }),
        { alvo: "negocio", chave: "nascimento", op: "entre", valor: "1990-01-01", ate: "1990-12-31" },
        campo("nascimento"),
      ),
    ).toBe(true);
  });

  it("sim/não: 'não' vale também para o campo nunca preenchido", () => {
    const sim = { alvo: "negocio" as const, chave: "vip", op: "igual" as const, valor: "true" };
    const nao = { ...sim, valor: "false" };
    expect(passaCondicao(com({ vip: true }), sim, campo("vip"))).toBe(true);
    expect(passaCondicao(com({}), sim, campo("vip"))).toBe(false);
    expect(passaCondicao(com({}), nao, campo("vip"))).toBe(true);
    expect(passaCondicao(com({ vip: false }), nao, campo("vip"))).toBe(true);
  });

  it("preenchido e vazio", () => {
    expect(passaCondicao(com({ cidade: "Natal" }), { alvo: "negocio", chave: "cidade", op: "preenchido" }, campo("cidade"))).toBe(true);
    expect(passaCondicao(com({ cidade: "  " }), { alvo: "negocio", chave: "cidade", op: "vazio" }, campo("cidade"))).toBe(true);
  });

  it("os campos do contato leem o nome anexado pela rota e o e-mail da capa", () => {
    const lead = negocio("x", { contact_email: "ana@x.com" }, { contato_nome: "Ana Souza" });
    expect(passaCondicao(lead, { alvo: "contato", chave: "nome", op: "contem", valor: "souza" })).toBe(true);
    expect(passaCondicao(lead, { alvo: "contato", chave: "email", op: "preenchido" })).toBe(true);
    expect(passaCondicao(lead, { alvo: "contato", chave: "telefone", op: "vazio" })).toBe(true);
  });
});

describe("aplicar: status, busca, criação, valor e os filtros do original", () => {
  it("status com várias escolhas", () => {
    const leads = [negocio("aberto"), negocio("ganho", { status: "won" }), negocio("perdido", { status: "lost" })];
    expect(aplicar(leads, { status: ["open", "lost"] })).toEqual(["aberto", "perdido"]);
    expect(aplicar(leads, { status: ["won"] })).toEqual(["ganho"]);
  });

  it("a busca olha título, nome do contato (sem acento), e-mail e os dígitos do telefone", () => {
    const leads = [
      negocio("titulo", { title: "Proposta Acme" }),
      negocio("nome", {}, { contato_nome: "João Silva" }),
      negocio("email", { contact_email: "maria@empresa.com" }),
      negocio("fone", { contact_phone: "+55 (11) 98765-4321" }),
      negocio("nada"),
    ];
    expect(aplicar(leads, { busca: "acme" })).toEqual(["titulo"]);
    expect(aplicar(leads, { busca: "joao" })).toEqual(["nome"]);
    expect(aplicar(leads, { busca: "MARIA@" })).toEqual(["email"]);
    expect(aplicar(leads, { busca: "98765 4321" })).toEqual(["fone"]);
  });

  it("data de criação, de e até, no dia local", () => {
    const leads = [negocio("dia10", { created_at: "2026-10-10T15:00:00Z" }), negocio("dia12", { created_at: "2026-10-12T15:00:00Z" })];
    expect(aplicar(leads, { criadoEm: { de: "2026-10-11" } })).toEqual(["dia12"]);
    expect(aplicar(leads, { criadoEm: { ate: "2026-10-11" } })).toEqual(["dia10"]);
    expect(aplicar(leads, { criadoEm: { de: "2026-10-10", ate: "2026-10-12" } })).toEqual(["dia10", "dia12"]);
  });

  it("valor só compara na moeda da organização (negócio sem moeda é da organização)", () => {
    const leads = [
      negocio("pouco", { value_cents: 50000, currency: "BRL" }),
      negocio("muito", { value_cents: 200000, currency: "BRL" }),
      negocio("sem-moeda", { value_cents: 300000, currency: null }),
      negocio("euro", { value_cents: 500000, currency: "EUR" }),
    ];
    expect(aplicar(leads, { valor: { min: 100000 } })).toEqual(["muito", "sem-moeda"]);
    expect(aplicar(leads, { valor: { max: 100000 } })).toEqual(["pouco"]);
  });

  it("dono, tags e atrasados seguem as regras do original", () => {
    const leads = [
      negocio("da-ana", { owner_user_id: "u-ana", owner_kind: "user", tags: ["vip"] }),
      negocio("sem-dono", { contact_tags: ["vip"] }),
      negocio("atrasado", { expected_close_date: "2026-10-01" }),
    ];
    expect(aplicar(leads, { dono: "u-ana" })).toEqual(["da-ana"]);
    expect(aplicar(leads, { dono: "unassigned" })).toEqual(["sem-dono", "atrasado"]);
    expect(aplicar(leads, { tags: ["vip"] })).toEqual(["da-ana", "sem-dono"]);
    expect(aplicar(leads, { atrasados: true })).toEqual(["atrasado"]);
  });
});

describe("aplicar: conversa", () => {
  const SEM_CONTATO = negocio("sem-contato", {}, {});
  const SEM_CONVERSA = negocio("sem-conversa", { contact_id: "c2", conversa: null }, {});
  const WHATS = negocio(
    "whats",
    { contact_id: "c3", conversa: { id: "v3", preview: null, last_message_at: horasAtras(1), unread: 2 } },
    { conversa: { status: "open", canal: "whatsapp", atendente_id: "u-1", ultima_entrada: horasAtras(1), ultima_saida: horasAtras(3) } },
  );
  const INSTA = negocio(
    "insta",
    { contact_id: "c4", conversa: { id: "v4", preview: null, last_message_at: horasAtras(5), unread: 0 } },
    { conversa: { status: "resolved", canal: "instagram", atendente_id: null, ultima_entrada: horasAtras(6), ultima_saida: horasAtras(5) } },
  );
  const TODOS = [SEM_CONTATO, SEM_CONVERSA, WHATS, INSTA];

  it("com e sem conversa", () => {
    expect(aplicar(TODOS, { conversa: { existe: "sem" } })).toEqual(["sem-contato", "sem-conversa"]);
    expect(aplicar(TODOS, { conversa: { existe: "com" } })).toEqual(["whats", "insta"]);
  });

  it("não lidas e não respondidas pelo atendente", () => {
    expect(aplicar(TODOS, { conversa: { naoLidas: true } })).toEqual(["whats"]);
    expect(aplicar(TODOS, { conversa: { semResposta: true } })).toEqual(["whats"]);
  });

  it("status, canal e atendente (com 'não atribuídos')", () => {
    expect(aplicar(TODOS, { conversa: { situacao: ["encerrada"] } })).toEqual(["insta"]);
    expect(aplicar(TODOS, { conversa: { situacao: ["aberta"] } })).toEqual(["whats"]);
    expect(aplicar(TODOS, { conversa: { canais: ["instagram", "facebook"] } })).toEqual(["insta"]);
    expect(aplicar(TODOS, { conversa: { atendentes: ["nenhum"] } })).toEqual(["insta"]);
    expect(aplicar(TODOS, { conversa: { atendentes: ["u-1", "nenhum"] } })).toEqual(["whats", "insta"]);
  });
});

describe("aplicar: campos, atividades e tempo", () => {
  it("as condições de campo se somam (E)", () => {
    const leads = [
      negocio("natal-ouro", { custom_fields: { cidade: "Natal", plano: "ouro" } }),
      negocio("natal-prata", { custom_fields: { cidade: "Natal", plano: "prata" } }),
    ];
    expect(
      aplicar(leads, {
        campos: [
          { alvo: "negocio", chave: "cidade", op: "contem", valor: "natal" },
          { alvo: "negocio", chave: "plano", op: "igual", valor: "ouro" },
        ],
      }),
    ).toEqual(["natal-ouro"]);
  });

  it("atividades concluídas, mínimo e máximo; sem o dado conta como zero", () => {
    const leads = [
      negocio("zero", {}, { atividades_concluidas: 0 }),
      negocio("duas", {}, { atividades_concluidas: 2 }),
      negocio("cinco", {}, { atividades_concluidas: 5 }),
      negocio("sem-dado"),
    ];
    expect(aplicar(leads, { atividadesConcluidas: { min: 2, max: 3 } })).toEqual(["duas"]);
    expect(aplicar(leads, { atividadesConcluidas: { max: 0 } })).toEqual(["zero", "sem-dado"]);
  });

  it("tempo na etapa em dias inteiros e em horas; sem a data da etapa, conta da criação", () => {
    const leads = [
      negocio("50h", { stage_changed_at: horasAtras(50) }),
      negocio("47h", { stage_changed_at: horasAtras(47) }),
      negocio("9h", { stage_changed_at: horasAtras(9) }),
      negocio("sem-data", { stage_changed_at: null, created_at: horasAtras(30) }),
    ];
    expect(aplicar(leads, { tempoNaEtapa: { min: 2, unidade: "dias" } })).toEqual(["50h"]);
    expect(aplicar(leads, { tempoNaEtapa: { min: 1, max: 1, unidade: "dias" } })).toEqual(["47h", "sem-data"]);
    expect(aplicar(leads, { tempoNaEtapa: { max: 10, unidade: "horas" } })).toEqual(["9h"]);
  });

  it("tempo desde a entrada conta da criação", () => {
    const leads = [negocio("30h", { created_at: horasAtras(30) }), negocio("49h", { created_at: horasAtras(49) })];
    expect(aplicar(leads, { tempoDesdeEntrada: { max: 1, unidade: "dias" } })).toEqual(["30h"]);
  });
});

describe("colunas visíveis e o recorte do quadro", () => {
  const ETAPAS = [etapa("entrada"), etapa("ganho", { is_won: true }), etapa("perdido", { is_lost: true })];

  it("a coluna de ganho e a de perda só aparecem quando o status as pede", () => {
    expect(etapasVisiveis(ETAPAS, ["open"]).map((s) => s.id)).toEqual(["entrada"]);
    expect(etapasVisiveis(ETAPAS, ["open", "won"]).map((s) => s.id)).toEqual(["entrada", "ganho"]);
    expect(etapasVisiveis(ETAPAS, ["won", "lost"]).map((s) => s.id)).toEqual(["entrada", "ganho", "perdido"]);
  });

  it("o recorte devolve as colunas visíveis e só os cards delas, com a categoria de perda da origem", () => {
    const quadro = {
      pipeline: { id: "p-1", settings: {} },
      stages: ETAPAS,
      leads: [
        negocio("aberto", { stage_id: "entrada" }),
        negocio("perdido-preco", { stage_id: "perdido", status: "lost", lost_reason: "price" }),
        negocio("aberto-na-coluna-de-ganho", { stage_id: "ganho" }),
      ],
    } as unknown as BoardData;
    const ctx = { moeda: "BRL", campos: CAMPOS, agora: AGORA };
    const soAbertos = recortarQuadro(quadro, { status: ["open"] }, ctx);
    expect(soAbertos.stages.map((s) => s.id)).toEqual(["entrada"]);
    expect(soAbertos.leads.map((l) => l.id)).toEqual(["aberto"]);

    const categoria = categoriaDoMotivo("price", {})!;
    const perdas = recortarQuadro(quadro, { status: ["lost"], categoriaDePerda: categoria }, ctx);
    expect(perdas.leads.map((l) => l.id)).toEqual(["perdido-preco"]);
  });
});
