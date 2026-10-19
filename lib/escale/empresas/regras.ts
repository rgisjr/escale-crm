/**
 * Regras puras das empresas da casca (Fase 2D): escopo, consulta, CNPJ,
 * colunas, nova empresa e o desfecho de remover um contato.
 */
import { z } from "zod";

import { isValidCnpj } from "@/lib/cobranca/documento";
import { formatCnpj, normalizeCnpj } from "@/lib/crm-b2b/normalize";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";

export const ESCOPOS_DE_EMPRESAS = ["todas", "com_nome", "sem_nome"] as const;
export type EscopoDeEmpresas = (typeof ESCOPOS_DE_EMPRESAS)[number];
export const ESCOPO_PADRAO: EscopoDeEmpresas = "com_nome";
export const ROTULO_DO_ESCOPO: Record<EscopoDeEmpresas, string> = {
  todas: "Todas as empresas",
  com_nome: "Com nome",
  sem_nome: "Sem nome",
};

/** Acima disso a Clint mostra "Refine a busca…". */
export const CONTAGEM_MAXIMA = 10_000;

export const consultaDaListaDeEmpresasSchema = z.object({
  q: z.string().trim().max(200).optional(),
  e: z.enum(ESCOPOS_DE_EMPRESAS).default(ESCOPO_PADRAO),
  p: z.coerce.number().int().min(1).max(1_000_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO),
  f: z.string().max(16384).optional(),
});
export type ConsultaDaListaDeEmpresas = z.infer<typeof consultaDaListaDeEmpresasSchema>;

/** `00.000.000/0000-00` enquanto digita (a máscara da Clint). */
export function mascaraDeCnpj(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 14);
  const partes = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 12), d.slice(12, 14)];
  let saida = partes[0] ?? "";
  if (partes[1]) saida += `.${partes[1]}`;
  if (partes[2]) saida += `.${partes[2]}`;
  if (partes[3]) saida += `/${partes[3]}`;
  if (partes[4]) saida += `-${partes[4]}`;
  return saida;
}

export function lerCnpj(texto: string | null | undefined): { ok: true; normalizado: string | null; formatado: string | null } | { ok: false } {
  const bruto = (texto ?? "").trim();
  if (!bruto) return { ok: true, normalizado: null, formatado: null };
  const normalizado = normalizeCnpj(bruto);
  if (!normalizado || !isValidCnpj(normalizado)) return { ok: false };
  return { ok: true, normalizado, formatado: formatCnpj(normalizado) };
}

export const COLUNAS_NATIVAS_DE_EMPRESAS = ["contato_principal", "segmento", "contatos", "valor_aberto", "negocios"] as const;
export type ColunaNativaDeEmpresa = (typeof COLUNAS_NATIVAS_DE_EMPRESAS)[number];
export const ROTULO_DA_COLUNA_DE_EMPRESA: Record<ColunaNativaDeEmpresa, string> = {
  contato_principal: "Contato principal",
  segmento: "Segmento",
  contatos: "Contatos",
  valor_aberto: "Valor em aberto",
  negocios: "Negócios",
};
/** As cinco nativas na tabela, como a Clint (`U`). */
export const COLUNAS_PADRAO_DE_EMPRESAS = COLUNAS_NATIVAS_DE_EMPRESAS.map((chave) => ({ tipo: "nativa" as const, chave }));
/** Campos do catálogo que já são colunas nativas e não aparecem em "Campos da empresa" (Clint `ea`). */
export const CAMPOS_QUE_SAO_COLUNAS = new Set(["nome", "segmento"]);

export const novaEmpresaSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().max(32).optional(),
  site: z.string().trim().max(300).optional(),
  contato_id: z.string().uuid(),
});
export type NovaEmpresa = z.infer<typeof novaEmpresaSchema>;

export type DesfechoDaRemocao = "simples" | "escolher_principal" | "ultimo";

export function desfechoDaRemocao(contatos: ReadonlyArray<{ id: string; principal: boolean }>, contatoId: string): DesfechoDaRemocao {
  const outros = contatos.filter((c) => c.id !== contatoId);
  if (outros.length === 0) return "ultimo";
  const alvo = contatos.find((c) => c.id === contatoId);
  return alvo?.principal ? "escolher_principal" : "simples";
}

/** Campo fixo da empresa → coluna de `companies`. */
export const COLUNA_DO_CAMPO_FIXO: Record<string, "trade_name" | "city" | "state" | "cnpj"> = {
  nome: "trade_name",
  cidade: "city",
  estado: "state",
  cnpj: "cnpj",
};

export function iniciaisDaEmpresa(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "?";
  const primeira = palavras[0]?.[0] ?? "";
  const ultima = palavras.length > 1 ? (palavras[palavras.length - 1]?.[0] ?? "") : "";
  return `${primeira}${ultima}`.toUpperCase();
}
