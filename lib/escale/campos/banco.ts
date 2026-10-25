/**
 * O catálogo de campos no banco (Fase 2C). O negócio mora em
 * `crm_campos_do_negocio` (gatilhos da 9006), contato e empresa em
 * `crm_campos_do_crm`; os grupos dos três em `crm_grupos_de_campos`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { CAMPOS_DO_CRM_MAX } from "@/lib/schemas/settings";

import {
  type CampoDoCatalogo,
  type Catalogo,
  GRUPOS_MAX,
  GRUPO_PADRAO,
  type GrupoDeCampos,
  OBJETOS_DE_CAMPO,
  type ObjetoDeCampo,
  PAPEIS_DE_VISIBILIDADE,
  TIPOS_DA_CLINT,
  chaveDoNome,
  tipoDoMotor,
} from "./regras";

type SB = SupabaseClient;

export class ErroDoCatalogo extends Error {
  constructor(
    public readonly codigo: "nome_repetido" | "grupo_sumiu" | "limite" | "padrao" | "nao_encontrado" | "opcoes",
  ) {
    super(codigo);
  }
}

const tabelaDe = (objeto: ObjetoDeCampo) => (objeto === "negocio" ? "crm_campos_do_negocio" : "crm_campos_do_crm");

// Só `crm_campos_do_crm` (9104) tem `padrao`; o catálogo do negócio (9006) não tem campo padrão.
const colunasDe = (objeto: ObjetoDeCampo): string =>
  objeto === "negocio" ? "id, chave, definicao, grupo_id, papel_minimo, posicao" : "id, chave, definicao, grupo_id, papel_minimo, posicao, padrao";

function linhaParaCampo(objeto: ObjetoDeCampo, l: Record<string, unknown>): CampoDoCatalogo {
  return {
    id: String(l.id),
    objeto,
    chave: String(l.chave),
    definicao: l.definicao as CampoDoCatalogo["definicao"],
    grupo_id: (l.grupo_id as string | null) ?? null,
    papel_minimo: (l.papel_minimo as CampoDoCatalogo["papel_minimo"]) ?? null,
    posicao: Number(l.posicao ?? 0),
    padrao: Boolean(l.padrao),
  };
}

export async function lerCatalogo(sb: SB, orgId: string, objeto: ObjetoDeCampo): Promise<Catalogo> {
  // Grupos e campos não dependem um do outro: lidos ao mesmo tempo.
  let consulta = sb.from(tabelaDe(objeto)).select(colunasDe(objeto)).eq("organization_id", orgId);
  if (objeto !== "negocio") consulta = consulta.eq("objeto", objeto);
  const [grupos, campos] = await Promise.all([
    sb
      .from("crm_grupos_de_campos")
      .select("id, chave, nome, posicao, padrao")
      .eq("organization_id", orgId)
      .eq("objeto", objeto)
      .order("posicao")
      .order("nome"),
    consulta.order("posicao").order("chave"),
  ]);
  if (grupos.error) throw grupos.error;
  if (campos.error) throw campos.error;

  return {
    grupos: (grupos.data ?? []) as GrupoDeCampos[],
    campos: ((campos.data ?? []) as unknown as Record<string, unknown>[]).map((l) => linhaParaCampo(objeto, l)),
  };
}

/**
 * Lê o catálogo de vários objetos ao mesmo tempo. A semente (organização criada depois da 9104)
 * só roda se algum voltar sem grupos, e então os catálogos são lidos de novo.
 */
export async function lerCatalogosSemeando(sb: SB, admin: SB, orgId: string, objetos: readonly ObjetoDeCampo[]): Promise<Catalogo[]> {
  const ler = () => Promise.all(objetos.map((o) => lerCatalogo(sb, orgId, o)));
  const lidos = await ler();
  if (lidos.every((c) => c.grupos.length > 0)) return lidos;
  await semearSeVazio(admin, orgId);
  return ler();
}

/** Organização sem o grupo padrão (criada depois da 9104) recebe a semente. */
export async function semearSeVazio(admin: SB, orgId: string): Promise<void> {
  const { data } = await admin
    .from("crm_grupos_de_campos")
    .select("id")
    .eq("organization_id", orgId)
    .eq("chave", GRUPO_PADRAO)
    .limit(1);
  if (data && data.length > 0) return;
  const { error } = await admin.rpc("fn_escale_semear_campos_padrao", { p_org: orgId });
  if (error) throw error;
}

export const novoCampoSchema = z.object({
  objeto: z.enum(OBJETOS_DE_CAMPO),
  nome: z.string().trim().min(1).max(80),
  grupo_id: z.string().uuid(),
  tipo: z.enum(TIPOS_DA_CLINT.map((t) => t.chave) as [string, ...string[]]),
  opcoes: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
});
export type NovoCampo = z.infer<typeof novoCampoSchema>;

export const patchDoCampoSchema = z
  .object({
    nome: z.string().trim().min(1).max(80).optional(),
    grupo_id: z.string().uuid().nullable().optional(),
    papel_minimo: z.enum(PAPEIS_DE_VISIBILIDADE).nullable().optional(),
    opcoes: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  })
  .strict();
export type PatchDoCampo = z.infer<typeof patchDoCampoSchema>;

export const novoGrupoSchema = z.object({ objeto: z.enum(OBJETOS_DE_CAMPO), nome: z.string().trim().min(1).max(60) });
export const renomearGrupoSchema = z.object({ nome: z.string().trim().min(1).max(60) });

export const ordemSchema = z.object({
  objeto: z.enum(OBJETOS_DE_CAMPO),
  grupos: z.array(z.string().uuid()).max(GRUPOS_MAX),
  campos: z.array(z.object({ grupo_id: z.string().uuid(), ids: z.array(z.string().uuid()).max(CAMPOS_DO_CRM_MAX) })).max(GRUPOS_MAX),
});
export type OrdemDoCatalogo = z.infer<typeof ordemSchema>;

const opcoesDe = (opcoes: string[] | undefined) => {
  const unicas = [...new Set(opcoes ?? [])];
  return unicas.map((o) => ({ value: o, label: o }));
};

export async function criarCampo(sb: SB, orgId: string, entrada: NovoCampo): Promise<CampoDoCatalogo> {
  const tipo = tipoDoMotor(entrada.tipo as (typeof TIPOS_DA_CLINT)[number]["chave"]);
  const precisaDeOpcoes = tipo === "select" || tipo === "multiselect";
  if (precisaDeOpcoes && opcoesDe(entrada.opcoes).length === 0) throw new ErroDoCatalogo("opcoes");

  const atual = await lerCatalogo(sb, orgId, entrada.objeto);
  if (atual.campos.length >= CAMPOS_DO_CRM_MAX) throw new ErroDoCatalogo("limite");
  if (!atual.grupos.some((g) => g.id === entrada.grupo_id)) throw new ErroDoCatalogo("grupo_sumiu");
  const nome = entrada.nome.trim();
  if (atual.campos.some((c) => String(c.definicao.label).trim().toLowerCase() === nome.toLowerCase())) throw new ErroDoCatalogo("nome_repetido");

  const chave = chaveDoNome(nome, atual.campos.map((c) => c.chave));
  if (!chave) throw new ErroDoCatalogo("nome_repetido");
  const noGrupo = atual.campos.filter((c) => c.grupo_id === entrada.grupo_id);
  const posicao = noGrupo.length ? Math.max(...noGrupo.map((c) => c.posicao)) + 1 : 0;

  const definicao = { label: nome, type: tipo, ...(precisaDeOpcoes ? { options: opcoesDe(entrada.opcoes) } : {}) };
  const linha = {
    organization_id: orgId,
    ...(entrada.objeto === "negocio" ? {} : { objeto: entrada.objeto }),
    chave,
    definicao,
    grupo_id: entrada.grupo_id,
    posicao,
  };
  const { data, error } = await sb.from(tabelaDe(entrada.objeto)).insert(linha).select(colunasDe(entrada.objeto)).single();
  if (error) throw error;
  return linhaParaCampo(entrada.objeto, (data ?? { ...linha, id: "" }) as unknown as Record<string, unknown>);
}

async function campoPorId(sb: SB, orgId: string, objeto: ObjetoDeCampo, id: string): Promise<CampoDoCatalogo> {
  const { data, error } = await sb.from(tabelaDe(objeto)).select(colunasDe(objeto)).eq("organization_id", orgId).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ErroDoCatalogo("nao_encontrado");
  return linhaParaCampo(objeto, data as unknown as Record<string, unknown>);
}

export async function mudarCampo(sb: SB, orgId: string, objeto: ObjetoDeCampo, id: string, patch: PatchDoCampo): Promise<CampoDoCatalogo> {
  const campo = await campoPorId(sb, orgId, objeto, id);
  if (campo.padrao && (patch.nome !== undefined || patch.opcoes !== undefined)) throw new ErroDoCatalogo("padrao");
  const mudanca: Record<string, unknown> = {};
  if (patch.nome !== undefined || patch.opcoes !== undefined) {
    const atual = await lerCatalogo(sb, orgId, objeto);
    if (patch.nome !== undefined) {
      const nome = patch.nome.trim();
      if (atual.campos.some((c) => c.id !== id && String(c.definicao.label).trim().toLowerCase() === nome.toLowerCase())) throw new ErroDoCatalogo("nome_repetido");
    }
    const tipo = campo.definicao.type;
    if (patch.opcoes !== undefined && tipo !== "select" && tipo !== "multiselect") throw new ErroDoCatalogo("opcoes");
    if (patch.opcoes !== undefined && opcoesDe(patch.opcoes).length === 0) throw new ErroDoCatalogo("opcoes");
    mudanca.definicao = {
      ...campo.definicao,
      ...(patch.nome !== undefined ? { label: patch.nome.trim() } : {}),
      ...(patch.opcoes !== undefined ? { options: opcoesDe(patch.opcoes) } : {}),
    };
  }
  if (patch.grupo_id !== undefined) mudanca.grupo_id = patch.grupo_id;
  if (patch.papel_minimo !== undefined) mudanca.papel_minimo = patch.papel_minimo;
  const { data, error } = await sb.from(tabelaDe(objeto)).update(mudanca).eq("organization_id", orgId).eq("id", id).select(colunasDe(objeto)).single();
  if (error) throw error;
  return linhaParaCampo(objeto, (data ?? { ...campo, ...mudanca }) as unknown as Record<string, unknown>);
}

export async function excluirCampo(sb: SB, orgId: string, objeto: ObjetoDeCampo, id: string): Promise<void> {
  const campo = await campoPorId(sb, orgId, objeto, id);
  if (campo.padrao) throw new ErroDoCatalogo("padrao");
  const { error } = await sb.from(tabelaDe(objeto)).delete().eq("organization_id", orgId).eq("id", id);
  if (error) throw error;
}

export async function criarGrupo(sb: SB, orgId: string, objeto: ObjetoDeCampo, nome: string): Promise<GrupoDeCampos> {
  const atual = await lerCatalogo(sb, orgId, objeto);
  if (atual.grupos.length >= GRUPOS_MAX) throw new ErroDoCatalogo("limite");
  if (atual.grupos.some((g) => g.nome.trim().toLowerCase() === nome.trim().toLowerCase())) throw new ErroDoCatalogo("nome_repetido");
  const chave = chaveDoNome(nome, atual.grupos.map((g) => g.chave)) ?? `grupo_${atual.grupos.length + 1}`;
  const posicao = atual.grupos.length ? Math.max(...atual.grupos.map((g) => g.posicao)) + 1 : 0;
  const linha = { organization_id: orgId, objeto, chave, nome: nome.trim(), posicao };
  const { data, error } = await sb.from("crm_grupos_de_campos").insert(linha).select("id, chave, nome, posicao, padrao").single();
  if (error) throw error;
  return (data ?? { ...linha, id: "", padrao: false }) as GrupoDeCampos;
}

export async function renomearGrupo(sb: SB, orgId: string, id: string, nome: string): Promise<void> {
  const { error } = await sb.from("crm_grupos_de_campos").update({ nome: nome.trim() }).eq("organization_id", orgId).eq("id", id);
  if (error) throw error;
}

export async function excluirGrupo(sb: SB, orgId: string, id: string): Promise<void> {
  const { data, error } = await sb.from("crm_grupos_de_campos").select("id, padrao").eq("organization_id", orgId).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ErroDoCatalogo("nao_encontrado");
  if ((data as { padrao: boolean }).padrao) throw new ErroDoCatalogo("padrao");
  const del = await sb.from("crm_grupos_de_campos").delete().eq("organization_id", orgId).eq("id", id);
  if (del.error) throw del.error;
}

/** Quantas gravações de posição vão ao banco ao mesmo tempo. */
const GRAVACOES_EM_PARALELO = 25;

/** Grava `posicao` dos grupos e dos campos (e o `grupo_id` de cada campo) na ordem recebida. */
export async function reordenar(sb: SB, orgId: string, ordem: OrdemDoCatalogo): Promise<void> {
  const tabela = tabelaDe(ordem.objeto);
  const gravacoes: Array<() => PromiseLike<{ error: unknown }>> = [
    ...ordem.grupos.map((id, i) => () => sb.from("crm_grupos_de_campos").update({ posicao: i }).eq("organization_id", orgId).eq("id", id)),
    ...ordem.campos.flatMap((grupo) =>
      grupo.ids.map((id, i) => () => sb.from(tabela).update({ posicao: i, grupo_id: grupo.grupo_id }).eq("organization_id", orgId).eq("id", id)),
    ),
  ];
  for (let inicio = 0; inicio < gravacoes.length; inicio += GRAVACOES_EM_PARALELO) {
    const respostas = await Promise.all(gravacoes.slice(inicio, inicio + GRAVACOES_EM_PARALELO).map((g) => g()));
    const falha = respostas.find((r) => r.error);
    if (falha) throw falha.error;
  }
}

/** Mensagem para cada erro tipado, com os textos da Clint. */
export const TEXTO_DO_ERRO: Record<ErroDoCatalogo["codigo"], string> = {
  nome_repetido: "Já existe um outro campo com o nome informado, o campo deve ser único.",
  grupo_sumiu: "Este grupo foi removido. Atualize a página e tente novamente.",
  limite: "Limite de campos ou grupos atingido.",
  padrao: "Não é possível editar um campo padrão do sistema",
  nao_encontrado: "Campo não encontrado.",
  opcoes: "Informe ao menos uma opção de seleção.",
};
