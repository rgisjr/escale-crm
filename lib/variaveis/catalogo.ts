/**
 * A LISTA ÚNICA DE VARIÁVEIS DE MENSAGEM (fork Escale, Frente V).
 *
 * Os grupos, a ordem, os rótulos e os tokens são os da Clint
 * (`variable-options` do app dela e os prints de 25/10 em
 * `docs/escale/clint/prints-variaveis/`): Negócio, Contato, Empresa, Usuário.
 * Toda tela que insere ou mapeia variável lê DAQUI; nenhuma monta a sua lista.
 *
 * `disponivel: false` = a Clint tem o campo, mas o Escale ainda não guarda o
 * dado. Fica fora do seletor até o dado nascer (decisão D1 do plano): oferecer
 * uma variável que sai sempre vazia é prometer dado que não existe.
 */

export type ObjetoDaVariavel = "negocio" | "contato" | "empresa";
export type ChaveDoGrupo = "DEAL" | "CONTACT" | "ORGANIZATION" | "USER" | "OUTROS";

export interface Variavel {
  /** O que vai no texto: `[CONTACT.FIRST_NAME]` (ou `{{saudacao}}`, o único extra). */
  token: string;
  rotulo: string;
  disponivel: boolean;
}

export interface GrupoDeVariaveis {
  chave: ChaveDoGrupo;
  grupo: string;
  itens: readonly Variavel[];
}

/** Um campo personalizado do catálogo da 2C: a chave gravada e o rótulo. */
export interface CampoDaVariavel {
  chave: string;
  rotulo: string;
}

export type CamposPorObjeto = Partial<Record<ObjetoDaVariavel, readonly CampoDaVariavel[]>>;

/** O único extra que existe hoje: a saudação da campanha (D4). */
export type ExtraDasVariaveis = "saudacao";

export const TOKEN_DA_SAUDACAO = "{{saudacao}}";

const v = (token: string, rotulo: string, disponivel = true): Variavel => ({
  token,
  rotulo,
  disponivel,
});

export const GRUPOS_DE_VARIAVEIS: readonly GrupoDeVariaveis[] = [
  {
    chave: "DEAL",
    grupo: "Negócio",
    itens: [
      v("[DEAL.DATE]", "Data"),
      v("[DEAL.STATUS]", "Status"),
      v("[DEAL.STAGE]", "Etapa"),
      v("[DEAL.VALUE]", "Valor"),
      v("[DEAL.LATEST_MEETING_LINK]", "Link do último agendamento"),
      v("[DEAL.LATEST_MEETING_DATETIME]", "Data do último agendamento"),
      v("[DEAL.ID]", "ID do negócio"),
    ],
  },
  {
    chave: "CONTACT",
    grupo: "Contato",
    itens: [
      v("[CONTACT.NAME]", "Nome"),
      v("[CONTACT.FIRST_NAME]", "Primeiro nome"),
      v("[CONTACT.LAST_NAME]", "Sobrenome"),
      v("[CONTACT.ROLE]", "Cargo"),
      v("[CONTACT.EMAIL]", "Email"),
      v("[CONTACT.PHONE]", "Telefone"),
      v("[CONTACT.ID]", "ID do contato"),
    ],
  },
  {
    chave: "ORGANIZATION",
    grupo: "Empresa",
    itens: [
      v("[ORGANIZATION.NAME]", "Nome da empresa"),
      v("[ORGANIZATION.URL]", "URL", false),
      v("[ORGANIZATION.CITY]", "Cidade"),
      v("[ORGANIZATION.STATE]", "Estado"),
      v("[ORGANIZATION.SEGMENT]", "Segmento", false),
      v("[ORGANIZATION.CATEGORY]", "Categoria", false),
      v("[ORGANIZATION.EMPLOYEES]", "Número de funcionários", false),
    ],
  },
  {
    chave: "USER",
    grupo: "Usuário",
    itens: [
      v("[USER.FIRST_NAME]", "Primeiro nome"),
      v("[USER.LAST_NAME]", "Segundo nome"),
      v("[USER.EMAIL]", "Email"),
      v("[USER.ORGANIZATION.NAME]", "Nome da empresa"),
      v("[USER.PHONE]", "Telefone", false),
      v("[USER.WHATSAPP]", "WhatsApp", false),
      v("[USER.LINK]", "Link", false),
      v("[USER.IDENTIFIER]", "Identificador", false),
    ],
  },
];

const OBJETO_DO_GRUPO: Partial<Record<ChaveDoGrupo, ObjetoDaVariavel>> = {
  DEAL: "negocio",
  CONTACT: "contato",
  ORGANIZATION: "empresa",
};

export const ENTIDADE_DO_OBJETO: Record<ObjetoDaVariavel, "DEAL" | "CONTACT" | "ORGANIZATION"> = {
  negocio: "DEAL",
  contato: "CONTACT",
  empresa: "ORGANIZATION",
};

/** A chave do campo no formato da Clint: maiúsculas, e o que não é letra, número ou _ vira _. */
export const chaveDaVariavel = (chave: string): string =>
  chave.toUpperCase().replace(/[^A-Z0-9_]/g, "_");

export const tokenDoCampo = (objeto: ObjetoDaVariavel, chave: string): string =>
  `[${ENTIDADE_DO_OBJETO[objeto]}.${chaveDaVariavel(chave)}]`;

/**
 * Os grupos prontos para o seletor: só os campos disponíveis, os personalizados
 * no FIM do grupo do seu objeto (como a Clint) e, se pedido, "Outros" no fim.
 */
export function gruposComCampos(
  campos: CamposPorObjeto = {},
  extras: readonly ExtraDasVariaveis[] = [],
): GrupoDeVariaveis[] {
  const grupos: GrupoDeVariaveis[] = GRUPOS_DE_VARIAVEIS.map((g) => {
    const objeto = OBJETO_DO_GRUPO[g.chave];
    const fixos = g.itens.filter((i) => i.disponivel);
    const jaUsados = new Set(fixos.map((i) => i.token));
    const personalizados = objeto
      ? (campos[objeto] ?? [])
          .map((c) => v(tokenDoCampo(objeto, c.chave), c.rotulo))
          .filter((i) => !jaUsados.has(i.token))
      : [];
    return { ...g, itens: [...fixos, ...personalizados] };
  });
  if (extras.includes("saudacao")) {
    grupos.push({ chave: "OUTROS", grupo: "Outros", itens: [v(TOKEN_DA_SAUDACAO, "Saudação")] });
  }
  return grupos;
}

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * A busca do popover: casa pelo rótulo do campo ou do grupo, sem acento. O
 * grupo sem resultado some. `t` traduz rótulo e grupo antes de comparar.
 */
export function filtrarGrupos(
  grupos: readonly GrupoDeVariaveis[],
  busca: string,
  t: (s: string) => string = (s) => s,
): GrupoDeVariaveis[] {
  const termo = semAcento(busca.trim());
  if (!termo) return [...grupos];
  return grupos
    .map((g) => {
      const doGrupo = semAcento(t(g.grupo)).includes(termo);
      return {
        ...g,
        itens: g.itens.filter((i) => doGrupo || semAcento(t(i.rotulo)).includes(termo)),
      };
    })
    .filter((g) => g.itens.length > 0);
}

/** O rótulo de um token (para o chip da prévia e a caixa "Primeiro nome"). */
export function rotuloDoToken(
  token: string,
  campos: CamposPorObjeto = {},
): { rotulo: string; grupo: ChaveDoGrupo } | null {
  for (const g of gruposComCampos(campos, ["saudacao"])) {
    const achado = g.itens.find((i) => i.token === token);
    if (achado) return { rotulo: achado.rotulo, grupo: g.chave };
  }
  return null;
}
