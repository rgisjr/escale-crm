/**
 * CONVERSAS › CONFIGURAÇÕES › MODELOS DE MENSAGEM (fork Escale, Frente V):
 * as regras puras da lista (print v01 da Clint): rótulos de status, categoria
 * e idioma, os filtros e o texto da prévia com as variáveis no lugar.
 */
import { lerConteudo } from "@/lib/channels/template-conteudo";
import type { MapeamentoDaLinha, MapeamentoDoModelo } from "@/lib/variaveis/mapeamento";

export interface ModeloDaConta {
  name: string;
  language: string;
  status: string;
  category: string | null;
  components: unknown[];
  contractHash: string;
  mapeamento: MapeamentoDaLinha;
}

export type TomDoStatus = "ok" | "espera" | "erro" | "neutro";

const STATUS: Record<string, { rotulo: string; tom: TomDoStatus }> = {
  APPROVED: { rotulo: "Aprovado", tom: "ok" },
  PENDING: { rotulo: "Em análise", tom: "espera" },
  IN_APPEAL: { rotulo: "Em análise", tom: "espera" },
  REJECTED: { rotulo: "Rejeitado", tom: "erro" },
  PAUSED: { rotulo: "Pausado", tom: "espera" },
  DISABLED: { rotulo: "Desativado", tom: "erro" },
};

export function statusDoModelo(status: string): { rotulo: string; tom: TomDoStatus } {
  return STATUS[status.toUpperCase()] ?? { rotulo: status, tom: "neutro" };
}

const CATEGORIAS: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilitário",
  AUTHENTICATION: "Autenticação",
};

export const categoriaDoModelo = (categoria: string | null): string =>
  categoria ? (CATEGORIAS[categoria.toUpperCase()] ?? categoria) : "—";

/** "pt_BR" → "BR", "en_US" → "US", "es" → "ES" (como a coluna IDIOMA da Clint). */
export function siglaDoIdioma(idioma: string): string {
  const [lingua, pais] = idioma.split(/[_-]/);
  return (pais ?? lingua ?? idioma).toUpperCase();
}

export interface FiltrosDosModelos {
  busca: string;
  status: string;
  categoria: string;
  idioma: string;
}

export const FILTROS_VAZIOS: FiltrosDosModelos = { busca: "", status: "", categoria: "", idioma: "" };

export function filtrarModelos(modelos: readonly ModeloDaConta[], f: FiltrosDosModelos): ModeloDaConta[] {
  const termo = f.busca.trim().toLowerCase();
  return modelos.filter(
    (m) =>
      (!termo || m.name.toLowerCase().includes(termo)) &&
      (!f.status || statusDoModelo(m.status).rotulo === f.status) &&
      (!f.categoria || categoriaDoModelo(m.category) === f.categoria) &&
      (!f.idioma || siglaDoIdioma(m.language) === f.idioma),
  );
}

/** "1 variável" / "2 variáveis" (só as que o mapeamento cobre, sem mídia). */
export const quantasVariaveis = (m: ModeloDaConta): number => m.mapeamento.slots.length;

export type PedacoDaPrevia = { tipo: "texto"; texto: string } | { tipo: "variavel"; chave: string };

/**
 * O corpo (e o cabeçalho de texto) cortado nos `{{n}}`, para a prévia trocar
 * cada um pelo chip. A chave é a do mapeamento: "1" no corpo, "header:1" no
 * cabeçalho.
 */
export function pedacosDaPrevia(components: unknown): PedacoDaPrevia[] {
  const conteudo = lerConteudo(components);
  const pedacos: PedacoDaPrevia[] = [];
  const cortar = (texto: string, prefixo: string) => {
    let resto = 0;
    for (const m of texto.matchAll(/\{\{\s*([\w]+)\s*\}\}/g)) {
      if (m.index! > resto) pedacos.push({ tipo: "texto", texto: texto.slice(resto, m.index) });
      pedacos.push({ tipo: "variavel", chave: `${prefixo}${m[1]}` });
      resto = m.index! + m[0].length;
    }
    if (resto < texto.length) pedacos.push({ tipo: "texto", texto: texto.slice(resto) });
  };
  if (conteudo.header?.texto) {
    cortar(conteudo.header.texto, "header:");
    pedacos.push({ tipo: "texto", texto: "\n\n" });
  }
  if (conteudo.body) cortar(conteudo.body, "");
  return pedacos;
}

/** Quantos slots estão definidos (o "1 de 1 resolvida" da campanha da Clint). */
export const definidos = (m: ModeloDaConta, mapa: MapeamentoDoModelo): number =>
  m.mapeamento.slots.filter((s) => mapa[s.chave] !== undefined).length;
