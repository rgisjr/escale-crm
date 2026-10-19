"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";

import { SeloDaCasca } from "@/components/escale/menu/SeloDaCasca";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/auth/AuthProvider";
import {
  useExcluirFiltroDaLista,
  useFiltrosDaLista,
  useMudarFiltroDaLista,
} from "@/hooks/escale/useFiltrosDaLista";
import { useT } from "@/hooks/i18n/useT";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";
import {
  PAINEL_DO_PRESET,
  PAINEL_DO_PRESET_DE_GRUPO,
  PRESETS_DE_GRUPO,
  ROTULO_DO_PRESET_DE_GRUPO,
  rotuloDoBotao,
  type FiltrosDoPainel,
  type PresetDeGrupo,
} from "@/lib/escale/conversas/filtros-da-fila";
import { PRESETS_DE_STATUS, ROTULO_DO_PRESET, type Preset } from "@/lib/escale/conversas/presets";
import {
  Archive,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  EllipsisVertical,
  MessageSquare,
  Plus,
  SlidersHorizontal,
  User,
  Users,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { JanelaRenomearFiltro } from "./JanelaRenomearFiltro";

const ICONE: Record<Preset, LucideIcon> = {
  todos: SlidersHorizontal,
  nao_lidas: MessageSquare,
  meus_em_aberto: User,
  em_aberto: Users,
  em_espera: Clock,
  fechadas: Archive,
};
const ICONE_DE_GRUPO: Record<PresetDeGrupo, LucideIcon> = {
  somente_conversas: MessageSquare,
  somente_grupos: Users,
};
const CABECALHO =
  "px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase";

/**
 * O botão de presets e o menu (fork Escale, Fases 3A e 3D; c31, c71, 02-006): o
 * texto é o preset, o salvo aplicado ou "Personalizado"; "SALVOS" lista os meus e
 * os compartilhados, com o ⋮ nos meus (Renomear, Compartilhar, Excluir); "Criar
 * filtro" abre o painel (não é janela, como na Clint).
 */
export function MenuDePresets({
  painel,
  aoMudarPainel,
  aoCriarFiltro,
  temGrupos,
}: {
  painel: FiltrosDoPainel;
  aoMudarPainel: (f: FiltrosDoPainel) => void;
  aoCriarFiltro: () => void;
  temGrupos: boolean;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [renomeando, setRenomeando] = useState<{ id: string; nome: string } | null>(null);
  const { data: salvos = [] } = useFiltrosDaLista("conversas");
  const excluir = useExcluirFiltroDaLista("conversas");
  const mudar = useMudarFiltroDaLista("conversas");
  const naoLidas = useConversationCounts(activeOrg?.orgId ?? null, { unread: true }).data?.all ?? 0;
  const rotulo = rotuloDoBotao(painel, salvos);
  const IconeDoBotao =
    rotulo.tipo === "preset"
      ? ICONE[rotulo.preset]
      : rotulo.tipo === "grupo"
        ? ICONE_DE_GRUPO[rotulo.preset]
        : rotulo.tipo === "salvo"
          ? Bookmark
          : SlidersHorizontal;
  const textoDoBotao =
    rotulo.tipo === "preset"
      ? t(ROTULO_DO_PRESET[rotulo.preset])
      : rotulo.tipo === "grupo"
        ? t(ROTULO_DO_PRESET_DE_GRUPO[rotulo.preset])
        : rotulo.tipo === "salvo"
          ? rotulo.nome
          : t("Personalizado");

  const item = (p: Preset) => {
    const Ic = ICONE[p];
    const atual = rotulo.tipo === "preset" && rotulo.preset === p;
    return (
      <MenuPrimitive.Item
        key={p}
        className={cn(ITEM_DO_MENU, "h-9 text-[12px]", atual && "text-casca-marca")}
        onSelect={() => aoMudarPainel(PAINEL_DO_PRESET[p])}
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
    <>
      <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-8 max-w-[200px] items-center gap-1.5 rounded-casca-gatilho border px-2.5 text-[12px] font-medium text-casca-texto",
              aberto ? "border-casca-marca" : "border-casca-borda hover:bg-casca-raia",
            )}
          >
            <IconeDoBotao size={14} aria-hidden className="shrink-0 text-casca-suave" />
            <span className="max-w-[140px] truncate">{textoDoBotao}</span>
            {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          </button>
        </DropdownMenuTrigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Content
            align="start"
            sideOffset={6}
            aria-label={t("Filtrar por")}
            className={cn(CAIXA_DO_MENU, "max-h-[70vh] w-[224px] overflow-y-auto")}
          >
            {item("todos")}
            {item("nao_lidas")}
            {temGrupos
              ? PRESETS_DE_GRUPO.map((p) => {
                  const Ic = ICONE_DE_GRUPO[p];
                  const atual = rotulo.tipo === "grupo" && rotulo.preset === p;
                  return (
                    <MenuPrimitive.Item
                      key={p}
                      className={cn(ITEM_DO_MENU, "h-9 text-[12px]", atual && "text-casca-marca")}
                      onSelect={() => aoMudarPainel(PAINEL_DO_PRESET_DE_GRUPO[p])}
                    >
                      <Ic size={16} aria-hidden />
                      <span className="flex-1">{t(ROTULO_DO_PRESET_DE_GRUPO[p])}</span>
                      {atual ? <Check size={14} aria-hidden /> : null}
                    </MenuPrimitive.Item>
                  );
                })
              : null}
            <p className={CABECALHO}>{t("Status")}</p>
            {PRESETS_DE_STATUS.map(item)}
            <p className={CABECALHO}>{t("Salvos")}</p>
            {salvos.map((s) => {
              const atual = rotulo.tipo === "salvo" && rotulo.id === s.id;
              return (
                <div key={s.id} className="group flex items-center">
                  <MenuPrimitive.Item
                    className={cn(
                      ITEM_DO_MENU,
                      "h-9 flex-1 text-[12px]",
                      atual && "text-casca-marca",
                    )}
                    onSelect={() => aoMudarPainel(s.criterios)}
                  >
                    <Bookmark size={16} aria-hidden />
                    <span className="flex-1 truncate">{s.nome}</span>
                    {atual ? <Check size={14} aria-hidden /> : null}
                  </MenuPrimitive.Item>
                  {s.meu ? (
                    <MenuPrimitive.Sub>
                      <MenuPrimitive.SubTrigger
                        aria-label={t("Mais opções")}
                        className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave opacity-0 group-hover:opacity-100 hover:bg-casca-raia data-[state=open]:opacity-100"
                      >
                        <EllipsisVertical size={14} aria-hidden />
                      </MenuPrimitive.SubTrigger>
                      <MenuPrimitive.Portal>
                        <MenuPrimitive.SubContent
                          sideOffset={4}
                          className={cn(CAIXA_DO_MENU, "w-[180px]")}
                        >
                          <MenuPrimitive.Item
                            className={cn(ITEM_DO_MENU, "h-9 text-[12px]")}
                            onSelect={() => setRenomeando({ id: s.id, nome: s.nome })}
                          >
                            {t("Renomear")}
                          </MenuPrimitive.Item>
                          <MenuPrimitive.Item
                            className={cn(ITEM_DO_MENU, "h-9 text-[12px]")}
                            onSelect={() =>
                              mudar.mutate({ id: s.id, compartilhado: !s.compartilhado })
                            }
                          >
                            {s.compartilhado ? t("Deixar de compartilhar") : t("Compartilhar")}
                          </MenuPrimitive.Item>
                          <MenuPrimitive.Item
                            className={cn(ITEM_DO_MENU, "h-9 text-[12px] text-casca-alerta")}
                            onSelect={() =>
                              excluir.mutate(s.id, {
                                onSuccess: () => toast.success(t("Filtro excluído.")),
                              })
                            }
                          >
                            {t("Excluir")}
                          </MenuPrimitive.Item>
                        </MenuPrimitive.SubContent>
                      </MenuPrimitive.Portal>
                    </MenuPrimitive.Sub>
                  ) : null}
                </div>
              );
            })}
            <MenuPrimitive.Item
              className={cn(ITEM_DO_MENU, "h-9 text-[12px] text-casca-marca")}
              onSelect={aoCriarFiltro}
            >
              <Plus size={16} aria-hidden />
              {t("Criar filtro")}
            </MenuPrimitive.Item>
          </MenuPrimitive.Content>
        </MenuPrimitive.Portal>
      </DropdownMenu>
      <JanelaRenomearFiltro filtro={renomeando} aoFechar={() => setRenomeando(null)} />
    </>
  );
}
