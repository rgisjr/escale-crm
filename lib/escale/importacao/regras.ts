/**
 * AS REGRAS DO IMPORTADOR (fork Escale, Fase 2F; Clint "Import Studio",
 * `index-UPYK_E9J`: constantes `M`, `N`, `G`, `pe`, `me`). Cada situação
 * ("motivo") tem a categoria da tela, a gravidade, a que tipo de importação
 * vale, o risco (1–5), a decisão padrão e as opções. Os níveis decidem por
 * risco; HARD sempre descarta; SOFT_LOCKED sempre vai para revisão.
 */
export const TIPOS_DE_IMPORTACAO = ["contato", "negocio"] as const;
export type TipoDeImportacao = (typeof TIPOS_DE_IMPORTACAO)[number];

export const ACOES = [
  "SKIP_ROW",
  "SKIP_PHONE_KEEP_REST",
  "UPDATE",
  "KEEP_DB",
  "OVERWRITE",
  "UPDATE_EMAIL_CONTACT",
  "UPDATE_PHONE_CONTACT",
  "MERGE_CONTACTS",
  "USE_DEFAULT",
  "PICK_MANUALLY",
  "USE_FIRST",
  "UPDATE_EXISTING",
  "CREATE_NEW",
  "CREATE_NO_VALUE",
  "CREATE_WITH_PARSED_VALUE",
  "PENDING_REVIEW",
] as const;
export type Acao = (typeof ACOES)[number];

export const MOTIVOS = [
  "MISSING_REQUIRED_FIELDS",
  "INVALID_EMAIL_FORMAT",
  "INVALID_PHONE_FORMAT",
  "MATCH_FILL_EMPTY_FIELDS",
  "MATCH_OVERWRITE_FILLED_FIELD",
  "MATCH_PHONE_DIFFERS",
  "MATCH_INSTAGRAM_DIFFERS",
  "MERGE_HINT_EMAIL_PHONE_SPLIT",
  "PHONE_HAS_ACTIVE_WHATSAPP",
  "DUPLICATE_IN_BATCH",
  "ORIGIN_NAME_NOT_FOUND",
  "STAGE_NAME_NOT_FOUND",
  "DEAL_DUPLICATE_OPEN",
  "DEAL_VALUE_INVALID",
  "DEAL_ID_NOT_FOUND",
] as const;
export type Motivo = (typeof MOTIVOS)[number];

export type Gravidade = "HARD" | "SOFT" | "CONFIG" | "SOFT_LOCKED";
export type Categoria = "A" | "B" | "C" | "D" | "E";

export interface Regra {
  categoria: Categoria;
  gravidade: Gravidade;
  alvo: "contato" | "negocio" | "ambos";
  risco: number;
  padrao: Acao;
  opcoes: readonly Acao[];
  desligadas?: readonly Acao[];
  exigeMapeado?: string;
}

export const REGRAS: Record<Motivo, Regra> = {
  MISSING_REQUIRED_FIELDS: { categoria: "A", gravidade: "HARD", alvo: "ambos", risco: 3, padrao: "SKIP_ROW", opcoes: [] },
  INVALID_EMAIL_FORMAT: { categoria: "A", gravidade: "HARD", alvo: "ambos", risco: 2, padrao: "SKIP_ROW", opcoes: [] },
  INVALID_PHONE_FORMAT: {
    categoria: "A", gravidade: "SOFT", alvo: "ambos", risco: 2, padrao: "SKIP_PHONE_KEEP_REST",
    opcoes: ["SKIP_PHONE_KEEP_REST", "SKIP_ROW"], exigeMapeado: "phone",
  },
  MATCH_FILL_EMPTY_FIELDS: {
    categoria: "B", gravidade: "CONFIG", alvo: "contato", risco: 1, padrao: "UPDATE", opcoes: ["UPDATE", "SKIP_ROW"],
  },
  MATCH_OVERWRITE_FILLED_FIELD: {
    categoria: "B", gravidade: "SOFT", alvo: "contato", risco: 4, padrao: "KEEP_DB", opcoes: ["KEEP_DB", "OVERWRITE"],
  },
  MATCH_PHONE_DIFFERS: {
    categoria: "B", gravidade: "SOFT", alvo: "contato", risco: 3, padrao: "KEEP_DB",
    opcoes: ["KEEP_DB", "OVERWRITE"], exigeMapeado: "phone",
  },
  MATCH_INSTAGRAM_DIFFERS: {
    categoria: "B", gravidade: "SOFT", alvo: "contato", risco: 3, padrao: "KEEP_DB",
    opcoes: ["KEEP_DB", "OVERWRITE"], exigeMapeado: "instagram",
  },
  MERGE_HINT_EMAIL_PHONE_SPLIT: {
    categoria: "C", gravidade: "SOFT_LOCKED", alvo: "contato", risco: 5, padrao: "PENDING_REVIEW",
    opcoes: ["UPDATE_EMAIL_CONTACT", "UPDATE_PHONE_CONTACT", "MERGE_CONTACTS", "SKIP_ROW"],
    desligadas: ["MERGE_CONTACTS"],
  },
  PHONE_HAS_ACTIVE_WHATSAPP: {
    categoria: "D", gravidade: "SOFT", alvo: "contato", risco: 5, padrao: "SKIP_PHONE_KEEP_REST",
    opcoes: ["SKIP_PHONE_KEEP_REST", "SKIP_ROW"], exigeMapeado: "phone",
  },
  DUPLICATE_IN_BATCH: { categoria: "D", gravidade: "HARD", alvo: "contato", risco: 2, padrao: "SKIP_ROW", opcoes: [] },
  ORIGIN_NAME_NOT_FOUND: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 3, padrao: "USE_DEFAULT",
    opcoes: ["USE_DEFAULT", "PICK_MANUALLY", "SKIP_ROW"], exigeMapeado: "origin_name",
  },
  STAGE_NAME_NOT_FOUND: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 3, padrao: "USE_FIRST",
    opcoes: ["USE_FIRST", "PICK_MANUALLY", "SKIP_ROW"], exigeMapeado: "stage_name",
  },
  DEAL_DUPLICATE_OPEN: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 4, padrao: "UPDATE_EXISTING",
    opcoes: ["UPDATE_EXISTING", "CREATE_NEW", "SKIP_ROW"],
  },
  DEAL_VALUE_INVALID: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 3, padrao: "CREATE_NO_VALUE",
    opcoes: ["CREATE_NO_VALUE", "CREATE_WITH_PARSED_VALUE", "SKIP_ROW"],
  },
  DEAL_ID_NOT_FOUND: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 5, padrao: "PENDING_REVIEW",
    opcoes: ["CREATE_NEW", "SKIP_ROW"], exigeMapeado: "deal_id",
  },
};

export const CATEGORIAS: ReadonlyArray<{ id: Categoria; rotulo: string }> = [
  { id: "A", rotulo: "Linhas novas e inválidas" },
  { id: "B", rotulo: "Contato já existe" },
  { id: "C", rotulo: "A linha bate com dois contatos" },
  { id: "D", rotulo: "Proteções de dados" },
  { id: "E", rotulo: "Negócios" },
];

export const NIVEIS = ["conservador", "padrao", "agressivo"] as const;
export type Nivel = (typeof NIVEIS)[number];
export const LIMITE_DO_NIVEL: Record<Nivel, number> = { conservador: 2, padrao: 3, agressivo: 4 };

export type Decisoes = Partial<Record<Motivo, Acao>>;
/** Uma coluna do arquivo e o destino dela (`"none"` = não importar). */
export interface ColunaMapeada {
  csv: string;
  para: string;
}

const AJUSTAVEIS = MOTIVOS.filter((m) => REGRAS[m].gravidade === "SOFT" || REGRAS[m].gravidade === "CONFIG");
const TRAVADOS = MOTIVOS.filter((m) => REGRAS[m].gravidade === "SOFT_LOCKED");
const IDENTIFICADORES = ["email", "phone", "instagram"];

const valeParaOTipo = (m: Motivo, tipo: TipoDeImportacao) => {
  const alvo = REGRAS[m].alvo;
  return alvo === "ambos" || tipo === "negocio" || alvo === "contato";
};

function mapeados(mapa: readonly ColunaMapeada[] | undefined): Set<string> | null {
  if (!mapa) return null;
  return new Set(mapa.map((c) => c.para).filter((p) => p && p !== "none"));
}

const aplicavel = (m: Motivo, usados: Set<string> | null) => {
  if (!usados) return true;
  const exige = REGRAS[m].exigeMapeado;
  if (exige && !usados.has(exige)) return false;
  if (m === "MERGE_HINT_EMAIL_PHONE_SPLIT") return IDENTIFICADORES.filter((i) => usados.has(i)).length >= 2;
  return true;
};

export function decisoesDoNivel(nivel: Nivel): Decisoes {
  const limite = LIMITE_DO_NIVEL[nivel];
  const saida: Decisoes = {};
  for (const m of AJUSTAVEIS) saida[m] = REGRAS[m].risco <= limite ? REGRAS[m].padrao : "PENDING_REVIEW";
  return saida;
}

export function acaoValida(m: Motivo, acao: Acao): boolean {
  const regra = REGRAS[m];
  if (acao === "PENDING_REVIEW") return true;
  return regra.opcoes.includes(acao) && !(regra.desligadas ?? []).includes(acao);
}

/** O nível com os ajustes da pessoa; ajuste inválido é ignorado (Clint `It`). */
export function decisoesComAjustes(nivel: Nivel, ajustes: Decisoes): Decisoes {
  const saida = decisoesDoNivel(nivel);
  for (const m of AJUSTAVEIS) {
    const a = ajustes[m];
    if (a && a !== "PICK_MANUALLY" && acaoValida(m, a)) saida[m] = a;
  }
  return saida;
}

export function situacoesAjustaveis(tipo: TipoDeImportacao, mapa?: readonly ColunaMapeada[]): Motivo[] {
  const usados = mapeados(mapa);
  return AJUSTAVEIS.filter((m) => valeParaOTipo(m, tipo) && aplicavel(m, usados));
}

export function situacoesTravadas(tipo: TipoDeImportacao, mapa?: readonly ColunaMapeada[]): Motivo[] {
  const usados = mapeados(mapa);
  return TRAVADOS.filter((m) => valeParaOTipo(m, tipo) && aplicavel(m, usados));
}

export function contagemDasDecisoes(
  decisoes: Decisoes,
  tipo: TipoDeImportacao,
  mapa?: readonly ColunaMapeada[],
): { auto: number; revisar: number; travadas: number; total: number } {
  const ajustaveis = situacoesAjustaveis(tipo, mapa);
  const travadas = situacoesTravadas(tipo, mapa).length;
  const revisar = ajustaveis.filter((m) => decisoes[m] === "PENDING_REVIEW").length;
  return { auto: ajustaveis.length - revisar, revisar: revisar + travadas, travadas, total: ajustaveis.length };
}

export function nivelDasDecisoes(
  decisoes: Decisoes,
  tipo: TipoDeImportacao,
  mapa?: readonly ColunaMapeada[],
): Nivel | "personalizado" {
  const ajustaveis = situacoesAjustaveis(tipo, mapa);
  return (
    NIVEIS.find((n) => {
      const doNivel = decisoesDoNivel(n);
      return ajustaveis.every((m) => decisoes[m] === doNivel[m]);
    }) ?? "personalizado"
  );
}

/** A decisão que vale para o motivo nesta importação. */
export function decisaoDe(m: Motivo, decisoes: Decisoes): Acao {
  const regra = REGRAS[m];
  if (regra.gravidade === "HARD") return regra.padrao;
  if (regra.gravidade === "SOFT_LOCKED") return "PENDING_REVIEW";
  const escolhida = decisoes[m];
  if (escolhida && escolhida !== "PICK_MANUALLY" && acaoValida(m, escolhida)) return escolhida;
  return decisoesDoNivel("conservador")[m] ?? regra.padrao;
}

/** Os botões da situação no passo Decisões (Clint `Zt`): as opções sem "Escolher na lista", mais "Revisar". */
export function opcoesDaSituacao(m: Motivo): Acao[] {
  return [...REGRAS[m].opcoes.filter((a) => a !== "PICK_MANUALLY"), "PENDING_REVIEW"];
}
