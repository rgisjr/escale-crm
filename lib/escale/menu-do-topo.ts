/**
 * O MENU DO TOPO (fork Escale): igual ao da Clint na variante "menu superior"
 * (V2 da casca igual à Clint). São 7 itens fixos e mais o "⠿ Mais".
 *
 * Não decide permissão. Recebe a lista de telas que a pessoa PODE ver
 * (`searchable()` do registro — a mesma régua da barra lateral e do ⌘K) e só
 * reparte:
 *   - item do topo que a pessoa não pode ver some;
 *   - toda tela visível que não está no topo vai para o "Mais", na ordem de
 *     grupos e seções do registro.
 * Empresas, Agenda e Agentes IA saíram do topo (a Clint não os tem lá) e caem no
 * "Mais" por essa mesma regra.
 */
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { NAV_GROUPS, type NavDestination, type NavGroup } from "@/lib/navigation/registry";

export interface ItemDoTopo {
  /** A tela do registro: decide permissão (`montarMenuDoTopo`) e o "ativo". */
  href: string;
  /** Para onde o clique leva, quando não é o próprio `href` (Fase 1B). */
  destino?: string;
  /** Chave em português do dicionário (`t(rotulo)`). */
  rotulo: string;
  contador?: "fila";
  /** Prefixos de rota em que o item aparece como atual. */
  ativoEm: readonly string[];
}

export const ITENS_DO_TOPO: readonly ItemDoTopo[] = [
  {
    href: "/app/kanban",
    destino: "/app/escale/negocios",
    rotulo: "Negócios",
    ativoEm: ["/app/kanban", "/app/pipelines", "/app/leads"],
  },
  { href: "/app/contacts", rotulo: "Contatos", ativoEm: ["/app/contacts"] },
  { href: "/app/tasks", rotulo: "Atividades", ativoEm: ["/app/tasks"] },
  // "Atendimento" na Clint é o nosso Conversas (Inbox), com o contador da fila.
  { href: "/app/inbox", rotulo: "Atendimento", contador: "fila", ativoEm: ["/app/inbox"] },
  { href: "/app/settings/automacoes", rotulo: "Automações", ativoEm: ["/app/settings/automacoes"] },
  { href: "/app/campaigns", rotulo: "Campanhas", ativoEm: ["/app/campaigns"] },
  { href: "/app/metrics", rotulo: "Indicadores", ativoEm: ["/app/metrics"] },
];

export interface SecaoDoMais {
  secao: string;
  itens: NavDestination[];
}

export interface GrupoDoMais {
  grupo: NavGroup;
  secoes: SecaoDoMais[];
}

export interface MenuDoTopo {
  topo: ItemDoTopo[];
  mais: GrupoDoMais[];
}

export function destinoAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?");
}

export function itemAtivo(pathname: string, item: ItemDoTopo): boolean {
  return item.ativoEm.some((prefixo) => destinoAtivo(pathname, prefixo));
}

export function montarMenuDoTopo(visiveis: readonly NavDestination[]): MenuDoTopo {
  const hrefs = new Set(visiveis.map((d) => d.href));
  const topo = ITENS_DO_TOPO.filter((i) => hrefs.has(i.href));
  const noTopo = new Set(topo.map((i) => i.href));

  const mais: GrupoDoMais[] = [];
  for (const grupo of NAV_GROUPS) {
    const porSecao = new Map<string, NavDestination[]>();
    for (const d of visiveis) {
      if (d.group !== grupo.id || noTopo.has(d.href)) continue;
      const secao = d.section ?? "";
      const lista = porSecao.get(secao);
      if (lista) lista.push(d);
      else porSecao.set(secao, [d]);
    }
    if (porSecao.size > 0) {
      mais.push({ grupo, secoes: [...porSecao.entries()].map(([secao, itens]) => ({ secao, itens })) });
    }
  }
  return { topo, mais };
}

/**
 * O que o botão "Novo +" cria. O menu aberto da Clint é print que falta, então
 * só entra o que JÁ tem tela de criar no Escale. Negócio fica de fora: criar
 * negócio pede origem e etapa, e o "Negócio +" da página do quadro é da V4.
 */
export interface AcaoDeCriar {
  id: "contato" | "campanha" | "proposta";
  /** Chave em português do dicionário (`t(rotulo)`). */
  rotulo: string;
  /** Para onde vai. `null` abre a janela de novo contato sem sair da tela. */
  destino: string | null;
  /** A tela que a pessoa precisa enxergar (papel, módulo, capacidade e interface). */
  exige: string;
  /** O papel que a rota ou a página de criar exige. */
  papel: Role;
}

export const ACOES_DE_CRIAR: readonly AcaoDeCriar[] = [
  // POST /api/v1/contacts: requireRole("agent").
  { id: "contato", rotulo: "Contato", destino: null, exige: "/app/contacts", papel: "agent" },
  // POST /api/v1/campaigns: requireRole("manager").
  { id: "campanha", rotulo: "Campanha", destino: "/app/campaigns/new", exige: "/app/campaigns", papel: "manager" },
  // app/app/proposals/novo/page.tsx: agent ou acima (e a capacidade "propostas" ligada).
  { id: "proposta", rotulo: "Proposta", destino: "/app/proposals/novo", exige: "/app/proposals", papel: "agent" },
];

export function acoesDeCriar(visiveis: readonly NavDestination[], papel: Role | null): AcaoDeCriar[] {
  const hrefs = new Set(visiveis.map((d) => d.href));
  return ACOES_DE_CRIAR.filter((a) => hrefs.has(a.exige) && roleAtLeast(papel, a.papel));
}

/**
 * A porta do ✦. Na Clint ele abre a "Aura" (assistente de IA). O Escale não tem
 * assistente global, e a porta de IA mais próxima é o hub "Agente de IA".
 */
export const ENTRADA_DA_IA = "/app/ai";

export function entradaDaIa(visiveis: readonly NavDestination[]): string | null {
  return visiveis.some((d) => d.group === "ia") ? ENTRADA_DA_IA : null;
}

/**
 * O texto do selo vermelho: "99+" no menu do topo, "+9" no botão de conversas.
 * Zero ou menos não desenha selo — número que nunca some ensina a ignorar o número.
 */
export function textoDoSelo(valor: number, limite: 9 | 99): string | null {
  if (!(valor > 0)) return null;
  if (valor <= limite) return String(Math.floor(valor));
  return limite === 99 ? "99+" : "+9";
}
