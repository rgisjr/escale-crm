import { describe, expect, it } from "vitest";

import {
  ativarTodosNoDispositivo,
  canalDoSlug,
  dispositivosDoUsuario,
  ligarNoDispositivo,
  quemEstaNoDispositivo,
  statusDoDispositivo,
} from "@/lib/escale/conversas/canais";
import { CARTOES_DO_HUB } from "@/lib/escale/conversas/hub";
import {
  CHAVES_EDITAVEIS,
  PERMISSOES_DE_CONVERSAS,
  desativarTodos,
  estadoDoToggle,
  excecaoAoMudar,
  grupoDoUsuario,
  papelAlcanca,
} from "@/lib/escale/conversas/permissoes";
import {
  canalDaConversa,
  comBarra,
  respostaSchema,
  respostaServe,
} from "@/lib/escale/conversas/respostas";
import {
  CORES_DO_SETOR,
  filtrarSetores,
  monograma,
  ordenarSetores,
  setorSchema,
} from "@/lib/escale/conversas/setores";

const t = (s: string) => s;
const perm = (chave: string) => PERMISSOES_DE_CONVERSAS.find((p) => p.chave === chave)!;
const U = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

describe("setores", () => {
  it("monograma de uma e de duas palavras, paleta de 24, schema e busca", () => {
    expect(monograma("Atendimento")).toBe("AT");
    expect(monograma("Suporte SAO")).toBe("SS");
    expect(monograma("  admin ")).toBe("AD");
    expect(monograma("x")).toBe("X");
    expect(CORES_DO_SETOR).toHaveLength(24);
    expect(new Set(CORES_DO_SETOR).size).toBe(24);
    expect(
      setorSchema.safeParse({ nome: " Vendas ", cor: "#1C3FD8", membros: [U(1)] }).success,
    ).toBe(true);
    expect(setorSchema.safeParse({ nome: "", cor: "#1C3FD8", membros: [] }).success).toBe(false);
    expect(setorSchema.safeParse({ nome: "Vendas", cor: "azul", membros: [] }).success).toBe(false);
    const lista = [
      {
        id: "b",
        nome: "Suporte",
        cor: "#000000",
        membros: [],
        dispositivos: 0,
        ids_dos_dispositivos: [],
      },
      {
        id: "a",
        nome: "atendimento",
        cor: "#000000",
        membros: [],
        dispositivos: 1,
        ids_dos_dispositivos: [],
      },
    ];
    expect(ordenarSetores(lista).map((s) => s.id)).toEqual(["a", "b"]);
    expect(filtrarSetores(lista, "SUP").map((s) => s.id)).toEqual(["b"]);
  });
});

describe("permissões (as 19 da Clint)", () => {
  it("tem as 19 chaves na ordem dos prints e as editáveis da N4", () => {
    expect(PERMISSOES_DE_CONVERSAS).toHaveLength(19);
    expect(PERMISSOES_DE_CONVERSAS[0].rotulo).toBe("Visualizar todos os dispositivos");
    expect(PERMISSOES_DE_CONVERSAS[18].rotulo).toBe(
      "Consultar respostas rápidas de outros setores",
    );
    expect([...CHAVES_EDITAVEIS].sort()).toEqual(
      [
        "CHAT_BULK_ACTIONS",
        "CHAT_CHANGE_ATTENDANT_ALL",
        "CHAT_CHANGE_ATTENDANT_TEAM",
        "CHAT_EDIT_QUICK_RESPONSE",
        "CHAT_EDIT_TEAMS",
        "CHAT_SHARE_QUICK_RESPONSE",
        "CHAT_VIEW_CHANNEL_ACCOUNT",
        "CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS",
        "CHAT_VIEW_TEAM",
      ].sort(),
    );
  });
  it("papel alcança, padrão, exceção, travas e dicas", () => {
    expect(papelAlcanca("manager", "agent")).toBe(true);
    expect(papelAlcanca("agent", "manager")).toBe(false);
    const base = {
      papel: "agent" as const,
      visibilidade: "own_and_unassigned" as const,
      excecoes: {},
    };
    expect(estadoDoToggle(perm("CHAT_VIEW_TEAM"), base)).toEqual({
      ligado: true,
      travado: false,
      dica: null,
    });
    expect(
      estadoDoToggle(perm("CHAT_VIEW_TEAM"), { ...base, excecoes: { CHAT_VIEW_TEAM: false } })
        .ligado,
    ).toBe(false);
    expect(estadoDoToggle(perm("CHAT_BULK_ACTIONS"), base)).toEqual({
      ligado: false,
      travado: false,
      dica: null,
    });
    expect(estadoDoToggle(perm("CHAT_EDIT_TEAMS"), base)).toEqual({
      ligado: false,
      travado: true,
      dica: "Disponível a partir de Gerente",
    });
    expect(estadoDoToggle(perm("CHAT_VIEW_ALL"), base)).toEqual({
      ligado: false,
      travado: true,
      dica: "Definido pelo papel do usuário",
    });
    expect(estadoDoToggle(perm("CHAT_VIEW_ALL"), { ...base, visibilidade: "all" }).ligado).toBe(
      true,
    );
    expect(estadoDoToggle(perm("CHAT_VIEW_UNASSIGNED"), { ...base, visibilidade: "own" })).toEqual({
      ligado: false,
      travado: true,
      dica: "Definido pelo modo de visibilidade da organização",
    });
    expect(
      estadoDoToggle(perm("CHAT_SEND_MESSAGE_TEAM"), {
        ...base,
        excecoes: { CHAT_VIEW_TEAM: false },
      }),
    ).toEqual({
      ligado: false,
      travado: true,
      dica: "Segue a visualização do atendimento do setor",
    });
    expect(estadoDoToggle(perm("CHAT_CONFIG_MESSAGE_TEMPLATES"), base).dica).toBe("Em breve");
    const admin = estadoDoToggle(perm("CHAT_BULK_ACTIONS"), { ...base, papel: "admin" });
    expect(admin).toEqual({ ligado: true, travado: true, dica: "Usuário administrador" });
  });
  it("exceção some quando volta ao padrão; desativar todos; grupo", () => {
    expect(excecaoAoMudar(perm("CHAT_VIEW_TEAM"), "agent", false)).toBe(false);
    expect(excecaoAoMudar(perm("CHAT_VIEW_TEAM"), "agent", true)).toBeNull();
    expect(desativarTodos("agent")).toEqual({
      CHAT_VIEW_CHANNEL_ACCOUNT: false,
      CHAT_VIEW_TEAM: false,
      CHAT_CHANGE_ATTENDANT_TEAM: false,
      CHAT_CHANGE_ATTENDANT_ALL: false,
      CHAT_BULK_ACTIONS: false,
      CHAT_EDIT_QUICK_RESPONSE: false,
      CHAT_SHARE_QUICK_RESPONSE: false,
      CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS: false,
    });
    expect(grupoDoUsuario("manager", {})).toBe("manager");
    expect(grupoDoUsuario("manager", { CHAT_BULK_ACTIONS: false })).toBe("personalizado");
  });
});

describe("hub", () => {
  it("tem os 9 cartões na ordem da Clint, 3 em breve", () => {
    expect(CARTOES_DO_HUB.map((c) => c.titulo)).toEqual([
      "Dispositivo",
      "Setores",
      "Mensagens agendadas",
      "Respostas rápidas",
      "Usuários e Permissões",
      "Notificações",
      "Modelos de mensagem",
      "WhatsApp Flows",
      "Análise de templates",
    ]);
    expect(CARTOES_DO_HUB.filter((c) => c.emBreve)).toHaveLength(3);
  });
});

describe("respostas rápidas", () => {
  it("schema, canal da conversa e a escolha por canal e setor", () => {
    const ok = {
      atalho: "boas vindas",
      corpo: "Olá {{nome}}",
      canais: ["whatsapp"],
      compartilhar: true,
      todos_os_setores: true,
      setores: [],
    };
    expect(respostaSchema.safeParse(ok).success).toBe(true);
    expect(respostaSchema.safeParse({ ...ok, canais: [] }).success).toBe(false);
    expect(respostaSchema.safeParse({ ...ok, todos_os_setores: false, setores: [] }).success).toBe(
      false,
    );
    expect(comBarra("oi")).toBe("/oi");
    expect(canalDaConversa({ provider: "zernio_social", social_platform: "instagram" })).toBe(
      "instagram",
    );
    expect(canalDaConversa({ provider: "waha", social_platform: null })).toBe("whatsapp");
    const r = {
      id: "r1",
      atalho: "oi",
      corpo: "Oi",
      canais: ["whatsapp" as const],
      compartilhada: true,
      todos_os_setores: false,
      setores: ["s1"],
      dono: null,
      criada_por: null,
      atualizada_em: "",
    };
    expect(
      respostaServe(r, { canal: "whatsapp", setorDaConversa: "s1", setorEscolhido: null }),
    ).toBe(true);
    expect(
      respostaServe(r, { canal: "instagram", setorDaConversa: "s1", setorEscolhido: null }),
    ).toBe(false);
    expect(
      respostaServe(r, { canal: "whatsapp", setorDaConversa: "s2", setorEscolhido: null }),
    ).toBe(false);
    expect(
      respostaServe(r, { canal: "whatsapp", setorDaConversa: "s2", setorEscolhido: "s1" }),
    ).toBe(true);
    expect(
      respostaServe(
        { ...r, todos_os_setores: true },
        { canal: "whatsapp", setorDaConversa: null, setorEscolhido: null },
      ),
    ).toBe(true);
  });
});

describe("canais e quem está no dispositivo", () => {
  const elegiveis = [U(1), U(2), U(3)];
  it("slug, status, legado = todos, ligar/desligar e ativar todos", () => {
    expect(canalDoSlug("whatsapp-oficial")).toBe("whatsapp_oficial");
    expect(canalDoSlug("x")).toBeNull();
    expect(statusDoDispositivo("WORKING")).toBe("conectado");
    expect(statusDoDispositivo("STOPPED")).toBe("desconectado");
    const legado = { id: "c1", user_ids: [], mode: "legacy_unconfigured" as const };
    const restrito = { id: "c2", user_ids: [U(1)], mode: "restricted" as const };
    expect(quemEstaNoDispositivo(legado, elegiveis)).toEqual(elegiveis);
    expect(quemEstaNoDispositivo(restrito, elegiveis)).toEqual([U(1)]);
    expect(ligarNoDispositivo(legado, elegiveis, U(2), false)).toEqual([U(1), U(3)]);
    expect(ligarNoDispositivo(restrito, elegiveis, U(3), true)).toEqual([U(1), U(3)]);
    expect(ativarTodosNoDispositivo(elegiveis)).toEqual(elegiveis);
    expect(dispositivosDoUsuario(U(3), "agent", [legado, restrito], elegiveis)).toEqual(["c1"]);
    expect(dispositivosDoUsuario(U(3), "admin", [legado, restrito], elegiveis)).toEqual([
      "c1",
      "c2",
    ]);
  });
});
