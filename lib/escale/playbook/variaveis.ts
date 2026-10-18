/**
 * AS VARIÁVEIS DA MENSAGEM (fork Escale, Fase 1I; P10): o formato da Clint
 * (`[CONTACT.FIRST_NAME]`), com o que o Escale tem, inclusive os campos
 * personalizados do CRM (`[DEAL.<CHAVE>]` e `[CONTACT.<CHAVE>]`). A atividade guarda o
 * texto com as variáveis; a troca é feita na tela, na hora de mostrar o balão e
 * de enviar (a Clint também resolve no front). A variável sem valor vira vazio,
 * e a desconhecida (checkout, agendamento, IDs) fica como está.
 */
export interface VariavelDaMensagem {
  nome: string;
  rotulo: string;
}

export interface GrupoDeVariaveis {
  grupo: string;
  itens: readonly VariavelDaMensagem[];
}

export const VARIAVEIS_DA_MENSAGEM: readonly GrupoDeVariaveis[] = [
  {
    grupo: "Negócio",
    itens: [
      { nome: "[DEAL.STAGE]", rotulo: "Etapa" },
      { nome: "[DEAL.VALUE]", rotulo: "Valor" },
    ],
  },
  {
    grupo: "Contato",
    itens: [
      { nome: "[CONTACT.NAME]", rotulo: "Nome" },
      { nome: "[CONTACT.FIRST_NAME]", rotulo: "Primeiro nome" },
      { nome: "[CONTACT.LAST_NAME]", rotulo: "Sobrenome" },
      { nome: "[CONTACT.EMAIL]", rotulo: "Email" },
      { nome: "[CONTACT.PHONE]", rotulo: "Telefone" },
    ],
  },
  {
    grupo: "Usuário",
    itens: [
      { nome: "[USER.FIRST_NAME]", rotulo: "Primeiro nome" },
      { nome: "[USER.LAST_NAME]", rotulo: "Segundo nome" },
      { nome: "[USER.EMAIL]", rotulo: "Email" },
    ],
  },
  { grupo: "Empresa", itens: [{ nome: "[ORGANIZATION.NAME]", rotulo: "Nome da empresa" }] },
];

/** Um campo personalizado do CRM (`settings.fields` da origem): a chave e o rótulo. */
export interface CampoDaVariavel {
  chave: string;
  rotulo: string;
}

/** A chave do campo no formato da Clint (`[DEAL.<CHAVE>]`): maiúsculas, e o que não é letra, número ou _ vira _. */
export const chaveDaVariavel = (chave: string) => chave.toUpperCase().replace(/[^A-Z0-9_]/g, "_");

/** Os grupos fixos mais os campos personalizados: em "Negócio" (valor do negócio) e em "Contato" (valor do contato). */
export function gruposDeVariaveis(campos: readonly CampoDaVariavel[] = []): GrupoDeVariaveis[] {
  const doCampo = (entidade: "DEAL" | "CONTACT") =>
    campos.map((c) => ({ nome: `[${entidade}.${chaveDaVariavel(c.chave)}]`, rotulo: c.rotulo }));
  return VARIAVEIS_DA_MENSAGEM.map((g) =>
    g.grupo === "Negócio"
      ? { ...g, itens: [...g.itens, ...doCampo("DEAL")] }
      : g.grupo === "Contato"
        ? { ...g, itens: [...g.itens, ...doCampo("CONTACT")] }
        : g,
  );
}

export interface DadosDasVariaveis {
  contato: { nome: string | null; email: string | null; telefone: string | null };
  negocio: { etapa: string | null; valor: string | null };
  usuario: { nome: string | null; email: string | null };
  empresa: { nome: string | null };
  /** Os campos personalizados, já em texto, pela variável inteira (`"[DEAL.PLANO]": "Ouro"`). */
  campos?: Readonly<Record<string, string>>;
}

const partes = (nome: string | null) => (nome ?? "").trim().split(/\s+/).filter(Boolean);

export function resolverVariaveis(texto: string, d: DadosDasVariaveis): string {
  const contato = partes(d.contato.nome);
  const usuario = partes(d.usuario.nome);
  const valores: Record<string, string> = {
    ...(d.campos ?? {}),
    "[DEAL.STAGE]": d.negocio.etapa ?? "",
    "[DEAL.VALUE]": d.negocio.valor ?? "",
    "[CONTACT.NAME]": contato.join(" "),
    "[CONTACT.FIRST_NAME]": contato[0] ?? "",
    "[CONTACT.LAST_NAME]": contato.slice(1).join(" "),
    "[CONTACT.EMAIL]": d.contato.email ?? "",
    "[CONTACT.PHONE]": d.contato.telefone ?? "",
    "[USER.FIRST_NAME]": usuario[0] ?? "",
    "[USER.LAST_NAME]": usuario.slice(1).join(" "),
    "[USER.EMAIL]": d.usuario.email ?? "",
    "[ORGANIZATION.NAME]": d.empresa.nome ?? "",
  };
  return texto.replace(/\[[A-Z0-9_]+(?:\.[A-Z0-9_]+)+\]/g, (v) => (v in valores ? valores[v]! : v));
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrarVariaveis(
  busca: string,
  t: (s: string) => string,
  campos: readonly CampoDaVariavel[] = [],
): GrupoDeVariaveis[] {
  const termo = semAcento(busca.trim());
  const grupos = gruposDeVariaveis(campos);
  if (!termo) return grupos;
  return grupos
    .map((g) => ({
      grupo: g.grupo,
      itens: g.itens.filter(
        (v) => semAcento(t(v.rotulo)).includes(termo) || semAcento(t(g.grupo)).includes(termo),
      ),
    }))
    .filter((g) => g.itens.length > 0);
}

export function inserirNoCursor(
  texto: string,
  inicio: number,
  fim: number,
  variavel: string,
): { texto: string; cursor: number } {
  const a = Math.max(0, Math.min(inicio, texto.length));
  const b = Math.max(a, Math.min(fim, texto.length));
  return { texto: texto.slice(0, a) + variavel + texto.slice(b), cursor: a + variavel.length };
}
