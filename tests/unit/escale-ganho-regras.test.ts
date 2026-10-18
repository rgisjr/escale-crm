import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MENSAGEM_DO_GANHO_BLOQUEADO, recusaDoGanhoPeloBanco } from "@/lib/escale/ganho/recusa";
import {
  CONDICAO_VAZIA,
  TIPOS_NA_ATRIBUICAO,
  atribuicaoDaTela,
  frasesDasRegras,
  gravarAtribuicao,
  lerAtribuicao,
  patchDaAtribuicao,
  podeMarcarGanho,
  soAdminGanha,
} from "@/lib/escale/ganho/regras";

describe("leitura tolerante", () => {
  it("lixo vira 'sem regra'; só condições completas passam; operador padrão 'e'", () => {
    expect(lerAtribuicao(null)).toEqual({ operador: "e", condicoes: [] });
    expect(
      lerAtribuicao({
        escale_atribuicao_de_ganho: {
          operador: "ou",
          condicoes: [
            { tipo: "atividade", vezes: 2, atividade: "ligacao" },
            { tipo: "atividade", vezes: 0, atividade: "email" },
            { tipo: "atividade", vezes: 1, atividade: "fax" },
            { tipo: "tag", tag: "  VIP " },
            { tipo: "tag", tag: "" },
          ],
        },
      }),
    ).toEqual({
      operador: "ou",
      condicoes: [
        { tipo: "atividade", vezes: 2, atividade: "ligacao" },
        { tipo: "tag", tag: "vip" },
      ],
    });
  });

  it("só admin: só o true conta", () => {
    expect(soAdminGanha({ escale_so_admin_ganha: true })).toBe(true);
    expect(soAdminGanha({ escale_so_admin_ganha: "true" })).toBe(false);
    expect(soAdminGanha({})).toBe(false);
  });
});

describe("a tela", () => {
  it("sem regra gravada, mostra uma linha vazia (como a Clint)", () => {
    expect(
      atribuicaoDaTela({ soAdminGanha: false, atribuicao: { operador: "e", condicoes: [] } }),
    ).toEqual({
      soAdmin: false,
      operador: "e",
      condicoes: [CONDICAO_VAZIA],
    });
  });

  it("a lista dos tipos na ordem e com os rótulos do print 027", () => {
    expect(TIPOS_NA_ATRIBUICAO.map((x) => x.rotulo)).toEqual([
      "Ligação",
      "Email",
      "Agendamento",
      "Tarefa",
      "Reunião",
      "Whatsapp",
      "Instagram",
    ]);
  });

  it("o patch tira a condição sem tipo e a tag vazia; número fora da faixa trava", () => {
    expect(
      patchDaAtribuicao({
        soAdmin: true,
        operador: "ou",
        condicoes: [
          CONDICAO_VAZIA,
          { tipo: "atividade", vezes: "3", atividade: "whatsapp" },
          { tipo: "tag", tag: " " },
        ],
      }),
    ).toEqual({
      ok: true,
      patch: {
        so_admin: true,
        operador: "ou",
        condicoes: [{ tipo: "atividade", vezes: 3, atividade: "whatsapp" }],
      },
    });
    expect(
      patchDaAtribuicao({
        soAdmin: false,
        operador: "e",
        condicoes: [{ tipo: "atividade", vezes: "0", atividade: "email" }],
      }),
    ).toEqual({ ok: false, erro: "Informe quantas vezes, de 1 a 999." });
  });

  it("gravar: o true entra, o false some; sem condição a chave some; o resto do settings fica", () => {
    expect(
      gravarAtribuicao(
        { fields: [], escale_so_admin_ganha: true },
        { so_admin: false, operador: "e", condicoes: [] },
      ),
    ).toEqual({ fields: [] });
    expect(
      gravarAtribuicao(
        {},
        { so_admin: true, operador: "ou", condicoes: [{ tipo: "tag", tag: "vip" }] },
      ),
    ).toEqual({
      escale_so_admin_ganha: true,
      escale_atribuicao_de_ganho: { operador: "ou", condicoes: [{ tipo: "tag", tag: "vip" }] },
    });
  });
});

describe("quem ganha e as frases", () => {
  it("podeMarcarGanho: sem a trava todos; com a trava só admin", () => {
    expect(podeMarcarGanho({ papel: "agent", soAdmin: false })).toBe(true);
    expect(podeMarcarGanho({ papel: "manager", soAdmin: true })).toBe(false);
    expect(podeMarcarGanho({ papel: "admin", soAdmin: true })).toBe(true);
  });

  it("as frases da janela do negócio ganho", () => {
    expect(
      frasesDasRegras({
        operador: "e",
        condicoes: [
          { tipo: "atividade", vezes: 2, atividade: "ligacao" },
          { tipo: "tag", tag: "vip" },
        ],
      }),
    ).toEqual([
      {
        modelo: "Ter realizado {n} vezes a atividade do tipo {tipo}",
        valores: { n: "2", tipo: "Ligação" },
      },
      { modelo: "Possuir a tag {tag}", valores: { tag: "vip" } },
    ]);
  });

  it("a recusa do banco vira o texto da Clint; o resto não é dela", () => {
    expect(
      recusaDoGanhoPeloBanco({ code: "PT403", message: "so_administrador_marca_ganho" }, "pt-BR"),
    ).toEqual({
      codigo: "forbidden",
      mensagem: MENSAGEM_DO_GANHO_BLOQUEADO,
    });
    expect(recusaDoGanhoPeloBanco({ code: "PT403", message: "outra_coisa" }, "pt-BR")).toBeNull();
    expect(recusaDoGanhoPeloBanco({ code: "23514", message: "x" }, "pt-BR")).toBeNull();
    expect(recusaDoGanhoPeloBanco(null, "pt-BR")).toBeNull();
  });
});

describe("os encaixes da recusa do ganho (N16)", () => {
  it.each(["app/api/v1/leads/[id]/move/route.ts", "lib/leads/encerramento.ts", "app/api/v1/leads/bulk/route.ts"])(
    "%s traduz a recusa do banco",
    (arquivo) => {
      expect(readFileSync(join(process.cwd(), arquivo), "utf8")).toContain("recusaDoGanhoPeloBanco(");
    },
  );
});
