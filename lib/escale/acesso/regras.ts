import { DEFAULT_VISIBILITY_MODE, type Role, type VisibilityMode } from "@/lib/auth/types";

/**
 * ACESSO POR ORIGEM (fork Escale, Fase 1J; D11 e D12 do PRD de Negócios).
 *
 * A origem guarda, no mesmo `crm_pipelines.settings` da 1F, a regra de quem vê
 * os negócios (`escale_visualizacao`, os valores de `visibility_mode`) e a
 * lista de pessoas com acesso (`escale_pessoas`, ids). O grupo guarda a sua
 * lista em `crm_pipeline_groups.settings.escale_pessoas`: a origem sem lista
 * própria segue a do grupo (Clint). Quem DECIDE é o banco (migration 9010);
 * este módulo é o espelho em TypeScript, para a tela desligar o que o banco
 * recusaria, para a página da ficha escolher o aviso e para os testes.
 * Toda leitura é tolerante: lixo vira "sem regra" / "sem lista".
 */
export const CHAVE_DA_VISUALIZACAO = "escale_visualizacao";
export const CHAVE_DAS_PESSOAS = "escale_pessoas";
export const PESSOAS_MAX = 200;

/** A ordem do seletor da Clint (print F03): todos, apenas seus, seus e sem dono. */
export const VISUALIZACOES = [
  "all",
  "own",
  "own_and_unassigned",
] as const satisfies readonly VisibilityMode[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function comoRecord(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

export function visualizacaoDaOrigem(settings: unknown): VisibilityMode | null {
  const bruta = comoRecord(settings)[CHAVE_DA_VISUALIZACAO];
  return typeof bruta === "string" && (VISUALIZACOES as readonly string[]).includes(bruta)
    ? (bruta as VisibilityMode)
    : null;
}

/** A lista da origem ou a do grupo: o mesmo desenho nos dois `settings`. */
export function pessoasDaOrigem(settings: unknown): string[] {
  const bruta = comoRecord(settings)[CHAVE_DAS_PESSOAS];
  if (!Array.isArray(bruta)) return [];
  const vistas = new Set<string>();
  for (const x of bruta) if (typeof x === "string" && UUID.test(x)) vistas.add(x.toLowerCase());
  return [...vistas];
}

/** A da origem; sem ela, a da organização; sem as duas, o padrão do original. */
export function regraEmVigor(
  settings: unknown,
  daOrganizacao: VisibilityMode | null | undefined,
): VisibilityMode {
  return visualizacaoDaOrigem(settings) ?? daOrganizacao ?? DEFAULT_VISIBILITY_MODE;
}

export function ehGerenteOuAcima(papel: Role | null | undefined): boolean {
  return papel === "manager" || papel === "admin";
}

/** Lista vazia = sem restrição; senão a pessoa precisa estar nela. */
export function listaPermite(pessoas: readonly string[], userId: string): boolean {
  return pessoas.length === 0 || pessoas.includes(userId.toLowerCase());
}

/** `fn_escale_tem_acesso_a_origem` (9010): só admin passa por cima (Q4); a lista da origem vence a do grupo (Q6). */
export function temAcessoAOrigem(args: {
  papel: Role | null | undefined;
  userId: string;
  pessoas: readonly string[];
  pessoasDoGrupo: readonly string[];
}): boolean {
  if (!args.papel) return false;
  if (args.papel === "admin") return true;
  return args.pessoas.length > 0
    ? listaPermite(args.pessoas, args.userId)
    : listaPermite(args.pessoasDoGrupo, args.userId);
}

/** `fn_escale_tem_acesso_ao_grupo` (9010): a lista do grupo, ou uma origem dele com lista própria que me inclua. */
export function temAcessoAoGrupo(args: {
  papel: Role | null | undefined;
  userId: string;
  pessoasDoGrupo: readonly string[];
  listasDasOrigens: ReadonlyArray<readonly string[]>;
}): boolean {
  if (!args.papel) return false;
  if (args.papel === "admin") return true;
  if (listaPermite(args.pessoasDoGrupo, args.userId)) return true;
  return args.listasDasOrigens.some((l) => l.length > 0 && listaPermite(l, args.userId));
}

/** O espelho de `fn_escale_pode_ver_negocio` (9010). */
export function podeVerNegocio(args: {
  papel: Role | null | undefined;
  userId: string;
  donoUserId: string | null;
  regra: VisibilityMode;
  pessoas: readonly string[];
  pessoasDoGrupo: readonly string[];
}): boolean {
  if (!args.papel) return false;
  if (!temAcessoAOrigem(args)) return false;
  // Como a SQL: só viewer, gerente e admin veem tudo; qualquer outro papel segue a regra do agente.
  if (args.papel === "viewer" || args.papel === "manager" || args.papel === "admin") return true;
  if (args.donoUserId === args.userId) return true;
  if (args.regra === "all") return true;
  if (args.regra === "own_and_unassigned") return args.donoUserId === null;
  return false;
}

/** A Clint desliga o seletor de dono fora de "todos" para quem não administra (N14). */
export function podeTrocarDono(args: {
  papel: Role | null | undefined;
  regra: VisibilityMode;
}): boolean {
  return ehGerenteOuAcima(args.papel) || args.regra === "all";
}

export type AvisoDaFicha = "origem" | "outro_dono";

/** O que a página da ficha mostra quando a sessão não lê o negócio (N16). */
export function avisoDaFicha(args: {
  papel: Role | null | undefined;
  userId: string;
  donoUserId: string | null;
  settingsDaOrigem: unknown;
  settingsDoGrupo: unknown;
  modoDaOrganizacao: VisibilityMode;
}): AvisoDaFicha | null {
  const pessoas = pessoasDaOrigem(args.settingsDaOrigem);
  const pessoasDoGrupo = pessoasDaOrigem(args.settingsDoGrupo);
  if (!temAcessoAOrigem({ papel: args.papel, userId: args.userId, pessoas, pessoasDoGrupo }))
    return "origem";
  const regra = regraEmVigor(args.settingsDaOrigem, args.modoDaOrganizacao);
  if (!podeVerNegocio({ ...args, regra, pessoas, pessoasDoGrupo })) return "outro_dono";
  return null;
}
