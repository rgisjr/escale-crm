import { describe, expect, it } from "vitest";

import {
  REGRAS,
  acaoValida,
  contagemDasDecisoes,
  decisaoDe,
  decisoesComAjustes,
  decisoesDoNivel,
  nivelDasDecisoes,
  opcoesDaSituacao,
  situacoesAjustaveis,
  situacoesTravadas,
  type ColunaMapeada,
} from "@/lib/escale/importacao/regras";
import { ROTULO_DO_MOTIVO, rotuloDaAcao } from "@/lib/escale/importacao/textos";

const mapa = (...para: string[]): ColunaMapeada[] => para.map((p, i) => ({ csv: `c${i}`, para: p }));

describe("regras do importador (Fase 2F)", () => {
  it("o print v2-10: Negócios com Telefone e Email — 2/6, 4/4 e 6/2", () => {
    const m = mapa("phone", "email", "none");
    expect(contagemDasDecisoes(decisoesDoNivel("conservador"), "negocio", m)).toMatchObject({ auto: 2, revisar: 6, travadas: 1 });
    expect(contagemDasDecisoes(decisoesDoNivel("padrao"), "negocio", m)).toMatchObject({ auto: 4, revisar: 4 });
    expect(contagemDasDecisoes(decisoesDoNivel("agressivo"), "negocio", m)).toMatchObject({ auto: 6, revisar: 2 });
  });

  it("Contatos não vê as situações de negócio; o campo não mapeado some", () => {
    const so = situacoesAjustaveis("contato", mapa("email", "name"));
    expect(so).toContain("MATCH_FILL_EMPTY_FIELDS");
    expect(so).not.toContain("DEAL_VALUE_INVALID");
    expect(so).not.toContain("INVALID_PHONE_FORMAT");
    expect(situacoesTravadas("contato", mapa("email", "name"))).toEqual([]);
    expect(situacoesTravadas("contato", mapa("email", "phone"))).toEqual(["MERGE_HINT_EMAIL_PHONE_SPLIT"]);
    expect(situacoesAjustaveis("negocio", mapa("stage_name"))).toContain("STAGE_NAME_NOT_FOUND");
    expect(situacoesAjustaveis("negocio", mapa("title"))).not.toContain("STAGE_NAME_NOT_FOUND");
  });

  it("o nível nasce das decisões; mexer vira personalizado", () => {
    const m = mapa("phone", "email");
    expect(nivelDasDecisoes(decisoesDoNivel("padrao"), "contato", m)).toBe("padrao");
    const ajustada = decisoesComAjustes("conservador", { MATCH_PHONE_DIFFERS: "OVERWRITE" });
    expect(nivelDasDecisoes(ajustada, "contato", m)).toBe("personalizado");
    expect(decisoesComAjustes("conservador", { MATCH_PHONE_DIFFERS: "UPDATE" }).MATCH_PHONE_DIFFERS).toBe("PENDING_REVIEW");
  });

  it("a decisão de cada motivo: duro descarta, travado revisa, o resto segue as decisões", () => {
    expect(decisaoDe("INVALID_EMAIL_FORMAT", {})).toBe("SKIP_ROW");
    expect(decisaoDe("MERGE_HINT_EMAIL_PHONE_SPLIT", {})).toBe("PENDING_REVIEW");
    expect(decisaoDe("MATCH_FILL_EMPTY_FIELDS", decisoesDoNivel("conservador"))).toBe("UPDATE");
    expect(decisaoDe("PHONE_HAS_ACTIVE_WHATSAPP", decisoesDoNivel("agressivo"))).toBe("PENDING_REVIEW");
    expect(decisaoDe("DEAL_ID_NOT_FOUND", {})).toBe("PENDING_REVIEW");
  });

  it("ações válidas e os botões de cada situação", () => {
    expect(acaoValida("MERGE_HINT_EMAIL_PHONE_SPLIT", "MERGE_CONTACTS")).toBe(false);
    expect(acaoValida("ORIGIN_NAME_NOT_FOUND", "PICK_MANUALLY")).toBe(true);
    expect(acaoValida("ORIGIN_NAME_NOT_FOUND", "OVERWRITE")).toBe(false);
    expect(opcoesDaSituacao("ORIGIN_NAME_NOT_FOUND")).toEqual(["USE_DEFAULT", "SKIP_ROW", "PENDING_REVIEW"]);
    expect(REGRAS.DUPLICATE_IN_BATCH.gravidade).toBe("HARD");
  });

  it("os textos da Clint, com a Escale OS no lugar da Clint", () => {
    expect(ROTULO_DO_MOTIVO.MERGE_HINT_EMAIL_PHONE_SPLIT.descricao).toContain("A Escale OS não decide sozinha.");
    expect(rotuloDaAcao("CREATE_NEW", "DEAL_DUPLICATE_OPEN").rotulo).toBe("Criar novo negócio");
    expect(rotuloDaAcao("CREATE_NEW", "DEAL_DUPLICATE_OPEN").curto).toBe("Criar");
    expect(rotuloDaAcao("SKIP_PHONE_KEEP_REST", "INVALID_PHONE_FORMAT").curto).toBe("Sem telefone");
  });
});
