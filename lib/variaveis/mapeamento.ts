/**
 * O MAPEAMENTO DAS VARIÁVEIS DE UM MODELO DA META (fork Escale, Frente V).
 *
 * Para cada `{{n}}` (o `slotKey` do contrato: "1", "header:1", "button0:1"),
 * de onde vem o valor: um campo da lista única (`[CONTACT.FIRST_NAME]`), com
 * um valor alternativo para quando o campo está vazio, ou um texto fixo. É o
 * que a janela "Modelo de mensagem" salva em `meta_templates.variaveis` e o
 * que a conversa, a campanha e o follow-up leem.
 *
 * Os slots de mídia (cabeçalho de imagem, vídeo, documento) ficam de fora:
 * o link continua em `saved_values` (0382).
 *
 * As regras do WhatsApp para texto fixo e a de botão (só campo) são as da
 * Clint (`component.TemplateVariables.*`, `MessageTemplateModal.buttonsBannerText`).
 */
import { z } from "zod";

import { slotKey } from "@/lib/channels/meta/build-components";
import type { ParamSlot, TemplateContract } from "@/lib/channels/meta/template-contract";
import { saudacaoDaHora } from "@/lib/campanhas/renderizador";

import { TOKEN_DA_SAUDACAO } from "./catalogo";
import { resolverTexto, type FontesDasVariaveis } from "./resolver";

/** Um token da lista única: `[CONTACT.FIRST_NAME]`, `[DEAL.PLANO]`. */
export const TOKEN_DE_CAMPO = /^\[[A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)+\]$/;

/** Os valores que as campanhas da 8B gravaram antes da Frente V. Continuam válidos. */
export const CAMPO_ANTIGO = /^(nome|primeiro_nome|saudacao|(contato|lead)\.[a-z][a-z0-9_]{0,39})$/;

export const campoValido = (campo: string): boolean =>
  TOKEN_DE_CAMPO.test(campo) || CAMPO_ANTIGO.test(campo) || campo === TOKEN_DA_SAUDACAO;

export const FIXO_MAX = 1024;
export const ALTERNATIVO_MAX = 200;

export const variavelDoModeloSchema = z.discriminatedUnion("fonte", [
  z
    .object({
      fonte: z.literal("campo"),
      campo: z.string().refine(campoValido, "campo desconhecido"),
      alternativo: z.string().trim().max(ALTERNATIVO_MAX).nullable().default(null),
    })
    .strict(),
  z.object({ fonte: z.literal("fixo"), valor: z.string().trim().min(1).max(FIXO_MAX) }).strict(),
]);
export type VariavelDoModelo = z.infer<typeof variavelDoModeloSchema>;

/** A chave do slot é a do `slotKey` do original: "1" (corpo), "header:1", "button0:1". */
export const CHAVE_DO_SLOT = /^[a-z0-9:_]{1,40}$/i;

export const mapeamentoSchema = z.record(z.string().regex(CHAVE_DO_SLOT), variavelDoModeloSchema);
export type MapeamentoDoModelo = Record<string, VariavelDoModelo>;

const MIDIA = new Set(["image", "video", "document"]);

export interface SlotDoMapeamento {
  /** A chave de `template_values` (e do mapeamento). */
  chave: string;
  /** Slot de botão: só aceita campo (a Meta exige valor que muda por contato). */
  botao: boolean;
  /** O texto em volta, para mostrar "…Olá {{1}}, estou…". */
  antes: string;
  depois: string;
  numero: string;
}

const ehBotao = (s: ParamSlot) =>
  s.address.kind === "button" || (s.address.kind === "card" && s.address.inner.kind === "button");

/** Os slots que o mapeamento cobre (sem os de mídia), na ordem do contrato. */
export function slotsDoMapeamento(contrato: TemplateContract): SlotDoMapeamento[] {
  return contrato.slots
    .filter((s) => !MIDIA.has(s.expects))
    .map((s) => ({
      chave: slotKey(s.address, s.key),
      botao: ehBotao(s),
      antes: s.contextBefore,
      depois: s.contextAfter,
      numero: s.key,
    }));
}

/**
 * O que o WhatsApp recusa num texto fixo (e no alternativo): quebra de linha,
 * tabulação, quatro ou mais espaços seguidos e mais de 1024 caracteres.
 */
export function erroDoTextoFixo(valor: string): string | null {
  if (valor.trim() === "") return "Digite o texto";
  if (/[\n\r\t]/.test(valor) || / {4,}/.test(valor) || valor.length > FIXO_MAX) {
    return "O WhatsApp recusa quebras de linha, tabulações, quatro ou mais espaços seguidos e textos acima de 1024 caracteres.";
  }
  return null;
}

/** Erro de UM slot (null = ok). Slot ainda sem definição não é erro: pode salvar. */
export function erroDoSlot(slot: SlotDoMapeamento, v: VariavelDoModelo | undefined): string | null {
  if (!v) return null;
  if (v.fonte === "fixo") {
    if (slot.botao) return "Variável de botão: aceita apenas campo da Escale, não aceita texto fixo.";
    return erroDoTextoFixo(v.valor);
  }
  if (!campoValido(v.campo)) return "Escolha o campo da Escale";
  if (v.alternativo && erroDoTextoFixo(v.alternativo)) return erroDoTextoFixo(v.alternativo);
  return null;
}

export type Validacao =
  | { ok: true; mapa: MapeamentoDoModelo }
  | { ok: false; erros: Record<string, string> };

/**
 * Confere o mapeamento contra o contrato. Chave que o modelo não tem é
 * recusada; mapeamento parcial passa ("Pode salvar agora. O envio libera
 * quando tudo estiver definido.").
 */
export function validarMapeamento(contrato: TemplateContract, bruto: unknown): Validacao {
  const lido = mapeamentoSchema.safeParse(bruto);
  if (!lido.success) return { ok: false, erros: { _: "mapeamento inválido" } };
  const slots = new Map(slotsDoMapeamento(contrato).map((s) => [s.chave, s]));
  const erros: Record<string, string> = {};
  for (const [chave, v] of Object.entries(lido.data)) {
    const slot = slots.get(chave);
    if (!slot) {
      erros[chave] = "este modelo não tem essa variável";
      continue;
    }
    const erro = erroDoSlot(slot, v);
    if (erro) erros[chave] = erro;
  }
  if (Object.keys(erros).length > 0) return { ok: false, erros };
  const mapa = Object.fromEntries(
    Object.entries(lido.data).map(([k, v]) =>
      v.fonte === "campo" ? [k, { ...v, alternativo: v.alternativo?.trim() ? v.alternativo.trim() : null }] : [k, v],
    ),
  );
  return { ok: true, mapa };
}

/** Todo slot (sem mídia) definido e válido. */
export function mapeamentoCompleto(contrato: TemplateContract, mapa: MapeamentoDoModelo): boolean {
  return slotsDoMapeamento(contrato).every((s) => {
    const v = mapa[s.chave];
    return v !== undefined && erroDoSlot(s, v) === null;
  });
}

/** O valor salvo é do contrato atual? (D12: o modelo editado na Meta invalida o mapa) */
export function mapeamentoAtual(
  contratoAtual: string,
  salvo: { variaveis: unknown; variaveis_contrato: string | null },
): MapeamentoDoModelo {
  if (!salvo.variaveis_contrato || salvo.variaveis_contrato !== contratoAtual) return {};
  const lido = mapeamentoSchema.safeParse(salvo.variaveis ?? {});
  return lido.success ? lido.data : {};
}

/** O campo antigo da campanha (`primeiro_nome`, `lead.x`) no token da lista única. */
export function tokenDoCampoAntigo(campo: string): string {
  if (campo === "nome") return "[CONTACT.NAME]";
  if (campo === "primeiro_nome") return "[CONTACT.FIRST_NAME]";
  if (campo === "saudacao") return TOKEN_DA_SAUDACAO;
  const m = /^(contato|lead)\.(.+)$/.exec(campo);
  if (m) return `[${m[1] === "lead" ? "DEAL" : "CONTACT"}.${m[2]!.toUpperCase()}]`;
  return campo;
}

/**
 * Os valores de cada slot para um contato. Campo vazio usa o alternativo; sem
 * alternativo, o slot vai para `faltando` (nunca sai com lacuna: a Meta recusa
 * parâmetro vazio, D8). A saudação só existe com `quando`.
 */
export function valoresDoMapeamento(
  contrato: TemplateContract,
  mapa: MapeamentoDoModelo,
  fontes: FontesDasVariaveis,
  quando?: { agora: Date; fuso: string },
): { valores: Record<string, string>; faltando: string[] } {
  const valores: Record<string, string> = {};
  const faltando: string[] = [];
  for (const slot of slotsDoMapeamento(contrato)) {
    const v = mapa[slot.chave];
    if (!v) {
      faltando.push(slot.chave);
      continue;
    }
    if (v.fonte === "fixo") {
      valores[slot.chave] = v.valor;
      continue;
    }
    const token = tokenDoCampoAntigo(v.campo);
    let valor: string | null = null;
    if (token === TOKEN_DA_SAUDACAO) {
      valor = quando ? saudacaoDaHora(quando.agora, quando.fuso) : null;
    } else {
      const r = resolverTexto(token, fontes, { vazio: "falta" });
      valor = r.faltando.length === 0 && r.desconhecidas.length === 0 && r.texto.trim() !== "" ? r.texto : null;
    }
    const alternativo = v.alternativo?.trim() ?? "";
    if (valor !== null) valores[slot.chave] = valor;
    else if (alternativo !== "") valores[slot.chave] = alternativo;
    else faltando.push(slot.chave);
  }
  return { valores, faltando };
}

export interface MapeamentoDaLinha {
  slots: SlotDoMapeamento[];
  /** O mapeamento salvo, só se for do contrato de hoje (D12). */
  variaveis: MapeamentoDoModelo;
  /** Havia mapeamento, mas o modelo mudou na Meta depois de salvo. */
  desatualizado: boolean;
}

/** O que as rotas de modelos devolvem para a tela, a partir da linha de `meta_templates`. */
export function mapeamentoDaLinha(
  contrato: TemplateContract,
  linha: { contract_hash: string; variaveis?: unknown; variaveis_contrato?: string | null },
): MapeamentoDaLinha {
  const salvo = { variaveis: linha.variaveis ?? {}, variaveis_contrato: linha.variaveis_contrato ?? null };
  const variaveis = mapeamentoAtual(linha.contract_hash, salvo);
  const tinha =
    salvo.variaveis !== null && typeof salvo.variaveis === "object" && Object.keys(salvo.variaveis).length > 0;
  return {
    slots: slotsDoMapeamento(contrato),
    variaveis,
    desatualizado: tinha && salvo.variaveis_contrato !== linha.contract_hash,
  };
}

interface LinhaDoFluxo {
  contract_hash: string;
  variaveis?: unknown;
  variaveis_contrato?: string | null;
  saved_values?: unknown;
}

/** Os links de mídia salvos (0382) que o contrato de hoje pede. `null` = falta algum. */
function linksDeMidia(contrato: TemplateContract, salvos: unknown): Record<string, string> | null {
  const mapa = salvos && typeof salvos === "object" ? (salvos as Record<string, unknown>) : {};
  const saida: Record<string, string> = {};
  for (const s of contrato.slots) {
    if (!MIDIA.has(s.expects)) continue;
    const chave = slotKey(s.address, s.key);
    const link = mapa[chave];
    if (typeof link !== "string" || link.trim() === "") return null;
    saida[chave] = link;
  }
  return saida;
}

/**
 * O fluxo de follow-up pode mandar este modelo sozinho? (Frente V, D6) Sem
 * variável, sempre; com variável, só com o mapeamento salvo completo e atual e
 * com o link de toda mídia salvo.
 */
export function modeloPodeSairNoFluxo(contrato: TemplateContract, linha: LinhaDoFluxo): boolean {
  if (contrato.slots.length === 0) return true;
  const mapa = mapeamentoAtual(linha.contract_hash, {
    variaveis: linha.variaveis ?? {},
    variaveis_contrato: linha.variaveis_contrato ?? null,
  });
  return mapeamentoCompleto(contrato, mapa) && linksDeMidia(contrato, linha.saved_values) !== null;
}

/**
 * Os valores do modelo para o envio do fluxo, ou o motivo de não sair (o passo
 * é pulado com ele: `variavel_sem_valor` quando o contato não tem o dado e não
 * há alternativo).
 */
export function valoresDoModeloDoFluxo(
  contrato: TemplateContract,
  linha: LinhaDoFluxo,
  fontes: FontesDasVariaveis,
  quando: { agora: Date; fuso: string },
): { ok: true; valores: Record<string, string> } | { ok: false; motivo: string } {
  if (!modeloPodeSairNoFluxo(contrato, linha)) {
    return {
      ok: false,
      motivo:
        "tem variáveis sem o mapeamento salvo em Conversas › Configurações › Modelos de mensagem (ou sem o link da mídia).",
    };
  }
  const mapa = mapeamentoAtual(linha.contract_hash, {
    variaveis: linha.variaveis ?? {},
    variaveis_contrato: linha.variaveis_contrato ?? null,
  });
  const r = valoresDoMapeamento(contrato, mapa, fontes, quando);
  if (r.faltando.length > 0) {
    return {
      ok: false,
      motivo: `tem variável sem valor para este contato (variavel_sem_valor: ${r.faltando.join(", ")}).`,
    };
  }
  return { ok: true, valores: { ...linksDeMidia(contrato, linha.saved_values), ...r.valores } };
}
