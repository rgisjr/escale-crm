"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { CommandPalette } from "@/components/shell/CommandPalette";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgentInbox } from "@/hooks/ai/useAgentInbox";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useTrocarDeIdioma } from "@/hooks/escale/useTrocarDeIdioma";
import { useTrocarDeOrganizacao } from "@/hooks/escale/useTrocarDeOrganizacao";
import { useT } from "@/hooks/i18n/useT";
import { useSonsDaCentral } from "@/hooks/notifications/useSonsDaCentral";
import { IDIOMAS_VISIVEIS } from "@/lib/i18n/registro";
import { useTheme, type Theme } from "@/lib/theme";
import { Bell, Check, LogOut, Search, ShieldCheck } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, ROTULO_DO_MENU, SOMBRA_DO_MENU } from "./estilos";
import { SeloDaCasca } from "./SeloDaCasca";

const PROXIMO_TEMA: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };

/**
 * O AVATAR QUADRADO ▾ DA CLINT (fork Escale, casca igual à Clint — V2).
 *
 * O topo da Clint só tem ✦, "?", "Novo +" e o avatar. Tudo o que o topo do
 * original deixava solto mora aqui dentro: organização, busca ⌘K, sino, idioma,
 * tema e conta. Este componente fica montado o tempo todo na casca (md+), e por
 * isso é ele quem mantém vivo o que não pode depender do menu aberto:
 *   - o atalho ⌘K (antes no `SearchTrigger`);
 *   - o atalho ⌘⇧L (antes no `ThemeToggle`);
 *   - o som da central de avisos (antes no `AlertsBell`).
 *
 * `modal={false}`: o menu abre a paleta e outras janelas por cima. Um menu modal
 * deixaria o `pointer-events: none` do Radix preso no `body`.
 */
export function MenuDaConta({ veAvisos }: { veAvisos: boolean }) {
  return veAvisos ? <MenuComAvisos /> : <Menu avisos={null} />;
}

function MenuComAvisos() {
  const { data } = useAgentInbox("open");
  // O som da organização para o aviso que pede gente — o mesmo do sino do original.
  useSonsDaCentral(data?.items);
  return <Menu avisos={data?.open_count ?? 0} />;
}

function Menu({ avisos }: { avisos: number | null }) {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const [buscaAberta, setBuscaAberta] = useState(false);

  // `enableOnFormTags`: o atalho vale com o cursor dentro do composer do inbox.
  useHotkeys("mod+k", () => setBuscaAberta(true), { preventDefault: true, enableOnFormTags: true });
  useHotkeys("mod+shift+l", () => setTheme(PROXIMO_TEMA[theme]), { preventDefault: true }, [theme]);

  const rotuloDosAvisos = avisos ? `${t("Central de avisos")} — ${avisos} ${t("em aberto")}` : t("Central de avisos");
  return (
    <>
      <DropdownMenu modal={false}>
        <GatilhoDoAvatar avisos={avisos} rotuloDosAvisos={rotuloDosAvisos} />
        <DropdownMenuContent align="end" sideOffset={8} className={cn(CONTEUDO_DO_MENU, "w-60")} style={SOMBRA_DO_MENU}>
          <CabecalhoDaConta />
          <SecaoDaOrganizacao />
          <DropdownMenuSeparator />
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => setBuscaAberta(true)}>
            <Search aria-hidden />
            {t("Buscar")}
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
          {avisos !== null ? (
            <DropdownMenuItem asChild className={ITEM_DO_MENU}>
              <Link href="/app/ai/inbox" aria-label={rotuloDosAvisos}>
                <Bell aria-hidden />
                {t("Central de avisos")}
                <SeloDaCasca
                  valor={avisos}
                  limite={99}
                  rotulo={rotuloDosAvisos}
                  className="ml-auto h-[14px] min-w-[14px] px-[5px] text-[9px]"
                />
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <SecaoDoIdioma />
          <DropdownMenuSeparator />
          <SecaoDoTema />
          <RodapeDaConta />
        </DropdownMenuContent>
      </DropdownMenu>
      <CommandPalette open={buscaAberta} onOpenChange={setBuscaAberta} />
    </>
  );
}

/** 28×28, raio 5, inicial branca; ▾ escuro 2px depois (01-010 x 1855–1901, ÷ 1,25). */
function GatilhoDoAvatar({ avisos, rotuloDosAvisos }: { avisos: number | null; rotuloDosAvisos: string }) {
  const t = useT();
  const { user } = useAuth();
  const inicial = ((user.full_name ?? "").trim() || user.email).charAt(0).toUpperCase();
  return (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={t("Menu do usuário")}
        data-testid="menu-da-conta"
        className="relative flex items-center gap-[2px] rounded-[5px] outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca"
      >
        <Avatar className="size-7 rounded-[5px]">
          {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
          <AvatarFallback className="rounded-[5px] bg-casca-marca text-base font-normal text-white">
            {inicial}
          </AvatarFallback>
        </Avatar>
        <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden className="text-casca-texto">
          <path d="M0 0h8L4 5z" fill="currentColor" />
        </svg>
        {avisos ? (
          <SeloDaCasca
            valor={avisos}
            limite={99}
            rotulo={rotuloDosAvisos}
            className="absolute -right-1 -top-1.5 h-[14px] min-w-[14px] px-1 text-[9px] ring-2 ring-surface"
          />
        ) : null}
      </button>
    </DropdownMenuTrigger>
  );
}

function CabecalhoDaConta() {
  const { user } = useAuth();
  return (
    <DropdownMenuLabel className="px-3 py-2">
      <span className="block truncate text-xs font-semibold text-casca-texto">{user.full_name ?? user.email}</span>
      <span className="block truncate text-[11px] font-normal text-casca-suave">{user.email}</span>
    </DropdownMenuLabel>
  );
}

function SecaoDaOrganizacao() {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const { trocando, trocar } = useTrocarDeOrganizacao();
  if (user.organizations.length <= 1 && !user.is_platform_admin) return null;
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className={ROTULO_DO_MENU}>{t("Organização")}</DropdownMenuLabel>
      {user.organizations.map((o) => (
        <DropdownMenuItem
          key={o.organization_id}
          className={ITEM_DO_MENU}
          disabled={trocando || !!user.support}
          title={user.support ? t("Saia do acompanhamento para trocar de organização") : undefined}
          onSelect={() => void trocar(o.organization_id)}
        >
          <Check aria-hidden className={o.organization_id === activeOrg?.orgId ? "" : "invisible"} />
          <span className="truncate">{o.organization_name}</span>
        </DropdownMenuItem>
      ))}
      {user.is_platform_admin ? (
        <DropdownMenuItem asChild className={ITEM_DO_MENU}>
          <Link href="/admin/tenants">{t("Gerenciar organizações")}</Link>
        </DropdownMenuItem>
      ) : null}
    </>
  );
}

function SecaoDoIdioma() {
  const t = useT();
  const { idioma, salvando, escolher } = useTrocarDeIdioma();
  return (
    <>
      <DropdownMenuLabel className={ROTULO_DO_MENU}>{t("Idioma")}</DropdownMenuLabel>
      {IDIOMAS_VISIVEIS.map(({ codigo, nomeNativo }) => (
        <DropdownMenuItem
          key={codigo}
          className={ITEM_DO_MENU}
          disabled={salvando}
          data-testid={`casca-idioma-${codigo}`}
          aria-current={codigo === idioma}
          onSelect={() => escolher(codigo)}
        >
          <Check aria-hidden className={codigo === idioma ? "" : "invisible"} />
          {nomeNativo}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function SecaoDoTema() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const temas: { valor: Theme; rotulo: string }[] = [
    { valor: "light", rotulo: t("Claro") },
    { valor: "dark", rotulo: t("Escuro") },
    { valor: "system", rotulo: t("Sistema") },
  ];
  return (
    <>
      <DropdownMenuLabel className={ROTULO_DO_MENU}>{t("Tema")}</DropdownMenuLabel>
      {temas.map((tm) => (
        <DropdownMenuItem key={tm.valor} className={ITEM_DO_MENU} onSelect={() => setTheme(tm.valor)}>
          <Check aria-hidden className={tm.valor === theme ? "" : "invisible"} />
          {tm.rotulo}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function RodapeDaConta() {
  const t = useT();
  const { user, signOut } = useAuth();
  const [saindo, startSaida] = useTransition();
  return (
    <>
      {user.is_platform_admin ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className={ITEM_DO_MENU}>
            <Link href="/admin" data-testid="casca-modo-administrador">
              <ShieldCheck aria-hidden />
              <span className="flex flex-col">
                <span>{t("Modo administrador")}</span>
                <span className="text-[11px] text-casca-suave">{t("Configurar este servidor")}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        </>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className={ITEM_DO_MENU}
        disabled={saindo}
        onSelect={() =>
          startSaida(async () => {
            await signOut();
          })
        }
      >
        <LogOut aria-hidden />
        {t("Sair")}
      </DropdownMenuItem>
    </>
  );
}
