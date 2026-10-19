import { describe, expect, it } from "vitest";

import {
  classificar,
  type ContatoExistente,
  type ContextoDaLinha,
  type ContextoDoNegocio,
} from "@/lib/escale/importacao/classificar";
import { normalizarLinha, type DadosDaLinha } from "@/lib/escale/importacao/linhas";
import { decisoesDoNivel, type ColunaMapeada } from "@/lib/escale/importacao/regras";

const defs = { contato: { plano: { type: "text" as const, label: "Plano" } }, empresa: {}, negocio: {} };
const mapa = (...para: string[]): ColunaMapeada[] => para.map((p, i) => ({ csv: `c${i}`, para: p }));
const linha = (para: string[], celulas: string[], tipo: "contato" | "negocio" = "contato"): DadosDaLinha =>
  normalizarLinha(celulas, mapa(...para), tipo, defs);

const contato = (extra: Partial<ContatoExistente> = {}): ContatoExistente => ({
  id: "c-1",
  nome: "Maria",
  email: "maria@x.com",
  telefone: "+5564999446816",
  instagram: null,
  nascimento: null,
  campos: {},
  tags: ["antiga"],
  empresa: null,
  ...extra,
});
const ctx = (extra: Partial<ContextoDaLinha> = {}): ContextoDaLinha => ({
  tipo: "contato",
  porId: null,
  porEmail: null,
  porTelefone: null,
  whatsappAtivo: () => false,
  tagsDaImportacao: [],
  negocio: null,
  ...extra,
});
const conservador = decisoesDoNivel("conservador");
const agressivo = decisoesDoNivel("agressivo");

describe("classificar (Fase 2F)", () => {
  it("contato novo vira criar, com as tags da configuração", () => {
    const d = classificar(linha(["name", "email", "tag"], ["Ana", "ana@x.com", "vip"]), null, ctx({ tagsDaImportacao: ["feira"] }), conservador);
    expect(d).toMatchObject({
      tipo: "importar",
      plano: { contato: { tipo: "criar", dados: { nome: "Ana", email: "ana@x.com", tags: ["vip", "feira"] } }, negocio: null },
    });
  });

  it("A: sem dados, e-mail inválido e repetida são puladas", () => {
    expect(classificar(linha(["plano"], ["x"]), null, ctx(), conservador)).toMatchObject({ tipo: "pular", motivo: "MISSING_REQUIRED_FIELDS" });
    expect(classificar(linha(["email"], ["x@"]), null, ctx(), conservador)).toMatchObject({ tipo: "pular", motivo: "INVALID_EMAIL_FORMAT" });
    expect(classificar(linha(["email"], ["a@x.com"]), 0, ctx(), conservador)).toMatchObject({
      tipo: "pular",
      motivo: "DUPLICATE_IN_BATCH",
      detalhe: { primeiraLinha: 0 },
    });
  });

  it("telefone inválido: sem telefone com aviso; só telefone vira sem dados", () => {
    expect(classificar(linha(["name", "phone"], ["Ana", "12"]), null, ctx(), conservador)).toMatchObject({
      tipo: "importar",
      detalhe: { avisos: { telefone: "12" } },
    });
    expect(classificar(linha(["phone"], ["12"]), null, ctx(), conservador)).toMatchObject({ tipo: "pular", motivo: "MISSING_REQUIRED_FIELDS" });
    expect(
      classificar(linha(["name", "phone"], ["Ana", "12"]), null, ctx(), { ...conservador, INVALID_PHONE_FORMAT: "PENDING_REVIEW" }),
    ).toMatchObject({ tipo: "revisar", motivo: "INVALID_PHONE_FORMAT" });
  });

  it("C: e-mail de um e telefone de outro vai para revisão; a escolha decide o alvo", () => {
    const a = contato({ id: "a", telefone: null });
    const b = contato({ id: "b", email: null });
    const l = linha(["email", "phone"], ["maria@x.com", "(64) 99944-6816"]);
    const c = ctx({ porEmail: a, porTelefone: b });
    expect(classificar(l, null, c, agressivo)).toMatchObject({ tipo: "revisar", motivo: "MERGE_HINT_EMAIL_PHONE_SPLIT" });
    const d = classificar(l, null, c, agressivo, { MERGE_HINT_EMAIL_PHONE_SPLIT: { acao: "UPDATE_EMAIL_CONTACT" } });
    expect(d).toMatchObject({ tipo: "importar", plano: { contato: { tipo: "atualizar", id: "a" } }, detalhe: { avisos: { telefone: "+5564999446816" } } });
  });

  it("B: telefone diferente — Conservador revisa, Padrão mantém, Substituir troca", () => {
    const l = linha(["email", "phone"], ["maria@x.com", "(11) 98888-7777"]);
    const c = ctx({ porEmail: contato() });
    expect(classificar(l, null, c, conservador)).toMatchObject({ tipo: "revisar", motivo: "MATCH_PHONE_DIFFERS" });
    const mantem = classificar(l, null, c, decisoesDoNivel("padrao"));
    expect(mantem).toMatchObject({ tipo: "importar", plano: { contato: { tipo: "atualizar", id: "c-1" } } });
    expect(mantem.tipo === "importar" && mantem.plano.contato.tipo === "atualizar" && mantem.plano.contato.mudancas.telefone).toBeFalsy();
    const troca = classificar(l, null, c, conservador, { MATCH_PHONE_DIFFERS: { acao: "OVERWRITE" } });
    expect(troca).toMatchObject({ plano: { contato: { mudancas: { telefone: "+5511988887777" } } } });
  });

  it("D: telefone com WhatsApp em andamento nunca é trocado pelo nível", () => {
    const l = linha(["email", "phone"], ["maria@x.com", "(11) 98888-7777"]);
    const c = ctx({ porEmail: contato(), whatsappAtivo: () => true });
    expect(classificar(l, null, c, agressivo)).toMatchObject({ tipo: "revisar", motivo: "PHONE_HAS_ACTIVE_WHATSAPP" });
    expect(classificar(l, null, c, agressivo, { PHONE_HAS_ACTIVE_WHATSAPP: { acao: "SKIP_PHONE_KEEP_REST" } })).toMatchObject({
      tipo: "importar",
      detalhe: { avisos: { telefone: "+5511988887777" } },
    });
  });

  it("B: campo preenchido diferente; 'Manter e atualizar marcados'; preencher vazios", () => {
    const l = linha(["email", "name", "custom:plano"], ["maria@x.com", "Maria Silva", "ouro"]);
    const c = ctx({ porEmail: contato({ campos: { plano: "prata" } }) });
    const revisar = classificar(l, null, c, decisoesDoNivel("padrao"));
    expect(revisar).toMatchObject({
      tipo: "revisar",
      motivo: "MATCH_OVERWRITE_FILLED_FIELD",
      detalhe: { campo: "nome", valorAtual: "Maria", valorDoArquivo: "Maria Silva", outrasDiferencas: [{ campo: "campo:plano" }] },
    });
    const marcados = classificar(l, null, c, conservador, {
      MATCH_OVERWRITE_FILLED_FIELD: { acao: "KEEP_DB", dados: { sobrescrever: ["campo:plano"] } },
    });
    expect(marcados).toMatchObject({ plano: { contato: { mudancas: { campos: { plano: "ouro" } } } } });
    expect(marcados.tipo === "importar" && marcados.plano.contato.tipo === "atualizar" && marcados.plano.contato.mudancas.nome).toBeFalsy();
    const vazio = classificar(linha(["email", "custom:plano"], ["maria@x.com", "ouro"]), null, ctx({ porEmail: contato() }), conservador);
    expect(vazio).toMatchObject({
      tipo: "importar",
      detalhe: { preenchimentos: [{ campo: "campo:plano", valor: "ouro" }] },
      plano: { contato: { mudancas: { campos: { plano: "ouro" } } } },
    });
  });

  it("o e-mail que é de outro contato é descartado com aviso", () => {
    const d = classificar(
      linha(["id", "email"], ["0b6f2d7e-1c3a-4e5b-8f9a-1b2c3d4e5f60", "outro@x.com"]),
      null,
      ctx({ porId: contato({ id: "0b6f2d7e-1c3a-4e5b-8f9a-1b2c3d4e5f60", email: null }), porEmail: contato({ id: "z" }) }),
      conservador,
    );
    expect(d).toMatchObject({ tipo: "importar", detalhe: { avisos: { email: "outro@x.com" } } });
  });

  describe("negócios", () => {
    const negocio = (extra: Partial<ContextoDoNegocio> = {}): ContextoDoNegocio => ({
      porId: null,
      abertoNaOrigem: () => null,
      origemPorNome: (nome) => (nome === "Funil A" ? "o-a" : null),
      etapaPorNome: (origem, nome) => (origem === "o-a" && nome === "Proposta" ? "e-a2" : null),
      primeiraEtapa: (origem) => (origem === "o-a" ? "e-a1" : "e-p1"),
      donoPorTexto: (texto) => (texto === "joao@x.com" ? "u-joao" : null),
      padrao: { origemId: "o-p", etapaId: "e-p2", status: "open", motivoDePerda: null },
      ...extra,
    });
    const cn = (extra: Partial<ContextoDoNegocio> = {}) => ctx({ tipo: "negocio", negocio: negocio(extra) });

    it("cria na origem e etapa padrão, com dono e título", () => {
      const d = classificar(linha(["name", "title", "owner"], ["Ana", "Site novo", "joao@x.com"], "negocio"), null, cn(), conservador);
      expect(d).toMatchObject({
        tipo: "importar",
        plano: { negocio: { tipo: "criar", origemId: "o-p", etapaId: "e-p2", titulo: "Site novo", donoId: "u-joao", status: "open" } },
      });
    });

    it("origem e etapa por nome; não achadas seguem as decisões", () => {
      const achada = classificar(linha(["name", "origin_name", "stage_name"], ["Ana", "Funil A", "Proposta"], "negocio"), null, cn(), conservador);
      expect(achada).toMatchObject({ plano: { negocio: { origemId: "o-a", etapaId: "e-a2" } } });
      const semEtapa = classificar(linha(["name", "origin_name", "stage_name"], ["Ana", "Funil A", "Xis"], "negocio"), null, cn(), decisoesDoNivel("padrao"));
      expect(semEtapa).toMatchObject({ plano: { negocio: { origemId: "o-a", etapaId: "e-a1" } } });
      const semOrigem = classificar(linha(["name", "origin_name"], ["Ana", "Funil Z"], "negocio"), null, cn(), conservador);
      expect(semOrigem).toMatchObject({ tipo: "revisar", motivo: "ORIGIN_NAME_NOT_FOUND", detalhe: { origemDoArquivo: "Funil Z" } });
      const escolhida = classificar(linha(["name", "origin_name"], ["Ana", "Funil Z"], "negocio"), null, cn(), conservador, {
        ORIGIN_NAME_NOT_FOUND: { acao: "PICK_MANUALLY", dados: { origemId: "o-a" } },
      });
      expect(escolhida).toMatchObject({ plano: { negocio: { origemId: "o-a", etapaId: "e-a1" } } });
    });

    it("valor inválido, negócio aberto repetido e perdido sem motivo", () => {
      const valor = classificar(linha(["name", "value"], ["Ana", "uns 2.000,50"], "negocio"), null, cn(), conservador, {
        DEAL_VALUE_INVALID: { acao: "CREATE_WITH_PARSED_VALUE" },
      });
      expect(valor).toMatchObject({ plano: { negocio: { valorCentavos: 200050 } } });
      const repetido = classificar(
        linha(["email"], ["maria@x.com"], "negocio"),
        null,
        { ...cn({ abertoNaOrigem: () => ({ id: "n-1", titulo: "Antigo", origemId: "o-p", campos: {} }) }), porEmail: contato() },
        decisoesDoNivel("agressivo"),
      );
      expect(repetido).toMatchObject({ plano: { negocio: { tipo: "atualizar", id: "n-1" } } });
      const perdido = classificar(linha(["name", "status"], ["Ana", "Perdido"], "negocio"), null, cn(), conservador);
      expect(perdido).toMatchObject({ plano: { negocio: { status: "lost", motivoDePerda: "other" } } });
    });
  });
});
