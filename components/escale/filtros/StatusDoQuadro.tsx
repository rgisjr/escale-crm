"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import {
  STATUS_DO_NEGOCIO,
  normalizarStatus,
  type StatusDoNegocio,
} from "@/lib/escale/filtros/tipos";
import { CaretDown } from "@/lib/ui/icons";

const ROTULOS: Record<StatusDoNegocio, string> = {
  open: "Em aberto",
  won: "Ganhos",
  lost: "Perdidos",
};

/**
 * O STATUS DO QUADRO (fork Escale, Fase 1D): "Em aberto" é o padrão, como na
 * Clint, e dá para juntar ganhos e perdidos. Pelo menos um fica marcado: um
 * quadro sem status nenhum seria vazio sem explicação.
 */
export function StatusDoQuadro({
  status,
  onMudar,
}: {
  status: readonly StatusDoNegocio[];
  onMudar: (status: StatusDoNegocio[]) => void;
}) {
  const t = useT();
  const rotulo =
    status.length === STATUS_DO_NEGOCIO.length
      ? t("Todos os status")
      : status.map((s) => t(ROTULOS[s])).join(" + ");

  function alternar(s: StatusDoNegocio) {
    const proximos = status.includes(s) ? status.filter((x) => x !== s) : [...status, s];
    if (proximos.length === 0) return;
    onMudar(normalizarStatus(proximos));
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" data-testid="status-do-quadro">
          {rotulo}
          <CaretDown size={14} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t("Status do negócio")}</DropdownMenuLabel>
        {STATUS_DO_NEGOCIO.map((s) => (
          <DropdownMenuCheckboxItem
            key={s}
            checked={status.includes(s)}
            onCheckedChange={() => alternar(s)}
            onSelect={(e) => e.preventDefault()}
          >
            {t(ROTULOS[s])}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onMudar([...STATUS_DO_NEGOCIO])}>
          {t("Mostrar todos")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
