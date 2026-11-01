import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  casaComFiltro,
  caminhoDoComentario,
  comentarioDoEvento,
  dentroDoPrazo,
  problemasDoGatilho,
  sortearVariacao,
} from "@/lib/escale/comentarios/caminhos";
import { MAXIMO_DA_RESPOSTA } from "@/lib/escale/comentarios/constantes";
import {
  configDoPassoDoInstagramSchema,
  exigirConfigDoComentario,
  exigirGatilhoDoPassoDoInstagram,
  type CaminhoDoGatilho,
  type ConfigDoComentario,
  type FiltroDoCaminho,
} from "@/lib/escale/comentarios/schema";

/** Fase 10B: as regras puras do gatilho de comentário e do passo Instagram. */
const CANAL = "11111111-1111-4111-8111-111111111111";
const CONTATO = "22222222-2222-4222-8222-222222222222";

const pub = (id: string) => ({ id, legenda: null, miniatura: null, tipo: null });
const caminho = (id: string, publicacoes: string[], extra: Partial<CaminhoDoGatilho> = {}): CaminhoDoGatilho => ({
  id,
  publicacoes: publicacoes.map(pub),
  filtro: { modo: "qualquer" },
  resposta: null,
  ...extra,
});
const config = (extra: Partial<ConfigDoComentario> = {}): ConfigDoComentario => ({
  channel_session_id: CANAL,
  escopo: "todos",
  caminhos: [caminho("qualquer", [])],
  ...extra,
});
const evento = (publicacaoId: string, texto: string, canal = CANAL) => ({
  contact_id: CONTATO,
  channel_session_id: canal,
  plataforma: "instagram",
  conta_id: "acc-1",
  comentario: {
    id: "c-1",
    texto,
    comentado_em: "2026-11-01T10:00:00.000Z",
    publicacao_id: publicacaoId,
    publicacao_zernio_id: null,
    autor: { id: "u-1", usuario: "fulano", nome: "Fulano" },
  },
  publicacao: { legenda: null, miniatura: null, link: null },
});

describe("casaComFiltro", () => {
  it("qualquer comentário sempre casa", () => {
    expect(casaComFiltro("", { modo: "qualquer" })).toBe(true);
  });
  it("casa por palavra contida, sem caixa", () => {
    expect(casaComFiltro("Quero o LINK!", { modo: "palavras", palavras: ["link"], combinar: "qualquer" })).toBe(true);
  });
  it("todas exige as duas palavras, sem acento", () => {
    const f: FiltroDoCaminho = { modo: "palavras", palavras: ["quero", "preço"], combinar: "todas" };
    expect(casaComFiltro("quero saber", f)).toBe(false);
    expect(casaComFiltro("quero o PRECO", f)).toBe(true);
  });
  it("palavras só com espaço não casam", () => {
    expect(casaComFiltro("oi", { modo: "palavras", palavras: ["  "], combinar: "qualquer" })).toBe(false);
  });
});

describe("caminhoDoComentario", () => {
  it("conta diferente → null", () => {
    expect(caminhoDoComentario(config(), evento("1", "oi", "99999999-9999-4999-8999-999999999999"))).toBeNull();
  });
  it("todos → o caminho único, qualquer publicação", () => {
    expect(caminhoDoComentario(config(), evento("qualquer-post", "oi"))?.id).toBe("qualquer");
  });
  it("específicos → o caminho que tem a publicação", () => {
    const cfg = config({ escopo: "especificos", caminhos: [caminho("a", ["10"]), caminho("b", ["179"])] });
    expect(caminhoDoComentario(cfg, evento("179", "oi"))?.id).toBe("b");
  });
  it("publicação fora de todos os caminhos → null", () => {
    const cfg = config({ escopo: "especificos", caminhos: [caminho("a", ["10"])] });
    expect(caminhoDoComentario(cfg, evento("77", "oi"))).toBeNull();
  });
  it("filtro que não casa → null", () => {
    const cfg = config({
      caminhos: [caminho("qualquer", [], { filtro: { modo: "palavras", palavras: ["link"], combinar: "qualquer" } })],
    });
    expect(caminhoDoComentario(cfg, evento("1", "bom dia"))).toBeNull();
  });
  it("config ilegível → null", () => {
    expect(caminhoDoComentario({ foo: 1 }, evento("1", "oi"))).toBeNull();
    expect(caminhoDoComentario(null, evento("1", "oi"))).toBeNull();
  });
  it("payload sem channel_session_id → null", () => {
    expect(caminhoDoComentario(config(), { comentario: { publicacao_id: "1", texto: "oi" } })).toBeNull();
  });
  it("não exige contact_id válido (o contato ainda não existe)", () => {
    expect(caminhoDoComentario(config(), { ...evento("1", "oi"), contact_id: "" })?.id).toBe("qualquer");
  });
});

describe("comentarioDoEvento", () => {
  it("lê o payload completo e recusa o resto", () => {
    expect(comentarioDoEvento(evento("1", "oi"))?.comentario.id).toBe("c-1");
    expect(comentarioDoEvento({ contact_id: "x" })).toBeNull();
  });
});

describe("sortearVariacao e dentroDoPrazo", () => {
  it("sorteia pela posição", () => {
    expect(sortearVariacao(["a", "b"], () => 0.99)).toBe("b");
    expect(sortearVariacao(["a", "b"], () => 0)).toBe("a");
  });
  it("sem variação preenchida → null", () => {
    expect(sortearVariacao(["", " "])).toBeNull();
  });
  const agora = new Date("2026-11-10T12:00:00.000Z");
  it("6 dias e 23 h → dentro", () => {
    expect(dentroDoPrazo("2026-11-03T13:00:00.000Z", agora)).toBe(true);
  });
  it("7 dias e 1 min → fora", () => {
    expect(dentroDoPrazo("2026-11-03T11:59:00.000Z", agora)).toBe(false);
  });
  it("data inválida → fora", () => {
    expect(dentroDoPrazo("ontem", agora)).toBe(false);
  });
});

describe("problemasDoGatilho", () => {
  it("config válida → nenhum problema", () => {
    expect(problemasDoGatilho(config())).toEqual([]);
  });
  it("1 · sem conta", () => {
    expect(problemasDoGatilho(config({ channel_session_id: "" }))).toContain(
      "Selecione um dispositivo para ver as publicações.",
    );
  });
  it("2 · todos com dois caminhos ou com publicação", () => {
    expect(problemasDoGatilho(config({ caminhos: [caminho("a", []), caminho("b", [])] }))).toContain(
      "Revise a configuração do gatilho.",
    );
    expect(problemasDoGatilho(config({ caminhos: [caminho("a", ["1"])] }))).toContain(
      "Revise a configuração do gatilho.",
    );
  });
  it("3 · específicos sem caminho", () => {
    expect(problemasDoGatilho(config({ escopo: "especificos", caminhos: [] }))).toContain(
      "Adicione ao menos uma publicação ao gatilho.",
    );
  });
  it("4 · mais de 10 caminhos", () => {
    const caminhos = Array.from({ length: 11 }, (_, i) => caminho(`c${i}`, [String(i)]));
    expect(problemasDoGatilho(config({ escopo: "especificos", caminhos }))).toContain(
      "O gatilho aceita até 10 caminhos de publicação.",
    );
  });
  it("5 · caminho sem publicação", () => {
    expect(problemasDoGatilho(config({ escopo: "especificos", caminhos: [caminho("a", [])] }))).toContain(
      "Cada caminho precisa ter ao menos uma publicação.",
    );
  });
  it("6 · mais de 20 publicações", () => {
    const caminhos = [caminho("a", Array.from({ length: 21 }, (_, i) => String(i)))];
    expect(problemasDoGatilho(config({ escopo: "especificos", caminhos }))).toContain(
      "O gatilho aceita até 20 publicações.",
    );
  });
  it("7 · mesma publicação em dois caminhos", () => {
    const caminhos = [caminho("a", ["1"]), caminho("b", ["1"])];
    expect(problemasDoGatilho(config({ escopo: "especificos", caminhos }))).toContain(
      "Uma publicação só pode estar em um caminho.",
    );
  });
  it("8 · filtro de palavras sem palavra", () => {
    const c = config({
      caminhos: [caminho("qualquer", [], { filtro: { modo: "palavras", palavras: [" "], combinar: "qualquer" } })],
    });
    expect(problemasDoGatilho(c)).toContain(
      'Preencha a palavra do filtro de cada publicação ou use "Qualquer comentário".',
    );
  });
  it("9 · mais de 5 variações", () => {
    const c = config({
      caminhos: [caminho("qualquer", [], { resposta: { variacoes: ["a", "b", "c", "d", "e", "f"] } })],
    });
    expect(problemasDoGatilho(c)).toContain("Cada resposta aceita até 5 variações.");
  });
  it("10 · resposta sem variação preenchida", () => {
    const vazia = config({ caminhos: [caminho("qualquer", [], { resposta: { variacoes: [] } })] });
    const branca = config({ caminhos: [caminho("qualquer", [], { resposta: { variacoes: ["a", " "] } })] });
    expect(problemasDoGatilho(vazia)).toContain("Escreva a resposta ao comentário ou remova a resposta.");
    expect(problemasDoGatilho(branca)).toContain("Escreva a resposta ao comentário ou remova a resposta.");
  });
  it("11 · variação com mais de 300 caracteres", () => {
    const c = config({
      caminhos: [caminho("qualquer", [], { resposta: { variacoes: ["x".repeat(MAXIMO_DA_RESPOSTA + 1)] } })],
    });
    expect(problemasDoGatilho(c)).toContain("A resposta ao comentário aceita até 300 caracteres.");
  });
  it("não repete a mesma frase", () => {
    const c = config({ escopo: "especificos", caminhos: [caminho("a", []), caminho("b", [])] });
    const lista = problemasDoGatilho(c);
    expect(new Set(lista).size).toBe(lista.length);
  });
});

describe("schema do passo Instagram", () => {
  const botao = { titulo: "Ver", url: "https://escaleia.com" };
  it("aceita 1.000 caracteres sem botão", () => {
    expect(configDoPassoDoInstagramSchema.safeParse({ texto: "x".repeat(1000), botoes: [] }).success).toBe(true);
  });
  it("recusa 641 com botão", () => {
    const r = configDoPassoDoInstagramSchema.safeParse({ texto: "x".repeat(641), botoes: [botao] });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain("Com botão, a mensagem aceita até 640 caracteres.");
  });
  it("recusa título de 21, link http e 4 botões", () => {
    const base = { texto: "oi" };
    expect(
      configDoPassoDoInstagramSchema.safeParse({ ...base, botoes: [{ ...botao, titulo: "x".repeat(21) }] }).success,
    ).toBe(false);
    expect(
      configDoPassoDoInstagramSchema.safeParse({ ...base, botoes: [{ ...botao, url: "http://a.com" }] }).success,
    ).toBe(false);
    expect(configDoPassoDoInstagramSchema.safeParse({ ...base, botoes: [botao, botao, botao, botao] }).success).toBe(
      false,
    );
  });
});

describe("refinamentos do motor", () => {
  const regra = z
    .object({
      trigger_event: z.string().optional(),
      trigger_config: z.record(z.string(), z.unknown()).optional(),
      actions: z.array(z.object({ type: z.string() })).optional(),
    })
    .superRefine(exigirConfigDoComentario)
    .superRefine(exigirGatilhoDoPassoDoInstagram);

  it("comentário sem conta: a mensagem vai para trigger_config", () => {
    const r = regra.safeParse({ trigger_event: "comment.received", trigger_config: config({ channel_session_id: "" }) });
    expect(r.success).toBe(false);
    const issue = r.error?.issues.find((i) => i.message === "Selecione um dispositivo para ver as publicações.");
    expect(issue?.path).toEqual(["trigger_config"]);
  });
  it("config ilegível → pede para revisar o gatilho", () => {
    const r = regra.safeParse({ trigger_event: "comment.received", trigger_config: { x: 1 } });
    expect(r.error?.issues[0]?.message).toBe("Revise a configuração do gatilho.");
  });
  it("outro gatilho não é olhado", () => {
    expect(regra.safeParse({ trigger_event: "lead.won", trigger_config: {} }).success).toBe(true);
  });
  it("o passo Instagram só com o gatilho de comentário", () => {
    const acoes = [{ type: "send_instagram_message" }];
    expect(regra.safeParse({ trigger_event: "contact.tag_added", actions: acoes }).success).toBe(false);
    expect(regra.safeParse({ trigger_event: "comment.received", trigger_config: config(), actions: acoes }).success).toBe(
      true,
    );
  });
});
