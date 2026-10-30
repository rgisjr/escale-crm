import type { AutomacaoDaLista, FiltrosDaLista, Ordem, PastaDeAutomacao } from "./tipos";

export const NOME_MAXIMO = 80; // modal de criar e de renomear (Q11)
export const NOME_MAXIMO_DA_REGRA = 120; // o limite do original (createAutomationRuleSchema)
export const SEM_AGENTE = "sem_agente";
const SUFIXO_DA_COPIA = " (cópia)";

/** Minúsculas e sem acento: "Pós-venda" → "pos-venda". */
export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Q1: os agent_id das ações `send_ai_message` do nível de cima, na ordem, sem repetir,
 * só os que estão em `conhecidos`. Aceita `unknown` (o jsonb vem do banco).
 */
export function agentesDaRegra(actions: unknown, conhecidos: ReadonlySet<string>): string[] {
  if (!Array.isArray(actions)) return [];
  const vistos = new Set<string>();
  const ids: string[] = [];
  for (const acao of actions) {
    if (!acao || typeof acao !== "object") continue;
    const { type, config } = acao as { type?: unknown; config?: unknown };
    if (type !== "send_ai_message" || !config || typeof config !== "object") continue;
    const id = (config as { agent_id?: unknown }).agent_id;
    if (typeof id !== "string" || !conhecidos.has(id) || vistos.has(id)) continue;
    vistos.add(id);
    ids.push(id);
  }
  return ids;
}

function naVisao(a: AutomacaoDaLista, visao: FiltrosDaLista["visao"]): boolean {
  switch (visao.tipo) {
    case "todas":
      return true;
    case "favoritos":
      return a.favorita;
    case "pasta":
      return a.pastaId === visao.id;
    case "sem_pasta":
      return a.pastaId === null;
  }
}

function passaPeloAgente(a: AutomacaoDaLista, agentes: readonly string[]): boolean {
  if (agentes.length === 0) return true;
  if (a.agentes.length === 0) return agentes.includes(SEM_AGENTE);
  return a.agentes.some((id) => agentes.includes(id));
}

/** Visão + busca (sem acento, contém) + status (vazio = todos) + agentes (vazio = todos). */
export function filtrarAutomacoes(lista: readonly AutomacaoDaLista[], f: FiltrosDaLista): AutomacaoDaLista[] {
  const termo = semAcento(f.busca.trim());
  return lista.filter((a) => {
    if (!naVisao(a, f.visao)) return false;
    if (termo && !semAcento(a.nome).includes(termo)) return false;
    if (f.status.length > 0 && !f.status.includes(a.ativa ? "ativa" : "pausada")) return false;
    return passaPeloAgente(a, f.agentes);
  });
}

function porDataDesc(a: AutomacaoDaLista, b: AutomacaoDaLista): number {
  return b.atualizadaEm.localeCompare(a.atualizadaEm);
}

/** Nova lista; nome por `localeCompare("pt-BR", { sensitivity: "base" })`; status asc = ativas primeiro; empate pela data desc. */
export function ordenarAutomacoes(lista: readonly AutomacaoDaLista[], ordem: Ordem): AutomacaoDaLista[] {
  const sinal = ordem.direcao === "asc" ? 1 : -1;
  return [...lista].sort((a, b) => {
    if (ordem.coluna === "nome") {
      return sinal * a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }) || porDataDesc(a, b);
    }
    if (ordem.coluna === "status") {
      return sinal * (Number(b.ativa) - Number(a.ativa)) || porDataDesc(a, b);
    }
    return sinal * a.atualizadaEm.localeCompare(b.atualizadaEm);
  });
}

/** Página de 1 em diante; página além do fim cai na última que existe. */
export function paginar<T>(lista: readonly T[], pagina: number, porPagina: number): { itens: T[]; pagina: number } {
  const total = Math.max(1, Math.ceil(lista.length / porPagina));
  const atual = Math.min(Math.max(1, pagina), total);
  const inicio = (atual - 1) * porPagina;
  return { itens: lista.slice(inicio, inicio + porPagina), pagina: atual };
}

export interface ContagensDoTrilho {
  todas: number;
  favoritos: number;
  porPasta: Readonly<Record<string, number>>;
  semPasta: number;
}

/** Conta sobre a lista inteira (sem busca nem filtros), como o trilho da Clint. Pasta inexistente conta como "sem pasta". */
export function contagensDoTrilho(
  lista: readonly AutomacaoDaLista[],
  pastas: readonly PastaDeAutomacao[],
): ContagensDoTrilho {
  const existentes = new Set(pastas.map((p) => p.id));
  const porPasta: Record<string, number> = {};
  let favoritos = 0;
  let semPasta = 0;
  for (const a of lista) {
    if (a.favorita) favoritos += 1;
    if (a.pastaId !== null && existentes.has(a.pastaId)) {
      porPasta[a.pastaId] = (porPasta[a.pastaId] ?? 0) + 1;
    } else {
      semPasta += 1;
    }
  }
  return { todas: lista.length, favoritos, porPasta, semPasta };
}

/** L2: "Sem pasta" só aparece quando existe pasta E existe automação sem pasta. */
export function mostrarSemPasta(c: ContagensDoTrilho, quantasPastas: number): boolean {
  return quantasPastas > 0 && c.semPasta > 0;
}

/** "Vendas" → "Vendas (cópia)", cortando o nome para caber em 120. */
export function nomeDaCopia(nome: string): string {
  const base = nome.slice(0, NOME_MAXIMO_DA_REGRA - SUFIXO_DA_COPIA.length);
  return `${base}${SUFIXO_DA_COPIA}`;
}

/** 0 → "0 itens", 1 → "1 item", 2 → "2 itens". Devolve a chave e o número. */
export function textoDeItens(n: number): { chave: "{n} item" | "{n} itens"; n: string } {
  return { chave: n === 1 ? "{n} item" : "{n} itens", n: n.toLocaleString("pt-BR") };
}
