import { chaveDaEtiqueta, normalizarCorDeEtiqueta } from "@/lib/tags/cor-da-etiqueta";

/**
 * AS 16 CORES DAS TAGS NA CASCA (fork Escale; prints em docs/escale/prints/tags).
 *
 * Os matizes são os da Clint (a CHAVE gravada em `settings.tags[].cor`), mas o
 * par do chip é nosso: a Clint é clara demais e tem tons quase iguais (pedido do
 * usuário, 27/10). Cada tom ganha luz (0,80–0,92) e croma (0,04–0,12) próprios,
 * com o matiz a até 8° do da Clint, para que NENHUM par de fundos fique abaixo de
 * ΔE OKLab 0,07 (antes: 0,009). Texto do mesmo matiz, escurecido até o contraste
 * chegar a 5,0. Os testes cobram contraste ≥ 4,5 e separação ≥ 0,07.
 * Tag sem cor ganha um tom pelo nome — determinístico e sem gravar nada.
 */
export type TomDeTag = { chave: string; nome: string; fundo: string; texto: string };

export const PALETA_DA_CASCA: readonly TomDeTag[] = [
  { chave: "#e91e63", nome: "Rosa", fundo: "#fe9cb6", texto: "#820f40" },
  { chave: "#f44336", nome: "Vermelho", fundo: "#ffc4c2", texto: "#9c2933" },
  { chave: "#ff5722", nome: "Laranja-escuro", fundo: "#ffa37f", texto: "#7a2a00" },
  { chave: "#ff9800", nome: "Laranja", fundo: "#ffcb8a", texto: "#764b00" },
  { chave: "#ffc107", nome: "Âmbar", fundo: "#d9ba6c", texto: "#584300" },
  { chave: "#8bc34a", nome: "Verde-claro", fundo: "#9ece8c", texto: "#205300" },
  { chave: "#4caf50", nome: "Verde", fundo: "#b6f9b0", texto: "#167114" },
  { chave: "#009688", nome: "Verde-água", fundo: "#86fcf2", texto: "#006e68" },
  { chave: "#9c27b0", nome: "Roxo", fundo: "#f9b5f6", texto: "#7d2d7d" },
  { chave: "#673ab7", nome: "Roxo-escuro", fundo: "#e9deff", texto: "#7148a9" },
  { chave: "#3f51b5", nome: "Índigo", fundo: "#bdc3ff", texto: "#43409f" },
  { chave: "#2196f3", nome: "Azul", fundo: "#77c7ff", texto: "#004b73" },
  { chave: "#03a9f4", nome: "Azul-claro", fundo: "#a9e2ff", texto: "#006082" },
  { chave: "#00bcd4", nome: "Ciano", fundo: "#54dfeb", texto: "#00585e" },
  { chave: "#607d8b", nome: "Cinza-azulado", fundo: "#a5c4cf", texto: "#004d60" },
  { chave: "#795548", nome: "Marrom", fundo: "#d6b6a8", texto: "#7b2d00" },
];

/** Os 8 tons do Deskcomm (lib/tags/cor-da-etiqueta) → o tom mais próximo dos 16. Leitura, sem migration. */
export const TOM_ANTIGO: Readonly<Record<string, string>> = {
  "#ffe629": "#ffc107",
  "#ffb224": "#ff9800",
  "#cf3716": "#f44336",
  "#00655a": "#009688",
  "#0091ff": "#2196f3",
  "#3e63dd": "#3f51b5",
  "#ab4aba": "#9c27b0",
  "#6f6f6f": "#607d8b",
};

const POR_CHAVE = new Map(PALETA_DA_CASCA.map((t) => [t.chave, t]));
/** Sem cor e sem nome: o Azul (o padrão que a casca já usava). */
const PADRAO = PALETA_DA_CASCA[11]!;

/** O tom automático de uma tag sem cor: sempre o mesmo para o mesmo nome. */
export function chaveAutomatica(tag: string): string {
  let soma = 0;
  for (const ch of chaveDaEtiqueta(tag)) soma = (soma * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETA_DA_CASCA[soma % PALETA_DA_CASCA.length]!.chave;
}

export function tomDaTag(cor: string | null | undefined, tag?: string): TomDeTag {
  const normalizada = normalizarCorDeEtiqueta(cor);
  const chave = normalizada ? (TOM_ANTIGO[normalizada] ?? normalizada) : null;
  const gravado = chave ? POR_CHAVE.get(chave) : undefined;
  if (gravado) return gravado;
  return tag ? POR_CHAVE.get(chaveAutomatica(tag))! : PADRAO;
}
