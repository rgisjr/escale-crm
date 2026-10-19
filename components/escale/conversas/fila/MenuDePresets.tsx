"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useState } from "react";

import { SeloDaCasca } from "@/components/escale/menu/SeloDaCasca";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";
import { PRESETS_DE_STATUS, ROTULO_DO_PRESET, type Preset } from "@/lib/escale/conversas/presets";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Plus,
  SlidersHorizontal,
  User,
  Users,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ICONE: Record<Preset, LucideIcon> = {
  todos: SlidersHorizontal,
  nao_lidas: MessageSquare,
  meus_em_aberto: User,
  em_aberto: Users,
  em_espera: Clock,
  fechadas: Archive,
};

const CABECALHO =
  "px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase";

/** O botão "Todos ▾" e o menu de presets (02-006, c31). "Salvos" chega na 3D. */
export function MenuDePresets({
  preset,
  aoMudar,
}: {
  preset: Preset;
  aoMudar: (p: Preset) => void;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const [aberto, setAberto] = useState(false);
  const naoLidas = useConversationCounts(activeOrg?.orgId ?? null, { unread: true }).data?.all ?? 0;
  const Icone = ICONE[preset];

  const item = (p: Preset) => {
    const Ic = ICONE[p];
    const atual = p === preset;
    return (
      <MenuPrimitive.Item
        key={p}
        className={cn(ITEM_DO_MENU, "h-9 text-[12px]", atual && "text-casca-marca")}
        onSelect={() => aoMudar(p)}
      >
        <Ic size={16} aria-hidden />
        <span className="flex-1">{t(ROTULO_DO_PRESET[p])}</span>
        {p === "nao_lidas" && naoLidas > 0 ? (
          <SeloDaCasca
            valor={naoLidas}
            limite={99}
            rotulo={t("Não lidas")}
            className="h-4 min-w-4 px-1.5 text-[10px]"
          />
        ) : null}
        {atual ? <Check size={14} aria-hidden /> : null}
      </MenuPrimitive.Item>
    );
  };

  return (
    <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-casca-gatilho border px-2.5 text-[12px] font-medium text-casca-texto",
            aberto ? "border-casca-marca" : "border-casca-borda hover:bg-casca-raia",
          )}
        >
          <Icone size={14} aria-hidden className="text-casca-suave" />
          {t(ROTULO_DO_PRESET[preset])}
          {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
        </button>
      </DropdownMenuTrigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="start"
          sideOffset={6}
          className={cn(CAIXA_DO_MENU, "w-[224px]")}
        >
          {item("todos")}
          {item("nao_lidas")}
          <p className={CABECALHO}>{t("Status")}</p>
          {PRESETS_DE_STATUS.map(item)}
          <p className={CABECALHO}>{t("Salvos")}</p>
          <MenuPrimitive.Item
            disabled
            title={t("Em breve")}
            className={cn(
              ITEM_DO_MENU,
              "h-9 text-[12px] text-casca-marca disabled:text-casca-marca disabled:opacity-60",
            )}
          >
            <Plus size={16} aria-hidden />
            {t("Criar filtro")}
          </MenuPrimitive.Item>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </DropdownMenu>
  );
}
