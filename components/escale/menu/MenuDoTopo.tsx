"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AlertsBell } from "@/components/shell/AlertsBell";
import { AvisoDePropostaEmDestaque } from "@/components/shell/AvisoDePropostaEmDestaque";
import { ContadorDaFila } from "@/components/shell/ContadorDaFila";
import { SearchTrigger } from "@/components/shell/SearchTrigger";
import { TenantSwitcher } from "@/components/shell/TenantSwitcher";
import { UserMenu } from "@/components/shell/UserMenu";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { itemAtivo, montarMenuDoTopo } from "@/lib/escale/menu-do-topo";
import { searchable } from "@/lib/navigation/registry";
import { CaretDown } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { MarcaNoTopo } from "./MarcaNoTopo";
import { PainelMais } from "./PainelMais";

/**
 * A barra do topo da casca nova (md+). No celular a casca mostra a `TopBar` de
 * sempre (gaveta + barra inferior), então este componente se esconde abaixo de `md`.
 */
export function MenuDoTopo() {
  const t = useT();
  const pathname = usePathname() ?? "/app";
  const { user, activeOrg } = useAuth();
  const menu = useMemo(
    () =>
      montarMenuDoTopo(
        searchable(
          user.is_platform_admin && !user.support,
          activeOrg?.role ?? null,
          activeOrg?.interface_settings,
          activeOrg?.modulos_ligados ?? [],
          activeOrg?.capacidades_ligadas ?? [],
        ),
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

  // O painel fica aberto "nesta tela": trocar de tela fecha sem precisar de efeito
  // (estado derivado, e não setState dentro de useEffect).
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const maisAberto = abertoEm === pathname;
  const ancoraDoMais = useRef<HTMLDivElement>(null);

  // Clique fora ou Esc fecham o painel.
  useEffect(() => {
    if (!maisAberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (ancoraDoMais.current && !ancoraDoMais.current.contains(e.target as Node)) setAbertoEm(null);
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
  }, [maisAberto]);

  return (
    <header
      data-testid="menu-do-topo"
      className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur md:flex"
    >
      <MarcaNoTopo />
      <TenantSwitcher />
      <nav aria-label={t("Menu principal")} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {menu.topo.map((item) => {
          const ativo = itemAtivo(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors",
                ativo
                  ? "bg-accent-soft font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
              )}
            >
              {t(item.rotulo)}
              {item.contador === "fila" && <ContadorDaFila compacto={false} />}
            </Link>
          );
        })}
      </nav>
      {menu.mais.length > 0 && (
        <div ref={ancoraDoMais} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={maisAberto}
            onClick={() => setAbertoEm((v) => (v === pathname ? null : pathname))}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              maisAberto ? "bg-accent-soft text-foreground" : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
            )}
          >
            {t("Mais")}
            <CaretDown size={14} aria-hidden />
          </button>
          {maisAberto && (
            <PainelMais grupos={menu.mais} pathnameAtual={pathname} onNavegar={() => setAbertoEm(null)} />
          )}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2">
        <div className="w-56">
          <SearchTrigger />
        </div>
        <AlertsBell />
        <AvisoDePropostaEmDestaque />
        <UserMenu />
      </div>
    </header>
  );
}
