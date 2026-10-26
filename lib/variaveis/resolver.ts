/**
 * O RESOLVEDOR ÚNICO DAS VARIÁVEIS (fork Escale, Frente V).
 *
 * Troca os tokens da Clint (`[CONTACT.FIRST_NAME]`) pelos dados das
 * `FontesDasVariaveis`. É puro: roda no servidor (envios) e na tela (prévia,
 * atividade), sem banco e sem React. Quem busca as fontes no banco é
 * `lib/variaveis/fontes.ts`.
 *
 * ═══ Os formatos antigos (`{{nome}}`, `{{lead.x}}`…) ═══
 *
 * Eles NÃO querem dizer a mesma coisa em todo lugar: `{{lead.title}}` é coluna
 * na automação e `{{lead.gancho}}` é campo personalizado na campanha. Por isso
 * cada lugar continua dono do seu formato antigo (o "dialeto", decisão D10) e
 * entra aqui como `legado`: uma regex e uma troca. A passada é UMA SÓ, com as
 * duas regex juntas, para um valor inserido por uma nunca ser lido pela outra.
 *
 * ═══ Variável sem valor ═══
 *
 * `vazio` diz o que cada lugar faz (D8): "vazio" troca por nada (automação,
 * atividade), "literal" mantém o token (inbox: o envio é barrado) e "falta"
 * mantém e avisa em `faltando` (campanha tira a pessoa da lista). Sem fontes
 * nenhuma (`null`), o token fica como está e não conta como falta: quem chamou
 * não tinha o contexto, e a próxima passada (o envio) resolve.
 */
import { chaveDaVariavel } from "./catalogo";

/** `[CONTACT.FIRST_NAME]`, `[USER.ORGANIZATION.NAME]`, `[DEAL.PLANO_2]`. */
export const TOKEN_DA_CLINT = /\[([A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)+)\]/g;

export type ModoDoVazio = "vazio" | "literal" | "falta";

type Campos = Readonly<Record<string, unknown>> | null | undefined;

export interface FontesDasVariaveis {
  contato?: {
    id: string | null;
    nome: string | null;
    email: string | null;
    telefone: string | null;
    cargo?: string | null;
    campos?: Campos;
  } | null;
  negocio?: {
    id: string | null;
    criadoEm: string | null;
    status: string | null;
    etapa: string | null;
    valorCentavos: number | null;
    moeda: string | null;
    /** O valor já em texto (a tela que só tem o texto pronto); vence os centavos. */
    valorTexto?: string | null;
    campos?: Campos;
  } | null;
  empresa?: { nome: string | null; cidade: string | null; estado: string | null; campos?: Campos } | null;
  usuario?: { nome: string | null; email: string | null } | null;
  /** A conta (organização do Escale): `[USER.ORGANIZATION.NAME]`. */
  conta?: { nome: string | null } | null;
  ultimoAgendamento?: { link: string | null; inicio: string | null } | null;
  /**
   * Os campos PERSONALIZADOS já em texto, pela variável inteira
   * (`"[DEAL.PLANO]": "Ouro"`): é como chegam formatados pelo tipo (moeda,
   * data, opção) por quem tem as definições do catálogo. Só valem para token
   * que não é campo fixo: um personalizado chamado "email" não toma o lugar de
   * `[CONTACT.EMAIL]`.
   */
  prontos?: Readonly<Record<string, string>>;
  /** Fuso das datas e horas. Sem fuso: `America/Sao_Paulo`. */
  fuso?: string | null;
}

export interface TextoResolvido {
  texto: string;
  /** Tokens usados sem valor, quando `vazio` é "falta" (`CONTACT.FIRST_NAME`, sem colchetes). */
  faltando: string[];
  /** Tokens `[X.Y]` que ninguém conhece. Ficam literais. */
  desconhecidas: string[];
}

export interface Legado {
  /** A regex do formato antigo do dialeto (com `g`). */
  regex: RegExp;
  /** Troca UM literal casado pela regex (a regra atual daquele lugar). */
  trocar: (literal: string) => string;
}

export interface OpcoesDoResolvedor {
  vazio: ModoDoVazio;
  /** Aplicado a cada VALOR inserido (escape de HTML, blindagem da campanha). */
  formatar?: (valor: string) => string;
  legado?: Legado;
}

const FUSO_PADRAO = "America/Sao_Paulo";

/**
 * Tokens que a Clint tem e o Escale não guarda (D1, D2: escondidos,
 * Recuperação de vendas e checkouts). São CONHECIDOS: saem vazios, nunca crus.
 */
const SEM_DADO = new Set([
  "ORGANIZATION.URL",
  "ORGANIZATION.SEGMENT",
  "ORGANIZATION.CATEGORY",
  "ORGANIZATION.EMPLOYEES",
  "USER.PHONE",
  "USER.WHATSAPP",
  "USER.LINK",
  "USER.IDENTIFIER",
  "DEAL.BILLET_LINK",
  "DEAL.CHECKOUT_LINK",
  "DEAL.CHECKOUT_URL",
  "DEAL.PRODUCT_NAME",
  "DEAL.PRODUCT_ID",
  "DEAL.PAYMENT_BILLET_URL",
  "DEAL.PAYMENT_BILLET_BARCODE",
  "DEAL.EVENT",
  "DEAL.EVENT_KEY",
  "DEAL.PAYMENT_PIX_URL",
  "DEAL.PAYMENT_PIX_CODE",
  "DEAL.PURCHASE_CREATED_AT",
  "DEAL.PAYMENT_TYPE",
  "DEAL.PAYMENT_REFUSAL_REASON",
  "DEAL.PURCHASE_STATUS",
  "DEAL.PURCHASE_CHECKOUT_URL",
  "DEAL.PURCHASE_FULL_PRICE",
]);

const STATUS_DO_NEGOCIO: Record<string, string> = {
  open: "Aberto",
  won: "Ganho",
  lost: "Perdido",
};

const CHAVES_DE_PROTOTIPO = new Set(["__proto__", "constructor", "prototype"]);

const partes = (nome: string | null | undefined) =>
  (nome ?? "").trim().split(/\s+/).filter(Boolean);

const textoOuNull = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/** R$ 1.234,56 (ou a moeda do negócio, no formato brasileiro). */
export function valorEmDinheiro(centavos: number | null | undefined, moeda?: string | null): string | null {
  if (centavos === null || centavos === undefined) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda ?? "BRL" })
    .format(centavos / 100)
    .replace(/ /g, " ");
}

function data(iso: string | null | undefined, fuso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function dataEHora(iso: string | null | undefined, fuso: string): string | null {
  const dia = data(iso, fuso);
  if (!dia || !iso) return null;
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return `${dia} às ${hora}`;
}

/** Lista sai separada por vírgula; objeto não vira texto. Só propriedade própria. */
function textoDoCampo(campos: Campos, chave: string): string | null {
  if (!campos || typeof campos !== "object") return null;
  const propria = Object.keys(campos).find(
    (k) => !CHAVES_DE_PROTOTIPO.has(k) && chaveDaVariavel(k) === chave,
  );
  if (propria === undefined) return null;
  const bruto = (campos as Record<string, unknown>)[propria];
  if (bruto === null || bruto === undefined) return null;
  if (Array.isArray(bruto)) {
    return textoOuNull(
      bruto.filter((x) => x !== null && x !== undefined && typeof x !== "object").map(String).join(", "),
    );
  }
  if (typeof bruto === "object") return null;
  return textoOuNull(String(bruto));
}

/**
 * O valor de UM token (sem colchetes: `CONTACT.FIRST_NAME`).
 * `undefined` = token desconhecido; `null` = conhecido, sem valor.
 */
export function valorDaVariavel(token: string, f: FontesDasVariaveis): string | null | undefined {
  const fuso = f.fuso || FUSO_PADRAO;
  const [entidade, ...resto] = token.split(".");
  const campo = resto.join(".");
  const contato = f.contato ?? null;
  const negocio = f.negocio ?? null;
  const empresa = f.empresa ?? null;
  switch (token) {
    case "DEAL.DATE":
      return data(negocio?.criadoEm, fuso);
    case "DEAL.STATUS":
      return negocio?.status ? (STATUS_DO_NEGOCIO[negocio.status] ?? negocio.status) : null;
    case "DEAL.STAGE":
      return textoOuNull(negocio?.etapa);
    case "DEAL.VALUE":
      return negocio?.valorTexto !== undefined
        ? textoOuNull(negocio.valorTexto)
        : valorEmDinheiro(negocio?.valorCentavos, negocio?.moeda);
    case "DEAL.LATEST_MEETING_LINK":
      return textoOuNull(f.ultimoAgendamento?.link);
    case "DEAL.LATEST_MEETING_DATETIME":
      return dataEHora(f.ultimoAgendamento?.inicio, fuso);
    case "DEAL.ID":
      return textoOuNull(negocio?.id);
    case "CONTACT.NAME":
      return textoOuNull(partes(contato?.nome).join(" "));
    case "CONTACT.FIRST_NAME":
      return partes(contato?.nome)[0] ?? null;
    case "CONTACT.LAST_NAME":
      return textoOuNull(partes(contato?.nome).slice(1).join(" "));
    case "CONTACT.ROLE":
      return textoOuNull(contato?.cargo);
    case "CONTACT.EMAIL":
      return textoOuNull(contato?.email);
    case "CONTACT.PHONE":
      return textoOuNull(contato?.telefone);
    case "CONTACT.ID":
      return textoOuNull(contato?.id);
    case "CONTACT.ORGANIZATION.NAME":
    case "ORGANIZATION.NAME":
      return textoOuNull(empresa?.nome);
    case "ORGANIZATION.CITY":
      return textoOuNull(empresa?.cidade);
    case "ORGANIZATION.STATE":
      return textoOuNull(empresa?.estado);
    case "USER.FIRST_NAME":
      return partes(f.usuario?.nome)[0] ?? null;
    case "USER.LAST_NAME":
      return textoOuNull(partes(f.usuario?.nome).slice(1).join(" "));
    case "USER.EMAIL":
      return textoOuNull(f.usuario?.email);
    case "USER.ORGANIZATION.NAME":
      return textoOuNull(f.conta?.nome);
  }
  // Campo personalizado: `[DEAL.<CHAVE>]`, `[CONTACT.<CHAVE>]`, `[ORGANIZATION.<CHAVE>]`.
  const pronto = f.prontos?.[`[${token}]`];
  if (pronto !== undefined) return textoOuNull(pronto);
  if (resto.length === 1) {
    const mapa =
      entidade === "DEAL" ? negocio?.campos : entidade === "CONTACT" ? contato?.campos : entidade === "ORGANIZATION" ? empresa?.campos : undefined;
    const valor = textoDoCampo(mapa, campo);
    if (valor !== null) return valor;
    if (SEM_DADO.has(token)) return null;
    // Um campo personalizado que este registro não tem: conhecido, vazio.
    if (entidade === "DEAL" || entidade === "CONTACT" || entidade === "ORGANIZATION") return null;
  }
  if (SEM_DADO.has(token)) return null;
  return undefined;
}

/**
 * Troca os tokens da Clint (e, numa passada só, o formato antigo do dialeto).
 * `fontes: null` = sem contexto: os tokens `[X.Y]` ficam como estão.
 */
export function resolverTexto(
  texto: string,
  fontes: FontesDasVariaveis | null | undefined,
  opcoes: OpcoesDoResolvedor,
): TextoResolvido {
  const faltando = new Set<string>();
  const desconhecidas = new Set<string>();
  const formatar = opcoes.formatar ?? ((s: string) => s);
  const regex = opcoes.legado
    ? new RegExp(`${TOKEN_DA_CLINT.source}|${opcoes.legado.regex.source}`, "g")
    : new RegExp(TOKEN_DA_CLINT.source, "g");

  const saida = texto.replace(regex, (literal: string, token: string | undefined) => {
    if (token === undefined) return opcoes.legado!.trocar(literal);
    if (!fontes) return literal;
    const valor = valorDaVariavel(token, fontes);
    if (valor === undefined) {
      desconhecidas.add(token);
      return literal;
    }
    if (valor !== null) return formatar(valor);
    if (opcoes.vazio === "vazio") return "";
    if (opcoes.vazio === "falta") faltando.add(token);
    return literal;
  });
  return { texto: saida, faltando: [...faltando], desconhecidas: [...desconhecidas] };
}

/** Os tokens `[X.Y]` que um texto usa (sem colchetes, sem repetir). */
export function tokensUsados(texto: string): string[] {
  return [...new Set([...texto.matchAll(new RegExp(TOKEN_DA_CLINT.source, "g"))].map((m) => m[1]!))];
}

/** O texto usa algum token da Clint? (quem carrega fontes no banco pergunta antes) */
export const usaTokensDaClint = (texto: string): boolean =>
  new RegExp(TOKEN_DA_CLINT.source).test(texto);
