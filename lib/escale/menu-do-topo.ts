/**
 * O MENU DO TOPO (fork Escale, modelo V1 da Clint): 9 itens fixos + "Mais".
 *
 * Não decide permissão: recebe a lista de telas que a pessoa PODE ver
 * (`searchable()` do registro — a mesma régua da barra lateral e do ⌘K) e só
 * reparte. Item do topo que a pessoa não pode ver some; toda tela visível que não
 * está no topo vai para o "Mais", na ordem de grupos e seções do registro.
 */
import { NAV_GROUPS, type NavDestination, type NavGroup } from "@/lib/navigation/registry";

export interface ItemDoTopo {
  href: string;
  /** Chave em português do dicionário (`t(rotulo)`). */
  rotulo: string;
  contador?: "fila";
  /** Prefixos de rota em que o item aparece como atual. */
  ativoEm: readonly string[];
}

export const ITENS_DO_TOPO: readonly ItemDoTopo[] = [
  { href: "/app/kanban", rotulo: "Negócios", ativoEm: ["/app/kanban", "/app/pipelines", "/app/leads"] },
  { href: "/app/inbox", rotulo: "Conversas", contador: "fila", ativoEm: ["/app/inbox"] },
  { href: "/app/contacts", rotulo: "Contatos", ativoEm: ["/app/contacts"] },
  { href: "/app/companies", rotulo: "Empresas", ativoEm: ["/app/companies"] },
  { href: "/app/tasks", rotulo: "Atividades", ativoEm: ["/app/tasks"] },
  { href: "/app/agenda", rotulo: "Agenda", ativoEm: ["/app/agenda"] },
  { href: "/app/ai/agents", rotulo: "Agentes IA", ativoEm: ["/app/ai/agents"] },
  { href: "/app/settings/automacoes", rotulo: "Automações", ativoEm: ["/app/settings/automacoes"] },
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
