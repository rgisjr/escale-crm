import { z } from "zod";

import { normalizarTags } from "@/lib/contacts/tag-normalizada";

/**
 * A CRIAÇÃO DE NEGÓCIO POR DISPOSITIVO (fork Escale, Fase 3E; F1; Clint
 * `AutoDeal`, `index-BGmkH1Xr`). Regras puras: a forma das condições, a
 * validação com as frases da Clint e o casamento da mensagem.
 */
export const TIPOS_DE_MENSAGEM = ["igual", "comeca", "contem", "qualquer"] as const;
export type TipoDeMensagem = (typeof TIPOS_DE_MENSAGEM)[number];
/** Rótulos da Clint (`label.tEqual` etc.); quem mostra passa por `t()`. */
export const ROTULO_DO_TIPO_DE_MENSAGEM: Readonly<Record<TipoDeMensagem, string>> = {
  igual: "igual",
  comeca: "Começa com",
  contem: "Contém",
  qualquer: "Qualquer mensagem",
};
export const MENSAGENS_MAX = 10;
export const NOME_DA_CONDICAO_MAX = 35;
export const CONDICOES_MAX = 20;
export const TAGS_DA_CONDICAO_MAX = 10;

const uuid = z.string().uuid();
export const regraDeCriacaoSchema = z
  .object({
    id: z.string().min(1).max(40),
    nome: z.string().trim().min(1).max(NOME_DA_CONDICAO_MAX),
    tipo: z.enum(TIPOS_DE_MENSAGEM),
    mensagens: z.array(z.string().trim().min(1).max(500)).max(MENSAGENS_MAX),
    origem_id: uuid,
    etapa_id: uuid,
    tags: z.array(z.string().trim().min(1).max(40)).max(TAGS_DA_CONDICAO_MAX),
    manter_atendente: z.boolean(),
  })
  .strict()
  .refine((r) => r.tipo === "qualquer" || r.mensagens.length > 0, { message: "mensagens" });
export type RegraDeCriacao = z.infer<typeof regraDeCriacaoSchema>;

export const criacaoDeNegocioSchema = z
  .object({ ligado: z.boolean(), regras: z.array(regraDeCriacaoSchema).max(CONDICOES_MAX) })
  .strict()
  .refine((c) => !c.ligado || c.regras.length > 0, { message: "regras" });
export type CriacaoDeNegocio = z.infer<typeof criacaoDeNegocioSchema>;

/** O rascunho da tela: origem e etapa ainda vazias (""). */
export type RegraEmEdicao = Omit<RegraDeCriacao, "origem_id" | "etapa_id"> & {
  origem_id: string;
  etapa_id: string;
};
export type CriacaoEmEdicao = { ligado: boolean; regras: RegraEmEdicao[] };

export function novaRegra(numero: number): RegraEmEdicao {
  return {
    id: `regra-${Date.now().toString(36)}-${numero}`,
    nome: `Condição ${numero}`,
    tipo: "igual",
    mensagens: [],
    origem_id: "",
    etapa_id: "",
    tags: [],
    manter_atendente: false,
  };
}

/** Do banco: o que não passa no schema de hoje some (a condição inteira), sem quebrar a tela. */
export function lerCriacao(bruto: unknown): CriacaoDeNegocio {
  const b = (bruto ?? {}) as { ligado?: unknown; regras?: unknown };
  const regras = Array.isArray(b.regras)
    ? b.regras.flatMap((r) => {
        const lido = regraDeCriacaoSchema.safeParse(r);
        return lido.success ? [lido.data] : [];
      })
    : [];
  return { ligado: b.ligado === true, regras };
}

const FALTA = (campo: string, condicao: string, t: (s: string) => string) =>
  `${t("O campo")} ${t(campo)} ${t("é obrigatório em")} ${condicao}`;

export function validarCriacao(
  rascunho: CriacaoEmEdicao,
  t: (s: string) => string,
): { ok: true; valor: CriacaoDeNegocio } | { ok: false; erro: string; indice: number } {
  if (!rascunho.ligado) return { ok: true, valor: { ligado: false, regras: [] } };
  for (const [i, r] of rascunho.regras.entries()) {
    if (r.nome.trim().length > NOME_DA_CONDICAO_MAX)
      return {
        ok: false,
        erro: t("O número máximo de caracteres permitido para o nome da condição é de 35!"),
        indice: i,
      };
    if (r.tipo !== "qualquer" && r.mensagens.length === 0)
      return { ok: false, erro: FALTA("Quando receber uma mensagem que", r.nome, t), indice: i };
    if (!r.origem_id)
      return { ok: false, erro: FALTA("Criar negócio na origem", r.nome, t), indice: i };
    if (!r.etapa_id) return { ok: false, erro: FALTA("Na etapa", r.nome, t), indice: i };
  }
  const lido = criacaoDeNegocioSchema.safeParse({
    ligado: true,
    regras: rascunho.regras.map((r) => ({
      ...r,
      tags: normalizarTags(r.tags),
      mensagens: r.tipo === "qualquer" ? [] : r.mensagens,
    })),
  });
  return lido.success
    ? { ok: true, valor: lido.data }
    : { ok: false, erro: t("Ocorreu um erro ao salvar."), indice: 0 };
}

export function adicionarMensagem(
  lista: readonly string[],
  texto: string,
): { ok: true; lista: string[] } | { ok: false; erro: string } {
  const nova = texto.trim();
  if (!nova) return { ok: true, lista: [...lista] };
  if (lista.some((m) => m.trim().toLowerCase() === nova.toLowerCase()))
    return { ok: false, erro: "A mensagem já existe!" };
  if (lista.length >= MENSAGENS_MAX)
    return { ok: false, erro: "Você pode adicionar até 10 mensagens!" };
  return { ok: true, lista: [...lista, nova] };
}

/** Sem caixa, sem acento, sem espaço repetido. */
export const normalizarTexto = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

export function casaMensagem(
  regra: Pick<RegraDeCriacao, "tipo" | "mensagens">,
  texto: string,
): boolean {
  if (regra.tipo === "qualquer") return true;
  const alvo = normalizarTexto(texto);
  return regra.mensagens.some((m) => {
    const n = normalizarTexto(m);
    if (regra.tipo === "igual") return alvo === n;
    if (regra.tipo === "comeca") return alvo.startsWith(n);
    return alvo.includes(n);
  });
}

export const primeiraRegraQueCasa = (
  regras: readonly RegraDeCriacao[],
  texto: string,
): RegraDeCriacao | null => regras.find((r) => casaMensagem(r, texto)) ?? null;
