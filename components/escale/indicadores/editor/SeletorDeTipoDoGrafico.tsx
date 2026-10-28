"use client";
import { useState, type ComponentType } from "react";

import { CONTEUDO_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";
import { rotuloDoTipo, TIPO_PADRAO, TIPOS_DO_EDITOR } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import {
  ChartArea,
  ChartColumnStacked,
  Check,
  ChevronDown,
  ChevronUp,
  Table,
  TipoBarra,
  TipoDonut,
  TipoFunil,
  TipoLinha,
  TipoNumero,
  TipoPainelDeKpi,
  TipoPizza,
  X,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Icone = ComponentType<{ size?: number; weight?: "fill"; "aria-hidden"?: boolean; className?: string }>;
/** Sólidos como os react-icons da Clint: Phosphor `fill` e Lucide com `fill-current`. */
const ICONES: Record<TipoPrincipal, Icone> = {
  linha: TipoLinha,
  area: ChartArea,
  barra: TipoBarra,
  barra_empilhada: ChartColumnStacked,
  pizza: TipoPizza,
  donut: TipoDonut,
  funil: TipoFunil,
  tabela: Table,
  numero: TipoNumero,
  painel_de_kpi: TipoPainelDeKpi,
};

function IconeDoTipo({ tipo, className }: { tipo: TipoPrincipal; className?: string }) {
  const Desenho = ICONES[tipo];
  return <Desenho size={14} weight="fill" aria-hidden className={cn("fill-current", className)} />;
}

/** O seletor "Tipo de gráfico" (10-013): gatilho de 160 px com × e seta; lista com ícone sólido e o ativo na cor da marca. */
export function SeletorDeTipoDoGrafico({ tipo, aoEscolher }: { tipo: TipoPrincipal; aoEscolher: (t: TipoPrincipal) => void }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex h-8 w-[160px] items-center gap-1 rounded-[4px] px-3 text-[13px] text-casca-texto",
            aberto ? "border border-casca-marca bg-surface" : "border border-transparent bg-casca-busca",
          )}
        >
          <button
            type="button"
            role="combobox"
            aria-label={t("Tipo")}
            aria-expanded={aberto}
            className="min-w-0 flex-1 truncate text-left outline-hidden"
          >
            {t(rotuloDoTipo(tipo))}
          </button>
          <button
            type="button"
            aria-label={t("Restaurar tipo padrão")}
            onClick={(e) => {
              e.stopPropagation();
              aoEscolher(TIPO_PADRAO);
            }}
            className="grid shrink-0 place-items-center"
          >
            <X size={14} aria-hidden />
          </button>
          {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
        </div>
      </PopoverTrigger>
      <PainelSuspenso
        aria-label={t("Selecione o tipo de gráfico exibido")}
        sideOffset={4}
        className={cn(CONTEUDO_DO_MENU, "max-h-[380px] w-[320px] overflow-y-auto")}
        style={SOMBRA_DO_MENU}
      >
        <ul role="listbox" aria-label={t("Selecione o tipo de gráfico exibido")}>
          {TIPOS_DO_EDITOR.map(({ tipo: valor, rotulo }) => {
            const ativo = valor === tipo;
            return (
              <li key={valor} role="option" aria-selected={ativo}>
                <button
                  type="button"
                  onClick={() => {
                    aoEscolher(valor);
                    setAberto(false);
                  }}
                  className={cn(
                    "flex h-[38px] w-full items-center gap-2.5 rounded-[2px] px-3 text-left text-[13px] text-casca-texto hover:bg-casca-marca-suave",
                    ativo && "bg-casca-marca-suave text-casca-marca",
                  )}
                >
                  <IconeDoTipo tipo={valor} className={ativo ? "text-casca-marca" : "text-casca-escuro"} />
                  <span className="flex-1">{t(rotulo)}</span>
                  {ativo ? <Check size={14} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PainelSuspenso>
    </Popover>
  );
}
