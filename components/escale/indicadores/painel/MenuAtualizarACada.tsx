"use client";
import { CONTEUDO_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { INTERVALOS, type Intervalo } from "@/lib/escale/indicadores/painel/preferencias";
import { Check, EllipsisVertical } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ROTULO_DO_INTERVALO: Record<string, string> = {
  null: "Desativado",
  "15": "15 minutos",
  "30": "30 minutos",
  "60": "1 hora",
  "120": "2 horas",
  "1440": "1 dia",
};

/** O ⋮ do cabeçalho com "Atualizar a cada:" (print 10-010). Guardado no navegador; padrão Desativado. */
export function MenuAtualizarACada({ intervalo, aoMudar }: { intervalo: Intervalo; aoMudar: (v: Intervalo) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t("Opções")}
        className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia data-[state=open]:bg-casca-raia"
      >
        <EllipsisVertical size={16} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn(CONTEUDO_DO_MENU, "min-w-[125px]")} style={SOMBRA_DO_MENU}>
        <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[12px] font-normal text-casca-texto">
          {t("Atualizar a cada:")}
        </DropdownMenuLabel>
        {INTERVALOS.map((v) => {
          const ativo = v === intervalo;
          return (
            <DropdownMenuItem
              key={String(v)}
              role="menuitemradio"
              aria-checked={ativo}
              onSelect={() => aoMudar(v)}
              className="h-8 px-3 text-[11px] text-casca-texto"
            >
              {t(ROTULO_DO_INTERVALO[String(v)] ?? "")}
              {ativo ? <Check size={14} aria-hidden className="ml-auto text-casca-marca" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
