import { dadosDeFiltro, type ConversaDoFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import { tomDaTag } from "@/lib/escale/tags/paleta";
import { MOEDA_PADRAO, simboloDaMoeda } from "@/lib/money";
import type { Lead } from "@/lib/types/leads";

/**
 * AS REGRAS DO QUE O QUADRO DA CASCA ESCREVE (fork Escale, Casca V4; 01-010,
 * prints de 15/10 e design system §6.10–6.11 em `docs/escale/clint/`). Puras, para
 * o card e a coluna não decidirem formato na tela.
 */

/**
 * O texto da contagem já traduzido (`"{n} oportunidades de {negocio}"`) em duas
 * partes, em volta do "Negócio" em negrito da Clint. Número real e plural (D14).
 */
export function partesDaContagem(modelo: string, n: number): { antes: string; depois: string } {
  const [antes = "", depois = ""] = modelo.replace("{n}", String(n)).split("{negocio}");
  return { antes, depois };
}

function simbolo(moeda: string): string {
  try {
    return simboloDaMoeda(moeda);
  } catch {
    return moeda;
  }
}

const umaCasa = (x: number) =>
  (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "").replace(".", ",");
const inteiro = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);

/** O valor do card como a Clint escreve: "R$0", "R$950", "R$64,8k", "R$1,2M" (D12). */
export function valorCurto(
  cents: number | null | undefined,
  moeda: string | null | undefined,
): string {
  const s = simbolo(moeda ?? MOEDA_PADRAO);
  const v = (cents ?? 0) / 100;
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${s}${umaCasa(v / 1_000_000)}M`;
  if (a >= 1_000) return `${s}${umaCasa(v / 1_000)}k`;
  return `${s}${Math.round(v)}`;
}

/**
 * O total da coluna: "R$0" quando ninguém tem valor (a Clint mostra "undefined0":
 * bug que não se copia), "R$12.500" com uma moeda, moedas diferentes lado a lado
 * e nunca somadas (#1531). A moeda padrão vem primeiro.
 */
export function totalDaColuna(
  leads: ReadonlyArray<Pick<Lead, "value_cents" | "currency">>,
): string {
  const porMoeda = new Map<string, number>();
  for (const l of leads) {
    if (l.value_cents == null) continue;
    const moeda = l.currency ?? MOEDA_PADRAO;
    porMoeda.set(moeda, (porMoeda.get(moeda) ?? 0) + l.value_cents);
  }
  if (porMoeda.size === 0) return `${simbolo(MOEDA_PADRAO)}0`;
  return [...porMoeda.entries()]
    .sort(([a], [b]) => (a === MOEDA_PADRAO ? -1 : b === MOEDA_PADRAO ? 1 : a.localeCompare(b)))
    .map(([moeda, cents]) => `${simbolo(moeda)}${inteiro(cents / 100)}`)
    .join(" + ");
}

/** Tempo na etapa como nos prints ("31h", "3d"): horas até 47h, depois dias (D11). */
export function idadeNaEtapa(horas: number | null): string {
  if (horas == null) return "";
  const h = Math.max(0, Math.floor(horas));
  return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

const dois = (n: number) => String(n).padStart(2, "0");

/** A data da última mensagem: "10:31" quando é de hoje, "23/09" nos outros dias. */
export function dataDaMensagem(iso: string | null | undefined, agora: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoje =
    d.getFullYear() === agora.getFullYear() &&
    d.getMonth() === agora.getMonth() &&
    d.getDate() === agora.getDate();
  return hoje
    ? `${dois(d.getHours())}:${dois(d.getMinutes())}`
    : `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`;
}

/** Tons Material 700 (os avatares de inicial da Clint: `#7B1FA2`, `#0097A7`), só os que seguram letra branca. */
const MATERIAL_700 = [
  "#D32F2F",
  "#C2185B",
  "#7B1FA2",
  "#512DA8",
  "#303F9F",
  "#1976D2",
  "#0288D1",
  "#0097A7",
  "#00796B",
  "#388E3C",
  "#689F38",
  "#F57C00",
  "#E64A19",
  "#5D4037",
  "#616161",
  "#455A64",
] as const;

/** A cor do avatar de inicial: sempre a mesma para a mesma pessoa. */
export function corDoAvatar(id: string): string {
  let soma = 0;
  for (const ch of id) soma = (soma * 31 + ch.charCodeAt(0)) >>> 0;
  return MATERIAL_700[soma % MATERIAL_700.length]!;
}

export function inicialDoNome(nome: string | null | undefined): string {
  const limpo = (nome ?? "").trim();
  return limpo ? limpo[0]!.toUpperCase() : "?";
}

/** O par do chip (fundo, texto) do tom da tag: os 16 da Clint, medidos (lib/escale/tags/paleta). */
export function coresDaTag(cor: string | null | undefined, tag?: string): { fundo: string; texto: string } {
  const { fundo, texto } = tomDaTag(cor, tag);
  return { fundo, texto };
}

/** O nome do card: o do contato; sem ele, o título do negócio (D1). */
export function tituloDoCard(lead: Lead): string {
  return dadosDeFiltro(lead)?.contato_nome?.trim() || lead.title;
}

/** "concluídas/total" do rodapé: total = concluídas + em aberto. */
export function atividadesDoCard(lead: Lead): {
  concluidas: number;
  total: number;
  atrasadas: number;
} {
  const concluidas = dadosDeFiltro(lead)?.atividades_concluidas ?? 0;
  return {
    concluidas,
    total: concluidas + (lead.tarefas?.abertas ?? 0),
    atrasadas: lead.tarefas?.atrasadas ?? 0,
  };
}

/** A última mensagem da conversa é da equipe (o ✓✓ da caixa da mensagem)? */
export function ultimaFoiDaEquipe(c: ConversaDoFiltro | null | undefined): boolean {
  if (!c?.ultima_saida) return false;
  const saida = Date.parse(c.ultima_saida);
  const entrada = c.ultima_entrada ? Date.parse(c.ultima_entrada) : Number.NaN;
  return !Number.isNaN(saida) && (Number.isNaN(entrada) || saida >= entrada);
}

/** A foto do contato pela rota que já existe (D2), ou `null`. */
export function fotoDoContato(lead: Lead): string | null {
  return lead.contact_id && dadosDeFiltro(lead)?.contato_tem_foto
    ? `/api/v1/contacts/${lead.contact_id}/avatar`
    : null;
}
