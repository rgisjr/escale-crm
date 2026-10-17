/**
 * CAMPOS OBRIGATÓRIOS NO MODELO DA CLINT (Fase 1F, D6; `RequiredFields` da Clint).
 *
 * Uma REGRA por campo + Quando:
 * - "Ao entrar" + Etapas → `obrigatorio_em.etapas` do original (servidor, todo caminho);
 * - "Ao sair" + Etapas → `escale_ao_sair` (só na tela e só ao avançar, decisão de 15/10);
 * - "Ao sair" + Status (Ganho/Perdido) → `obrigatorio_em.ao_ganhar`/`ao_perder` do original.
 *
 * "Todas as etapas" (`all`) é exclusiva, como na Clint. No "Ao entrar" ela vira
 * a lista das etapas abertas (o original só guarda uuids). No "Durante" fica
 * `all`, que vale também para etapa criada depois. Marcas em etapa arquivada
 * ficam guardadas: a pessoa não as vê e a gravação não as apaga.
 *
 * Os CAMPOS são do CRM (Fase 1F-a, migration 9006): `settings.fields` é a
 * projeção do catálogo da organização, então `camposDaOrigem` devolve todos
 * os campos do CRM. A REGRA (`obrigatorio_em`, `escale_ao_sair`) é desta origem.
 */
import { z } from "zod";

import { camposDoFunil } from "@/lib/leads/campos-do-funil";

import {
  CHAVE_DO_AO_SAIR,
  TODAS_AS_ETAPAS,
  comoRecord,
  ehUuid,
  lerConfiguracoesDoFork,
  textos,
} from "./tipos";

export const QUANDO = ["ao_sair", "ao_entrar"] as const;
export const STATUS_DA_REGRA = ["ganho", "perdido"] as const;
export const MAX_REGRAS = 50;

export const regraDeCampoSchema = z
  .object({
    campo: z.string().min(1).max(40),
    quando: z.enum(QUANDO),
    etapas: z.array(z.union([z.literal(TODAS_AS_ETAPAS), z.string().uuid()])).max(50),
    status: z.array(z.enum(STATUS_DA_REGRA)).max(2),
  })
  .strict();
export type RegraDeCampo = z.infer<typeof regraDeCampoSchema>;

export interface CampoDaOrigem {
  campo: string;
  rotulo: string;
  tipo: string;
  objeto: "Negócio";
}

export function camposDaOrigem(settings: unknown): CampoDaOrigem[] {
  return camposDoFunil(comoRecord(settings)).map((c) => ({
    campo: c.key,
    rotulo: c.label,
    tipo: c.type,
    objeto: "Negócio" as const,
  }));
}

const cobreTodas = (ids: readonly string[], abertas: readonly string[]) =>
  abertas.length > 0 && abertas.every((id) => ids.includes(id));

export function regrasDaOrigem(
  settings: unknown,
  etapasAbertas: readonly string[],
): RegraDeCampo[] {
  const { aoSair } = lerConfiguracoesDoFork(settings);
  const abertas = new Set(etapasAbertas);
  const regras: RegraDeCampo[] = [];
  for (const campo of camposDoFunil(comoRecord(settings))) {
    const entrar = (campo.obrigatorio_em?.etapas ?? []).filter((id) => abertas.has(id));
    if (entrar.length > 0) {
      regras.push({
        campo: campo.key,
        quando: "ao_entrar",
        etapas: cobreTodas(entrar, etapasAbertas) ? [TODAS_AS_ETAPAS] : entrar,
        status: [],
      });
    }
    const sair = (aoSair[campo.key] ?? []).filter(
      (id) => id === TODAS_AS_ETAPAS || abertas.has(id),
    );
    const status = [
      ...(campo.obrigatorio_em?.ao_ganhar ? (["ganho"] as const) : []),
      ...(campo.obrigatorio_em?.ao_perder ? (["perdido"] as const) : []),
    ];
    if (sair.length > 0 || status.length > 0) {
      regras.push({ campo: campo.key, quando: "ao_sair", etapas: sair, status: [...status] });
    }
  }
  return regras;
}

/** Os erros por linha (índice → texto da Clint). Vazio = pode salvar. */
export function errosDasRegras(regras: readonly RegraDeCampo[]): Record<number, string> {
  const erros: Record<number, string> = {};
  const vistas = new Set<string>();
  regras.forEach((r, i) => {
    const chave = `${r.campo}|${r.quando}`;
    if (vistas.has(chave)) erros[i] = "Este campo já possui uma regra deste tipo.";
    else if (r.quando === "ao_entrar" && r.etapas.length === 0)
      erros[i] = "Selecione ao menos uma etapa";
    else if (r.quando === "ao_sair" && r.etapas.length === 0 && r.status.length === 0) {
      erros[i] = "Selecione ao menos uma etapa ou status";
    }
    vistas.add(chave);
  });
  return erros;
}

export type VereditoDosCampos =
  { ok: true; fields: unknown[]; aoSair: Record<string, string[]> } | { ok: false; erro: string };

const unicos = (ids: readonly string[]) => [...new Set(ids)];

/** A lista de regras é a tabela INTEIRA: campo sem regra perde as marcas nas etapas vivas. */
export function gravarRegrasDosCampos(
  settings: unknown,
  regras: readonly RegraDeCampo[],
  etapasAbertas: readonly string[],
  etapasVivas: readonly string[],
): VereditoDosCampos {
  if (regras.length > MAX_REGRAS) {
    return {
      ok: false,
      erro: `Esta origem atingiu o limite de ${MAX_REGRAS} regras de campo obrigatório. Remova algumas para poder salvar.`,
    };
  }
  if (Object.keys(errosDasRegras(regras)).length > 0) {
    return { ok: false, erro: "Selecione ao menos uma etapa ou status para cada campo." };
  }
  const abertas = new Set(etapasAbertas);
  if (regras.some((r) => r.etapas.some((id) => id !== TODAS_AS_ETAPAS && !abertas.has(id)))) {
    return { ok: false, erro: "Escolha etapas desta origem." };
  }
  const s = comoRecord(settings);
  const brutos: unknown[] = Array.isArray(s.fields) ? s.fields : [];
  const chaves = new Set(
    brutos.map((b) => comoRecord(b).key).filter((k): k is string => typeof k === "string"),
  );
  if (regras.some((r) => !chaves.has(r.campo))) {
    return { ok: false, erro: "Esse campo não existe mais no CRM. Feche e abra de novo." };
  }

  const vivas = new Set(etapasVivas);
  const antigo = lerConfiguracoesDoFork(s).aoSair;
  const aoSair: Record<string, string[]> = {};
  const fields = brutos.map((bruto) => {
    const campo = comoRecord(bruto);
    const key = typeof campo.key === "string" ? campo.key : null;
    if (!key) return bruto;
    const entrarRegra = regras.find((r) => r.campo === key && r.quando === "ao_entrar");
    const regraAoSair = regras.find((r) => r.campo === key && r.quando === "ao_sair");
    const obrigatorio = comoRecord(campo.obrigatorio_em);
    const guardadas = textos(obrigatorio.etapas).filter((id) => ehUuid(id) && !vivas.has(id));
    const entrar = unicos([
      ...(entrarRegra?.etapas.includes(TODAS_AS_ETAPAS)
        ? etapasAbertas
        : (entrarRegra?.etapas ?? [])),
      ...guardadas,
    ]);
    const sairGuardadas = (antigo[key] ?? []).filter(
      (id) => id !== TODAS_AS_ETAPAS && !vivas.has(id),
    );
    const sair = regraAoSair?.etapas.includes(TODAS_AS_ETAPAS)
      ? [TODAS_AS_ETAPAS]
      : unicos([...(regraAoSair?.etapas ?? []), ...sairGuardadas]);
    if (sair.length > 0) aoSair[key] = sair;
    const gatilhos: Record<string, unknown> = {};
    if (entrar.length > 0) gatilhos.etapas = entrar;
    if (regraAoSair?.status.includes("ganho")) gatilhos.ao_ganhar = true;
    if (regraAoSair?.status.includes("perdido")) gatilhos.ao_perder = true;
    const proximo: Record<string, unknown> = { ...campo };
    delete proximo.obrigatorio_em;
    if (Object.keys(gatilhos).length > 0) proximo.obrigatorio_em = gatilhos;
    return proximo;
  });
  return { ok: true, fields, aoSair };
}

export { CHAVE_DO_AO_SAIR };
