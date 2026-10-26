import { resolverTexto, type FontesDasVariaveis } from "@/lib/variaveis/resolver";

const ALIASES: Record<string, string> = {
  nome: "contact.name",
  primeiro_nome: "contact.name",
  telefone: "contact.phone_number",
  email: "contact.email",
};

/**
 * A marcação tem dono no CRM (contato ou negócio) — e por isso NÃO se preenche
 * de fora.
 *
 * Existe para quem recebe valor de terceiro (as variáveis do integrador em
 * `lib/operacao/modelos-de-mensagem.ts`): `{{nome}}` é alias de `contact.name`,
 * então um valor mandado para "nome" seria descartado em silêncio pelo render
 * — e quem mandou receberia o texto com a marcação vazia achando que preencheu.
 * A régua é por NOME, e não pelo dado: sem contato informado a marcação também
 * estaria vazia, e aí a recusa sumiria justamente no caso mais enganoso.
 */
export function marcacaoDoCrm(nome: string): boolean {
  return (
    aliasDe(nome) !== undefined ||
    nome.startsWith("contact.") ||
    nome.startsWith("lead.") ||
    /^\[[A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)+\]$/.test(nome)
  );
}

/**
 * `{{servico}}` como atalho de `{{lead.custom_fields.servico}}`.
 *
 * Quem escreve a mensagem digita o nome do campo que o formulário mandou, e não
 * o caminho interno do banco. Só vale para nome SIMPLES (sem ponto) e só como
 * ÚLTIMO recurso: alias e caminho direto continuam ganhando, então nenhum
 * template que já funcionava muda de resultado. Lista (multiselect) sai
 * separada por vírgula, que é como a pessoa leria.
 */
function campoPersonalizadoDoLead(context: Record<string, unknown>, nome: string): unknown {
  // Alias é marcação do CRM e tem dono: contato sem nome fica vazio, não pega
  // um campo do formulário que por acaso se chame igual.
  if (nome.includes(".") || aliasDe(nome) !== undefined) return undefined;
  const lead = context.lead;
  if (!lead || typeof lead !== "object") return undefined;
  const campos = (lead as { custom_fields?: unknown }).custom_fields;
  if (!campos || typeof campos !== "object" || Array.isArray(campos)) return undefined;
  // Só campo PRÓPRIO: `{{constructor}}` ou `{{toString}}` não podem puxar do protótipo.
  if (!Object.hasOwn(campos, nome)) return undefined;
  const valor = (campos as Record<string, unknown>)[nome];
  return Array.isArray(valor) ? valor.join(", ") : valor;
}

/**
 * Só PROPRIEDADE PRÓPRIA: `{{constructor}}` era procurado no protótipo do mapa
 * de aliases e derrubava o envio inteiro (achado pela cerca da Frente V).
 */
function aliasDe(nome: string): string | undefined {
  return Object.hasOwn(ALIASES, nome) ? ALIASES[nome] : undefined;
}

const CHAVES_DE_PROTOTIPO = new Set(["__proto__", "constructor", "prototype"]);

/** O caminho (`lead.title`) andando só por propriedade própria do contexto. */
function lerCaminho(context: Record<string, unknown>, path: string): unknown {
  let cur: unknown = context;
  for (const parte of path.split(".")) {
    if (cur === null || typeof cur !== "object" || CHAVES_DE_PROTOTIPO.has(parte)) return undefined;
    if (!Object.hasOwn(cur, parte)) return undefined;
    cur = (cur as Record<string, unknown>)[parte];
  }
  return cur;
}

const MARCACAO_ANTIGA = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * `formatarValor` recebe cada VALOR já resolvido, nunca o template: quem
 * renderiza para HTML escapa o que veio do contato/negócio e mantém a marcação
 * que o operador escreveu.
 *
 * Dialeto "automação" (Frente V, D10): `{{nome}}`, `{{contact.x}}`,
 * `{{lead.x}}` e `{{servico}}` seguem a regra de sempre; os tokens da Clint
 * (`[CONTACT.FIRST_NAME]`) saem de `fontes`, que o envio carrega só quando o
 * texto os usa. Sem valor, os dois viram vazio.
 */
export function renderTemplate(
  template: string,
  context: Record<string, unknown>,
  formatarValor: (valor: string) => string = (valor) => valor,
  fontes: FontesDasVariaveis | null = null,
): string {
  return resolverTexto(template, fontes, {
    vazio: "vazio",
    formatar: formatarValor,
    legado: {
      regex: MARCACAO_ANTIGA,
      trocar: (literal) =>
        literal.replace(new RegExp(MARCACAO_ANTIGA.source), (_m, path: string) => {
          const resolved =
            lerCaminho(context, aliasDe(path) ?? path) ?? campoPersonalizadoDoLead(context, path);
          // `{{primeiro_nome}}` = primeira palavra do nome, como no Inbox e na campanha.
          const texto = String(resolved ?? "");
          return formatarValor(
            path === "primeiro_nome" ? (texto.trim().split(/\s+/)[0] ?? "") : texto,
          );
        }),
    },
  }).texto;
}
