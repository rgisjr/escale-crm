"use client";
import Link from "next/link";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useMarcaDaInstalacao } from "@/lib/branding/contexto";
import { cn } from "@/lib/utils";

/**
 * A logo (Configurações › Marca, ou a da instalação em /admin/marca) sozinha; o
 * nome fica no `aria-label` do link (pedido do usuário, 27/10). Sem logo, o nome
 * escrito na cor `--color-escale-marca`. Mesma precedência de `components/shell/Sidebar.tsx`:
 * marca da organização acima da marca da instalação.
 */
export function MarcaNoTopo() {
  const { activeOrg } = useAuth();
  const brand = useMarcaDaInstalacao();
  const nome = activeOrg?.marca?.nome ?? brand.name;
  const logo = activeOrg?.marca?.logoUrl || brand.logoUrl;
  const logoEscuro =
    activeOrg?.marca?.logoDarkUrl !== undefined
      ? activeOrg.marca.logoDarkUrl
      : activeOrg?.marca?.logoUrl
        ? null
        : brand.logoDarkUrl;

  return (
    <Link href="/app" className="flex shrink-0 items-center" aria-label={nome}>
      {logo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt=""
            aria-hidden
            className={cn("h-7 w-auto max-w-[10rem] object-contain", logoEscuro && "dark:hidden")}
          />
          {logoEscuro ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoEscuro}
              alt=""
              aria-hidden
              className="hidden h-7 w-auto max-w-[10rem] object-contain dark:block"
            />
          ) : null}
        </>
      ) : (
        <span
          className="max-w-[12rem] truncate text-lg font-bold tracking-tight"
          style={{ color: "var(--color-escale-marca)" }}
        >
          {nome}
        </span>
      )}
    </Link>
  );
}
