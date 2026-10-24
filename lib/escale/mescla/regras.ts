import { z } from "zod";

import { chaveDeTelefone } from "@/lib/contacts/duplicados";

/**
 * AS REGRAS DA MESCLA DA CASCA (fork Escale, Fase 2E; C2; Clint `DuplicateContactsV2`
 * e `scoreTier`). Puras: rodam igual no servidor e no teste. As sugestões são
 * calculadas na hora (Q7): o banco devolve as chaves que repetem, aqui se agrupa
 * (união), se pontua (N10), se filtra e se ordena. A escolha por campo manda ids,
 * nunca valores (N11).
 */

// ─── Critérios e confiança ───────────────────────────────────────────────────
export const REGRAS_DE_MESCLA = ["whatsapp", "telefone", "email", "instagram", "nome", "empresa"] as const;
export type RegraDeMescla = (typeof REGRAS_DE_MESCLA)[number];

export const ROTULO_DA_REGRA: Readonly<Record<RegraDeMescla, string>> = {
  whatsapp: "ID do WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  instagram: "Instagram",
  nome: "Nome",
  empresa: "Organização",
};

export const PESO_DA_REGRA: Readonly<Record<RegraDeMescla, number>> = {
  whatsapp: 0.95,
  telefone: 0.9,
  email: 0.85,
  instagram: 0.7,
  nome: 0.35,
  empresa: 0.2,
};

export const PESO_DO_CONFLITO: Readonly<Partial<Record<RegraDeMescla, number>>> = {
  telefone: 0.3,
  email: 0.15,
  instagram: 0.15,
};

/** 0 a 100: `1 − Π(1 − peso)` dos que casaram, menos a soma dos conflitos. */
export function confianca(casou: readonly RegraDeMescla[], conflitos: readonly RegraDeMescla[]): number {
  const junta = 1 - casou.reduce((acc, r) => acc * (1 - PESO_DA_REGRA[r]), 1);
  const menos = conflitos.reduce((acc, r) => acc + (PESO_DO_CONFLITO[r] ?? 0), 0);
  return Math.round(Math.min(1, Math.max(0, junta - menos)) * 100);
}

export const FAIXA_ALTA = 85;
export const FAIXA_MEDIA = 65;
export type FaixaDeConfianca = "alta" | "media" | "baixa";
export const ROTULO_DA_FAIXA: Readonly<Record<FaixaDeConfianca, string>> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function faixaDaConfianca(pct: number): FaixaDeConfianca {
  if (pct >= FAIXA_ALTA) return "alta";
  if (pct >= FAIXA_MEDIA) return "media";
  return "baixa";
}

// ─── Sugestões ───────────────────────────────────────────────────────────────
export interface ContatoDaMescla {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  /** O link do Instagram como está no contato (`custom_fields.link_instagram`). */
  instagram: string | null;
  whatsapp: string | null;
  empresa: { id: string; nome: string } | null;
  tags: string[];
  criado_em: string;
  atualizado_em: string;
  atendimento_ativo: boolean;
}

/** O que `fn_escale_chaves_de_mescla` devolve: só as chaves que repetem. */
export interface ChaveDeMescla {
  contato_id: string;
  regra: "whatsapp" | "telefone" | "email" | "instagram";
  chave: string;
}

export interface Sugestao {
  /** O menor id do grupo: estável entre chamadas. */
  chave: string;
  /** O mais antigo primeiro. */
  contatos: ContatoDaMescla[];
  casou: RegraDeMescla[];
  conflitos: RegraDeMescla[];
  confianca: number;
  /** Dois ou mais com atendimento ativo (N12). */
  bloqueada: boolean;
  /** O `criado_em` mais novo do grupo ("Mais recentes"). */
  criada_em: string;
}

export const MAX_CONTATOS_DO_GRUPO = 20;

const normalizarNome = (nome: string | null): string =>
  (nome ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const valoresDistintos = (valores: Array<string | null>): Set<string> =>
  new Set(valores.filter((v): v is string => !!v));

const ordemDasRegras = (regras: Set<RegraDeMescla>): RegraDeMescla[] =>
  REGRAS_DE_MESCLA.filter((r) => regras.has(r)).sort(
    (a, b) => PESO_DA_REGRA[b] - PESO_DA_REGRA[a],
  );

export function montarSugestoes(
  chaves: readonly ChaveDeMescla[],
  contatos: ReadonlyMap<string, ContatoDaMescla>,
): Sugestao[] {
  const pai = new Map<string, string>();
  const raiz = (id: string): string => {
    let atual = id;
    while (pai.get(atual) !== atual) {
      const acima = pai.get(atual)!;
      pai.set(atual, pai.get(acima)!);
      atual = pai.get(atual)!;
    }
    return atual;
  };
  const porChave = new Map<string, string[]>();
  for (const c of chaves) {
    if (!contatos.has(c.contato_id)) continue;
    pai.set(c.contato_id, c.contato_id);
    const k = `${c.regra}:${c.chave}`;
    porChave.set(k, [...(porChave.get(k) ?? []), c.contato_id]);
  }
  const regrasDoContato = new Map<string, Set<RegraDeMescla>>();
  for (const [k, ids] of porChave) {
    const regra = k.slice(0, k.indexOf(":")) as RegraDeMescla;
    for (let i = 1; i < ids.length; i++) {
      const ra = raiz(ids[0]!);
      const rb = raiz(ids[i]!);
      if (ra !== rb) pai.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
    }
    for (const id of ids) regrasDoContato.set(id, (regrasDoContato.get(id) ?? new Set()).add(regra));
  }

  const grupos = new Map<string, ContatoDaMescla[]>();
  for (const id of pai.keys()) {
    const r = raiz(id);
    grupos.set(r, [...(grupos.get(r) ?? []), contatos.get(id)!]);
  }

  const lista: Sugestao[] = [];
  for (const membros of grupos.values()) {
    if (membros.length < 2 || membros.length > MAX_CONTATOS_DO_GRUPO) continue;
    const ordenados = [...membros].sort(
      (a, b) => a.criado_em.localeCompare(b.criado_em) || a.id.localeCompare(b.id),
    );
    const casou = new Set<RegraDeMescla>();
    for (const m of ordenados) for (const r of regrasDoContato.get(m.id) ?? []) casou.add(r);
    const nomes = ordenados.map((m) => normalizarNome(m.nome));
    if (nomes[0] && nomes.every((n) => n === nomes[0])) casou.add("nome");
    const empresas = ordenados.map((m) => m.empresa?.id ?? "");
    if (empresas[0] && empresas.every((e) => e === empresas[0])) casou.add("empresa");

    const conflitos = new Set<RegraDeMescla>();
    if (valoresDistintos(ordenados.map((m) => chaveDeTelefone(m.telefone) || null)).size > 1) conflitos.add("telefone");
    if (valoresDistintos(ordenados.map((m) => m.email?.trim().toLowerCase() || null)).size > 1) conflitos.add("email");
    if (valoresDistintos(ordenados.map((m) => m.instagram?.trim().toLowerCase() || null)).size > 1) conflitos.add("instagram");

    const regrasCasou = ordemDasRegras(casou);
    const regrasConflito = ordemDasRegras(conflitos);
    lista.push({
      chave: [...ordenados].map((m) => m.id).sort()[0]!,
      contatos: ordenados,
      casou: regrasCasou,
      conflitos: regrasConflito,
      confianca: confianca(regrasCasou, regrasConflito),
      bloqueada: ordenados.filter((m) => m.atendimento_ativo).length >= 2,
      criada_em: ordenados.reduce((max, m) => (m.criado_em > max ? m.criado_em : max), ordenados[0]!.criado_em),
    });
  }
  return lista;
}

// ─── Consulta, filtro e ordem ────────────────────────────────────────────────
export const ORDENS_DA_MESCLA = ["maior_confianca", "menor_confianca", "mais_recentes", "mais_antigas"] as const;
export type OrdemDaMescla = (typeof ORDENS_DA_MESCLA)[number];
export const ROTULO_DA_ORDEM: Readonly<Record<OrdemDaMescla, string>> = {
  maior_confianca: "Maior confiança",
  menor_confianca: "Menor confiança",
  mais_recentes: "Mais recentes",
  mais_antigas: "Mais antigas",
};

const listaDaUrl = <T extends string>(valores: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((v) => v.trim()).filter(Boolean) : []))
    .pipe(z.array(z.enum(valores as unknown as [T, ...T[]])));

export const consultaDeSugestoesSchema = z.object({
  q: z.string().trim().max(120).default(""),
  ordem: z.enum(ORDENS_DA_MESCLA).default("maior_confianca"),
  regras: listaDaUrl(REGRAS_DE_MESCLA),
  min: z.coerce.number().int().min(0).max(100).default(0),
  max: z.coerce.number().int().min(0).max(100).default(100),
  tags: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((v) => v.trim()).filter(Boolean) : [])),
  validos: z
    .enum(["1"])
    .optional()
    .transform((v) => v === "1"),
  contato: z.string().uuid().optional(),
  p: z.coerce.number().int().min(1).default(1),
  n: z.coerce.number().int().min(0).max(50).default(20),
});
export type ConsultaDeSugestoes = z.infer<typeof consultaDeSugestoesSchema>;

const digitos = (s: string | null) => (s ?? "").replace(/\D/g, "");
const telefoneValido = (s: string | null) => {
  const d = digitos(s);
  return d.length >= 10 && d.length <= 15;
};

export function filtrarSugestoes(lista: readonly Sugestao[], c: ConsultaDeSugestoes): Sugestao[] {
  const termo = normalizarNome(c.q);
  const termoDigitos = digitos(c.q);
  return lista.filter((s) => {
    if (c.contato && !s.contatos.some((m) => m.id === c.contato)) return false;
    if (s.confianca < c.min || s.confianca > c.max) return false;
    if (c.regras.length > 0 && !c.regras.some((r) => s.casou.includes(r))) return false;
    if (c.tags.length > 0 && !s.contatos.some((m) => m.tags.some((t) => c.tags.includes(t)))) return false;
    if (c.validos && s.contatos.some((m) => m.telefone && !telefoneValido(m.telefone))) return false;
    if (!termo) return true;
    return s.contatos.some(
      (m) =>
        normalizarNome(m.nome).includes(termo) ||
        (termoDigitos.length >= 4 && digitos(m.telefone).includes(termoDigitos)),
    );
  });
}

export function ordenarSugestoes(lista: readonly Sugestao[], ordem: OrdemDaMescla): Sugestao[] {
  const desempate = (a: Sugestao, b: Sugestao) => a.chave.localeCompare(b.chave);
  const copia = [...lista];
  switch (ordem) {
    case "maior_confianca":
      return copia.sort((a, b) => b.confianca - a.confianca || desempate(a, b));
    case "menor_confianca":
      return copia.sort((a, b) => a.confianca - b.confianca || desempate(a, b));
    case "mais_recentes":
      return copia.sort((a, b) => b.criada_em.localeCompare(a.criada_em) || desempate(a, b));
    case "mais_antigas":
      return copia.sort((a, b) => a.criada_em.localeCompare(b.criada_em) || desempate(a, b));
  }
}

// ─── Escolha por campo (N11) ─────────────────────────────────────────────────
export const CAMPOS_DA_MESCLA = ["nome", "email", "telefone", "instagram", "empresa"] as const;
export type CampoDaMescla = (typeof CAMPOS_DA_MESCLA)[number];
export const ROTULO_DO_CAMPO_DA_MESCLA: Readonly<Record<CampoDaMescla, string>> = {
  nome: "Nome",
  email: "E-mail",
  telefone: "Telefone",
  instagram: "Instagram",
  empresa: "Organização",
};

/** Campo → id do contato cujo valor fica. */
export type Escolhas = Partial<Record<CampoDaMescla, string>>;

export function valorDoCampo(c: ContatoDaMescla, campo: CampoDaMescla): string | null {
  const bruto = campo === "empresa" ? (c.empresa?.nome ?? null) : c[campo];
  return bruto?.trim() ? bruto : null;
}

export function escolhasPadrao(contatos: readonly ContatoDaMescla[]): Escolhas {
  const escolhas: Escolhas = {};
  for (const campo of CAMPOS_DA_MESCLA) {
    const dono = contatos.find((c) => valorDoCampo(c, campo) !== null);
    if (dono) escolhas[campo] = dono.id;
  }
  return escolhas;
}

export type EstadoDoCampo = "igual" | "unico" | "decidir" | "vazio";

export function estadoDoCampo(contatos: readonly ContatoDaMescla[], campo: CampoDaMescla): EstadoDoCampo {
  const comValor = contatos.map((c) => valorDoCampo(c, campo)).filter((v): v is string => v !== null);
  if (comValor.length === 0) return "vazio";
  if (comValor.length === 1) return "unico";
  const chave = (v: string) => (campo === "telefone" ? chaveDeTelefone(v) : v.trim().toLowerCase());
  return new Set(comValor.map(chave)).size === 1 && comValor.length === contatos.length ? "igual" : "decidir";
}

export function contatoResultante(
  contatos: readonly ContatoDaMescla[],
  escolhas: Escolhas,
): Record<CampoDaMescla, string | null> {
  const resultado = {} as Record<CampoDaMescla, string | null>;
  for (const campo of CAMPOS_DA_MESCLA) {
    const dono = contatos.find((c) => c.id === escolhas[campo]);
    resultado[campo] = dono ? valorDoCampo(dono, campo) : null;
  }
  return resultado;
}

/** O principal (o registro que fica) é o dono do nome escolhido; sem escolha, o mais antigo. */
export function principalDasEscolhas(contatos: readonly ContatoDaMescla[], escolhas: Escolhas): string {
  return contatos.find((c) => c.id === escolhas.nome)?.id ?? contatos[0]!.id;
}

// ─── Mescla em massa ─────────────────────────────────────────────────────────
export const PRIORIDADES = [
  "criado_por_ultimo",
  "criado_por_primeiro",
  "atualizado_por_ultimo",
  "atualizado_por_primeiro",
] as const;
export type Prioridade = (typeof PRIORIDADES)[number];
export const ROTULO_DA_PRIORIDADE: Readonly<Record<Prioridade, string>> = {
  criado_por_ultimo: "Adicionado por último",
  criado_por_primeiro: "Adicionado por primeiro",
  atualizado_por_ultimo: "Atualizado por último",
  atualizado_por_primeiro: "Atualizado por primeiro",
};

export function principalPorPrioridade(contatos: readonly ContatoDaMescla[], prioridade: Prioridade): string {
  const campo = prioridade.startsWith("criado") ? "criado_em" : "atualizado_em";
  const maisNovo = prioridade.endsWith("ultimo");
  return [...contatos].sort((a, b) => {
    const ordem = a[campo].localeCompare(b[campo]);
    return (maisNovo ? -ordem : ordem) || a.id.localeCompare(b.id);
  })[0]!.id;
}

export const MAX_GRUPOS_EM_MASSA = 100;

export const mesclarSchema = z
  .object({
    principal_id: z.string().uuid(),
    secundarios: z.array(z.string().uuid()).min(1).max(MAX_CONTATOS_DO_GRUPO - 1),
    // zod 4: `z.record` com enum exige TODAS as chaves; `partialRecord` aceita só algumas.
    escolhas: z.partialRecord(z.enum(CAMPOS_DA_MESCLA), z.string().uuid()).default({}),
  })
  .strict()
  .refine((m) => !m.secundarios.includes(m.principal_id), { path: ["secundarios"] })
  .refine((m) => new Set(m.secundarios).size === m.secundarios.length, { path: ["secundarios"] })
  .refine(
    (m) => Object.values(m.escolhas).every((id) => id === m.principal_id || m.secundarios.includes(id)),
    { path: ["escolhas"] },
  );
export type PedidoDeMescla = z.infer<typeof mesclarSchema>;

export const mesclarEmMassaSchema = z
  .object({
    grupos: z
      .array(z.array(z.string().uuid()).min(2).max(MAX_CONTATOS_DO_GRUPO))
      .min(1)
      .max(MAX_GRUPOS_EM_MASSA),
    prioridade: z.enum(PRIORIDADES),
  })
  .strict();
export type PedidoDeMesclaEmMassa = z.infer<typeof mesclarEmMassaSchema>;
