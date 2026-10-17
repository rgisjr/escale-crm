import { z } from "zod";

import { TIPOS_DE_LINK, chaveDoLink } from "@/lib/leads/links-de-contato";

/**
 * A LISTA DE CONTATOS DA CASCA (fork Escale, Fase 2A) — regras puras.
 * A tela é a da Clint (capturas 03-001 e 03-002); estas regras não leem banco.
 */

// ─── Visões prontas (Clint `ContactFilterPresets` + "Pessoais" do original) ───
export const VISOES_DE_CONTATOS = ["todos", "com_negocio", "sem_negocio", "pessoais"] as const;
export type VisaoDeContatos = (typeof VISOES_DE_CONTATOS)[number];
/** Rótulos em português; quem mostra passa por `t()` com o literal. */
export const ROTULO_DA_VISAO: Record<VisaoDeContatos, string> = {
  todos: "Todos os contatos",
  com_negocio: "Com negócio",
  sem_negocio: "Sem negócio",
  pessoais: "Pessoais",
};

// ─── Paginação ────────────────────────────────────────────────────────────────
export const POR_PAGINA = [10, 25, 50, 100] as const;
export const POR_PAGINA_PADRAO = 10;
/** Onde o "N por página" fica lembrado (a Clint guarda no navegador). */
export const CHAVE_DO_POR_PAGINA = "escale:contatos:por-pagina";

export function totalDePaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

/** As páginas do rodapé: 1–4 no começo, vizinhos no meio, as quatro últimas no fim. */
export function paginasVisiveis(atual: number, total: number): Array<number | "…"> {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (atual <= 3) return [1, 2, 3, 4, "…", total];
  if (atual >= total - 2) return [1, "…", total - 3, total - 2, total - 1, total];
  return [1, "…", atual - 1, atual, atual + 1, "…", total];
}

// ─── Telefone ───────────────────────────────────────────────────────────────
/** Os países do seletor da janela (Brasil primeiro, como a Clint). */
export const PAISES_DO_TELEFONE = [
  { sigla: "BR", ddi: "55" },
  { sigla: "PT", ddi: "351" },
  { sigla: "US", ddi: "1" },
  { sigla: "AR", ddi: "54" },
  { sigla: "CL", ddi: "56" },
  { sigla: "CO", ddi: "57" },
  { sigla: "MX", ddi: "52" },
  { sigla: "PY", ddi: "595" },
  { sigla: "UY", ddi: "598" },
  { sigla: "ES", ddi: "34" },
] as const;

/** "+5564999446816" → "(64) 99944-6816"; outro país → "+351 912345678". */
export function formatarTelefone(e164: string | null | undefined): string {
  if (!e164) return "";
  const brasil = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164);
  if (brasil) return `(${brasil[1]}) ${brasil[2]}-${brasil[3]}`;
  const outro = /^\+(\d{1,3})(\d+)$/.exec(e164);
  if (!outro) return e164;
  const pais = PAISES_DO_TELEFONE.find((p) => e164.startsWith(`+${p.ddi}`));
  const ddi = pais?.ddi ?? outro[1] ?? "";
  return `+${ddi} ${e164.slice(ddi.length + 1)}`;
}

/** País + número digitado → E.164 (o que o motor aceita), ou null se não fecha 8–15 dígitos. */
export function telefoneE164(ddi: string, numero: string): string | null {
  let digitos = numero.replace(/\D/g, "").replace(/^0+/, "");
  // Quem digita o código do país dentro do número (+55 64 …) não pode duplicá-lo.
  if (ddi === "55" && digitos.startsWith("55") && digitos.length >= 12) digitos = digitos.slice(2);
  if (!digitos) return null;
  if (ddi === "55" && digitos.length !== 10 && digitos.length !== 11) return null;
  const completo = `${ddi}${digitos}`;
  if (completo.length < 8 || completo.length > 15) return null;
  if (digitos.length < 8) return null;
  return `+${completo}`;
}

// ─── Instagram (o original guarda o link em custom_fields.link_instagram) ───
const USUARIO_DO_INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/;

/** "@usuario", "usuario" ou o link → "https://instagram.com/usuario"; vazio = null; inválido = false. */
export function linkDoInstagram(entrada: string): string | null | false {
  const bruto = entrada.trim();
  if (!bruto) return null;
  const doLink = /instagram\.com\/([^/?#]+)/i.exec(bruto);
  const usuario = (doLink?.[1] ?? bruto).replace(/^@/, "");
  return USUARIO_DO_INSTAGRAM.test(usuario) ? `https://instagram.com/${usuario}` : false;
}

/** O link guardado → "usuario" para a coluna; null se não é do Instagram. */
export function instagramDoLink(href: string | null | undefined): string | null {
  if (!href) return null;
  const m = /instagram\.com\/([^/?#]+)/i.exec(href);
  const usuario = m?.[1];
  return usuario && USUARIO_DO_INSTAGRAM.test(usuario) ? usuario : null;
}

// ─── Colunas (03-002) ─────────────────────────────────────────────────────────
export const COLUNAS_NATIVAS = [
  "contato",
  "tags",
  "negocios",
  "status",
  "ultima_atividade",
  "criado_em",
  "origem",
] as const;
export type ColunaNativa = (typeof COLUNAS_NATIVAS)[number];

export const ROTULO_DA_COLUNA: Record<ColunaNativa, string> = {
  contato: "Contato",
  tags: "Tags",
  negocios: "Negócios",
  status: "Status",
  ultima_atividade: "Última atividade",
  criado_em: "Criado em",
  origem: "Origem",
};

/** "Campos do contato" nesta fase: o nascimento e os links. A 2C traz os personalizados. */
export const CAMPOS_DO_CONTATO_2A: ReadonlyArray<{ chave: string; rotulo: string }> = [
  { chave: "nascimento", rotulo: "Data de nascimento" },
  ...TIPOS_DE_LINK.map((l) => ({ chave: chaveDoLink(l.id), rotulo: l.rotulo })),
];

export type ItemDeColuna =
  { tipo: "nativa"; chave: ColunaNativa } | { tipo: "campo"; chave: string };

export const COLUNAS_PADRAO: ItemDeColuna[] = [
  { tipo: "nativa", chave: "contato" },
  { tipo: "nativa", chave: "tags" },
  { tipo: "nativa", chave: "negocios" },
];
export const MAXIMO_DE_COLUNAS = 40;

const itemSchema = z.union([
  z.object({ tipo: z.literal("nativa"), chave: z.string() }),
  z.object({ tipo: z.literal("campo"), chave: z.string().regex(/^[a-z0-9_]{1,40}$/) }),
]);
/** O corpo guardado em `crm_colunas_das_listas.colunas`. */
export const colunasSchema = z
  .object({ itens: z.array(itemSchema).max(MAXIMO_DE_COLUNAS) })
  .strict();

export function chaveDoItem(item: ItemDeColuna): string {
  return `${item.tipo}:${item.chave}`;
}

/** A preferência guardada → lista limpa; ausente ou estragada → o padrão. */
export function lerColunas(guardado: unknown): ItemDeColuna[] {
  if (!guardado || typeof guardado !== "object") return COLUNAS_PADRAO;
  const itens = (guardado as { itens?: unknown }).itens;
  if (!Array.isArray(itens)) return COLUNAS_PADRAO;
  const vistos = new Set<string>();
  const saida: ItemDeColuna[] = [];
  for (const bruto of itens) {
    const lido = itemSchema.safeParse(bruto);
    if (!lido.success) continue;
    const item = lido.data;
    if (item.tipo === "nativa" && !(COLUNAS_NATIVAS as readonly string[]).includes(item.chave))
      continue;
    const chave = `${item.tipo}:${item.chave}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(item as ItemDeColuna);
    if (saida.length === MAXIMO_DE_COLUNAS) break;
  }
  return saida;
}

export function mesmasColunas(a: readonly ItemDeColuna[], b: readonly ItemDeColuna[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, i) => chaveDoItem(item) === (b[i] ? chaveDoItem(b[i]) : ""))
  );
}
