"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AvisoDePropostaEmDestaque } from "@/components/shell/AvisoDePropostaEmDestaque";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useAvisosDaOrigem } from "@/hooks/escale/useAvisosDaOrigem";
import { useT } from "@/hooks/i18n/useT";
import {
  acoesDeCriar,
  entradaDaIa,
  itemAtivo,
  montarMenuDoTopo,
  type GrupoDoMais,
} from "@/lib/escale/menu-do-topo";
import { searchable } from "@/lib/navigation/registry";
import { cn } from "@/lib/utils";

import { AjudaDoTopo } from "./AjudaDoTopo";
import { BotaoDaIa } from "./BotaoDaIa";
import { ContadorDaFilaDaCasca } from "./ContadorDaFilaDaCasca";
import { MarcaNoTopo } from "./MarcaNoTopo";
import { MenuDaConta } from "./MenuDaConta";
import { NovoDoTopo } from "./NovoDoTopo";
import { PainelMais } from "./PainelMais";

/**
 * Item do topo da Clint (01-010, ÷ 1,25): texto 14/400 `#2F2C5D`, padding
 * lateral de 9px e nenhum gap entre os blocos.
 * - Ativo: fundo de altura inteira na cor da marca bem clara (`#F8F6FD` na
 *   Clint), em semibold, sem sublinhado.
 * - Hover: são os tokens da Clint (`navHover` rgba(0,0,0,.03) e texto na cor da
 *   marca). O print do hover falta.
 */
const ITEM = "flex shrink-0 items-center gap-1.5 whitespace-nowrap px-[9px] text-sm text-casca-texto transition-colors";
const ITEM_ATIVO = "bg-casca-marca-suave font-semibold";
const ITEM_PARADO = "hover:bg-black/[.03] hover:text-casca-marca";

/**
 * A barra do topo da casca nova (md+), igual à da Clint na variante "menu
 * superior". No celular a casca mostra a `TopBar` de sempre (gaveta + barra
 * inferior), então este componente se esconde abaixo de `md`.
 *
 * Medidas (01-010, ÷ 1,25; janela de 1536px):
 *   - altura de 44px com a borda;
 *   - marca a 18px da esquerda e 18px até o 1º item;
 *   - ▾ do avatar a 14px da direita;
 *   - 18px entre as peças do lado direito.
 */
export function MenuDoTopo() {
  useAvisosDaOrigem(); // FORK ESCALE · Fase 1K (D15): os avisos da origem dentro do app.
  const t = useT();
  const pathname = usePathname() ?? "/app";
  const { user, activeOrg } = useAuth();
  const visiveis = useMemo(
    () =>
      searchable(
        user.is_platform_admin && !user.support,
        activeOrg?.role ?? null,
        activeOrg?.interface_settings,
        activeOrg?.modulos_ligados ?? [],
        activeOrg?.capacidades_ligadas ?? [],
      ),
    [
      user.is_platform_admin,
      user.support,
      activeOrg?.role,
      activeOrg?.interface_settings,
      activeOrg?.modulos_ligados,
      activeOrg?.capacidades_ligadas,
    ],
  );
  const menu = useMemo(() => montarMenuDoTopo(visiveis), [visiveis]);
  const acoes = useMemo(() => acoesDeCriar(visiveis, activeOrg?.role ?? null), [visiveis, activeOrg?.role]);

  return (
    <header
      data-testid="menu-do-topo"
      className="sticky top-0 z-30 hidden h-11 shrink-0 items-stretch border-b border-casca-borda bg-surface pl-[18px] pr-[14px] md:flex"
    >
      <div className="flex shrink-0 items-center pr-[18px]">
        <MarcaNoTopo />
      </div>
      <nav aria-label={t("Menu principal")} className="flex min-w-0 items-stretch overflow-x-auto">
        {menu.topo.map((item) => {
          const ativo = itemAtivo(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.destino ?? item.href}
              // A entrada de Negócios só redireciona: pré-carregar não adianta nada.
              prefetch={item.destino ? false : undefined}
              aria-current={ativo ? "page" : undefined}
              className={cn(ITEM, ativo ? ITEM_ATIVO : ITEM_PARADO)}
            >
              {t(item.rotulo)}
              {item.contador === "fila" && (
                <ContadorDaFilaDaCasca limite={99} className="h-[14px] min-w-[14px] px-[5px] text-[9px]" />
              )}
            </Link>
          );
        })}
      </nav>
      {menu.mais.length > 0 && <BotaoMais grupos={menu.mais} pathname={pathname} />}
      <div className="ml-auto flex shrink-0 items-center gap-[18px] pl-4">
        <BotaoDaIa destino={entradaDaIa(visiveis)} />
        <AjudaDoTopo />
        <NovoDoTopo acoes={acoes} />
        <MenuDaConta veAvisos={visiveis.some((d) => d.href === "/app/ai/inbox")} />
        <AvisoDePropostaEmDestaque />
      </div>
    </header>
  );
}

/** "⠿ Mais": 4 pontos (2×2) antes do rótulo, com 5px a mais de espaço antes (01-010 x 901→930). */
function BotaoMais({ grupos, pathname }: { grupos: GrupoDoMais[]; pathname: string }) {
  const t = useT();
  // O painel fica aberto "nesta tela": trocar de tela fecha sem precisar de efeito
  // (estado derivado, e não setState dentro de useEffect).
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const ancora = useRef<HTMLDivElement>(null);

  // Clique fora ou Esc fecham o painel.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (ancora.current && !ancora.current.contains(e.target as Node)) setAbertoEm(null);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbertoEm(null);
    };
    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <div ref={ancora} className="relative ml-[5px] flex shrink-0 items-stretch">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAbertoEm((v) => (v === pathname ? null : pathname))}
        className={cn(ITEM, aberto ? ITEM_ATIVO : ITEM_PARADO)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="currentColor">
          <circle cx="2" cy="2" r="1.6" />
          <circle cx="8" cy="2" r="1.6" />
          <circle cx="2" cy="8" r="1.6" />
          <circle cx="8" cy="8" r="1.6" />
        </svg>
        {t("Mais")}
      </button>
      {aberto && <PainelMais grupos={grupos} pathnameAtual={pathname} onNavegar={() => setAbertoEm(null)} />}
    </div>
  );
}
