/**
 * Regras puras do catálogo de campos por objeto (Fase 2C).
 *
 * Três objetos (contato, empresa, negócio), grupos, visibilidade por papel
 * mínimo e a régua da Clint para a chave a partir do nome (AddFieldForm).
 */
import type { CustomFieldDef } from "@/lib/schemas/settings";
import { ROLE_RANK, type Role } from "@/lib/auth/types";

export const OBJETOS_DE_CAMPO = ["contato", "empresa", "negocio"] as const;
export type ObjetoDeCampo = (typeof OBJETOS_DE_CAMPO)[number];

export const ROTULO_DO_OBJETO: Record<ObjetoDeCampo, string> = {
  contato: "Contato",
  empresa: "Empresa",
  negocio: "Negócio",
};

/** Tipos oferecidos ao criar, na ordem e com os rótulos da Clint. */
export const TIPOS_DA_CLINT = [
  { chave: "TEXT", rotulo: "Texto", motor: "text" },
  { chave: "NUMBER", rotulo: "Número", motor: "number" },
  { chave: "CURRENCY", rotulo: "Monetário", motor: "currency" },
  { chave: "RICH_TEXT", rotulo: "Texto Rico", motor: "textarea" },
  { chave: "PHONE", rotulo: "Telefone", motor: "phone" },
  { chave: "SELECT", rotulo: "Seleção", motor: "select" },
  { chave: "MULTIPLE_SELECT", rotulo: "Múltipla seleção", motor: "multiselect" },
  { chave: "DATE", rotulo: "Data", motor: "date" },
  { chave: "DATETIME", rotulo: "Data e Hora", motor: "datetime" },
] as const;
export type TipoDaClint = (typeof TIPOS_DA_CLINT)[number]["chave"];
export type TipoDoMotor = CustomFieldDef["type"];

export function tipoDoMotor(tipo: TipoDaClint): TipoDoMotor {
  return TIPOS_DA_CLINT.find((t) => t.chave === tipo)!.motor;
}

/** Rótulo (da Clint) de um tipo do motor; os sem par na Clint têm rótulo nosso. */
export const ROTULO_DO_TIPO: Record<TipoDoMotor, string> = {
  text: "Texto",
  number: "Número",
  currency: "Monetário",
  textarea: "Texto Rico",
  phone: "Telefone",
  select: "Seleção",
  multiselect: "Múltipla seleção",
  date: "Data",
  datetime: "Data e Hora",
  boolean: "Sim ou não",
  email: "E-mail",
  url: "Link",
};

export const CHAVE_MAX = 20;
export const GRUPOS_MAX = 30;
export const GRUPO_PADRAO = "informacoes_gerais";
export const NOME_DO_GRUPO_PADRAO = "Informações Gerais";

/** Chaves que a Clint reserva e que aqui colidem com colunas ou links. */
const RESERVADAS = new Set(["ddi", "valid_phone", "duplicate_phone", "whatsapp_number", "id", "nome", "telefone", "email"]);

/**
 * A régua da Clint (AddFieldForm `Te`): sem acento, minúscula, sem pontuação,
 * espaço vira `_`, `__` vira `_`, 20 caracteres, sem `_` no fim; se já existe,
 * `_1`, `_2`… Chave que começa com dígito ganha `c_` (a nossa check exige letra).
 */
export function chaveDoNome(nome: string, existentes: readonly string[]): string | null {
  let chave = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[`~!@#$%^&*()|+\-=?;:'",.<>{}[\]\\/]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  if (!chave) return null;
  if (/^\d/.test(chave)) chave = `c_${chave}`;
  if (chave.length > CHAVE_MAX) chave = chave.slice(0, CHAVE_MAX);
  chave = chave.replace(/_+$/, "");
  if (!chave) return null;
  const usadas = new Set([...existentes, ...RESERVADAS]);
  const base = chave.replace(/_\d+$/, "");
  let n = 1;
  let final = chave;
  while (usadas.has(final) || final.startsWith("link_")) {
    final = `${base}_${n}`;
    n += 1;
  }
  return final;
}

export const PAPEIS_DE_VISIBILIDADE = ["agent", "manager", "admin"] as const;
export type PapelMinimo = (typeof PAPEIS_DE_VISIBILIDADE)[number];

export const ROTULO_DA_VISIBILIDADE: Record<PapelMinimo | "todos", string> = {
  todos: "Sempre visível",
  agent: "A partir de atendente",
  manager: "A partir de gerente",
  admin: "Só administrador",
};

export function visivelPara(papelMinimo: PapelMinimo | null, papel: Role): boolean {
  if (!papelMinimo) return true;
  return ROLE_RANK[papel] >= ROLE_RANK[papelMinimo];
}

export interface GrupoDeCampos {
  id: string;
  chave: string;
  nome: string;
  posicao: number;
  padrao: boolean;
}

export interface CampoDoCatalogo {
  id: string;
  objeto: ObjetoDeCampo;
  chave: string;
  definicao: Omit<CustomFieldDef, "key">;
  grupo_id: string | null;
  papel_minimo: PapelMinimo | null;
  posicao: number;
  padrao: boolean;
}

export interface Catalogo {
  grupos: GrupoDeCampos[];
  campos: CampoDoCatalogo[];
}

export const CATALOGO_VAZIO: Catalogo = { grupos: [], campos: [] };

/** Campos que são colunas (ou links) e não linhas do catálogo. */
export interface CampoFixo {
  chave: string;
  rotulo: string;
  tipo: TipoDoMotor;
  /** Só leitura na ficha (o CPF é cifrado e tem rota própria). */
  soLeitura?: boolean;
}

export const CAMPOS_FIXOS_DO_CONTATO: readonly CampoFixo[] = [
  { chave: "nome", rotulo: "Nome", tipo: "text" },
  { chave: "telefone", rotulo: "Telefone", tipo: "phone" },
  { chave: "email", rotulo: "Email", tipo: "email" },
  { chave: "instagram", rotulo: "Instagram", tipo: "text" },
  { chave: "documento", rotulo: "Documento", tipo: "text", soLeitura: true },
  { chave: "nascimento", rotulo: "Data de nascimento", tipo: "date" },
];

export const CAMPOS_FIXOS_DA_EMPRESA: readonly CampoFixo[] = [
  { chave: "nome", rotulo: "Nome da empresa", tipo: "text" },
  { chave: "cidade", rotulo: "Cidade", tipo: "text" },
  { chave: "estado", rotulo: "Estado", tipo: "text" },
  { chave: "cnpj", rotulo: "CNPJ", tipo: "text" },
];

/** Os quatro campos padrão da empresa que são linhas do catálogo (semeados pela 9104). */
export const CAMPOS_PADRAO_DA_EMPRESA = [
  { chave: "site", label: "Site", type: "url" },
  { chave: "categoria", label: "Categoria", type: "text" },
  { chave: "segmento", label: "Segmento", type: "text" },
  { chave: "numero_de_funcionarios", label: "Número de funcionários", type: "number" },
] as const;

export interface GrupoComCampos {
  grupo: GrupoDeCampos;
  campos: CampoDoCatalogo[];
}

/** Agrupa na ordem dos grupos; campo sem grupo (ou de grupo sumido) cai no padrão. */
export function camposPorGrupo(catalogo: Catalogo): GrupoComCampos[] {
  const grupos = [...catalogo.grupos].sort((a, b) => a.posicao - b.posicao || a.nome.localeCompare(b.nome));
  const padrao = grupos.find((g) => g.chave === GRUPO_PADRAO) ?? grupos[0];
  const porGrupo = new Map<string, CampoDoCatalogo[]>(grupos.map((g) => [g.id, []]));
  for (const campo of [...catalogo.campos].sort((a, b) => a.posicao - b.posicao || a.chave.localeCompare(b.chave))) {
    const alvo = (campo.grupo_id && porGrupo.get(campo.grupo_id)) || (padrao && porGrupo.get(padrao.id));
    alvo?.push(campo);
  }
  return grupos.map((grupo) => ({ grupo, campos: porGrupo.get(grupo.id) ?? [] }));
}

export function variavelDoCampo(objeto: ObjetoDeCampo, chave: string): string {
  return `{{${objeto}.${chave}}}`;
}

/** Só os campos que o papel enxerga. */
export function catalogoVisivel(catalogo: Catalogo, papel: Role): Catalogo {
  return { grupos: catalogo.grupos, campos: catalogo.campos.filter((c) => visivelPara(c.papel_minimo, papel)) };
}
